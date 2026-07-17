import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/lib/whatsapp/advisor";
import { SITE_URL } from "@/lib/seo";

// Advisor del modo administrador (M3.1, Fase 1.2 Flujo A): hoy solo dispara la investigación
// automática de un modelo nuevo. La revisión conversacional (fotos/specs/publicar) es M3.2.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 500;

const ADMIN_SYSTEM = `Eres el asistente interno de Francisco, dueño de Electrificarte, en un canal de WhatsApp exclusivo para él (nunca clientes). Tu única función hoy es recibir pedidos de investigar un modelo de auto nuevo y dispararla con la tool start_research.

## Cómo funciona
Francisco escribe algo como "agrega el GWM Ora 03 GT" o "quiero investigar el BYD Seal 06". Extrae marca y modelo del mensaje y llama a start_research(brand, model). Si el mensaje es ambiguo (falta marca o modelo claro), pregunta antes de llamar la tool — nunca inventes marca/modelo.

Después de llamar la tool, responde brevemente confirmando que la investigación quedó en curso y que le avisas cuando termine (puede tardar unos minutos). No prometas resultados que no sabes — no inventes specs ni fotos, la investigación real corre aparte.

Si el mensaje no es un pedido de investigación (saludo, pregunta general), responde breve y cordial, recordando que este canal es para gestionar el catálogo.

Mensajes cortos, directos, sin relleno — Francisco es el dueño del negocio, no un cliente.`;

const START_RESEARCH_TOOL: Anthropic.Tool = {
  name: "start_research",
  description: "Dispara la investigación automática de specs + fotos de un modelo de auto nuevo y crea su ficha oculta en Sanity.",
  input_schema: {
    type: "object",
    properties: {
      brand: { type: "string", description: "Marca del auto, ej: GWM" },
      model: { type: "string", description: "Modelo del auto, ej: Ora 03 GT" },
    },
    required: ["brand", "model"],
  },
};

async function triggerResearch(brand: string, model: string, phone: string): Promise<string> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return "No se pudo iniciar: falta configurar ADMIN_API_SECRET en el servidor.";
  try {
    const res = await fetch(`${SITE_URL}/api/admin/pdp-research`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ brand, model, phone }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 202) return "queued";
    return `Error al iniciar (status ${res.status}).`;
  } catch (err) {
    return `Error al iniciar: ${(err as Error).message}`;
  }
}

function normalizeForAnthropic(history: ChatMessage[]): ChatMessage[] {
  let start = 0;
  while (start < history.length && history[start].role === "assistant") start++;
  const trimmed = history.slice(start);
  const merged: ChatMessage[] = [];
  for (const m of trimmed) {
    const last = merged.at(-1);
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else merged.push({ role: m.role, content: m.content });
  }
  return merged;
}

export async function runAdminAdvisor(history: ChatMessage[], phone: string): Promise<string> {
  const normalized = normalizeForAnthropic(history);
  if (normalized.length === 0 || normalized.at(-1)?.role !== "user") {
    return "¿Qué modelo quieres agregar al catálogo?";
  }

  const messages: Anthropic.MessageParam[] = normalized.map((m) => ({ role: m.role, content: m.content }));

  let finalText = "";
  for (let i = 0; i < 3; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: ADMIN_SYSTEM,
      messages,
      tools: [START_RESEARCH_TOOL],
    });

    finalText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (response.stop_reason !== "tool_use") break;

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (toolUses.length === 0) break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      if (tu.name === "start_research") {
        const input = tu.input as { brand?: string; model?: string };
        const brand = (input.brand ?? "").trim();
        const model = (input.model ?? "").trim();
        const result = brand && model ? await triggerResearch(brand, model, phone) : "Faltó marca o modelo.";
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result });
      }
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return finalText || "Listo.";
}
