/**
 * CLI local de verificación de vigencia/precio (Fase 1.2, Flujo B / M4). Corre el mismo motor
 * que usarán los crons (`app/api/cron/price-check-*`), útil para probar mientras el bot de
 * WhatsApp está en pausa.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/price-check.ts [--limit N] [--dry]
 *
 * Sin --dry, escribe priceCheckFlag/priceCheckNote/lastPriceCheckAt en Sanity (y oculta autos
 * que parezcan descontinuados). Toma los N autos con lastPriceCheckAt más antiguo (o nunca
 * revisados primero) — mismo criterio que el cron diario.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import { checkCarPricing, type CarToCheck } from "../lib/price-check/check";

const DRY_RUN = process.argv.includes("--dry");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 17;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("\nFalta ANTHROPIC_API_KEY en el entorno (.env.local o Vercel).\n");
  process.exit(1);
}
if (!process.env.SANITY_API_TOKEN) {
  console.error("\nFalta SANITY_API_TOKEN (con permiso de escritura) en el entorno.\n");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

async function main() {
  const cars = await sanity.fetch<CarToCheck[]>(
    `*[_type == "car" && hidden != true && !(_id in path("drafts.**"))] | order(coalesce(lastPriceCheckAt, "1970-01-01") asc) [0...$limit] {
      "id": _id, name, "brand": brand->name, basePrice, discountPrice
    }`,
    { limit: LIMIT }
  );

  if (cars.length === 0) {
    console.log("\nNo hay autos para revisar.\n");
    return;
  }

  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Revisando ${cars.length} auto(s)...\n`);

  const results = [];
  for (const car of cars) {
    const result = await checkCarPricing(car, { anthropic, sanity, dryRun: DRY_RUN, log: (l) => console.log(l) });
    results.push(result);
  }

  const discontinued = results.filter((r) => r.flag === "discontinued");
  const priceHigh = results.filter((r) => r.flag === "price_high");
  console.log(
    `\n${DRY_RUN ? "[DRY RUN] " : ""}▶ Resumen: ${results.length} revisados · ${discontinued.length} descontinuados · ${priceHigh.length} con precio alto · ${results.length - discontinued.length - priceHigh.length} sin novedad${DRY_RUN ? " (nada se escribió en Sanity)" : ""}\n`
  );
}

main().catch((err) => {
  console.error("\nError fatal:", err);
  process.exit(1);
});
