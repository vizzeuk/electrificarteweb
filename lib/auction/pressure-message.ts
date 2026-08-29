/**
 * Generador del mensaje de "presión" que recibe el vendedor para que mejore su
 * puja en la subasta inversa (WhatsApp/Kapso + correo/Resend).
 *
 * Regla dura acordada: la urgencia se ancla SOLO a señales REALES, nunca se
 * fabrica competencia. El vendedor es cliente que paga ($12.990/mes); mentirle
 * rompe la confianza y va contra la regla de "no inventar" del proyecto. Los
 * hechos (cuántos compiten, mejor puja actual anonimizada, ventana restante)
 * los calcula el código; la IA solo redacta el tono. Fallback determinista si
 * la API falla.
 *
 * Usa claude-sonnet-5 SIN `temperature` (Sonnet 5 rechaza sampling — CLAUDE.md).
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 500;

export interface PressureContext {
  nombreVendedor?: string;
  targetModel: string;
  /** Señales REALES de competencia: */
  vendedoresCompitiendo: number; // vendedores que tienen el lead disponible ahora
  mejorPrecioActual?: number; // mejor puja vigente (anonimizada), CLP
  suPrecioActual?: number; // la puja actual de este vendedor, CLP
  horasRestantes: number; // ventana que le queda para mejorar
}

const CLP = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

/** Hechos verificables (fuente de verdad para la IA). Solo se incluye lo que es
 *  real: si no hay otras pujas, no se menciona competencia inventada. */
export function buildPressureFacts(ctx: PressureContext): string[] {
  const facts: string[] = [`Lead: cliente buscando ${ctx.targetModel}.`];
  if (ctx.vendedoresCompitiendo > 1) {
    facts.push(`Hay ${ctx.vendedoresCompitiendo} vendedores con este lead disponible ahora.`);
  } else {
    facts.push("Por ahora eres el único con este lead disponible.");
  }
  if (ctx.suPrecioActual != null) {
    facts.push(`Tu puja actual: ${CLP(ctx.suPrecioActual)}.`);
  }
  if (ctx.mejorPrecioActual != null) {
    const lideraElVendedor =
      ctx.suPrecioActual != null && ctx.suPrecioActual <= ctx.mejorPrecioActual;
    facts.push(
      lideraElVendedor
        ? `Tu puja es la mejor hasta ahora (${CLP(ctx.mejorPrecioActual)}).`
        : `La mejor oferta vigente es ${CLP(ctx.mejorPrecioActual)} (de otro vendedor, anónimo).`,
    );
  }
  facts.push(`Quedan ${ctx.horasRestantes} horas para mejorar tu oferta.`);
  return facts;
}

function deterministicMessage(ctx: PressureContext): string {
  const saludo = ctx.nombreVendedor ? `Hola ${ctx.nombreVendedor},` : "Hola,";
  const cuerpo = buildPressureFacts(ctx).map((f) => `• ${f}`).join("\n");
  return `${saludo} tienes una oportunidad activa:\n\n${cuerpo}\n\nSi puedes mejorar tu oferta, respondé con el nuevo precio. Cerramos en la ventana indicada.`;
}

const SYSTEM = `Eres el sistema de Electrificarte que le escribe a un VENDEDOR asociado
(paga suscripción) para incentivarlo a mejorar su puja en una subasta inversa.

Reglas estrictas:
- Usa SOLO los hechos entregados. NUNCA inventes competencia, cifras ni urgencia falsa.
  Si dice que es el único vendedor, NO insinúes que hay otros.
- Tono profesional, directo y motivador, sin ser agresivo ni manipulador. Breve, para WhatsApp.
- El objetivo es que mejore su oferta si puede, no presionarlo con mentiras.
- No uses la palabra "concesionario".
- Cierra pidiéndole que responda con un nuevo precio si quiere mejorar.`;

/** Genera el mensaje de presión. Determinista en los datos, la IA solo redacta.
 *  Cae al template si la API falla. */
export async function generatePressureMessage(ctx: PressureContext): Promise<string> {
  const hechos = buildPressureFacts(ctx).map((f) => `- ${f}`).join("\n");
  const userMsg =
    `Vendedor: ${ctx.nombreVendedor ?? "(sin nombre)"}\n\nHechos reales:\n${hechos}\n\n` +
    `Redacta el mensaje de WhatsApp para el vendedor.`;

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
    return text || deterministicMessage(ctx);
  } catch {
    return deterministicMessage(ctx);
  }
}
