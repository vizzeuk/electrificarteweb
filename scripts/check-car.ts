/// <reference types="node" />
/**
 * Diagnóstico de calidad de datos por versión.
 *
 * Muestra qué specs tiene y qué le falta cada versión de cada auto.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/check-car.ts              # todos los autos
 *   npx tsx --env-file=.env.local scripts/check-car.ts bmw          # filtrar por marca
 *   npx tsx --env-file=.env.local scripts/check-car.ts --missing    # solo los que tienen versiones vacías
 */

import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const FILTER_BRAND  = process.argv.find((a: string) => !a.startsWith("-") && !a.includes("/") && !a.includes("tsx"))?.toLowerCase();
const ONLY_MISSING  = process.argv.includes("--missing");

const SPEC_FIELDS = ["batteryCapacity", "range", "power", "traction", "acceleration", "topSpeed",
  "torque", "chargeTimeDC", "chargeTimeAC", "fuelConsumption", "rendimientoElectrico", "electricRangeKm"] as const;

async function main() {
  const cars = await client.fetch(`
    *[_type == "car" && count(versions) > 0] | order(brand->name asc, name asc) {
      _id,
      name,
      "brand": brand->name,
      "slug": slug.current,
      batteryCapacity, range, power, traction, acceleration, topSpeed,
      torque, chargeTimeDC, chargeTimeAC, fuelConsumption, rendimientoElectrico, electricRangeKm,
      "versions": versions[]{
        _key, _type, name, price, discountPrice,
        batteryCapacity, range, power, traction, acceleration, topSpeed,
        torque, chargeTimeDC, chargeTimeAC, fuelConsumption, rendimientoElectrico, electricRangeKm
      }
    }
  `);

  const filtered = FILTER_BRAND
    ? cars.filter((c: any) => c.brand?.toLowerCase().includes(FILTER_BRAND))
    : cars;

  console.log(`\n📊 Autos con versiones: ${cars.length} total, ${filtered.length} mostrados\n`);
  console.log("─".repeat(80));

  let carsWithBadVersions = 0;

  for (const car of filtered) {
    const versions = car.versions ?? [];
    if (versions.length === 0) continue;

    // For each spec field, check if ALL versions share the same value (or all null)
    const fieldStatus: Record<string, string> = {};
    for (const field of SPEC_FIELDS) {
      const vals = versions.map((v: any) => v[field] ?? null);
      const nonNull = vals.filter((v: any) => v !== null);
      const unique  = new Set(nonNull.map((v: any) => JSON.stringify(v)));

      if (nonNull.length === 0) {
        fieldStatus[field] = "❌ sin datos (usa fallback del auto)";
      } else if (unique.size === 1 && nonNull.length === versions.length) {
        fieldStatus[field] = `✅ set en todas (${nonNull[0]})`;
      } else if (unique.size === 1) {
        fieldStatus[field] = `⚠️  solo ${nonNull.length}/${versions.length} versiones tienen datos`;
      } else {
        fieldStatus[field] = `✅ diferente por versión (${[...unique].join(", ")})`;
      }
    }

    const hasMissing = Object.values(fieldStatus).some(s => s.startsWith("❌") || s.startsWith("⚠️"));
    if (ONLY_MISSING && !hasMissing) continue;

    carsWithBadVersions += hasMissing ? 1 : 0;

    console.log(`\n🚗 ${car.brand} ${car.name}  [${car.slug}]`);
    console.log(`   ${versions.length} versiones: ${versions.map((v: any) => v.name ?? "sin nombre").join(" | ")}`);

    // Show version prices
    const priceLine = versions.map((v: any) => `${v.name}: ${v.price ? `$${(v.price/1e6).toFixed(1)}M` : "sin precio"}`).join(" · ");
    console.log(`   Precios: ${priceLine}`);

    // Show field status (only interesting ones)
    const interestingFields = Object.entries(fieldStatus).filter(([, s]) => !s.startsWith("✅ set en todas"));
    if (interestingFields.length === 0) {
      console.log(`   ✅ Todos los campos tienen datos por versión`);
    } else {
      for (const [field, status] of interestingFields) {
        console.log(`   ${field}: ${status}`);
      }
    }
  }

  console.log("\n" + "─".repeat(80));
  console.log(`\n📋 Resumen:`);
  console.log(`   Autos con versiones: ${filtered.length}`);
  console.log(`   Con datos faltantes: ${carsWithBadVersions}`);

  if (FILTER_BRAND) {
    console.log(`\n💡 Tip: ejecuta sin filtro de marca para ver todos los autos`);
  } else {
    console.log(`\n💡 Tip: usa --missing para ver solo los autos con versiones incompletas`);
    console.log(`   Usa un argumento de texto para filtrar por marca. Ej: "bmw" o "hyundai"`);
  }
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
