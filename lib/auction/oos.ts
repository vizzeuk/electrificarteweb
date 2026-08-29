/**
 * Captura de la respuesta al seguimiento OOS ("¿se concretó la venta?").
 *
 * Tras aceptar una oferta, el flujo 5 le pregunta al cliente (48 h después) si
 * concretó la compra. Cuando responde por WhatsApp, este enganche interpreta:
 *  - "sí"  → registra oos_resultado='si' y agradece.
 *  - "no"  → registra 'no' y ofrece RECUPERACIÓN (buscar otro sin re-cobro), o
 *            devolución si ya se llegó al tope (reusa offerRecovery).
 *  - dudoso → pide aclarar.
 *
 * Aislado al tier `oferta`. Se engancha en el bot antes de la recuperación.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getSupabase, normalizePhone } from "@/lib/whatsapp/subscription";
import { offerRecovery } from "@/lib/auction/recovery";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001";
const OOS_VENTANA_DIAS = 7; // cuánto tiempo tras el OOS interpretamos la respuesta

function phoneCandidates(digits: string): string[] {
  const c = new Set<string>([digits, `+${digits}`]);
  if (digits.startsWith("56") && digits.length > 9) c.add(digits.slice(2));
  else if (digits.length === 9 && digits.startsWith("9")) { c.add(`56${digits}`); c.add(`+56${digits}`); }
  return [...c];
}

interface OosRow {
  id: string;
  oos_at: string | null;
  leads: { id: number; telefono: string | null; target_model: string | null } | null;
}

async function classifyOos(text: string): Promise<"si" | "no" | "no_claro"> {
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 6,
      system:
        "Al cliente se le preguntó si concretó la compra de su auto. Según su respuesta, " +
        "responde SOLO: SI (sí la concretó), NO (no la concretó), o NO_CLARO.",
      messages: [{ role: "user", content: text.slice(0, 300) }],
    });
    const out = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim().toUpperCase();
    if (/^SI/.test(out)) return "si";
    if (/^NO_CLARO/.test(out)) return "no_claro";
    if (/^NO/.test(out)) return "no";
    return "no_claro";
  } catch {
    return "no_claro";
  }
}

/** Enganche del bot. Devuelve si manejó el mensaje + qué responder. */
export async function handleOosReply(phone: string, text: string): Promise<{ handled: boolean; reply?: string }> {
  const sb = getSupabase();
  if (!sb) return { handled: false };

  const { data: rows } = await sb
    .from("ofertas")
    .select("id, oos_at, leads!inner(id, telefono, target_model)")
    .eq("estado", "aceptada")
    .not("oos_at", "is", null)
    .is("oos_resultado", null)
    .in("leads.telefono", phoneCandidates(normalizePhone(phone)))
    .order("oos_at", { ascending: false })
    .returns<OosRow[]>();

  const now = Date.now();
  const oferta = (rows ?? []).find(
    (o) => o.oos_at && now - new Date(o.oos_at).getTime() < OOS_VENTANA_DIAS * 86_400_000,
  );
  if (!oferta || !oferta.leads) return { handled: false };

  const decision = await classifyOos(text);
  if (decision === "no_claro") return { handled: false }; // que siga la conversación normal

  if (decision === "si") {
    await sb.from("ofertas").update({ oos_resultado: "si" }).eq("id", oferta.id);
    return { handled: true, reply: "¡Excelente! Nos alegra que concretaras tu compra. Que lo disfrutes 🚗⚡ Cualquier cosa, acá estamos." };
  }

  // "no" → registra y ofrece recuperación (o devolución si está en el tope).
  await sb.from("ofertas").update({ oos_resultado: "no" }).eq("id", oferta.id);
  const reply = await offerRecovery(sb, oferta.leads.id, oferta.leads.target_model ?? "tu auto");
  return { handled: true, reply };
}
