/**
 * Generador del mensaje que recibe el cliente ($19.990) con la(s) 1–2 mejores
 * ofertas de la subasta inversa (WhatsApp/Kapso + correo/Resend).
 *
 * Regla dura del proyecto (no inventar): TODOS los números y hechos los calcula
 * este módulo de forma determinista (`buildOfferFacts`). La IA solo REDACTA
 * sobre esos hechos: ordena ventajas/desventajas y le da tono, pero no decide
 * por el cliente ni agrega datos que no le pasamos. Si la API falla, se cae a un
 * template determinista para que la notificación nunca quede sin enviar.
 *
 * Usa claude-sonnet-5 SIN `temperature` — Sonnet 5 rechaza los parámetros de
 * sampling con 400 (ver CLAUDE.md, trampas operativas).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { CercaniaZona, VersionMatch } from "@/lib/auction/score";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 700;

export interface OfferForMessage {
  marca: string;
  modelo: string;
  anio?: number;
  precioOferta: number;
  precioPublicado: number;
  cercania: CercaniaZona;
  horasEntrega: number;
  aceptaFinanciamiento: boolean;
  valorRegalias: number;
  versionMatch: VersionMatch;
  comunaVendedor?: string;
}

export interface LeadForMessage {
  nombre?: string;
  targetModel: string;
  comuna?: string;
  requiereFinanciamiento: boolean;
}

const CLP = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

const CERCANIA_LABEL: Record<CercaniaZona, string> = {
  local: "en tu misma comuna o con despacho incluido",
  regional: "en tu región",
  vecina: "en una región vecina",
  distante: "en otra región, más lejos",
};

const VERSION_LABEL: Record<VersionMatch, string> = {
  exacta: "es exactamente el modelo y versión que buscabas",
  variacion_menor: "es el mismo modelo y versión, cambia el color o el tapiz",
  upgrade: "es una versión superior, al mismo precio cotizado",
  inferior: "es una versión más básica que la que pediste",
  no_coincidente: "es un modelo distinto al que buscabas",
};

/** Convierte una oferta en una lista de hechos verificables (la fuente de
 *  verdad que se le pasa a la IA — nunca redondeos ni inferencias del modelo). */
export function buildOfferFacts(offer: OfferForMessage): string[] {
  const descuento = offer.precioPublicado - offer.precioOferta;
  const pct = offer.precioPublicado > 0 ? (descuento / offer.precioPublicado) * 100 : 0;
  const facts: string[] = [
    `Vehículo: ${offer.marca} ${offer.modelo}${offer.anio ? ` ${offer.anio}` : ""}.`,
    `Precio ofertado: ${CLP(offer.precioOferta)} (precio publicado ${CLP(offer.precioPublicado)}).`,
    descuento > 0
      ? `Ahorro: ${CLP(descuento)} (${pct.toFixed(1)}% bajo el publicado).`
      : `Sin descuento respecto al precio publicado.`,
    `Coincidencia: ${VERSION_LABEL[offer.versionMatch]}.`,
    `Ubicación: ${CERCANIA_LABEL[offer.cercania]}${offer.comunaVendedor ? ` (${offer.comunaVendedor})` : ""}.`,
    `Entrega estimada: ${offer.horasEntrega} horas.`,
    offer.aceptaFinanciamiento ? "Ofrece financiamiento." : "No ofrece financiamiento.",
  ];
  if (offer.valorRegalias > 0) {
    facts.push(`Beneficios/regalías incluidos por ${CLP(offer.valorRegalias)}.`);
  }
  return facts;
}

/** Template determinista — fallback si la IA no responde. */
function deterministicMessage(lead: LeadForMessage, offers: OfferForMessage[]): string {
  const saludo = lead.nombre ? `Hola ${lead.nombre}!` : "Hola!";
  const intro =
    offers.length > 1
      ? `Conseguimos ${offers.length} ofertas para tu ${lead.targetModel}. Estas son:`
      : `Conseguimos una oferta para tu ${lead.targetModel}:`;
  const bloques = offers
    .map((o, i) => {
      const facts = buildOfferFacts(o).map((f) => `  • ${f}`).join("\n");
      return `${offers.length > 1 ? `*Opción ${i + 1}*\n` : ""}${facts}`;
    })
    .join("\n\n");
  const cierre =
    offers.length > 1
      ? "\n\nCada una tiene sus ventajas: revisá precio, cercanía y entrega, y respondé cuál prefieres."
      : "\n\nSi te interesa, respondé y coordinamos el siguiente paso.";
  return `${saludo} ${intro}\n\n${bloques}${cierre}`;
}

const SYSTEM = `Eres el asistente de Electrificarte, marketplace chileno de autos electrificados.
Le escribes por WhatsApp a un cliente que ya pagó por conseguir la mejor oferta de su auto.
Recibes 1 o 2 ofertas ya evaluadas, con sus HECHOS verificados.

Reglas estrictas:
- Usa SOLO los hechos que se te entregan. NO inventes datos, cifras, specs ni beneficios.
- Si hay 2 ofertas, explica las ventajas y desventajas de cada una de forma equilibrada
  (ej. una más barata pero más lejos; otra un modelo parecido pero más cerca). NO decidas por
  el cliente: la decisión es suya.
- Tono chileno cercano y claro, sin exagerar ni presionar. Breve, apto para WhatsApp.
- No uses la palabra "concesionario". No prometas nada que no esté en los hechos.
- Cierra invitando a responder cuál prefiere.`;

/** Genera el mensaje de comparación para el cliente. Determinista en los datos,
 *  la IA solo redacta. Cae al template si la API falla. */
export async function generateClientComparison(
  lead: LeadForMessage,
  offers: OfferForMessage[],
): Promise<string> {
  if (offers.length === 0) {
    throw new Error("generateClientComparison: se requiere al menos una oferta");
  }
  const hechos = offers
    .map((o, i) => `Oferta ${i + 1}:\n${buildOfferFacts(o).map((f) => `- ${f}`).join("\n")}`)
    .join("\n\n");
  const userMsg =
    `Cliente: ${lead.nombre ?? "(sin nombre)"} — busca: ${lead.targetModel}` +
    `${lead.comuna ? ` — comuna: ${lead.comuna}` : ""}` +
    `${lead.requiereFinanciamiento ? " — necesita financiamiento" : " — paga al contado"}\n\n` +
    `${offers.length === 1 ? "Hay 1 oferta." : `Hay ${offers.length} ofertas.`}\n\n${hechos}\n\n` +
    `Redacta el mensaje de WhatsApp para el cliente.`;

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text || deterministicMessage(lead, offers);
  } catch {
    // Fail-safe: nunca dejar la notificación sin cuerpo.
    return deterministicMessage(lead, offers);
  }
}
