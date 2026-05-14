/// <reference types="node" />
/**
 * Rellena specs faltantes en versiones de autos desde datos investigados por agentes web.
 * SOLO escribe campos que están null/undefined — nunca sobreescribe datos existentes.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/patch-version-specs.ts          # dry-run
 *   npx tsx --env-file=.env.local scripts/patch-version-specs.ts --commit  # escribe a Sanity
 */

import { createClient } from "@sanity/client";

const DRY_RUN = !process.argv.includes("--commit");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   "production",
  apiVersion: "2025-01-01",
  token:     process.env.SANITY_API_TOKEN,
  useCdn:    false,
});

interface VersionSpecs {
  range?:        number | null;
  power?:        number | null;
  traction?:     string | null;
  acceleration?: number | null;
  topSpeed?:     number | null;
  torque?:       number | null;
}

// ── Mapping: carSlug → versionName → specs ──────────────────────────────────
// Version names must match EXACTLY what's in Sanity (case-sensitive)
const SPECS_MAP: Record<string, Record<string, VersionSpecs>> = {

  // ── AUDI ──────────────────────────────────────────────────────────────────
  "audi-q6-e-tron": {
    "Q6 E-tron 45":               { range: 530, power: 252, traction: "RWD", acceleration: 7.0,  topSpeed: 210, torque: 450  },
    "Q6 E-tron 50 Sport":         { range: 641, power: 326, traction: "RWD", acceleration: 6.6,  topSpeed: 210, torque: 485  },
    "Q6 E-tron 55 Sport Quattro": { range: 625, power: 388, traction: "AWD", acceleration: 5.9,  topSpeed: 210, torque: 855  },
  },

  // ── BMW ───────────────────────────────────────────────────────────────────
  "bmw-ix-xdrive40-atelier": {
    "iX xDrive40 Atelier": { range: 425, power: 326, traction: "AWD", acceleration: 6.1, topSpeed: 200, torque: 630 },
    "iX xDrive40 suite":   { range: 425, power: 326, traction: "AWD", acceleration: 6.1, topSpeed: 200, torque: 630 },
    "iX xDrive50 Atelier": { range: 549, power: 523, traction: "AWD", acceleration: 4.6, topSpeed: 200, torque: 765 },
    "iX xDrive50 suite":   { range: 549, power: 523, traction: "AWD", acceleration: 4.6, topSpeed: 200, torque: 765 },
  },
  "bmw-ix1-xdrive30-xline": {
    "iX1 eDrive20 xLine":  { range: 430, power: 204, traction: "FWD", acceleration: 8.3, topSpeed: 170, torque: 247 },
    "iX1 xDrive30 xLine":  { range: 440, power: 313, traction: "AWD", acceleration: 5.6, topSpeed: 180, torque: 494 },
  },

  // ── BYD ───────────────────────────────────────────────────────────────────
  "byd-dolphin-mini": {
    "Dolphin Mini Standard": { range: null, power: 75,  traction: "FWD", acceleration: 13.0, topSpeed: 130, torque: 135 },
  },
  "byd-han": {
    "Han AWD":    { range: 521, power: 517, traction: "AWD", acceleration: 3.9, topSpeed: 180, torque: 700 },
    "Han EV RWD": { range: 521, power: 245, traction: "FWD", acceleration: 7.9, topSpeed: 185, torque: 350 },
  },
  "byd-seal": {
    "Seal Standard":          { range: 460, power: 204, traction: "RWD", acceleration: 7.5, topSpeed: 180, torque: 310 },
    "Seal Excellence AWD":    { range: 520, power: 530, traction: "AWD", acceleration: 3.8, topSpeed: 180, torque: 670 },
    "Seal Excellence Ultra AWD": { range: 520, power: 530, traction: "AWD", acceleration: 3.8, topSpeed: 180, torque: 670 },
  },
  "byd-tang": {
    "Tang EV AWD": { range: 530, power: 517, traction: "AWD", acceleration: 4.9, topSpeed: 190, torque: 700 },
  },

  // ── CHANGAN ───────────────────────────────────────────────────────────────
  "changan-hunter-e-reev": {
    "Hunter E REEV 2WD": { range: 180, power: 177, traction: "RWD", acceleration: 7.9, topSpeed: 160, torque: 320 },
    "Hunter E REEV 4WD": { range: 180, power: 268, traction: "AWD", acceleration: 7.8, topSpeed: 160, torque: 470 },
  },

  // ── CUPRA ─────────────────────────────────────────────────────────────────
  "cupra-tavascan-ev": {
    "Tavascan VZ RWD": { range: 547, power: 286, traction: "RWD", acceleration: 6.8, topSpeed: 180, torque: 545 },
    "Tavascan VZ AWD": { range: 521, power: 340, traction: "AWD", acceleration: 5.5, topSpeed: 180, torque: 545 },
  },

  // ── HYUNDAI ───────────────────────────────────────────────────────────────
  "hyundai-ioniq-5": {
    "IONIQ 5 NE EV PREMIUM":      { range: 295, power: 170, traction: "RWD", acceleration: 8.5, topSpeed: 185, torque: 350 },
    "IONIQ 5 NE EV LIMITED":      { range: 476, power: 225, traction: "RWD", acceleration: 7.4, topSpeed: 185, torque: 350 },
    "IONIQ 5 NE EV AWD LIMITED":  { range: 481, power: 325, traction: "AWD", acceleration: 5.1, topSpeed: 185, torque: 605 },
  },

  // ── JAECOO ────────────────────────────────────────────────────────────────
  "jaecoo-6": {
    "Jaecoo 6 Standard": { range: 354, power: 184, traction: "RWD", acceleration: 10.5, topSpeed: 150, torque: 220 },
    "Jaecoo 6 Pro":      { range: 342, power: 279, traction: "AWD", acceleration: 6.5,  topSpeed: 150, torque: 385 },
  },

  // ── KIA ───────────────────────────────────────────────────────────────────
  "kia-ev5": {
    "EV5 Standard Range FWD": { range: 400, power: 218, traction: "FWD", acceleration: 8.5, topSpeed: 185, torque: 310 },
    "EV5 Long Range AWD":     { range: 491, power: 265, traction: "AWD", acceleration: 6.5, topSpeed: 185, torque: 480 },
  },
  "kia-ev6": {
    "EV6 Standard Range RWD":      { range: 394, power: 168, traction: "RWD", acceleration: 8.5, topSpeed: 185, torque: 350 },
    "EV6 Long Range RWD":          { range: 528, power: 228, traction: "RWD", acceleration: 7.3, topSpeed: 185, torque: 350 },
    "EV6 Long Range AWD GT-Line":  { range: 546, power: 325, traction: "AWD", acceleration: 5.2, topSpeed: 188, torque: 605 },
    "EV6 GT":                      { range: 450, power: 608, traction: "AWD", acceleration: 3.5, topSpeed: 260, torque: 740 },
  },
  "kia-ev9": {
    "EV9 Standard Range RWD": { range: 412, power: 214, traction: "RWD", acceleration: 8.2, topSpeed: 185, torque: 350 },
    "EV9 Long Range RWD":     { range: 563, power: 204, traction: "RWD", acceleration: 9.4, topSpeed: 185, torque: 350 },
  },

  // ── MG ────────────────────────────────────────────────────────────────────
  "mg-4": {
    "MG 4 Standard":   { range: 350, power: 170, traction: "RWD", acceleration: 7.7, topSpeed: 160, torque: 250 },
    "MG 4 Deluxe":     { range: 450, power: 204, traction: "RWD", acceleration: 7.9, topSpeed: 160, torque: 250 },
    "MG 4 Deluxe LR":  { range: 520, power: 245, traction: "RWD", acceleration: 6.5, topSpeed: 180, torque: 350 },
    "MG 4 XPower AWD": { range: 385, power: 435, traction: "AWD", acceleration: 3.8, topSpeed: 200, torque: 600 },
  },
  "mg-zs-ev": {
    "MG ZS EV Standard":   { range: 320, power: 177, traction: "FWD", acceleration: 8.6, topSpeed: 175, torque: 280 },
    "MG ZS EV Long Range": { range: 440, power: 156, traction: "FWD", acceleration: 8.4, topSpeed: 175, torque: 280 },
  },
  "mg-cyberster": {
    "MG Cyberster RWD": { range: 507, power: 340, traction: "RWD", acceleration: 5.0, topSpeed: 195, torque: 475 },
    "MG Cyberster AWD": { range: 444, power: 510, traction: "AWD", acceleration: 3.2, topSpeed: 200, torque: 725 },
  },

  // ── MINI ──────────────────────────────────────────────────────────────────
  "mini-aceman-electrico": {
    "Mini Aceman E":  { range: 298, power: 184, traction: "FWD", acceleration: 7.9, topSpeed: 160, torque: 290 },
    "Mini Aceman SE": { range: 382, power: 218, traction: "FWD", acceleration: 7.1, topSpeed: 170, torque: 330 },
  },
  "mini-cooper-electrico": {
    "Mini Cooper E":  { range: 305, power: 184, traction: "FWD", acceleration: 7.3, topSpeed: 160, torque: 290 },
    "Mini Cooper SE": { range: 385, power: 218, traction: "FWD", acceleration: 6.7, topSpeed: 170, torque: 330 },
  },
  "mini-countryman-electrico": {
    "Mini Countryman E FWD":      { range: 423, power: 204, traction: "FWD", acceleration: 8.6, topSpeed: 170, torque: 250 },
    "Mini Countryman SE ALL4 AWD":{ range: 399, power: 313, traction: "AWD", acceleration: 5.6, topSpeed: 180, torque: 494 },
  },

  // ── NAMMI ─────────────────────────────────────────────────────────────────
  "nammi-001": {
    "Nammi 001 SR":     { range: 230, power: 95, traction: "FWD", acceleration: 14.0, topSpeed: 140, torque: 175 },
    "Nammi 001 LR":     { range: 310, power: 95, traction: "FWD", acceleration: 14.0, topSpeed: 140, torque: 175 },
    "Nammi 001 LR ELITE":{ range: 310, power: 95, traction: "FWD", acceleration: 14.0, topSpeed: 140, torque: 175 },
    "Nammi 001 LR Full":{ range: 310, power: 95, traction: "FWD", acceleration: 14.0, topSpeed: 140, torque: 175 },
  },

  // ── ORA ───────────────────────────────────────────────────────────────────
  "ora-03": {
    "Ora 03 SR 47.8 kWh": { range: 310, power: 169, traction: "FWD", acceleration: 8.3, topSpeed: 160, torque: 250 },
    "Ora 03 LR 59.1 kWh": { range: 420, power: 169, traction: "FWD", acceleration: 8.2, topSpeed: 160, torque: 250 },
  },

  // ── PEUGEOT ───────────────────────────────────────────────────────────────
  "peugeot-new-3008-mhev": {
    "Allure":   { range: null, power: 136, traction: "FWD", acceleration: 10.2, topSpeed: 201, torque: 230 },
    "Premiere": { range: null, power: 136, traction: "FWD", acceleration: 10.2, topSpeed: 201, torque: 230 },
    "GT":       { range: null, power: 136, traction: "FWD", acceleration: 10.2, topSpeed: 201, torque: 230 },
  },

  // ── RIDDARA ───────────────────────────────────────────────────────────────
  "riddara-rd6": {
    "RD6 4x2 Air":   { range: 300, power: 268, traction: "RWD", acceleration: 7.3, topSpeed: 185, torque: 384 },
    "RD6 4x2 Ultra": { range: 400, power: 268, traction: "RWD", acceleration: 7.3, topSpeed: 185, torque: 384 },
    "RD6 4x4 PRO":   { range: 360, power: 422, traction: "AWD", acceleration: 4.5, topSpeed: 190, torque: 595 },
    "RD6 4x4 Ultra": { range: 365, power: 416, traction: "AWD", acceleration: 4.5, topSpeed: 190, torque: 585 },
  },

  // ── SMART ─────────────────────────────────────────────────────────────────
  "smart-1": {
    "#1 Pro 49 kWh":       { range: 310, power: 272, traction: "RWD", acceleration: 6.7, topSpeed: 180, torque: 343 },
    "#1 Pro+ 66 kWh":      { range: 440, power: 272, traction: "RWD", acceleration: 6.7, topSpeed: 180, torque: 343 },
    "#1 Brabus AWD 66 kWh":{ range: 400, power: 422, traction: "AWD", acceleration: 3.9, topSpeed: 180, torque: 584 },
  },
  "smart-3": {
    "#3 Pro 49 kWh":       { range: 325, power: 272, traction: "RWD", acceleration: 5.8, topSpeed: 180, torque: 343 },
    "#3 Pro+ 66 kWh":      { range: 435, power: 272, traction: "RWD", acceleration: 5.8, topSpeed: 180, torque: 343 },
    "#3 Brabus AWD 66 kWh":{ range: 415, power: 428, traction: "AWD", acceleration: 3.7, topSpeed: 180, torque: 543 },
  },

  // ── SUZUKI ────────────────────────────────────────────────────────────────
  "suzuki-fronx-hybrid": {
    "GL":    { range: null, power: 103, traction: "FWD", acceleration: 10.0, topSpeed: 175, torque: 137 },
    "GL AT": { range: null, power: 103, traction: "FWD", acceleration: 11.3, topSpeed: 175, torque: 137 },
    "GLX":   { range: null, power: 103, traction: "FWD", acceleration: 10.0, topSpeed: 175, torque: 137 },
    "GLX AT":{ range: null, power: 103, traction: "FWD", acceleration: 11.3, topSpeed: 175, torque: 137 },
  },
  "suzuki-new-swift-hybrid": {
    "1.2 GL Hybrid":     { range: null, power: 82, traction: "FWD", acceleration: 11.7, topSpeed: 165, torque: 112 },
    "1.2 GL CVT Hybrid": { range: null, power: 82, traction: "FWD", acceleration: 12.5, topSpeed: 160, torque: 112 },
    "1.2 GLX Hybrid":    { range: null, power: 82, traction: "FWD", acceleration: 11.7, topSpeed: 165, torque: 112 },
    "1.2 GLX CVT Hybrid":{ range: null, power: 82, traction: "FWD", acceleration: 12.5, topSpeed: 160, torque: 112 },
  },
  "suzuki-vitara-hybrid": {
    "GL MT 4x2":      { range: null, power: 103, traction: "FWD", acceleration: 12.5, topSpeed: 180, torque: 137 },
    "GLX MT 4x2":     { range: null, power: 103, traction: "FWD", acceleration: 12.5, topSpeed: 180, torque: 137 },
    "GL AT 4x2":      { range: null, power: 103, traction: "FWD", acceleration: 12.5, topSpeed: 180, torque: 137 },
    "GLX AT 4x2":     { range: null, power: 103, traction: "FWD", acceleration: 12.5, topSpeed: 180, torque: 137 },
    "Limited AT 4x4": { range: null, power: 103, traction: "AWD", acceleration: 12.5, topSpeed: 180, torque: 137 },
  },

  // ── TESLA ─────────────────────────────────────────────────────────────────
  "tesla-model-3": {
    "Model 3 RWD":             { range: 554, power: 272, traction: "RWD", acceleration: 6.1, topSpeed: 201, torque: 440 },
    "Model 3 Long Range AWD":  { range: 716, power: 441, traction: "AWD", acceleration: 4.4, topSpeed: 201, torque: 493 },
    "Model 3 Performance AWD": { range: 571, power: 534, traction: "AWD", acceleration: 3.3, topSpeed: 261, torque: 660 },
  },
  "tesla-model-y-juniper": {
    "Model Y RWD 60.5 kWh":      { range: 534, power: 299, traction: "RWD", acceleration: 6.9, topSpeed: 217, torque: 420 },
    "Model Y Long Range AWD 75 kWh": { range: 568, power: 450, traction: "AWD", acceleration: 4.3, topSpeed: 201, torque: 493 },
  },

  // ── TOYOTA ────────────────────────────────────────────────────────────────
  "toyota-corolla-hibrido": {
    "Corolla 1.8 HEV XLI": { range: null, power: 122, traction: "FWD", acceleration: 9.3, topSpeed: 182, torque: 142 },
    "Corolla 1.8 HEV XEI": { range: null, power: 122, traction: "FWD", acceleration: 9.3, topSpeed: 182, torque: 142 },
    "Corolla 1.8 HEV SEG": { range: null, power: 122, traction: "FWD", acceleration: 9.3, topSpeed: 182, torque: 142 },
  },

  // ── VOLVO ─────────────────────────────────────────────────────────────────
  "volvo-ec40-pure-electric": {
    "EC40 Single Motor RWD 69 kWh": { range: 478, power: 238, traction: "RWD", acceleration: 7.3, topSpeed: 180, torque: 420 },
    "EC40 Twin Motor AWD 82 kWh":   { range: 548, power: 408, traction: "AWD", acceleration: 4.7, topSpeed: 180, torque: 670 },
  },
  "volvo-ex30": {
    "EX30 Single Motor 51 kWh":   { range: 344, power: 272, traction: "RWD", acceleration: 5.7, topSpeed: 180, torque: 343 },
    "EX30 Long Range 69 kWh":     { range: 476, power: 272, traction: "RWD", acceleration: 5.3, topSpeed: 180, torque: 343 },
    "EX30 Twin Motor AWD 69 kWh": { range: 460, power: 428, traction: "AWD", acceleration: 3.6, topSpeed: 180, torque: 543 },
  },
  "volvo-ex40-pure-electric": {
    "EX40 Single Motor RWD 69 kWh": { range: 479, power: 238, traction: "RWD", acceleration: 7.3, topSpeed: 180, torque: 420 },
    "EX40 Twin Motor AWD 82 kWh":   { range: 539, power: 408, traction: "AWD", acceleration: 4.8, topSpeed: 180, torque: 670 },
  },
  "volvo-ex30-cross-country": {
    "EX30 Cross Country Twin Motor AWD 69 kWh": { range: 460, power: 428, traction: "AWD", acceleration: 3.6, topSpeed: 180, torque: 543 },
  },
  "volvo-xc90-plug-in-hybrid": {
    "XC90 T8 Core":       { range: 71, power: 449, traction: "AWD", acceleration: 5.4, topSpeed: 180, torque: 709 },
    "XC90 T8 Plus":       { range: 71, power: 449, traction: "AWD", acceleration: 5.4, topSpeed: 180, torque: 709 },
    "XC90 T8 Ultra":      { range: 71, power: 449, traction: "AWD", acceleration: 5.4, topSpeed: 180, torque: 709 },
    "XC90 T8 Ultra Dark": { range: 71, power: 449, traction: "AWD", acceleration: 5.4, topSpeed: 180, torque: 709 },
  },
};

// ── Main ─────────────────────────────────────────────────────────────────────

const SPEC_FIELDS: (keyof VersionSpecs)[] = ["range", "power", "traction", "acceleration", "topSpeed", "torque"];

async function main() {
  const cars = await client.fetch<Array<{
    _id: string; slug: string;
    versions: Array<{ _key: string; name: string; [k: string]: unknown }>;
  }>>(`
    *[_type == "car" && count(versions) > 0] {
      _id,
      "slug": slug.current,
      "versions": versions[]{ _key, name, range, power, traction, acceleration, topSpeed, torque }
    }
  `);

  let totalPatched = 0;
  let totalSkipped = 0;
  const tx = client.transaction();
  let hasMutations = false;

  for (const car of cars) {
    const carMap = SPECS_MAP[car.slug];
    if (!carMap) continue;

    for (const ver of car.versions) {
      const specs = carMap[ver.name];
      if (!specs) continue;

      const setFields: Record<string, unknown> = {};

      for (const field of SPEC_FIELDS) {
        const incoming = specs[field];
        const existing = ver[field] ?? null;

        if (existing !== null && existing !== undefined) {
          // Already has data — skip
          continue;
        }
        if (incoming === undefined) continue;
        // incoming can be null (e.g. range for MHEV) — still write null explicitly? No.
        // Only write if incoming is a real value (not null), to avoid polluting with nulls.
        if (incoming !== null) {
          setFields[`versions[_key=="${ver._key}"].${field}`] = incoming;
        }
      }

      if (Object.keys(setFields).length === 0) {
        totalSkipped++;
        continue;
      }

      totalPatched++;
      console.log(`  [${car.slug}] "${ver.name}" → set ${Object.keys(setFields).join(", ")}`);
      if (!DRY_RUN) {
        tx.patch(car._id, p => p.set(setFields));
        hasMutations = true;
      }
    }
  }

  console.log(`\n📊 Resumen: ${totalPatched} versiones con datos nuevos, ${totalSkipped} ya tenían datos o sin mapping.`);

  if (DRY_RUN) {
    console.log("\n⚠️  DRY-RUN — ningún cambio guardado. Usa --commit para escribir a Sanity.");
    return;
  }

  if (!hasMutations) {
    console.log("\nℹ️  Nada que commitear.");
    return;
  }

  await tx.commit();
  console.log("\n✅ Datos escritos en Sanity.");
}

main().catch(err => { console.error(err); process.exit(1); });
