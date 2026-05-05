/**
 * Repara versiones con _type: null en todos los autos de Sanity.
 * El script sync-from-ministerio.ts no preservaba _type al reemplazar el array.
 *
 * Uso: npx tsx --env-file=.env.local scripts/fix-version-types.ts
 * Dry run: npx tsx --env-file=.env.local scripts/fix-version-types.ts --dry
 */

import { createClient } from "@sanity/client";

const DRY_RUN = process.argv.includes("--dry");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN\n" : "🚀 Modo escritura\n");

  const cars = await client.fetch(`
    *[_type == "car" && count(versions[!defined(_type) || _type == null]) > 0] {
      _id, name, "brand": brand->name,
      "versions": versions[]{ _key, _type, name, batteryCapacity, maxACChargingPower, maxDCChargingPower, chargeTimeAC, chargeTimeDC, price, discountPrice }
    }
  `);

  console.log(`Autos con versiones sin _type: ${cars.length}\n`);

  let fixed = 0;
  for (const car of cars) {
    const badCount = car.versions.filter((v: any) => !v._type).length;
    console.log(`  ${car.brand} ${car.name} — ${badCount} versiones sin _type`);

    const repairedVersions = car.versions.map((v: any) => ({
      ...v,
      _type: v._type ?? "version",
    }));

    if (!DRY_RUN) {
      await client.patch(car._id).set({ versions: repairedVersions }).commit();
      console.log(`    ✔ Reparado`);
    }
    fixed++;
  }

  console.log(`\n── Resumen ──`);
  console.log(`  Autos reparados: ${fixed}`);
  if (DRY_RUN) console.log("  (Dry run — nada fue escrito)");
}

main().catch(err => { console.error(err); process.exit(1); });
