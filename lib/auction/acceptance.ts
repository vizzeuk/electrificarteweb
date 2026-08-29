/**
 * Flujo "cliente acepta": cuando un cliente que ya recibió sus 1–2 ofertas
 * responde por WhatsApp, interpretamos qué eligió y cerramos el círculo.
 *
 * - Se engancha en el bot entrante (lib/whatsapp/bot.ts), solo para clientes
 *   tier `oferta` que tienen ofertas en estado `enviada_cliente`. Si no hay
 *   ofertas esperando decisión, no hace nada y el bot sigue su curso normal.
 * - La elección se interpreta con IA (clasificador barato), sin adivinar: si no
 *   queda claro, se le pregunta al cliente.
 * - Al aceptar: marca la oferta `aceptada`, las otras mostradas `perdida`,
 *   avisa al vendedor ganador (y a los que mostramos y no ganaron), y le confirma
 *   al cliente. El seguimiento OOS lo hace un cron aparte.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, normalizePhone } from "@/lib/whatsapp/subscription";
import { sendProactiveText } from "@/lib/whatsapp/outbound";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001";
const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

interface PendingOffer {
  offerId: string;
  modelo: string;
  precio: number;
  precioFmt: string;
  comunaVendedor: string | null;
  vendor: { nombre: string | null; telefono: string | null; email: string | null };
}
export interface PendingCtx {
  leadId: number;
  nombre: string | null;
  telefono: string | null;
  targetModel: string;
  offers: PendingOffer[];
}

interface OfferJoinRow {
  id: string;
  lead_id: number;
  precio_oferta: number;
  marca_ofertada: string | null;
  modelo_ofertado: string | null;
  leads_vendors: { nombre: string | null; telefono: string | null; email: string | null; comuna: string | null } | null;
}

/** Variantes del teléfono para tolerar distintos formatos guardados en `leads`. */
function phoneCandidates(digits: string): string[] {
  const c = new Set<string>([digits, `+${digits}`]);
  if (digits.startsWith("56") && digits.length > 9) c.add(digits.slice(2));
  else if (digits.length === 9 && digits.startsWith("9")) { c.add(`56${digits}`); c.add(`+56${digits}`); }
  return [...c];
}

/** Devuelve las ofertas que este cliente tiene esperando decisión, o null. */
export async function getPendingClientOffers(sb: SupabaseClient, phone: string): Promise<PendingCtx | null> {
  const cands = phoneCandidates(normalizePhone(phone));
  const { data: leads } = await sb
    .from("leads")
    .select("id, first_name, telefono, target_model")
    .in("telefono", cands)
    .not("cerrada_at", "is", null)
    .order("cerrada_at", { ascending: false });
  if (!leads?.length) return null;

  const { data: offers } = await sb
    .from("ofertas")
    .select("id, lead_id, precio_oferta, marca_ofertada, modelo_ofertado, leads_vendors(nombre, telefono, email, comuna)")
    .in("lead_id", leads.map((l) => l.id))
    .eq("estado", "enviada_cliente")
    .order("score_total", { ascending: false }) // mismo orden que vio el cliente
    .returns<OfferJoinRow[]>();
  if (!offers?.length) return null;

  // Toma el lead más reciente que tenga ofertas esperando.
  const lead = leads.find((l) => offers.some((o) => o.lead_id === l.id))!;
  const myOffers = offers.filter((o) => o.lead_id === lead.id);

  return {
    leadId: lead.id,
    nombre: lead.first_name,
    telefono: lead.telefono,
    targetModel: lead.target_model,
    offers: myOffers.map((o) => ({
      offerId: o.id,
      modelo: [o.marca_ofertada, o.modelo_ofertado].filter(Boolean).join(" ") || lead.target_model,
      precio: o.precio_oferta,
      precioFmt: CLP(o.precio_oferta),
      comunaVendedor: o.leads_vendors?.comuna ?? null,
      vendor: {
        nombre: o.leads_vendors?.nombre ?? null,
        telefono: o.leads_vendors?.telefono ?? null,
        email: o.leads_vendors?.email ?? null,
      },
    })),
  };
}

type Decision = { decision: "acepta"; index: number } | { decision: "rechaza" } | { decision: "no_claro" };

/** Interpreta el mensaje del cliente contra sus ofertas. Ante la duda: no_claro. */
async function classifyDecision(text: string, offers: PendingOffer[]): Promise<Decision> {
  const lista = offers
    .map((o, i) => `Oferta ${i + 1}: ${o.modelo} a ${o.precioFmt}${o.comunaVendedor ? ` en ${o.comunaVendedor}` : ""}`)
    .join("\n");
  const system =
    `Eres un clasificador. Un cliente recibió estas ofertas de auto:\n${lista}\n\n` +
    `Según su mensaje, responde SOLO con una de estas opciones, sin nada más:\n` +
    `- El número de la oferta que elige (ej. "1" o "2").\n` +
    `- "RECHAZA" si dice que no quiere ninguna.\n` +
    `- "NO_CLARO" si no se entiende cuál elige.`;
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8,
      system,
      messages: [{ role: "user", content: text.slice(0, 500) }],
    });
    const out = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .toUpperCase();
    if (/RECHAZA/.test(out)) return { decision: "rechaza" };
    const n = parseInt(out, 10);
    if (Number.isInteger(n) && n >= 1 && n <= offers.length) return { decision: "acepta", index: n - 1 };
    return { decision: "no_claro" };
  } catch {
    return { decision: "no_claro" };
  }
}

/** Punto de entrada del bot. Devuelve si manejó el mensaje + qué responderle al cliente. */
export async function handleClientOfferDecision(
  phone: string,
  text: string,
): Promise<{ handled: boolean; reply?: string }> {
  const sb = getSupabase();
  if (!sb) return { handled: false };
  const ctx = await getPendingClientOffers(sb, phone);
  if (!ctx) return { handled: false };

  const d = await classifyDecision(text, ctx.offers);

  if (d.decision === "no_claro") {
    const opciones = ctx.offers.map((o, i) => `${i + 1}) ${o.modelo} a ${o.precioFmt}`).join("\n");
    return { handled: true, reply: `¿Cuál prefieres? Respóndeme con el número:\n${opciones}` };
  }

  if (d.decision === "rechaza") {
    await sb.from("ofertas").update({ estado: "rechazada" }).eq("lead_id", ctx.leadId).eq("estado", "enviada_cliente");
    return {
      handled: true,
      reply:
        "Entendido, no te convencen estas ofertas. Cuéntame qué buscas y vemos otras opciones; " +
        "recuerda que si no logramos un ahorro, tu pago es reembolsable. 🙌",
    };
  }

  // Acepta la oferta d.index
  const chosen = ctx.offers[d.index];
  // Idempotente: solo marca si sigue 'enviada_cliente'.
  const { data: updated } = await sb
    .from("ofertas")
    .update({ estado: "aceptada", aceptada_at: new Date().toISOString() })
    .eq("id", chosen.offerId)
    .eq("estado", "enviada_cliente")
    .select("id");
  if (!updated?.length) {
    return { handled: true, reply: "¡Ya habíamos registrado tu elección! El vendedor te va a contactar. 🚗" };
  }
  // Las otras mostradas → perdida.
  await sb.from("ofertas").update({ estado: "perdida" }).eq("lead_id", ctx.leadId).eq("estado", "enviada_cliente");

  // Avisar al vendedor ganador (con el contacto del cliente para cerrar).
  if (chosen.vendor.telefono) {
    await sendProactiveText(
      chosen.vendor.telefono,
      `🎉 ¡El cliente aceptó tu oferta por el ${chosen.modelo}! ` +
        `Contáctalo para cerrar: ${ctx.nombre ?? "Cliente"} — ${ctx.telefono ?? "(sin teléfono)"}. Éxito 🤝`,
    );
  }
  // Avisar a los que mostramos y no ganaron.
  for (const o of ctx.offers) {
    if (o.offerId !== chosen.offerId && o.vendor.telefono) {
      await sendProactiveText(
        o.vendor.telefono,
        `El cliente eligió otra oferta para el ${o.modelo}. Gracias por participar; te avisaremos del próximo lead. 🚗`,
      );
    }
  }

  return {
    handled: true,
    reply:
      `¡Listo${ctx.nombre ? " " + ctx.nombre : ""}! Elegiste la oferta del ${chosen.modelo} por ${chosen.precioFmt}. ` +
      `Ya le avisé al vendedor y te va a contactar para cerrar. Cualquier cosa, acá estoy. 🚗⚡`,
  };
}
