import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import type { ChatMessage } from "@/lib/whatsapp/advisor";
import { SITE_URL } from "@/lib/seo";
import { sendProactiveImage, sendProactiveText } from "@/lib/whatsapp/outbound";
import { loadAdminContext, saveAdminContext } from "@/lib/whatsapp/admin-context";
import { loadReviewState, saveReviewState, clearReviewState } from "@/lib/whatsapp/admin-review-state";

// Advisor del modo administrador (Fase 1.2): dispara la investigación de autos nuevos (M3.1,
// Flujo A), guía la revisión conversacional de specs/fotos antes de publicar (M3.2), y resuelve
// los hallazgos de la revisión semanal de vigencia/precio (M4, Flujo B).

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

const ADMIN_SYSTEM = `Eres el asistente interno de Francisco, dueño de Electrificarte, en un canal de WhatsApp exclusivo para él (nunca clientes). Tienes tres funciones:

1. **Investigar autos nuevos**: Francisco escribe algo como "agrega el GWM Ora 03 GT". Extrae marca y modelo y llama a start_research(brand, model). Si es ambiguo, pregunta antes de llamar la tool — nunca inventes marca/modelo. El resultado de la tool es uno de dos: "queued" → responde brevemente confirmando que quedó en curso y que avisas cuando termine (puede tardar unos minutos), sin inventar resultados. "duplicate:<id>" → ese auto YA existe, dile a Francisco que ya está en el catálogo y que no se creó nada nuevo — nunca digas "arranqué la investigación" en ese caso. Cuando la investigación de verdad termina, Francisco recibe automáticamente la portada + un resumen de specs y versiones (no lo generas tú, ya se manda directo).

2. **Guiar la revisión antes de publicar** (dos pasos, en este orden — nunca te saltes uno):
   - **Paso "specs"**: Francisco ya recibió el resumen de specs/versiones + link a Studio. Si dice "sí"/"aprobado"/"dale" → llama approve_specs() (esto manda las fotos directo, no agregues texto propio describiendo fotos que no has visto). Si en cambio corrige un dato ("la autonomía es 420", "el precio son 25990000") → llama update_spec(field, value) con el campo que corresponda (basePrice, discountPrice, range, batteryCapacity, power, tagline, description, warranty) y responde confirmando el cambio, sin avanzar de paso todavía.
   - **Paso "photos"**: Francisco ya recibió todas las fotos numeradas. Si dice "portada N" → set_cover_photo(index). Si da números de fotos a sacar ("3, 7" o "saca la 5") → remove_gallery_photos(indexes). Si dice "LISTO"/"todas bien"/"publica" → publish_car().
   Estas tools (approve_specs, set_cover_photo, remove_gallery_photos) devuelven confirmaciones cortas — respóndelas tal cual, sin inventar detalle adicional sobre fotos o specs que no te devolvió la tool.

3. **Resolver hallazgos de la revisión semanal de precio/vigencia**: cada semana Francisco recibe un resumen con autos que quedaron con precio sobre el oficial (🟡) o posiblemente descontinuados (🔴, ya ocultos automáticamente). Francisco responde en lenguaje natural sobre esos hallazgos:
   - "aplicar <modelo>" o "bájale el precio al X" → llama apply_suggested_price(query) con el nombre del modelo que mencionó.
   - "restaurar <modelo>" o "el X sigue a la venta" → llama restore_car(query) (revierte el ocultamiento automático).
   - "descartar <modelo>" o "déjalo así el X" → llama dismiss_price_flag(query) (limpia el aviso sin cambiar nada).
   Si el nombre que da Francisco es ambiguo o no calza con nada, dile qué encontraste (o que no encontraste nada) — nunca asumas cuál auto es si hay duda real.

Si Francisco tiene una ficha en revisión (viste specs o fotos recientemente en la conversación), un "sí" o "listo" suyo se refiere a ESE paso — no lo confundas con otra cosa. Si el mensaje no calza con ninguna de estas tres funciones (saludo, pregunta general), responde breve y cordial, recordando que este canal es para gestionar el catálogo.

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

const APPROVE_SPECS_TOOL: Anthropic.Tool = {
  name: "approve_specs",
  description: "Francisco aprobó las specs de la ficha en revisión — manda la galería completa numerada para que revise las fotos y elija portada.",
  input_schema: { type: "object", properties: {} },
};

const EDITABLE_FIELDS = ["basePrice", "discountPrice", "range", "batteryCapacity", "power", "tagline", "description", "warranty"] as const;

const UPDATE_SPEC_TOOL: Anthropic.Tool = {
  name: "update_spec",
  description: "Corrige un dato de la ficha en revisión (solo durante el paso de specs, antes de aprobar).",
  input_schema: {
    type: "object",
    properties: {
      field: { type: "string", enum: [...EDITABLE_FIELDS], description: "Campo a corregir." },
      value: { type: "string", description: "Nuevo valor. Para campos numéricos, solo el número (ej: '420' para range en km, sin puntos ni texto)." },
    },
    required: ["field", "value"],
  },
};

const SET_COVER_TOOL: Anthropic.Tool = {
  name: "set_cover_photo",
  description: "Cambia cuál foto es la portada de la ficha en revisión (solo durante el paso de fotos).",
  input_schema: {
    type: "object",
    properties: { index: { type: "number", description: "Número de la foto (1 = primera de la lista que se envió)." } },
    required: ["index"],
  },
};

const REMOVE_PHOTOS_TOOL: Anthropic.Tool = {
  name: "remove_gallery_photos",
  description: "Saca una o más fotos de la galería de la ficha en revisión (solo durante el paso de fotos) — para descartar fotos que no corresponden al auto.",
  input_schema: {
    type: "object",
    properties: {
      indexes: { type: "array", items: { type: "number" }, description: "Números de las fotos a sacar (ej: [3, 7])." },
    },
    required: ["indexes"],
  },
};

const PUBLISH_CAR_TOOL: Anthropic.Tool = {
  name: "publish_car",
  description: "Publica la ficha en revisión (la hace visible en el sitio) — solo cuando Francisco ya aprobó specs y fotos.",
  input_schema: { type: "object", properties: {} },
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

// ─── Revisión conversacional de specs/fotos (M3.2) ─────────────────────────────

async function appendToContext(phone: string, messages: ChatMessage[]): Promise<void> {
  const history = await loadAdminContext(phone);
  await saveAdminContext(phone, [...history, ...messages]);
}

interface GalleryImageDoc {
  _key: string;
  asset: { _type: "reference"; _ref: string };
}

async function approveSpecs(phone: string): Promise<string> {
  const state = await loadReviewState(phone);
  if (!state) return "No hay ninguna ficha en revisión ahora mismo.";
  if (state.step === "photos") return "Las specs ya estaban aprobadas — seguimos en la revisión de fotos.";

  const car = await sanity.fetch<{ galleryUrls: string[] } | null>(
    `*[_id == $id][0]{ "galleryUrls": gallery[].asset->url }`,
    { id: state.carId }
  );
  if (!car || !car.galleryUrls?.length) {
    return "No encontré fotos para mostrar en esta ficha — revisa en Studio directamente.";
  }

  const sent: ChatMessage[] = [];
  for (let i = 0; i < car.galleryUrls.length; i++) {
    const label = i === 0 ? "Foto 1 (portada actual)" : `Foto ${i + 1}`;
    await sendProactiveImage(phone, car.galleryUrls[i], label);
    sent.push({ role: "assistant", content: `[foto] ${label}` });
  }
  const instructions =
    `Responde "portada N" para cambiar la portada, los números de fotos a sacar (ej: 3,7), ` +
    `o LISTO si están todas bien y quieres publicar.`;
  await sendProactiveText(phone, instructions);
  sent.push({ role: "assistant", content: instructions });

  await saveReviewState(phone, { ...state, step: "photos" });
  await appendToContext(phone, sent);
  return "Fotos enviadas a Francisco para revisión — no agregues más texto, ya se mandó todo lo necesario.";
}

const NUMERIC_FIELDS = new Set(["basePrice", "discountPrice", "range", "batteryCapacity", "power"]);

async function updateSpec(phone: string, field: string, value: string): Promise<string> {
  const state = await loadReviewState(phone);
  if (!state) return "No hay ninguna ficha en revisión ahora mismo.";
  if (state.step !== "specs") return "Ya se aprobaron las specs — si igual quieres corregir algo, dímelo y lo hago, pero ya estamos revisando fotos.";
  if (!(EDITABLE_FIELDS as readonly string[]).includes(field)) {
    return `No puedo editar el campo "${field}" desde acá — corrígelo en Studio.`;
  }

  let parsedValue: string | number = value;
  if (NUMERIC_FIELDS.has(field)) {
    const num = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isNaN(num)) return `No entendí el valor "${value}" para ${field}.`;
    parsedValue = num;
  }
  await sanity.patch(state.carId).set({ [field]: parsedValue }).commit();
  return `Listo — actualicé ${field} a ${parsedValue}.`;
}

async function setCoverPhoto(phone: string, index: number): Promise<string> {
  const state = await loadReviewState(phone);
  if (!state) return "No hay ninguna ficha en revisión ahora mismo.";
  if (state.step !== "photos") return "Todavía no llegamos a la revisión de fotos.";
  const keys = state.galleryKeys;
  if (!Number.isInteger(index) || index < 1 || index > keys.length) {
    return `No hay una foto ${index} — hay ${keys.length} fotos en total.`;
  }
  const chosenKey = keys[index - 1];
  const car = await sanity.fetch<{ gallery: GalleryImageDoc[] } | null>(
    `*[_id == $id][0]{ gallery[]{_key, asset} }`,
    { id: state.carId }
  );
  const chosen = car?.gallery.find((g) => g._key === chosenKey);
  if (!chosen) return "Esa foto ya no está disponible — puede que la hayas sacado antes.";

  const rest = car!.gallery.filter((g) => g._key !== chosenKey);
  const newGallery = [chosen, ...rest];
  await sanity
    .patch(state.carId)
    .set({ mainImage: { _type: "image", asset: chosen.asset }, gallery: newGallery })
    .commit();
  await saveReviewState(phone, { ...state, galleryKeys: newGallery.map((g) => g._key) });
  return `Listo — la foto ${index} ahora es la portada.`;
}

async function removeGalleryPhotos(phone: string, indexes: number[]): Promise<string> {
  const state = await loadReviewState(phone);
  if (!state) return "No hay ninguna ficha en revisión ahora mismo.";
  if (state.step !== "photos") return "Todavía no llegamos a la revisión de fotos.";
  const keys = state.galleryKeys;
  const validIdx = [...new Set(indexes)].filter((i) => Number.isInteger(i) && i >= 1 && i <= keys.length);
  if (validIdx.length === 0) return `Ninguno de esos números es válido — hay ${keys.length} fotos.`;
  const keysToRemove = validIdx.map((i) => keys[i - 1]);
  const removingCover = keysToRemove.includes(keys[0]);

  await sanity
    .patch(state.carId)
    .unset(keysToRemove.map((k) => `gallery[_key=="${k}"]`))
    .commit();

  const remainingKeys = keys.filter((k) => !keysToRemove.includes(k));
  let coverNote = "";
  if (removingCover && remainingKeys.length > 0) {
    const car = await sanity.fetch<{ gallery: GalleryImageDoc[] } | null>(
      `*[_id == $id][0]{ gallery[]{_key, asset} }`,
      { id: state.carId }
    );
    if (car?.gallery.length) {
      await sanity.patch(state.carId).set({ mainImage: { _type: "image", asset: car.gallery[0].asset } }).commit();
      coverNote = " La portada pasó a ser la primera foto que quedó.";
    }
  }
  await saveReviewState(phone, { ...state, galleryKeys: remainingKeys });
  return `Listo — saqué ${keysToRemove.length} foto(s). Quedan ${remainingKeys.length}.${coverNote}`;
}

async function publishCar(phone: string): Promise<string> {
  const state = await loadReviewState(phone);
  if (!state) return "No hay ninguna ficha en revisión ahora mismo.";
  if (state.step !== "photos") return "Todavía falta aprobar las specs y revisar las fotos antes de publicar.";

  const car = await sanity.fetch<{ slug: string } | null>(`*[_id == $id][0]{ "slug": slug.current }`, { id: state.carId });
  await sanity.patch(state.carId).set({ hidden: false }).commit();
  await clearReviewState(phone);
  const publicUrl = car?.slug ? `${SITE_URL}/auto/${car.slug}` : SITE_URL;
  return `🎉 ${state.brand} ${state.model} ya está publicado: ${publicUrl}`;
}

async function triggerResearch(brand: string, model: string, phone: string): Promise<string> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return "No se pudo iniciar: falta configurar ADMIN_API_SECRET en el servidor.";
  try {
    // Vercel Authentication (Deployment Protection) bloquea llamadas servidor-a-servidor sin
    // sesión de browser, incluso en producción — se pasa el bypass generado en Vercel →
    // Settings → Deployment Protection → "Protection Bypass for Automation" para que esta
    // llamada interna no choque con esa capa (nada que ver con ADMIN_API_SECRET, que es nuestro
    // propio secreto de aplicación).
    const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    // ADMIN_API_BASE_URL permite apuntar esta llamada a otro lado (ej. http://localhost:3000
    // corriendo con ngrok/tunnel) — así una corrida local no queda igual atada al límite de
    // duración de la función en Vercel. Por defecto, producción.
    const baseUrl = process.env.ADMIN_API_BASE_URL ?? SITE_URL;
    const res = await fetch(`${baseUrl}/api/admin/pdp-research`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret,
        ...(bypassSecret ? { "x-vercel-protection-bypass": bypassSecret } : {}),
      },
      body: JSON.stringify({ brand, model, phone }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 202) return "queued";
    if (res.status === 200) {
      const body = await res.json().catch(() => null);
      if (body?.status === "duplicate") return `duplicate:${body.carId}`;
    }
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
      tools: [
        START_RESEARCH_TOOL,
        APPROVE_SPECS_TOOL,
        UPDATE_SPEC_TOOL,
        SET_COVER_TOOL,
        REMOVE_PHOTOS_TOOL,
        PUBLISH_CAR_TOOL,
        APPLY_PRICE_TOOL,
        RESTORE_CAR_TOOL,
        DISMISS_FLAG_TOOL,
      ],
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
      } else if (tu.name === "approve_specs") {
        result = await approveSpecs(phone);
      } else if (tu.name === "update_spec") {
        const input = tu.input as { field?: string; value?: string };
        result = await updateSpec(phone, (input.field ?? "").trim(), (input.value ?? "").trim());
      } else if (tu.name === "set_cover_photo") {
        result = await setCoverPhoto(phone, Number((tu.input as { index?: number }).index));
      } else if (tu.name === "remove_gallery_photos") {
        result = await removeGalleryPhotos(phone, (tu.input as { indexes?: number[] }).indexes ?? []);
      } else if (tu.name === "publish_car") {
        result = await publishCar(phone);
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
