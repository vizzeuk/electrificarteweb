import Anthropic from "@anthropic-ai/sdk";
import { validateOutput } from "@/lib/chat/output-validator";
import { advisorTools, runTool, getCoreKnowledge } from "@/lib/whatsapp/tools";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 700;
const MAX_TOOL_ITERATIONS = 5;
const CALL_TIMEOUT_MS = 20_000;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── System prompt del asesor ─────────────────────────────────────────────────

const BASE_SYSTEM = `Eres el asesor experto de Electrificarte, el marketplace de autos electrificados (EV, PHEV, HEV, EREV, MHEV) en Chile. Atiendes por WhatsApp a una persona que pagó una asesoría 1:1.

## Quién eres
Eres un especialista humano en movilidad eléctrica: cercano, honesto y pedagógico. NO eres un vendedor. Tu objetivo es que la persona entienda y decida bien, no cerrar una venta. Hablas como un experto que conversa 1:1, no como un folleto.

## Cómo trabajas
1. DIAGNÓSTICO primero. Antes de recomendar, entiende su realidad: uso (ciudad/carretera/mixto), kilómetros al día, presupuesto aproximado, dónde podría cargar (casa/trabajo/nada), y si prefiere eléctrico puro o híbrido. Pregunta de a 1-2 cosas por mensaje, de forma natural. No interrogues.
2. EDUCA cuando aporte. Explica trade-offs reales (autonomía vs precio, BEV vs PHEV según infraestructura de carga, costo de uso vs bencina). Para dudas conceptuales (carga, baterías, autonomía, mitos, garantías) usa la herramienta search_knowledge: es conocimiento verificado del sitio.
3. RECOMIENDA con datos reales. Usa search_vehicles para traer autos del catálogo según lo que necesita. Usa get_vehicle_detail cuando quiera profundizar en un modelo.

## Reglas innegociables (nada fuera del sitio)
- SOLO recomiendas autos que aparezcan en los resultados de search_vehicles / get_vehicle_detail. Si no hay resultados, dilo con honestidad y sugiere ajustar un criterio. NUNCA inventes modelos, precios, specs ni autonomías.
- Para conocimiento general usa search_knowledge y conocimiento de EVs ampliamente establecido y neutro. Si no estás seguro, dilo; no inventes cifras.
- El ÚNICO sitio que enlazas es electrificarte.com. Para fichas usa la pdpUrl exacta que devuelven las herramientas (formato https://electrificarte.com/auto/<slug>). Ningún otro link externo.
- No prometas stock ni plazos de entrega. No des cifras inventadas de seguros, financiamiento o mantención. Si lo piden, ofrece derivarlo al equipo humano.
- Solo hablas de movilidad eléctrica. Si se desvía, reencauza con amabilidad.

## Formato WhatsApp
- Mensajes cortos: 4-5 líneas máximo. Conversación, no ensayos.
- Negrita con *asteriscos* para nombres de modelos y precios (ej: *BYD Dolphin* — *$22.990.000 CLP*).
- Máximo 2 emojis por mensaje, solo si aportan.
- NO uses markdown de links [texto](url): WhatsApp no lo renderiza. Pega la URL completa tal cual.
- Cuando presentes opciones, máximo 3-4, cada una con su pdpUrl.`;

async function buildSystemPrompt(): Promise<string> {
  const core = await getCoreKnowledge();
  if (!core) return BASE_SYSTEM;
  return `${BASE_SYSTEM}\n\n## Conocimiento base de Electrificarte (úsalo como verdad de referencia)\n${core}`;
}

// ─── Validación de links bare (WhatsApp usa URLs completas, no markdown) ───────

function stripInvalidPdpUrls(text: string, validSlugs: Set<string>): string {
  return text.replace(
    /https?:\/\/electrificarte\.com\/auto\/([a-z0-9-]+)/gi,
    (match, slug: string) => (validSlugs.has(slug.toLowerCase()) ? match : "el catálogo de Electrificarte (https://electrificarte.com)"),
  );
}

// ─── Normalización para la API de Anthropic ───────────────────────────────────
// WhatsApp permite mensajes consecutivos del mismo rol (la persona manda 3 seguidos);
// Anthropic exige roles alternados y que el primero sea "user". Esto lo garantiza.
function normalizeForAnthropic(history: ChatMessage[]): ChatMessage[] {
  // Quita mensajes "assistant" iniciales (ej: saludo del bot antes de que escriba el user)
  let start = 0;
  while (start < history.length && history[start].role === "assistant") start++;
  const trimmed = history.slice(start);

  // Fusiona mensajes consecutivos del mismo rol
  const merged: ChatMessage[] = [];
  for (const m of trimmed) {
    const last = merged.at(-1);
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else merged.push({ role: m.role, content: m.content });
  }
  return merged;
}

// ─── Loop de tool use ─────────────────────────────────────────────────────────

export async function runAdvisor(history: ChatMessage[]): Promise<string> {
  const system = await buildSystemPrompt();

  const normalized = normalizeForAnthropic(history);
  if (normalized.length === 0 || normalized.at(-1)?.role !== "user") {
    return "¿En qué te puedo ayudar con tu próximo auto eléctrico? Cuéntame cómo usas el auto en tu día a día.";
  }

  const messages: Anthropic.MessageParam[] = normalized.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const validSlugs = new Set<string>();
  const validPrices: number[] = [];
  let finalText = "";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.4,
        system,
        messages,
        tools: advisorTools,
      },
      { timeout: CALL_TIMEOUT_MS },
    );

    // Acumula texto producido en esta iteración
    finalText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (response.stop_reason !== "tool_use") break;

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) break;

    // Ejecuta cada tool y construye los tool_result
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const run = await runTool(tu.name, (tu.input ?? {}) as Record<string, unknown>);
      for (const s of run.slugs) validSlugs.add(s.toLowerCase());
      for (const p of run.prices) validPrices.push(p);
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(run.output),
      });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  if (!finalText) {
    return "Disculpa, tuve un problema procesando tu consulta. ¿Me la puedes repetir?";
  }

  // Groundedness: quita links PDP inexistentes + chequeo de precios + largo
  const grounded = stripInvalidPdpUrls(finalText, validSlugs);
  return validateOutput(grounded, validSlugs, validPrices);
}
