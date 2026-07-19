import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import type { ChatMessage } from "@/lib/whatsapp/advisor";
import { SITE_URL } from "@/lib/seo";

// Advisor del modo administrador (Fase 1.2): dispara la investigación de autos nuevos (M3.1,
// Flujo A) y resuelve los hallazgos de la revisión semanal de vigencia/precio (M4, Flujo B). La
// revisión conversacional de fotos/specs de un auto recién investigado sigue pendiente (M3.2).

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 500;

const ADMIN_SYSTEM = `Eres el asistente interno de Francisco, dueño de Electrificarte, en un canal de WhatsApp exclusivo para él (nunca clientes). Tienes dos funciones:

1. **Investigar autos nuevos**: Francisco escribe algo como "agrega el GWM Ora 03 GT". Extrae marca y modelo y llama a start_research(brand, model). Si es ambiguo, pregunta antes de llamar la tool — nunca inventes marca/modelo. Después de llamar la tool, responde brevemente confirmando que quedó en curso y que avisas cuando termine (puede tardar unos minutos) — no inventes resultados, la investigación real corre aparte.

2. **Resolver hallazgos de la revisión semanal de precio/vigencia**: cada semana Francisco recibe un resumen con autos que quedaron con precio sobre el oficial (🟡) o posiblemente descontinuados (🔴, ya ocultos automáticamente). Francisco responde en lenguaje natural sobre esos hallazgos:
   - "aplicar <modelo>" o "bájale el precio al X" → llama apply_suggested_price(query) con el nombre del modelo que mencionó.
   - "restaurar <modelo>" o "el X sigue a la venta" → llama restore_car(query) (revierte el ocultamiento automático).
   - "descartar <modelo>" o "déjalo así el X" → llama dismiss_price_flag(query) (limpia el aviso sin cambiar nada).
   Si el nombre que da Francisco es ambiguo o no calza con nada, dile qué encontraste (o que no encontraste nada) — nunca asumas cuál auto es si hay duda real.

Si el mensaje no es ninguno de estos dos casos (saludo, pregunta general), responde breve y cordial, recordando que este canal es para gestionar el catálogo.

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

const APPLY_PRICE_TOOL: Anthropic.Tool = {
  name: "apply_suggested_price",
  description: "Baja el precio de un auto marcado 'precio sobre el oficial' al precio sugerido (5% bajo el oficial vigente) y limpia el aviso.",
  input_schema: {
    type: "object",
    properties: { query: { type: "string", description: "Nombre o marca+modelo del auto, tal como lo mencionó Francisco." } },
    required: ["query"],
  },
};

const RESTORE_CAR_TOOL: Anthropic.Tool = {
  name: "restore_car",
  description: "Revierte el ocultamiento automático de un auto marcado 'posiblemente descontinuado' (falso positivo) y limpia el aviso.",
  input_schema: {
    type: "object",
    properties: { query: { type: "string", description: "Nombre o marca+modelo del auto, tal como lo mencionó Francisco." } },
    required: ["query"],
  },
};

const DISMISS_FLAG_TOOL: Anthropic.Tool = {
  name: "dismiss_price_flag",
  description: "Limpia el aviso de un auto (precio o vigencia) sin cambiar nada más — Francisco decide dejarlo tal como está.",
  input_schema: {
    type: "object",
    properties: { query: { type: "string", description: "Nombre o marca+modelo del auto, tal como lo mencionó Francisco." } },
    required: ["query"],
  },
};

interface FlaggedCarLookup {
  _id: string;
  name: string;
  brand: string;
  priceCheckFlag: "none" | "price_high" | "discontinued";
  priceCheckSuggestedPrice?: number;
}

async function findFlaggedCar(query: string): Promise<FlaggedCarLookup | null> {
  // El nombre del auto vive separado de la marca (ej. brand="DS", name="3" → "DS 3" para
  // mostrar), así que buscar "DS 3" con match contra cada campo por separado no encuentra nada —
  // se trae la lista (siempre chica: solo autos con aviso pendiente) y se compara en JS contra
  // "marca nombre" combinado. priceCheckFlag != "none" en GROQ también matchea null/undefined
  // (autos aún sin revisar), así que se filtra explícitamente por los dos valores de alerta.
  const flagged = await sanity.fetch<FlaggedCarLookup[]>(
    `*[_type == "car" && priceCheckFlag in ["price_high", "discontinued"] && !(_id in path("drafts.**"))] {
      _id, name, "brand": brand->name, priceCheckFlag, priceCheckSuggestedPrice
    }`
  );
  const q = query.toLowerCase().trim();
  if (!q) return null;
  return flagged.find((c) => `${c.brand} ${c.name}`.toLowerCase().includes(q)) ?? null;
}

async function applySuggestedPrice(query: string): Promise<string> {
  const car = await findFlaggedCar(query);
  if (!car) return `No encontré ningún auto con avisos pendientes que calce con "${query}".`;
  if (car.priceCheckFlag !== "price_high" || !car.priceCheckSuggestedPrice) {
    return `${car.brand} ${car.name} no tiene un precio sugerido pendiente.`;
  }
  await sanity
    .patch(car._id)
    .set({ discountPrice: car.priceCheckSuggestedPrice, priceCheckFlag: "none" })
    .unset(["priceCheckNote", "priceCheckSuggestedPrice"])
    .commit();
  return `Listo — ${car.brand} ${car.name} ahora en $${car.priceCheckSuggestedPrice.toLocaleString("es-CL")}.`;
}

async function restoreCar(query: string): Promise<string> {
  const car = await findFlaggedCar(query);
  if (!car) return `No encontré ningún auto con avisos pendientes que calce con "${query}".`;
  if (car.priceCheckFlag !== "discontinued") {
    return `${car.brand} ${car.name} no está marcado como descontinuado.`;
  }
  await sanity
    .patch(car._id)
    .set({ hidden: false, priceCheckFlag: "none" })
    .unset(["priceCheckNote"])
    .commit();
  return `Listo — ${car.brand} ${car.name} vuelve a estar visible en el sitio.`;
}

async function dismissPriceFlag(query: string): Promise<string> {
  const car = await findFlaggedCar(query);
  if (!car) return `No encontré ningún auto con avisos pendientes que calce con "${query}".`;
  await sanity.patch(car._id).set({ priceCheckFlag: "none" }).unset(["priceCheckNote", "priceCheckSuggestedPrice"]).commit();
  return `Listo — descarté el aviso de ${car.brand} ${car.name}, queda tal como está.`;
}

async function triggerResearch(brand: string, model: string, phone: string): Promise<string> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return "No se pudo iniciar: falta configurar ADMIN_API_SECRET en el servidor.";
  try {
    // Diagnóstico temporal (no expone el secreto completo) — quitar una vez resuelto el 401
    // reportado en producción.
    console.warn("[admin-advisor] enviando secreto", { len: secret.length, prefix: secret.slice(0, 3), url: SITE_URL });
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
      tools: [START_RESEARCH_TOOL, APPLY_PRICE_TOOL, RESTORE_CAR_TOOL, DISMISS_FLAG_TOOL],
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
      let result: string;
      if (tu.name === "start_research") {
        const input = tu.input as { brand?: string; model?: string };
        const brand = (input.brand ?? "").trim();
        const model = (input.model ?? "").trim();
        result = brand && model ? await triggerResearch(brand, model, phone) : "Faltó marca o modelo.";
      } else if (tu.name === "apply_suggested_price") {
        result = await applySuggestedPrice(((tu.input as { query?: string }).query ?? "").trim());
      } else if (tu.name === "restore_car") {
        result = await restoreCar(((tu.input as { query?: string }).query ?? "").trim());
      } else if (tu.name === "dismiss_price_flag") {
        result = await dismissPriceFlag(((tu.input as { query?: string }).query ?? "").trim());
      } else {
        result = "Tool desconocida.";
      }
      toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return finalText || "Listo.";
}
