// Cron diario: revisa un lote rotativo de autos (los de lastPriceCheckAt más antiguo) contra su
// sitio oficial en Chile — vigencia + precio. No manda WhatsApp (eso lo hace price-check-digest,
// semanal) — solo actualiza priceCheckFlag/priceCheckNote/lastPriceCheckAt en Sanity.
// Fase 1.2, Flujo B (M4). Ver docs/HANDOFF.md sección 5 y el plan de M4.
//
// Seguridad: mismo patrón que app/api/cron/asesoria-reminder/route.ts — Vercel Cron manda
// `Authorization: Bearer <CRON_SECRET>`; fail-closed si no está configurado.

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import { checkCarPricing, type CarToCheck } from "@/lib/price-check/check";

export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH_SIZE = 17; // ~120 autos / 7 días ≈ revisión semanal por auto en promedio
const CONCURRENCY = 3; // no saturar el rate limit de Anthropic

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function runBatch<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    results.push(...(await Promise.all(chunk.map(fn))));
  }
  return results;
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY || !process.env.SANITY_API_TOKEN) {
    return Response.json({ error: "Faltan credenciales del servidor" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sanity = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2025-01-01",
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
  });

  const cars = await sanity.fetch<CarToCheck[]>(
    `*[_type == "car" && hidden != true && !(_id in path("drafts.**"))] | order(coalesce(lastPriceCheckAt, "1970-01-01") asc) [0...$limit] {
      "id": _id, name, "brand": brand->name, basePrice, discountPrice
    }`,
    { limit: BATCH_SIZE }
  );

  const results = await runBatch(cars, CONCURRENCY, (car) =>
    checkCarPricing(car, { anthropic, sanity, log: (l) => console.log(`[price-check-scan] ${l}`) }).catch((err) => {
      console.error(`[price-check-scan] error en ${car.brand} ${car.name}:`, err);
      return { carId: car.id, name: car.name, brand: car.brand, flag: "none" as const };
    })
  );

  const summary = {
    checked: results.length,
    discontinued: results.filter((r) => r.flag === "discontinued").length,
    priceHigh: results.filter((r) => r.flag === "price_high").length,
  };
  console.log("[cron price-check-scan]", summary);
  return Response.json(summary);
}
