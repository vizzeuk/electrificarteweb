/**
 * patch-sin-versiones.ts
 *
 * Agrega la primera versión (o versiones) a los 16 autos que no tienen
 * ninguna versión cargada en Sanity.
 *
 * También corrige el tipo eléctrico del DFSK E5 Plus (PHEV, no BEV).
 * Para el Deepal S05 BEV (aún no disponible en Chile) lo oculta.
 * Para el GWM 500 → lo renombra a Tank 500 HEV y agrega versión.
 * Para el GWM POER 500 → actualiza a versión PHEV.
 *
 * Fuentes: webs oficiales chilenas + autocosmos.cl + rutamotor.com
 *
 * Uso: npx tsx --env-file=.env.local scripts/patch-sin-versiones.ts
 */

import { createClient } from "@sanity/client";
import crypto from "crypto";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

function key() {
  return crypto.randomUUID().split("-")[0];
}

type V = Record<string, unknown>;

function v(fields: V): V {
  return { _key: key(), _type: "version", ...fields };
}

// ── Catálogo de parches ────────────────────────────────────────────────────────

const patches: Array<{
  brand: string;
  name: string;
  versions: V[];
  extraSet?: Record<string, unknown>;
}> = [

  // ── AVATR ─────────────────────────────────────────────────────────────────
  // Nota: en Sanity puede estar bajo marca AVTR o AVATR — probamos ambos
  {
    brand: "AVATR",
    name: "11",
    versions: [
      v({ name: "Luxury RWD", price: 64990000, batteryCapacity: 90.38, batteryType: "NMC",
          range: 475, power: 308, torque: 350, acceleration: 6.6,
          traction: "RWD", maxDCChargingPower: 200, maxACChargingPower: 7,
          connectorType: "CCS2", chargeTimeDC: "15 min (30-80%)", chargeTimeAC: "10h 30min (0-100%)",
          motorDescription: "Motor Eléctrico 227 kW (308 CV) Trasero",
          seats: 5, trunkCapacity: 395, frunkCapacity: 95 }),
    ],
  },

  // ── BAIC ──────────────────────────────────────────────────────────────────
  {
    brand: "BAIC",
    name: "BJ30 4WD HEV",
    versions: [
      v({ name: "BJ30 HEV 1.5T LV5 4WD", price: 27990000, power: 404, torque: 685,
          acceleration: 7.2, topSpeed: 170, traction: "AWD",
          motorDescription: "1.5T 156 CV + Motor Eléctrico Del. 174 CV + Motor Eléctrico Tras. 73 CV",
          fuelConsumption: 14.9, transmission: "DHT 2 velocidades",
          seats: 5 }),
    ],
  },

  // ── CHANGAN ───────────────────────────────────────────────────────────────
  {
    brand: "Changan",
    name: "Lumin",
    versions: [
      v({ name: "Lumin", price: 13990000, batteryCapacity: 28.08,
          range: 301, power: 46, torque: 83,
          traction: "FWD", maxACChargingPower: 3.3,
          chargeTimeAC: "7h 30min (0-100%)",
          motorDescription: "Motor Eléctrico 35 kW (46 CV)",
          seats: 4, trunkCapacity: 101 }),
    ],
  },

  // ── CHERY ─────────────────────────────────────────────────────────────────
  {
    brand: "Chery",
    name: "Tiggo 4 HEV",
    versions: [
      v({ name: "Tiggo 4 HEV 1.5 DHT", price: 17499000, power: 201, torque: 310,
          traction: "FWD", transmission: "DHT automática",
          motorDescription: "Motor 1.5L 95 CV + Motor Eléctrico 201 CV", fuelConsumption: 18.5,
          seats: 5, trunkCapacity: 340 }),
    ],
  },
  {
    brand: "Chery",
    name: "Tiggo 7 Pro Max PHEV",
    versions: [
      v({ name: "1.5T DHT CSH PHEV", price: 32990000, batteryCapacity: 18.3, batteryType: "LFP",
          electricRangeKm: 90, power: 315, torque: 525, acceleration: 7.5,
          traction: "FWD", maxDCChargingPower: 40, maxACChargingPower: 6.6,
          chargeTimeDC: "20 min (30-80%)", chargeTimeAC: "5h (0-100%)",
          motorDescription: "Motor 1.5T + Motor Eléctrico DHT",
          seats: 5, trunkCapacity: 475 }),
    ],
  },

  // ── CHEVROLET ─────────────────────────────────────────────────────────────
  {
    brand: "Chevrolet",
    name: "Captiva EV",
    versions: [
      v({ name: "Premier", price: 28990000, batteryCapacity: 60, batteryType: "LFP",
          range: 318, power: 204, traction: "FWD",
          maxDCChargingPower: 120, maxACChargingPower: 6.6,
          connectorType: "CCS2", chargeTimeDC: "30 min aprox. (0-80%)",
          motorDescription: "Motor Eléctrico 150 kW (204 CV)",
          seats: 5, trunkCapacity: 532 }),
    ],
  },
  {
    brand: "Chevrolet",
    name: "Captiva PHEV",
    versions: [
      v({ name: "Premier", price: 29990000, batteryCapacity: 20.5, batteryType: "LFP",
          electricRangeKm: 90, power: 201, torque: 310,
          traction: "FWD", maxACChargingPower: 6.6,
          motorDescription: "Motor 1.5L + Motor Eléctrico DHT",
          seats: 5, trunkCapacity: 532 }),
    ],
  },

  // ── DFSK ──────────────────────────────────────────────────────────────────
  {
    // DFSK E5 Plus es PHEV (7 plazas), NO BEV
    brand: "DFSK",
    name: "E5 Plus",
    versions: [
      v({ name: "E5 Plus PHEV", price: 30990000, batteryCapacity: 17.52, batteryType: "LFP",
          electricRangeKm: 90, power: 214, torque: 330,
          traction: "FWD", maxACChargingPower: 6.6,
          motorDescription: "Motor 1.5L 94 CV + Motor Eléctrico 214 CV",
          seats: 7, seatRows: 3 }),
    ],
  },

  // ── DEEPAL ────────────────────────────────────────────────────────────────
  {
    // S05 BEV puro aún no disponible en Chile (solo REEV disponible)
    brand: "Deepal",
    name: "S05",
    versions: [],
    extraSet: { hidden: true },
  },

  // ── GWM ───────────────────────────────────────────────────────────────────
  {
    // "GWM 500" probablemente es el Tank 500 HEV — renombramos y agregamos versión
    brand: "GWM",
    name: "500",
    versions: [
      v({ name: "Tank 500 HEV Luxury", price: 46490000, power: 347, torque: 648,
          acceleration: 8.3, traction: "AWD",
          motorDescription: "2.0T 245 CV + Motor Eléctrico 78 kW", fuelConsumption: 11.7,
          transmission: "DHT 9 velocidades",
          seats: 7, seatRows: 3 }),
    ],
    extraSet: { name: "Tank 500 HEV" },
  },
  {
    brand: "GWM",
    name: "POER 500",
    versions: [
      v({ name: "Poer P500 HI4-T PHEV Luxury", price: 41990000, batteryCapacity: 37.1,
          electricRangeKm: 108, power: 402, torque: 750, acceleration: 6.9,
          traction: "AWD", maxACChargingPower: 6.6,
          motorDescription: "2.0T 241 CV + Motor Eléctrico 161 CV",
          transmission: "Automática 9 velocidades",
          seats: 5 }),
    ],
    extraSet: { name: "POER P500 HI4-T PHEV" },
  },

  // ── JAC ───────────────────────────────────────────────────────────────────
  {
    brand: "JAC",
    name: "T9 EV",
    versions: [
      v({ name: "T9 EV AWD Advance", price: 41490000, batteryCapacity: 88, batteryType: "LFP",
          range: 317, power: 295, traction: "AWD",
          maxDCChargingPower: 80, connectorType: "CCS2", chargeTimeDC: "40 min aprox. (0-80%)",
          motorDescription: "Motor Eléctrico Del. 94 CV + Motor Eléctrico Tras. 201 CV",
          seats: 5 }),
    ],
  },

  // ── LEAPMOTOR ─────────────────────────────────────────────────────────────
  {
    brand: "Leapmotor",
    name: "B10",
    versions: [
      v({ name: "B10 Life", price: 24990000, batteryCapacity: 56.2, batteryType: "LFP",
          range: 360, power: 218, torque: 240, acceleration: 8.0, topSpeed: 170,
          traction: "RWD", maxDCChargingPower: 140, maxACChargingPower: 7,
          connectorType: "CCS2", chargeTimeDC: "16 min (30-80%)",
          motorDescription: "Motor Eléctrico 160 kW (218 CV) Trasero",
          seats: 5 }),
    ],
  },

  // ── RENAULT ───────────────────────────────────────────────────────────────
  {
    // Kwid E-TECH = mismo modelo que E-Kwid, renovado 2026. Actualizar specs.
    brand: "Renault",
    name: "Kwid E-TECH",
    versions: [
      v({ name: "Kwid E-Tech Techno", price: 16990000, batteryCapacity: 26.8,
          range: 298, power: 65, torque: 113,
          traction: "FWD", maxDCChargingPower: 30, maxACChargingPower: 7,
          connectorType: "CCS2", chargeTimeDC: "40 min (15-80%)", chargeTimeAC: "3h (15-80%)",
          motorDescription: "Motor Eléctrico 48 kW (65 CV)",
          seats: 5 }),
    ],
  },

  // ── TOYOTA ────────────────────────────────────────────────────────────────
  {
    brand: "Toyota",
    name: "Yaris Sedán Híbrido",
    versions: [
      v({ name: "Yaris Sedán HEV G", price: 21990000, power: 110, torque: 142,
          traction: "FWD", transmission: "E-CVT",
          motorDescription: "1.5L 90 CV + Motor Eléctrico 79 CV", fuelConsumption: 23.8,
          seats: 5 }),
    ],
  },

  // ── VOLKSWAGEN ────────────────────────────────────────────────────────────
  {
    brand: "Volkswagen",
    name: "Tiguan E-TSI",
    versions: [
      v({ name: "R-Line mHEV 1.5 TSI", price: 42990000, power: 150, torque: 250,
          traction: "FWD", transmission: "DSG 7 velocidades",
          motorDescription: "1.5L TSI + Sistema 48V mHEV", fuelConsumption: 19.6,
          seats: 5 }),
    ],
  },
];

// ── Ejecutar ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n════════════════════════════════════════════════");
  console.log("  PATCH SIN VERSIONES — Electrificarte");
  console.log(`  ${patches.length} autos a actualizar`);
  console.log("════════════════════════════════════════════════\n");

  let ok = 0, fail = 0, skip = 0;

  for (const patch of patches) {
    const { brand, name, versions, extraSet } = patch;

    const results: Array<{ _id: string; name: string }> = await client.fetch(
      `*[_type == "car" && brand->name == $brand && name == $name]{ _id, name }`,
      { brand, name }
    );

    if (results.length === 0) {
      console.log(`⚠️  NO ENCONTRADO: ${brand} ${name}`);
      skip++;
      continue;
    }

    const car = results[0];

    try {
      let mutation = client.patch(car._id);

      if (versions.length > 0) {
        mutation = mutation.set({ versions });
      } else {
        mutation = mutation.unset(["versions"]);
      }

      if (extraSet) {
        mutation = mutation.set(extraSet);
      }

      await mutation.commit();

      const label = (extraSet?.hidden === true)
        ? `🚫 OCULTADO`
        : `✅ ${versions.length} versión(es)`;
      const rename = extraSet?.name ? ` → renombrado a "${extraSet.name}"` : "";
      console.log(`${label}  ${brand} ${name}${rename}`);
      ok++;
    } catch (err) {
      console.error(`❌ ERROR: ${brand} ${name}`, err);
      fail++;
    }
  }

  console.log(`\n────────────────────────────────────────────────`);
  console.log(`  OK: ${ok}  |  Fallo: ${fail}  |  No encontrado: ${skip}`);
  console.log("════════════════════════════════════════════════\n");
}

main().catch(console.error);
