/**
 * Aplica a Sanity las specs investigadas que quedaron en
 * data/scrape/<slug>/car-specs.json (range, batteryCapacity, power,
 * electricRangeKm, fuelConsumption).
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/patch-car-specs.ts --dry
 *   npx tsx --env-file=.env.local scripts/patch-car-specs.ts
 *
 * Solo escribe campos numéricos válidos. También actualiza data/autos-nuevos.json
 * para mantener el JSON fuente consistente.
 */

import { createClient } from "@sanity/client";
import * as fs from "fs";
import * as path from "path";

const DRY_RUN = process.argv.includes("--dry");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const ALLOWED = ["range", "batteryCapacity", "power", "electricRangeKm", "fuelConsumption"];
const SCRAPE_DIR = path.resolve(__dirname, "../data/scrape");
const JSON_PATH = path.resolve(__dirname, "../data/autos-nuevos.json");

async function run() {
  const cars = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  const bySlug = new Map<string, Record<string, unknown>>(cars.map((c: { slug: string }) => [c.slug, c]));

  const dirs = fs.readdirSync(SCRAPE_DIR).filter((d) => fs.existsSync(path.join(SCRAPE_DIR, d, "car-specs.json")));
  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}${dirs.length} archivos car-specs.json encontrados\n`);

  let patched = 0;
  for (const slug of dirs) {
    const raw = JSON.parse(fs.readFileSync(path.join(SCRAPE_DIR, slug, "car-specs.json"), "utf-8"));
    // Solo campos permitidos, numéricos y positivos
    const fields: Record<string, number> = {};
    for (const k of ALLOWED) {
      const v = raw[k];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) fields[k] = v;
    }
    if (Object.keys(fields).length === 0) continue;

    const id = await client.fetch<string | null>(
      `*[_type == "car" && slug.current == $slug && !(_id in path("drafts.**"))][0]._id`,
      { slug }
    );
    if (!id) {
      console.log(`  ? no encontrado en Sanity: ${slug}`);
      continue;
    }

    console.log(`  ${DRY_RUN ? "·" : "✓"} ${slug} → ${JSON.stringify(fields)}`);
    if (!DRY_RUN) {
      await client.patch(id).set(fields).commit();
      const src = bySlug.get(slug);
      if (src) Object.assign(src, fields);
    }
    patched++;
  }

  if (!DRY_RUN) fs.writeFileSync(JSON_PATH, JSON.stringify(cars, null, 2));
  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Listo — ${patched} autos con specs aplicadas\n`);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
