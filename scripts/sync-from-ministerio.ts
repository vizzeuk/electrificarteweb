/**
 * Sincroniza datos de autos en Sanity con el JSON oficial del Ministerio de Energía.
 * Campos actualizados: batteryCapacity, maxACChargingPower, maxDCChargingPower,
 *   chargeTimeAC, chargeTimeDC, basePrice, discountPrice.
 * También actualiza versiones si el auto las tiene, y las agrega si faltan.
 *
 * Uso: npx tsx --env-file=.env.local scripts/sync-from-ministerio.ts
 * Dry run (solo muestra cambios): npx tsx --env-file=.env.local scripts/sync-from-ministerio.ts --dry
 */

import { createClient } from "@sanity/client";
import fs from "fs";
import path from "path";

const DRY_RUN = process.argv.includes("--dry");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface MinisterioRow {
  marca: string;
  modelo: string;
  version: string;
  bateria_kWh: number | null;
  carga_ac: string | null;
  carga_dc: string | null;
  potencia_ac_kW: number | null;
  potencia_dc_kW: number | null;
  precio_clp: number | null;
  precio_descuento_clp: number | null;
  rendimientoUrbano: number | null;
  rendimientoCarretera: number | null;
  rendimientoMixto: number | null;
  rendimientoElectrico: number | null;
  rendimientoPonderadoCombustible: number | null;
  rendimientoPonderadoElectrico: number | null;
}

/** Elige el mejor valor de eficiencia eléctrica (km/kWh) del row */
function bestElectricRendimiento(row: MinisterioRow): number | null {
  return row.rendimientoElectrico ?? row.rendimientoPonderadoElectrico ?? null;
}

/** Elige el mejor valor de rendimiento en combustible (km/L) del row */
function bestFuelRendimiento(row: MinisterioRow): number | null {
  return row.rendimientoPonderadoCombustible ?? row.rendimientoMixto ?? row.rendimientoUrbano ?? null;
}

interface SanityCar {
  _id: string;
  name: string;
  brand: string;
  brandRaw: string;
  slug: string;
  batteryCapacity: number | null;
  maxACChargingPower: number | null;
  maxDCChargingPower: number | null;
  chargeTimeAC: string | null;
  chargeTimeDC: string | null;
  fuelConsumption: number | null;
  rendimientoElectrico: number | null;
  basePrice: number;
  discountPrice: number | null;
  versions: { _key: string; _type?: string; name: string; batteryCapacity?: number | null; maxACChargingPower?: number | null; maxDCChargingPower?: number | null; chargeTimeAC?: string | null; chargeTimeDC?: string | null; fuelConsumption?: number | null; rendimientoElectrico?: number | null; price?: number | null; discountPrice?: number | null }[];
}

// ─── Normalization ────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Brand name aliases to handle mismatches between Ministerio and Sanity
const BRAND_ALIASES: Record<string, string> = {
  "mercedes-benz": "mercedes",
  "mercedes benz": "mercedes",
  "lynk co": "lynk",
  "lynk & co": "lynk",
};

function normBrand(s: string): string {
  const n = norm(s);
  return BRAND_ALIASES[n] ?? n.split(" ")[0]; // use first word as key
}

function normModel(s: string): string {
  return norm(s);
}

// Score how well a ministerio row matches a Sanity car
function matchScore(car: SanityCar, row: MinisterioRow): number {
  const carBrand = normBrand(car.brandRaw);
  const rowBrand = normBrand(row.marca);
  if (carBrand !== rowBrand) return 0;

  const carModel = normModel(car.name);
  const rowModel = normModel(row.modelo);

  // Full model match
  if (carModel === rowModel) return 100;
  // One contains the other
  if (carModel.includes(rowModel) || rowModel.includes(carModel)) return 80;
  // Share significant tokens
  const carTokens = new Set(carModel.split(" ").filter(t => t.length > 2));
  const rowTokens = rowModel.split(" ").filter(t => t.length > 2);
  const shared = rowTokens.filter(t => carTokens.has(t)).length;
  if (shared > 0) return 40 + shared * 10;
  return 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no se escribirá nada en Sanity\n" : "🚀 Modo escritura activo\n");

  // Load Ministerio JSON
  const jsonPath = path.join(process.cwd(), "public", "JSON", "modelos.json");
  const ministerioData: MinisterioRow[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`📄 Ministerio JSON: ${ministerioData.length} filas\n`);

  // Fetch all cars from Sanity
  const sanityCars: SanityCar[] = await client.fetch(`
    *[_type == "car"] {
      _id, name, "slug": slug.current,
      "brandRaw": brand->name,
      "brand": brand->name,
      batteryCapacity, maxACChargingPower, maxDCChargingPower,
      chargeTimeAC, chargeTimeDC, fuelConsumption, rendimientoElectrico, basePrice, discountPrice,
      "versions": versions[]{ _key, _type, name, batteryCapacity, maxACChargingPower, maxDCChargingPower, chargeTimeAC, chargeTimeDC, fuelConsumption, rendimientoElectrico, price, discountPrice }
    }
  `);
  console.log(`🚗 Sanity: ${sanityCars.length} autos\n`);

  // Group Ministerio rows by (marca, modelo)
  const rowsByModel = new Map<string, MinisterioRow[]>();
  for (const row of ministerioData) {
    const key = `${norm(row.marca)}|${norm(row.modelo)}`;
    if (!rowsByModel.has(key)) rowsByModel.set(key, []);
    rowsByModel.get(key)!.push(row);
  }

  let updated = 0;
  let skipped = 0;
  let noMatch = 0;

  for (const car of sanityCars) {
    // Find best matching ministerio group
    let bestScore = 0;
    let bestRows: MinisterioRow[] = [];

    for (const [, rows] of rowsByModel) {
      const score = matchScore(car, rows[0]);
      if (score > bestScore) {
        bestScore = score;
        bestRows = rows;
      }
    }

    if (bestScore < 40) {
      console.log(`  ⚠️  Sin match: ${car.brandRaw} ${car.name} (slug: ${car.slug})`);
      noMatch++;
      continue;
    }

    console.log(`\n✅ Match (score ${bestScore}): ${car.brandRaw} ${car.name}  ←  ${bestRows[0].marca} ${bestRows[0].modelo}`);

    // Build patch for main car fields using the first row (or if single version, its data)
    const refRow = bestRows[0];
    const patch: Record<string, unknown> = {};
    const changes: string[] = [];

    const MIN_PRICE_CLP = 5_000_000; // sanity: below this is corrupt data

    function maybeSet(field: string, current: unknown, newVal: unknown) {
      if (newVal == null) return;
      // Reject obviously corrupt prices
      if ((field === "basePrice" || field === "discountPrice" || field === "price") &&
          typeof newVal === "number" && newVal < MIN_PRICE_CLP) {
        console.log(`  ⚠️  Precio ignorado (valor sospechoso): ${field} = ${newVal}`);
        return;
      }
      if (current !== newVal) {
        patch[field] = newVal;
        changes.push(`  ${field}: ${JSON.stringify(current)} → ${JSON.stringify(newVal)}`);
      }
    }

    // For cars with no versions (single config), update top-level fields from refRow
    if (!car.versions || car.versions.length === 0) {
      maybeSet("batteryCapacity",      car.batteryCapacity,      refRow.bateria_kWh);
      maybeSet("maxACChargingPower",   car.maxACChargingPower,   refRow.potencia_ac_kW);
      maybeSet("maxDCChargingPower",   car.maxDCChargingPower,   refRow.potencia_dc_kW);
      maybeSet("chargeTimeAC",         car.chargeTimeAC,         refRow.carga_ac);
      maybeSet("chargeTimeDC",         car.chargeTimeDC,         refRow.carga_dc);
      maybeSet("fuelConsumption",      car.fuelConsumption,      bestFuelRendimiento(refRow));
      maybeSet("rendimientoElectrico", car.rendimientoElectrico, bestElectricRendimiento(refRow));
      if (refRow.precio_clp != null) maybeSet("basePrice", car.basePrice, refRow.precio_clp);
      if (refRow.precio_descuento_clp != null) maybeSet("discountPrice", car.discountPrice, refRow.precio_descuento_clp);
    } else {
      // Car has versions — update/add versions based on Ministerio rows
      const updatedVersions = [...car.versions];
      let versionsChanged = false;

      for (const row of bestRows) {
        if (!row.version) continue;
        const rowVersionNorm = norm(row.version);

        // Try to find a matching existing version
        const existingIdx = updatedVersions.findIndex(v => {
          if (!v.name) return false;
          const vn = norm(v.name);
          return vn === rowVersionNorm || vn.includes(rowVersionNorm) || rowVersionNorm.includes(vn);
        });

        if (existingIdx >= 0) {
          const v = updatedVersions[existingIdx];
          const vPatch: Record<string, unknown> = { ...v, _type: v._type ?? "version" };
          let vChanged = false;

          function maybeSetV(field: string, current: unknown, newVal: unknown) {
            if (newVal == null) return;
            if ((field === "price" || field === "discountPrice") &&
                typeof newVal === "number" && newVal < MIN_PRICE_CLP) {
              changes.push(`  ⚠️  versions[${v.name}].${field} = ${newVal} ignorado (sospechoso)`);
              return;
            }
            if (current !== newVal) {
              vPatch[field] = newVal;
              changes.push(`  versions[${v.name}].${field}: ${JSON.stringify(current)} → ${JSON.stringify(newVal)}`);
              vChanged = true;
            }
          }

          maybeSetV("batteryCapacity",      v.batteryCapacity,      row.bateria_kWh);
          maybeSetV("maxACChargingPower",   v.maxACChargingPower,   row.potencia_ac_kW);
          maybeSetV("maxDCChargingPower",   v.maxDCChargingPower,   row.potencia_dc_kW);
          maybeSetV("chargeTimeAC",         v.chargeTimeAC,         row.carga_ac);
          maybeSetV("chargeTimeDC",         v.chargeTimeDC,         row.carga_dc);
          maybeSetV("fuelConsumption",      v.fuelConsumption,      bestFuelRendimiento(row));
          maybeSetV("rendimientoElectrico", v.rendimientoElectrico, bestElectricRendimiento(row));
          if (row.precio_clp != null) maybeSetV("price", v.price, row.precio_clp);
          if (row.precio_descuento_clp != null) maybeSetV("discountPrice", v.discountPrice, row.precio_descuento_clp);

          if (vChanged) {
            updatedVersions[existingIdx] = vPatch as typeof v;
            versionsChanged = true;
          }
        } else {
          // New version not in Sanity — add it
          const newVersion = {
            _key: `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            _type: "version",
            name: row.version,
            batteryCapacity:      row.bateria_kWh ?? undefined,
            maxACChargingPower:   row.potencia_ac_kW ?? undefined,
            maxDCChargingPower:   row.potencia_dc_kW ?? undefined,
            chargeTimeAC:         row.carga_ac ?? undefined,
            chargeTimeDC:         row.carga_dc ?? undefined,
            fuelConsumption:      bestFuelRendimiento(row) ?? undefined,
            rendimientoElectrico: bestElectricRendimiento(row) ?? undefined,
            price:                row.precio_clp ?? undefined,
            discountPrice:        row.precio_descuento_clp ?? undefined,
          };
          updatedVersions.push(newVersion);
          changes.push(`  ➕ Nueva versión: "${row.version}"`);
          versionsChanged = true;
        }
      }

      // Also update top-level car fields from first row if missing
      maybeSet("batteryCapacity",      car.batteryCapacity,      refRow.bateria_kWh);
      maybeSet("maxACChargingPower",   car.maxACChargingPower,   refRow.potencia_ac_kW);
      maybeSet("maxDCChargingPower",   car.maxDCChargingPower,   refRow.potencia_dc_kW);
      maybeSet("chargeTimeAC",         car.chargeTimeAC,         refRow.carga_ac);
      maybeSet("chargeTimeDC",         car.chargeTimeDC,         refRow.carga_dc);
      maybeSet("fuelConsumption",      car.fuelConsumption,      bestFuelRendimiento(refRow));
      maybeSet("rendimientoElectrico", car.rendimientoElectrico, bestElectricRendimiento(refRow));
      if (refRow.precio_clp != null) maybeSet("basePrice", car.basePrice, refRow.precio_clp);

      if (versionsChanged) patch["versions"] = updatedVersions;
    }

    if (Object.keys(patch).length === 0) {
      console.log("  (sin cambios)");
      skipped++;
      continue;
    }

    console.log("  Cambios:");
    changes.forEach(c => console.log(c));

    if (!DRY_RUN) {
      await client.patch(car._id).set(patch).commit();
      console.log("  ✔ Guardado en Sanity");
    }
    updated++;
  }

  console.log(`\n── Resumen ──────────────────────────────`);
  console.log(`  Actualizados:    ${updated}`);
  console.log(`  Sin cambios:     ${skipped}`);
  console.log(`  Sin match JSON:  ${noMatch}`);
  if (DRY_RUN) { console.log("\n  (Dry run — nada fue escrito)"); return; }

  // Purge Next.js ISR cache so pages reflect the new data immediately
  const siteUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && updated > 0) {
    console.log(`\n🔄 Purgando caché ISR en ${siteUrl}...`);
    try {
      const res = await fetch(`${siteUrl}/api/revalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _type: "car" }),
      });
      const json = await res.json().catch(() => ({}));
      console.log(`  ✔ Revalidado: ${JSON.stringify(json)}`);
    } catch (e) {
      console.log(`  ⚠️  No se pudo purgar el caché: ${e}`);
    }
  } else if (updated > 0) {
    console.log(`\n⚠️  Agrega SITE_URL=https://tu-dominio.com en .env.local para purgar el caché automáticamente.`);
    console.log(`   O llama manualmente: curl -X POST https://tu-dominio.com/api/revalidate -H 'Content-Type: application/json' -d '{"_type":"car"}'`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
