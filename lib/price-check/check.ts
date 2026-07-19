/**
 * M4 (Fase 1.2, Flujo B) — revisa un auto ya publicado contra su sitio oficial en Chile: ¿sigue
 * vendiéndose? ¿nuestro precio sigue siendo mejor que el oficial? Escribe el resultado en el
 * propio documento car (priceCheckFlag/priceCheckNote/lastPriceCheckAt) — nunca cambia el precio
 * solo, solo lo sugiere; el auto se oculta automáticamente si parece descontinuado (reversible).
 *
 * Mismo patrón de búsqueda web + filtro .cl que lib/pdp-research/research.ts, pero sin Playwright
 * — solo necesita confirmar precio/vigencia, no scrapear ficha técnica completa ni fotos.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { createClient } from "@sanity/client";
import { isChileConfirmedUrl } from "@/lib/chile-url";

type SanityClientInstance = ReturnType<typeof createClient>;

export interface PriceCheckContext {
  anthropic: Anthropic;
  sanity: SanityClientInstance;
  dryRun?: boolean;
  log?: (line: string) => void;
}

export interface CarToCheck {
  id: string;
  name: string;
  brand: string;
  basePrice?: number | null;
  discountPrice?: number | null;
}

export interface PriceCheckResult {
  carId: string;
  name: string;
  brand: string;
  flag: "none" | "price_high" | "discontinued";
  note?: string;
  suggestedPrice?: number;
}

const MODEL = "claude-sonnet-5";
const MAX_SEARCH_USES = 4;
const UNDERCUT_RATIO = 0.95; // regla de negocio: 5% bajo el precio oficial vigente
// Piso de plausibilidad: ningún auto electrificado nuevo en Chile cuesta menos que esto — un
// precio por debajo probablemente viene de una mala lectura (ej. un artículo de prensa sin lista
// de precios, de donde se extrajo un número que no era el precio). Visto en la práctica: un
// "precio oficial" de $151.900 sacado de un newsroom en vez de la página de precios real.
const MIN_PLAUSIBLE_PRICE = 3_000_000;

const CHECK_SYSTEM_PROMPT =
  `Verificas si un modelo de auto sigue vendiéndose oficialmente en Chile HOY, y cuál es su ` +
  `precio de lista oficial vigente. SOLO sitios oficiales de la marca (dominio .cl, o contenido ` +
  `que confirme explícitamente el mercado chileno). Nunca marketplaces de terceros, foros, ni ` +
  `portales de reventa. Si el modelo ya no aparece en el catálogo oficial vigente (aunque haya ` +
  `existido antes), o no encuentras una fuente oficial confiable, repórtalo con found:false — ` +
  `no inventes un precio ni una URL. Cuidado con sitios regionales genéricos (LatAm) que no son ` +
  `específicos de Chile aunque estén en español. El precio SOLO debe venir de una página de ` +
  `precios/configurador/ficha de venta real — nunca de un newsroom, nota de prensa, o artículo ` +
  `de noticias (esos suelen mencionar cifras que no son el precio de lista: bonos, cuotas, ` +
  `otros mercados). Si solo encuentras noticias pero ninguna página de precios, reporta found:true ` +
  `(el modelo sigue vigente) pero omite el campo price.`;

interface StatusReport {
  found: boolean;
  price?: number;
  url?: string;
  note?: string;
}

async function findCurrentOfficialStatus(ctx: PriceCheckContext, brand: string, model: string): Promise<StatusReport> {
  const response = await ctx.anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: CHECK_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Marca: ${brand}\nModelo: ${model}\nPaís: Chile` }],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: MAX_SEARCH_USES,
        user_location: { type: "approximate", country: "CL" },
      },
      {
        name: "report_status",
        description: "Reporta el resultado final de la verificación de vigencia y precio.",
        input_schema: {
          type: "object",
          properties: {
            found: { type: "boolean", description: "true si el modelo sigue en el catálogo oficial vigente en Chile." },
            price: { type: "number", description: "Precio de lista oficial actual en CLP. Solo si found:true y el precio está explícito." },
            url: { type: "string", description: "URL oficial (.cl) donde se confirmó. Solo si found:true." },
            note: { type: "string", description: "Nota breve — motivo si found:false, o cualquier ambigüedad relevante." },
          },
          required: ["found"],
        },
      },
    ],
  });

  const block = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "report_status"
  );
  if (!block) return { found: false, note: "El modelo no llamó a report_status." };

  const input = block.input as StatusReport;
  const isChileUrl = input.url && isChileConfirmedUrl(input.url);

  if (input.url && !isChileUrl) {
    return { found: false, note: `Fuente descartada por no confirmar mercado Chile: ${input.url}` };
  }
  if (input.price && input.price < MIN_PLAUSIBLE_PRICE) {
    // Precio implausible (probable mala lectura, ej. de un newsroom sin lista de precios) —
    // se mantiene found:true (el modelo sí sigue vigente) pero sin precio para comparar.
    return { ...input, price: undefined, note: `${input.note ?? ""} (precio ignorado por implausible: $${input.price.toLocaleString("es-CL")})`.trim() };
  }
  return input;
}

export async function checkCarPricing(car: CarToCheck, ctx: PriceCheckContext): Promise<PriceCheckResult> {
  ctx.log?.(`▶ Revisando ${car.brand} ${car.name}...`);
  const status = await findCurrentOfficialStatus(ctx, car.brand, car.name);
  const nowIso = new Date().toISOString();
  const fecha = new Date().toLocaleDateString("es-CL");

  if (!status.found) {
    const note = `No se encontró en sitios oficiales el ${fecha}.${status.note ? ` ${status.note}` : ""}`;
    ctx.log?.(`  🔴 Posiblemente descontinuado — ${note}`);
    if (!ctx.dryRun) {
      await ctx.sanity
        .patch(car.id)
        .set({ hidden: true, priceCheckFlag: "discontinued", priceCheckNote: note, lastPriceCheckAt: nowIso })
        .unset(["priceCheckSuggestedPrice"])
        .commit();
    }
    return { carId: car.id, name: car.name, brand: car.brand, flag: "discontinued", note };
  }

  const ourPrice = car.discountPrice ?? car.basePrice ?? 0;

  if (!status.price || ourPrice <= 0) {
    ctx.log?.(`  ⚪ Vigente, sin precio comparable (oficial o nuestro no disponible) — sin acción.`);
    if (!ctx.dryRun) {
      // Confirmar vigencia limpia cualquier flag viejo (ej. un "discontinued" de una corrida
      // anterior que ya no aplica) — sin esto quedaba una etiqueta obsoleta pese a estar vigente.
      await ctx.sanity
        .patch(car.id)
        .set({ priceCheckFlag: "none", lastPriceCheckAt: nowIso })
        .unset(["priceCheckNote", "priceCheckSuggestedPrice"])
        .commit();
    }
    return { carId: car.id, name: car.name, brand: car.brand, flag: "none" };
  }

  const suggested = Math.round(status.price * UNDERCUT_RATIO);

  if (ourPrice > suggested) {
    const note =
      `Oficial: $${status.price.toLocaleString("es-CL")} · Nuestro: $${ourPrice.toLocaleString("es-CL")} · ` +
      `Sugerido (5% bajo oficial): $${suggested.toLocaleString("es-CL")} · Fuente: ${status.url ?? "—"}`;
    ctx.log?.(`  🟡 Precio sobre el oficial — ${note}`);
    if (!ctx.dryRun) {
      await ctx.sanity
        .patch(car.id)
        .set({ priceCheckFlag: "price_high", priceCheckNote: note, priceCheckSuggestedPrice: suggested, lastPriceCheckAt: nowIso })
        .commit();
    }
    return { carId: car.id, name: car.name, brand: car.brand, flag: "price_high", note, suggestedPrice: suggested };
  }

  ctx.log?.(`  ✓ Vigente y precio ok.`);
  if (!ctx.dryRun) {
    await ctx.sanity
      .patch(car.id)
      .set({ priceCheckFlag: "none", lastPriceCheckAt: nowIso })
      .unset(["priceCheckNote", "priceCheckSuggestedPrice"])
      .commit();
  }
  return { carId: car.id, name: car.name, brand: car.brand, flag: "none" };
}
