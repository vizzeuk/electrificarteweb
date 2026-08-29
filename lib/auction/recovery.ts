/**
 * Flujo de recuperación: cuando a un cliente no le resultó, le ofrecemos buscar
 * otro auto SIN re-cobro, por WhatsApp. Acotado (tope por cadena) y aislado al
 * tier `oferta`.
 *
 * - `offerRecovery`: marca que se le ofreció recuperación (para interpretar su
 *   próxima respuesta como el modelo nuevo).
 * - `handleRecoveryReply`: enganche del bot. Si el cliente tiene recuperación
 *   ofrecida y no tiene una subasta abierta, interpreta su mensaje como el modelo
 *   y crea el lead de recuperación (o avisa devolución si se pasó del tope).
 * - `createRecoveryLead`: crea el lead nuevo (lo comparte el endpoint /recuperar).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, normalizePhone } from "@/lib/whatsapp/subscription";
import { WINDOW_HOURS, RECOVERY_CAP, N8N_LEAD_PAID_URL } from "@/lib/auction/config";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001";
const OFERTA_VIGENTE_DIAS = 7; // ventana para interpretar la respuesta como recuperación

function phoneCandidates(digits: string): string[] {
  const c = new Set<string>([digits, `+${digits}`]);
  if (digits.startsWith("56") && digits.length > 9) c.add(digits.slice(2));
  else if (digits.length === 9 && digits.startsWith("9")) { c.add(`56${digits}`); c.add(`+56${digits}`); }
  return [...c];
}

export type RecoveryResult =
  | { cap: true; recuperacion_count: number }
  | { cap: false; leadId: number; recuperacion_count: number; quedan: number };

/** Crea el lead de recuperación (sin cobro). Compartido por el bot y el endpoint. */
export async function createRecoveryLead(
  sb: SupabaseClient,
  srcLeadId: number,
  targetModel: string,
): Promise<RecoveryResult | { error: string }> {
  const { data: src, error } = await sb
    .from("leads")
    .select("id, first_name, last_name, email, telefono, rut, region, comuna, financing, recuperacion_de, recuperacion_count")
    .eq("id", srcLeadId)
    .single();
  if (error || !src) return { error: "Lead no encontrado" };

  const count = src.recuperacion_count ?? 0;
  if (count >= RECOVERY_CAP) return { cap: true, recuperacion_count: count };

  const { data: nuevo, error: insErr } = await sb
    .from("leads")
    .insert({
      first_name: src.first_name, last_name: src.last_name, email: src.email, telefono: src.telefono,
      rut: src.rut, region: src.region, comuna: src.comuna, financing: src.financing,
      target_model: targetModel.trim(), status: "pagado", origen: "recuperacion",
      recuperacion_de: src.recuperacion_de ?? src.id, recuperacion_count: count + 1,
    })
    .select("id")
    .single();
  if (insErr || !nuevo) return { error: insErr?.message ?? "insert falló" };

  await sb.from("leads").update({ cierra_at: new Date(Date.now() + WINDOW_HOURS * 3600_000).toISOString() }).eq("id", nuevo.id);

  if (N8N_LEAD_PAID_URL) {
    fetch(N8N_LEAD_PAID_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: nuevo.id }), signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  }
  return { cap: false, leadId: nuevo.id, recuperacion_count: count + 1, quedan: RECOVERY_CAP - (count + 1) };
}

const DEVOLUCION_MSG =
  "Ya buscamos varias alternativas sin encontrar un buen precio, así que corresponde " +
  "la devolución de tu pago. Te contactamos para gestionarla. 🙏";

/** Ofrece recuperación (o devolución si ya se llegó al tope). Devuelve el texto a
 *  enviar; solo marca `recuperacion_ofrecida_at` si aún hay recuperaciones disponibles. */
export async function offerRecovery(sb: SupabaseClient, leadId: number, targetModel: string): Promise<string> {
  const { data } = await sb.from("leads").select("recuperacion_count").eq("id", leadId).single();
  if ((data?.recuperacion_count ?? 0) >= RECOVERY_CAP) return DEVOLUCION_MSG;

  await sb.from("leads").update({ recuperacion_ofrecida_at: new Date().toISOString() }).eq("id", leadId);
  return (
    `Entiendo que no te convencieron las ofertas para el ${targetModel}. ` +
    `Podemos buscarte **otro auto sin costo adicional** — dime qué modelo te interesa y lo ingresamos de nuevo. ` +
    `Si tampoco encontramos un buen precio, tu pago es reembolsable. 🙌`
  );
}

/** Extrae el modelo de auto del mensaje, o null si no menciona uno. */
async function extractModel(text: string): Promise<string | null> {
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 20,
      system:
        "Extrae el modelo de auto que el usuario quiere buscar (marca + modelo). " +
        "Responde SOLO con el modelo (ej. 'MG4' o 'BYD Dolphin'), o 'NINGUNO' si no menciona un auto concreto.",
      messages: [{ role: "user", content: text.slice(0, 300) }],
    });
    const out = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
    if (!out || /^ninguno$/i.test(out)) return null;
    return out.slice(0, 120);
  } catch {
    return null;
  }
}

/** Enganche del bot (tier oferta). Devuelve si manejó el mensaje + qué responder. */
export async function handleRecoveryReply(phone: string, text: string): Promise<{ handled: boolean; reply?: string }> {
  const sb = getSupabase();
  if (!sb) return { handled: false };

  const { data: leads } = await sb
    .from("leads")
    .select("id, status, cierra_at, cerrada_at, recuperacion_ofrecida_at, recuperacion_count, target_model")
    .in("telefono", phoneCandidates(normalizePhone(phone)))
    .order("created_at", { ascending: false });
  if (!leads?.length) return { handled: false };

  // Si tiene una subasta ABIERTA, no es recuperación (está en pleno proceso).
  const now = Date.now();
  const abierta = leads.some(
    (l) => l.status === "pagado" && !l.cerrada_at && l.cierra_at && new Date(l.cierra_at).getTime() > now,
  );
  if (abierta) return { handled: false };

  // Lead elegible: cerrado, con recuperación ofrecida hace poco, bajo el tope.
  const elegible = leads.find(
    (l) =>
      l.cerrada_at &&
      l.recuperacion_ofrecida_at &&
      now - new Date(l.recuperacion_ofrecida_at).getTime() < OFERTA_VIGENTE_DIAS * 86_400_000 &&
      (l.recuperacion_count ?? 0) < RECOVERY_CAP,
  );
  if (!elegible) return { handled: false };

  const modelo = await extractModel(text);
  if (!modelo) return { handled: false }; // no nombró un auto → que siga la conversación normal

  const r = await createRecoveryLead(sb, elegible.id, modelo);
  if ("error" in r) return { handled: false };
  if (r.cap) {
    return { handled: true, reply: "Ya hicimos varias búsquedas sin encontrar un buen precio, así que corresponde la devolución de tu pago. Te contactamos para gestionarla. 🙏" };
  }
  // Limpia la marca para no re-disparar con el próximo mensaje.
  await sb.from("leads").update({ recuperacion_ofrecida_at: null }).eq("id", elegible.id);
  return {
    handled: true,
    reply: `¡Listo! Ingresamos tu búsqueda del ${modelo} sin costo. Vamos a buscar la mejor oferta en la red de vendedores y te aviso apenas la tengamos. 🚗⚡`,
  };
}
