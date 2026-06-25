/**
 * Diagnóstico completo de autos: versiones y specs.
 *
 * Detecta:
 * 1. Versiones con specs idénticas (clon de otra versión)
 * 2. Autos con una sola versión (posibles candidatos a ampliar)
 * 3. Versiones con specs críticos vacíos (range, power, batteryCapacity, price)
 * 4. Autos sin versiones
 *
 * Uso: npx tsx --env-file=.env.local scripts/diagnostico-versiones.ts
 */

import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const SPEC_KEYS = [
  "batteryCapacity", "range", "power", "torque", "acceleration",
  "topSpeed", "traction", "maxDCChargingPower", "maxACChargingPower",
  "seats", "trunkCapacity", "fuelConsumption", "transmission",
] as const;

type SpecKey = typeof SPEC_KEYS[number];

interface Version {
  name?: string;
  price?: number;
  batteryCapacity?: number;
  range?: number;
  power?: number;
  torque?: number;
  acceleration?: number;
  topSpeed?: number;
  traction?: string;
  maxDCChargingPower?: number;
  maxACChargingPower?: number;
  seats?: number;
  trunkCapacity?: number;
  motorDescription?: string;
  electricRangeKm?: number;
  fuelConsumption?: number;
  transmission?: string;
}

interface Car {
  _id: string;
  name: string;
  brandName: string;
  electricType: string;
  versions: Version[];
  range?: number;
  power?: number;
  batteryCapacity?: number;
  basePrice?: number;
}

async function main() {
  const cars: Car[] = await client.fetch(`
    *[_type == "car" && hidden != true && !(_id in path("drafts.**"))] | order(brand->name asc, name asc) {
      _id,
      name,
      "brandName": brand->name,
      "electricType": electricType->name,
      basePrice,
      range,
      power,
      batteryCapacity,
      versions[] {
        name,
        price,
        batteryCapacity,
        range,
        electricRangeKm,
        power,
        torque,
        acceleration,
        topSpeed,
        traction,
        maxDCChargingPower,
        maxACChargingPower,
        seats,
        trunkCapacity,
        motorDescription,
        fuelConsumption,
        transmission,
      }
    }
  `);

  console.log(`\n════════════════════════════════════════════════════════`);
  console.log(`  DIAGNÓSTICO DE AUTOS — Electrificarte`);
  console.log(`  Total autos analizados: ${cars.length}`);
  console.log(`════════════════════════════════════════════════════════\n`);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function specFingerprint(v: Version): string {
    return SPEC_KEYS.map(k => `${k}:${v[k] ?? "null"}`).join("|");
  }

  // Tipos eléctricos que NO tienen autonomía EV ni batería kWh como spec relevante
  const NO_EV_TYPES = new Set(["HEV", "MHEV", "Mild-Hybrid", "Full Hybrid"]);

  function missingCritical(v: Version, electricType: string): string[] {
    const missing: string[] = [];
    if (!v.price) missing.push("precio");
    if (!v.power) missing.push("potencia");
    // Para HEV/MHEV: autonomía y batería kWh no aplican
    const isHev = NO_EV_TYPES.has(electricType);
    if (!isHev) {
      if (!v.range && !v.batteryCapacity) {
        // PHEV/REEV: necesita al menos electricRangeKm o range; BEV necesita range
        if (!(v as any).electricRangeKm) missing.push("autonomía");
        if (!v.batteryCapacity)           missing.push("batería kWh");
      } else {
        if (!v.range && !(v as any).electricRangeKm) missing.push("autonomía");
        if (!v.batteryCapacity)                       missing.push("batería kWh");
      }
    }
    return missing;
  }

  // ── Resultados agrupados ──────────────────────────────────────────────────
  const sinVersiones:   Car[] = [];
  const unaVersion:     Car[] = [];
  const versionsClon:   { car: Car; dupes: string[] }[] = [];
  const specVacios:     { car: Car; vName: string; missing: string[] }[] = [];

  for (const car of cars) {
    const versions = car.versions ?? [];

    if (versions.length === 0) {
      sinVersiones.push(car);
      continue;
    }

    if (versions.length === 1) {
      unaVersion.push(car);
    }

    // Detectar versiones con specs idénticas
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const v of versions) {
      const fp = specFingerprint(v);
      const all_null = SPEC_KEYS.every(k => v[k] == null);
      if (all_null) continue; // no tiene specs, se reporta aparte
      if (seen.has(fp)) {
        dupes.push(`"${v.name}" ≡ "${seen.get(fp)}"`);
      } else {
        seen.set(fp, v.name ?? "sin nombre");
      }
    }
    if (dupes.length > 0) {
      versionsClon.push({ car, dupes });
    }

    // Detectar specs críticos vacíos por versión
    for (const v of versions) {
      const missing = missingCritical(v, car.electricType ?? "");
      if (missing.length > 0) {
        specVacios.push({ car, vName: v.name ?? "sin nombre", missing });
      }
    }
  }

  // ── Reporte ───────────────────────────────────────────────────────────────

  console.log(`❌ AUTOS SIN VERSIONES (${sinVersiones.length})`);
  console.log(`─────────────────────────────────────────`);
  if (sinVersiones.length === 0) {
    console.log("  Ninguno ✅");
  } else {
    for (const c of sinVersiones) {
      console.log(`  • ${c.brandName} ${c.name}`);
    }
  }

  console.log(`\n⚠️  VERSIONES CON SPECS IDÉNTICAS — posibles clones (${versionsClon.length} autos)`);
  console.log(`─────────────────────────────────────────`);
  if (versionsClon.length === 0) {
    console.log("  Ninguno ✅");
  } else {
    for (const { car, dupes } of versionsClon) {
      console.log(`  • ${car.brandName} ${car.name}:`);
      for (const d of dupes) console.log(`      → ${d}`);
    }
  }

  console.log(`\n📋 AUTOS CON UNA SOLA VERSIÓN — revisar si faltan (${unaVersion.length})`);
  console.log(`─────────────────────────────────────────`);
  for (const c of unaVersion) {
    const v = c.versions[0];
    console.log(`  • ${c.brandName} ${c.name}  [versión: "${v.name ?? "sin nombre"}" | precio: ${v.price ? `$${v.price.toLocaleString("es-CL")}` : "❌ sin precio"}]`);
  }

  console.log(`\n🔴 SPECS CRÍTICOS VACÍOS POR VERSIÓN (${specVacios.length} versiones)`);
  console.log(`─────────────────────────────────────────`);
  if (specVacios.length === 0) {
    console.log("  Ninguno ✅");
  } else {
    let lastCar = "";
    for (const { car, vName, missing } of specVacios) {
      const label = `${car.brandName} ${car.name}`;
      if (label !== lastCar) {
        console.log(`  • ${label}:`);
        lastCar = label;
      }
      console.log(`      → "${vName}" — falta: ${missing.join(", ")}`);
    }
  }

  // ── Resumen ejecutivo ─────────────────────────────────────────────────────
  const totalVersiones = cars.reduce((s, c) => s + (c.versions?.length ?? 0), 0);
  const totalVersionesConProblemas = new Set([
    ...versionsClon.map(x => x.car._id),
    ...specVacios.map(x => x.car._id),
    ...sinVersiones.map(c => c._id),
  ]).size;

  console.log(`\n════════════════════════════════════════════════════════`);
  console.log(`  RESUMEN EJECUTIVO`);
  console.log(`────────────────────────────────────────────────────────`);
  console.log(`  Total autos:              ${cars.length}`);
  console.log(`  Total versiones:          ${totalVersiones}`);
  console.log(`  Sin versiones:            ${sinVersiones.length}`);
  console.log(`  Con versiones clon:       ${versionsClon.length}`);
  console.log(`  Con una sola versión:     ${unaVersion.length}`);
  console.log(`  Versiones con spec vacío: ${specVacios.length}`);
  console.log(`  Autos con algún problema: ${totalVersionesConProblemas}`);
  console.log(`════════════════════════════════════════════════════════\n`);

  // ── Lista para investigar (prioridad alta) ────────────────────────────────
  const prioritySet = new Set([
    ...versionsClon.map(x => `${x.car.brandName} ${x.car.name}`),
    ...sinVersiones.map(c => `${c.brandName} ${c.name}`),
  ]);
  if (prioritySet.size > 0) {
    console.log(`🎯 LISTA DE PRIORIDAD ALTA (investigar primero):`);
    for (const label of prioritySet) console.log(`  • ${label}`);
    console.log();
  }
}

main().catch(console.error);
