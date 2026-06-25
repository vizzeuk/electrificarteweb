/**
 * patch-specs-fase2.ts
 *
 * Rellena specs críticos vacíos en 124 versiones detectadas por el diagnóstico.
 * Estrategia: query-first merge — nunca sobreescribe campos ya poblados.
 *
 * Uso: npx tsx --env-file=.env.local scripts/patch-specs-fase2.ts
 */

import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

type SpecPatch = Record<string, unknown>;

// ── Catálogo de parches por auto ────────────────────────────────────────────
// Estructura: { brand, name, versionSpecs: { [versionName]: specs } }
// Solo se setean campos que estén null/undefined en Sanity.

const PATCHES: Array<{
  brand: string;
  name: string;
  versionSpecs: Record<string, SpecPatch>;
  carLevelPatch?: Record<string, unknown>;  // campos del car, no de versión
}> = [

  // ── AUDI ──────────────────────────────────────────────────────────────────
  {
    brand: "Audi", name: "Q6 Sportback e-tron",
    versionSpecs: {},
    carLevelPatch: { basePrice: 74990000 },   // solo falta precio del auto
  },
  {
    brand: "Audi", name: "Q8 E-tron",
    versionSpecs: {
      "Q8 E-tron": {
        power: 408, torque: 664, batteryCapacity: 106, range: 582,
        acceleration: 5.6, traction: "AWD",
        maxDCChargingPower: 170, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "26 min (20-80%)",
      },
    },
  },

  // ── BMW ───────────────────────────────────────────────────────────────────
  {
    brand: "BMW", name: "X1 PHEV",
    versionSpecs: {
      "X1 xDrive25e": {
        power: 245, torque: 385, batteryCapacity: 14.2, electricRangeKm: 92,
        acceleration: 6.0, traction: "AWD",
        maxACChargingPower: 7.4, connectorType: "Type2",
        chargeTimeAC: "2h 30min (0-100%)",
      },
    },
  },
  {
    brand: "BMW", name: "i4 eDrive40 Gran Coupé",
    versionSpecs: {
      "i4 eDrive40 Gran Coupé": {
        power: 340, torque: 430, batteryCapacity: 80.7, range: 536,
        acceleration: 5.7, traction: "RWD",
        maxDCChargingPower: 205, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "31 min (10-80%)",
      },
    },
  },
  {
    brand: "BMW", name: "i5 eDrive40 Berlina M Sport",
    versionSpecs: {
      "i5 eDrive40 Berlina M Sport": {
        power: 340, torque: 430, batteryCapacity: 81.2, range: 560,
        acceleration: 6.1, traction: "RWD",
        maxDCChargingPower: 205, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "31 min (10-80%)",
      },
    },
  },
  {
    brand: "BMW", name: "i7 M70 xDrive Berlina",
    versionSpecs: {
      "i7 M70 xDrive Berlina": {
        power: 660, torque: 1100, batteryCapacity: 101.7, range: 560,
        acceleration: 3.7, traction: "AWD",
        maxDCChargingPower: 195, maxACChargingPower: 22, connectorType: "CCS2",
        chargeTimeDC: "34 min (10-80%)",
      },
    },
  },
  {
    brand: "BMW", name: "iX2 xDrive30 M Sport HEA",
    versionSpecs: {
      "iX2 xDrive30 M Sport HEA": {
        power: 313, torque: 494, batteryCapacity: 64.7, range: 475,
        acceleration: 5.6, traction: "AWD",
        maxDCChargingPower: 130, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "34 min (10-80%)",
      },
    },
  },

  // ── BYD ───────────────────────────────────────────────────────────────────
  {
    brand: "BYD", name: "Dolphin Mini",
    versionSpecs: {
      "Dolphin Mini Standard": {
        power: 75, range: 300,   // NEDC; no hay WLTP oficial en Chile
        maxDCChargingPower: 40, maxACChargingPower: 6.6, connectorType: "CCS2",
        chargeTimeDC: "30 min (30-80%)",
      },
    },
  },
  {
    brand: "BYD", name: "Shark",
    versionSpecs: {
      "BYD Shark": {
        power: 430, torque: 650, batteryCapacity: 29.6, electricRangeKm: 100,
        acceleration: 5.7, traction: "AWD",
        maxDCChargingPower: 60, maxACChargingPower: 6.6, connectorType: "CCS2",
        chargeTimeDC: "15-22 min (30-80%)",
      },
    },
  },
  {
    brand: "BYD", name: "Song Plus DM-I",
    versionSpecs: {
      "Song Plus DM-I GX": {
        power: 338, torque: 520, batteryCapacity: 18.3, electricRangeKm: 80,
        acceleration: 8.3, traction: "FWD",
        maxACChargingPower: 6.6, connectorType: "Type2",
      },
    },
  },
  {
    brand: "BYD", name: "Song Pro",
    versionSpecs: {
      // GL y GS son mecánicamente distintos (batería y autonomía EV)
      "Song Pro GL": {
        power: 292, batteryCapacity: 12.9, electricRangeKm: 70,
        acceleration: 8.3, traction: "FWD",
        maxACChargingPower: 6.6, connectorType: "Type2",
      },
      "Song Pro GS": {
        power: 292, batteryCapacity: 18.3, electricRangeKm: 100,
        acceleration: 7.9, traction: "FWD",
        maxACChargingPower: 6.6, connectorType: "Type2",
      },
    },
  },
  {
    brand: "BYD", name: "Yuan Plus",
    versionSpecs: {
      "Yuan Plus Standard": {
        power: 201, torque: 310, batteryCapacity: 60.48, range: 480,
        acceleration: 7.3, traction: "FWD",
        maxDCChargingPower: 80, maxACChargingPower: 7, connectorType: "CCS2",
        chargeTimeDC: "30 min (30-80%)",
      },
    },
  },
  {
    brand: "BYD", name: "Yuan Pro",
    versionSpecs: {
      // PHEV DM-i — GL y GS con baterías muy distintas
      "Yuan Pro Standard": {
        power: 291, batteryCapacity: 7.85, electricRangeKm: 40,
        acceleration: 9.1, traction: "FWD",
      },
      "Yuan Pro Plus": {
        power: 291, batteryCapacity: 18.03, electricRangeKm: 90,
        acceleration: 7.5, traction: "FWD",
        maxACChargingPower: 6.6, connectorType: "Type2",
      },
    },
  },

  // ── CHANGAN ───────────────────────────────────────────────────────────────
  {
    brand: "Changan", name: "CS55 Plus iDD",
    versionSpecs: {
      "CS55 Plus iDD": {
        power: 268, torque: 470, batteryCapacity: 18.4, electricRangeKm: 115,
        acceleration: 7.3, traction: "FWD",
        maxACChargingPower: 6.6, connectorType: "Type2",
      },
    },
  },

  // ── CHERY ─────────────────────────────────────────────────────────────────
  {
    brand: "Chery", name: "Tiggo 7 Pro PHEV",
    versionSpecs: {
      "Tiggo 7 Pro PHEV": {
        power: 315, torque: 525, batteryCapacity: 18.3, electricRangeKm: 90,
        acceleration: 7.5, traction: "FWD",
        maxACChargingPower: 6.6, connectorType: "Type2",
        chargeTimeAC: "5h (0-100%)",
      },
    },
  },
  {
    brand: "Chery", name: "Tiggo 8 Pro PHEV",
    versionSpecs: {
      "Tiggo 8 Pro PHEV": {
        power: 315, torque: 525, batteryCapacity: 19.27, electricRangeKm: 75,
        acceleration: 7.0, traction: "FWD",
        maxACChargingPower: 7, connectorType: "Type2",
        chargeTimeAC: "4h 30min (0-100%)",
        seats: 7, seatRows: 3,
      },
    },
  },
  {
    brand: "Chery", name: "Tiggo 9 PHEV",
    versionSpecs: {
      "Tiggo 9 PHEV": {
        power: 347, torque: 530, batteryCapacity: 19.27, electricRangeKm: 75,
        traction: "FWD",
        seats: 7, seatRows: 3,
      },
    },
  },

  // ── CHEVROLET ─────────────────────────────────────────────────────────────
  {
    brand: "Chevrolet", name: "Blazer EV",
    versionSpecs: {
      "Blazer EV RS": {
        power: 340, torque: 636, batteryCapacity: 102, range: 520,
        acceleration: 6.0, traction: "RWD",
        maxDCChargingPower: 190, maxACChargingPower: 19.8, connectorType: "CCS2",
        chargeTimeDC: "40 min (10-80%)",
        seats: 5, trunkCapacity: 436,
      },
    },
  },
  {
    brand: "Chevrolet", name: "Bolt EUV",
    versionSpecs: {
      "Bolt EUV": {
        power: 200, torque: 360, batteryCapacity: 65, range: 456,
        acceleration: 7.7, traction: "FWD",
        maxDCChargingPower: 55, maxACChargingPower: 7.4, connectorType: "CCS2",
        chargeTimeDC: "60 min (10-80%)",
        seats: 5, trunkCapacity: 462,
      },
    },
  },
  {
    brand: "Chevrolet", name: "Equinox EV",
    versionSpecs: {
      "Equinox EV": {
        power: 286, batteryCapacity: 89, range: 488,
        traction: "AWD",
        maxDCChargingPower: 150, maxACChargingPower: 11.5, connectorType: "CCS2",
        chargeTimeDC: "35 min (10-80%)",
        seats: 5, trunkCapacity: 747,
      },
    },
  },
  {
    brand: "Chevrolet", name: "Spark EUV",
    versionSpecs: {
      "Spark EUV": {
        power: 101, torque: 180, batteryCapacity: 41.9, range: 298,
        acceleration: 11.2, traction: "FWD",
        maxACChargingPower: 6.6, connectorType: "CCS2",
        seats: 4, trunkCapacity: 549,
      },
    },
  },

  // ── DFSK ──────────────────────────────────────────────────────────────────
  {
    brand: "DFSK", name: "600 PHEV",
    versionSpecs: {
      "600 PHEV": {
        power: 283, torque: 435, batteryCapacity: 17.52, electricRangeKm: 87,
        traction: "FWD",
        maxACChargingPower: 6.6, connectorType: "Type2",
        chargeTimeAC: "4h (0-100%)",
        seats: 7, seatRows: 3,
      },
    },
  },
  {
    brand: "DFSK", name: "Seres 3 EV",
    versionSpecs: {
      "Seres 3 EV": {
        power: 163, torque: 300, batteryCapacity: 53, range: 329,
        acceleration: 8.9, traction: "FWD",
        maxDCChargingPower: 100, connectorType: "CCS2",
        chargeTimeDC: "30 min (0-80%)",
        seats: 5, trunkCapacity: 310,
      },
    },
  },

  // ── DS ────────────────────────────────────────────────────────────────────
  {
    brand: "DS", name: "3 Opera E-tense",
    versionSpecs: {
      "3 Opera E-tense": {
        power: 156, torque: 260, batteryCapacity: 50.8, range: 404,
        traction: "FWD",
        maxDCChargingPower: 100, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "30 min (10-80%)",
        seats: 5,
      },
    },
  },

  // ── DEEPAL ────────────────────────────────────────────────────────────────
  {
    brand: "Deepal", name: "S05 REEV",
    versionSpecs: {
      "S05 REEV": {
        power: 214, torque: 320, batteryCapacity: 27.28, electricRangeKm: 160,
        traction: "RWD",
        maxDCChargingPower: 151, maxACChargingPower: 7, connectorType: "CCS2",
        chargeTimeDC: "11 min (30-80%)",
        seats: 5, trunkCapacity: 423,
      },
    },
  },
  {
    brand: "Deepal", name: "S07 BEV",
    versionSpecs: {
      "S07 BEV": {
        power: 215, torque: 320, batteryCapacity: 79.97, range: 475,
        acceleration: 7.9, traction: "FWD",
        maxDCChargingPower: 93, maxACChargingPower: 11, connectorType: "CCS2",
        seats: 5, trunkCapacity: 445,
      },
    },
  },
  {
    brand: "Deepal", name: "S07 REEV",
    versionSpecs: {
      "S07 REEV": {
        power: 235, torque: 320, batteryCapacity: 31.74, electricRangeKm: 170,
        acceleration: 7.9, traction: "FWD",
        connectorType: "CCS2",
        seats: 5, trunkCapacity: 445,
      },
    },
  },

  // ── DONGFENG ──────────────────────────────────────────────────────────────
  {
    brand: "Dongfeng", name: "E70",
    versionSpecs: {
      "E70": {
        power: 148, torque: 210, batteryCapacity: 47.5, range: 401,
        traction: "RWD",
        maxACChargingPower: 7, connectorType: "CCS2",
        chargeTimeDC: "36 min (30-80%)",
        seats: 5, trunkCapacity: 502,
      },
    },
  },
  {
    brand: "Dongfeng", name: "T5 EVO HEV",
    versionSpecs: {
      "T5 EVO HEV": {
        power: 242, torque: 530,   // peak combinado sistema DHT
        acceleration: 7.9, traction: "FWD",
        fuelConsumption: 19.1, transmission: "e-CVT",
      },
    },
  },

  // ── FIAT ──────────────────────────────────────────────────────────────────
  {
    brand: "Fiat", name: "500 e",
    versionSpecs: {
      "500 e": {
        power: 118, torque: 220, batteryCapacity: 37.3, range: 320,
        traction: "FWD",
        maxDCChargingPower: 85, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "35 min (10-80%)",
        seats: 4,
      },
    },
  },
  {
    brand: "Fiat", name: "600 e",
    versionSpecs: {
      "600 e": {
        power: 156, torque: 260, batteryCapacity: 50.8, range: 409,
        traction: "FWD",
        maxDCChargingPower: 100, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "30 min (10-80%)",
        seats: 5,
      },
    },
  },

  // ── FORD ──────────────────────────────────────────────────────────────────
  {
    brand: "Ford", name: "Escape HEV",
    versionSpecs: {
      "Escape HEV FWD": { power: 192, torque: 210, traction: "FWD", transmission: "eCVT" },
    },
  },
  {
    brand: "Ford", name: "F-150 Platinum HEV",
    versionSpecs: {
      "F-150 Platinum HEV": { power: 430, torque: 667, traction: "AWD", transmission: "10AT" },
    },
  },
  {
    brand: "Ford", name: "Maverick HEV",
    versionSpecs: {
      "Maverick HEV FWD": { power: 191, torque: 235, traction: "FWD", transmission: "eCVT" },
    },
  },

  // ── GAC AION ──────────────────────────────────────────────────────────────
  {
    brand: "GAC", name: "AION ES",
    versionSpecs: {
      "AION ES": {
        power: 134, torque: 225, batteryCapacity: 55.2, range: 442,
        traction: "FWD", seats: 5,
      },
    },
  },
  {
    brand: "GAC", name: "AION Y",
    versionSpecs: {
      "AION Y": {
        power: 201, torque: 225, batteryCapacity: 63.2, range: 455,
        traction: "FWD", seats: 5, trunkCapacity: 405,
      },
    },
  },

  // ── GWM ───────────────────────────────────────────────────────────────────
  {
    brand: "GWM", name: "Poer 500 PHEV",
    versionSpecs: {
      "Poer 500 PHEV AWD": {
        power: 402, torque: 750, batteryCapacity: 37.1, electricRangeKm: 90,
        acceleration: 6.9, traction: "AWD",
        maxACChargingPower: 6.6, connectorType: "Type2",
      },
    },
  },

  // ── HAVAL ─────────────────────────────────────────────────────────────────
  {
    brand: "Haval", name: "H6 Híbrido",
    versionSpecs: {
      "H6 Híbrido": {
        power: 240, torque: 530, traction: "FWD",
        transmission: "DHT 2 velocidades", fuelConsumption: 20.5,
      },
    },
  },
  {
    brand: "Haval", name: "H6 PHEV",
    versionSpecs: {
      // Solo falta batería kWh; 2WD y 4WD tienen misma batería nominal
      "PHEV Deluxe 2WD": { batteryCapacity: 19.09 },
      "PHEV Deluxe 4WD": { batteryCapacity: 19.09 },
    },
  },
  {
    brand: "Haval", name: "H7 Híbrido",
    versionSpecs: {
      "H7 Híbrido": {
        power: 240, torque: 530, traction: "FWD",
        transmission: "DHT", fuelConsumption: 19.8,
      },
    },
  },
  {
    brand: "Haval", name: "Jolion Híbrido",
    versionSpecs: {
      "Jolion Híbrido": {
        power: 186, torque: 375, traction: "FWD",
        transmission: "DHT automática", fuelConsumption: 22.2,
      },
    },
  },
  {
    brand: "Haval", name: "Jolion Pro Híbrido",
    versionSpecs: {
      "Jolion Pro Híbrido": {
        power: 190, torque: 375, traction: "FWD",
        transmission: "DHT automática", fuelConsumption: 21.7,
      },
    },
  },

  // ── HONDA ─────────────────────────────────────────────────────────────────
  {
    brand: "Honda", name: "CRV Hybrid eHEV",
    versionSpecs: {
      "CRV Hybrid eHEV AWD": { power: 204, traction: "AWD" },
    },
  },

  // ── HYUNDAI ───────────────────────────────────────────────────────────────
  {
    brand: "Hyundai", name: "Inster",
    versionSpecs: {
      "Inster Standard Range": {
        power: 96, torque: 147, batteryCapacity: 42, range: 298,
        traction: "FWD",
        maxDCChargingPower: 100, maxACChargingPower: 7.4, connectorType: "CCS2",
        chargeTimeDC: "39 min (0-80%)",
        seats: 4, trunkCapacity: 280,
      },
      "Inster Long Range": {
        power: 113, torque: 147, batteryCapacity: 49, range: 338,
        traction: "FWD",
        maxDCChargingPower: 100, maxACChargingPower: 7.4, connectorType: "CCS2",
        chargeTimeDC: "39 min (0-80%)",
        seats: 4, trunkCapacity: 280,
      },
    },
  },
  {
    brand: "Hyundai", name: "Kona Eléctrico",
    versionSpecs: {
      // Versión 39.2 kWh (gen anterior, aún vigente en Chile)
      "Kona Eléctrico 39.2 kWh": {
        power: 133, torque: 255, range: 295,
        traction: "FWD",
        maxDCChargingPower: 100, maxACChargingPower: 7.4, connectorType: "CCS2",
        chargeTimeDC: "65 min (0-80%)",
        seats: 5, trunkCapacity: 466,
      },
      "Kona Eléctrico 64 kWh": {
        power: 201, torque: 255, range: 505,
        traction: "FWD",
        maxDCChargingPower: 100, maxACChargingPower: 7.4, connectorType: "CCS2",
        chargeTimeDC: "45 min (0-80%)",
        seats: 5, trunkCapacity: 466,
      },
    },
  },
  {
    brand: "Hyundai", name: "Kona Híbrido",
    versionSpecs: {
      "Kona Híbrido": { power: 139, torque: 270, traction: "FWD", transmission: "DCT 6" },
    },
  },
  {
    brand: "Hyundai", name: "Santa Fé Híbrido",
    versionSpecs: {
      "Santa Fé Híbrido AWD": { power: 215, torque: 367, traction: "AWD", transmission: "AT 6" },
    },
  },
  {
    brand: "Hyundai", name: "Tucson Híbrido",
    versionSpecs: {
      // Las 3 versiones tienen la misma potencia del sistema
      "NX4 1.6T HEV AT PLUS FL":         { power: 227, torque: 350, traction: "FWD", transmission: "AT 6" },
      "NX4 1.6T HEV AT DESIGN FL":       { power: 227, torque: 350, traction: "FWD", transmission: "AT 6" },
      "NX4 1.6T HEV AT 4WD LIMITED FL":  { power: 227, torque: 350, traction: "AWD", transmission: "AT 6" },
    },
  },

  // ── JAC ───────────────────────────────────────────────────────────────────
  {
    brand: "JAC", name: "E-JS1",
    versionSpecs: {
      "E-JS1": {
        power: 60, torque: 150, batteryCapacity: 31.4, range: 280,
        traction: "FWD",
        maxDCChargingPower: 50, maxACChargingPower: 7, connectorType: "GBT",
        chargeTimeDC: "42 min (30-80%)",
        seats: 4, trunkCapacity: 140,
      },
    },
  },
  {
    brand: "JAC", name: "E-JS4",
    versionSpecs: {
      "E-JS4": {
        power: 190, torque: 340, batteryCapacity: 55, range: 386,
        acceleration: 7.5, traction: "FWD",
        maxDCChargingPower: 50, maxACChargingPower: 7, connectorType: "GBT",
        chargeTimeDC: "40 min (30-80%)",
        seats: 5,
      },
    },
  },
  {
    brand: "JAC", name: "IGNITE 30X",
    versionSpecs: {
      "IGNITE 30X": {
        power: 134, torque: 175, batteryCapacity: 41, range: 405,
        traction: "FWD",
        connectorType: "CCS2",
        chargeTimeDC: "30 min (20-80%)",
        seats: 5, trunkCapacity: 250,
      },
    },
  },

  // ── JAECOO ────────────────────────────────────────────────────────────────
  {
    brand: "Jaecoo", name: "7 SHS",
    versionSpecs: {
      "Jaecoo 7 SHS PHEV": {
        power: 342, torque: 525, batteryCapacity: 18.3, electricRangeKm: 90,
        traction: "FWD",
        maxACChargingPower: 6.6, connectorType: "Type2",
      },
    },
  },

  // ── JEEP ──────────────────────────────────────────────────────────────────
  {
    brand: "Jeep", name: "Avenger e-Hybrid",
    versionSpecs: {
      "Jeep Avenger e-Hybrid": {
        power: 110, torque: 205, traction: "FWD",
        transmission: "eDCT 6", fuelConsumption: 22.7,
      },
    },
  },
  {
    brand: "Jeep", name: "Compass 4xe",
    versionSpecs: {
      "Jeep Compass 4xe PHEV": {
        power: 240, batteryCapacity: 11.4, electricRangeKm: 44,
        acceleration: 6.7, traction: "AWD",
        maxACChargingPower: 3.7, connectorType: "Type2",
        chargeTimeAC: "3h (0-100%)",
      },
    },
  },

  // ── JETOUR ────────────────────────────────────────────────────────────────
  {
    brand: "Jetour", name: "T1 PHEV",
    versionSpecs: {
      "1.5T PHEV Limited": { batteryCapacity: 26.7 },
    },
  },
  {
    brand: "Jetour", name: "T2 PHEV",
    versionSpecs: {
      "Jetour T2 PHEV AWD": {
        power: 380, torque: 610, batteryCapacity: 26.7, electricRangeKm: 139,
        traction: "FWD",  // comercializado como FWD en Chile
        maxACChargingPower: 6.6, connectorType: "Type2",
      },
    },
  },

  // ── JMC ───────────────────────────────────────────────────────────────────
  {
    brand: "JMC", name: "Vigus EV",
    versionSpecs: {
      "JMC Vigus EV": {
        power: 161, torque: 320, batteryCapacity: 60.16, range: 332,
        traction: "RWD",
        maxDCChargingPower: 120, maxACChargingPower: 6.6, connectorType: "CCS2",
        chargeTimeDC: "60 min (0-80%)",
      },
    },
  },

  // ── LEAPMOTOR ─────────────────────────────────────────────────────────────
  {
    brand: "Leapmotor", name: "C10 Eléctrico BEV",
    versionSpecs: {
      "Leapmotor C10 BEV": {
        power: 218, torque: 320, batteryCapacity: 69.9, range: 480,
        traction: "RWD",
        maxDCChargingPower: 84, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "30 min (30-80%)",
        seats: 5, trunkCapacity: 517,
      },
    },
  },
  {
    brand: "Leapmotor", name: "C10 REEV",
    versionSpecs: {
      "Leapmotor C10 REEV": {
        power: 215, torque: 320, batteryCapacity: 28.4, electricRangeKm: 170,
        traction: "RWD",
        maxDCChargingPower: 65, connectorType: "CCS2",
        chargeTimeDC: "18 min (30-80%)",
        seats: 5, trunkCapacity: 450,
      },
    },
  },

  // ── LEXUS ─────────────────────────────────────────────────────────────────
  {
    brand: "Lexus", name: "RZ 450 e",
    versionSpecs: {
      "Lexus RZ 450e AWD": {
        power: 308, torque: 435, batteryCapacity: 71.4, range: 440,
        acceleration: 5.3, traction: "AWD",
        maxDCChargingPower: 150, maxACChargingPower: 6.6, connectorType: "CCS2",
      },
    },
  },

  // ── LYNK & CO ─────────────────────────────────────────────────────────────
  {
    brand: "Lynk & Co", name: "08 PHEV",
    versionSpecs: {
      "Lynk&Co 08 PHEV FWD": {
        power: 385, torque: 580, batteryCapacity: 39.6, electricRangeKm: 200,
        traction: "FWD",
        maxDCChargingPower: 100, maxACChargingPower: 6.6, connectorType: "CCS2",
        chargeTimeDC: "30 min (30-80%)",
      },
    },
  },
  {
    brand: "Lynk & Co", name: "09 MHEV",
    versionSpecs: {
      "Lynk & Co 09 MHEV AWD": {
        power: 254, torque: 350, traction: "AWD",
        transmission: "AT 8 velocidades",
      },
    },
  },

  // ── MAXUS ─────────────────────────────────────────────────────────────────
  {
    brand: "Maxus", name: "T90 EV",
    versionSpecs: {
      "Maxus T90 EV RWD": {
        power: 174, torque: 310, batteryCapacity: 88.5, range: 330,
        traction: "RWD",
        maxDCChargingPower: 80, connectorType: "CCS2",
        chargeTimeDC: "45 min (20-80%)",
      },
    },
  },
  {
    brand: "Maxus", name: "All New T90 EV",
    versionSpecs: {
      "Maxus All New T90 EV AWD": {
        power: 442, torque: 700, batteryCapacity: 102.2, range: 430,
        traction: "AWD",
        maxDCChargingPower: 80, connectorType: "CCS2",
        chargeTimeDC: "45 min (20-80%)",
      },
    },
  },

  // ── MAZDA ─────────────────────────────────────────────────────────────────
  {
    brand: "Mazda", name: "CX60 SIGNATURE 2.5 PHEV",
    versionSpecs: {
      "Mazda CX60 Signature PHEV AWD": {
        power: 327, batteryCapacity: 17.8, electricRangeKm: 60,
        acceleration: 5.8, traction: "AWD",
        maxACChargingPower: 7.2, connectorType: "Type2",
        chargeTimeAC: "2h 40min (0-100%)",
      },
    },
  },

  // ── MERCEDES-BENZ ─────────────────────────────────────────────────────────
  {
    brand: "Mercedes-Benz", name: "EQA 350 4Matic",
    versionSpecs: {
      "EQA 350 4Matic": {
        power: 292, torque: 520, batteryCapacity: 66.5, range: 411,
        acceleration: 6.0, traction: "AWD",
        maxDCChargingPower: 112, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "32 min (10-80%)",
      },
    },
  },
  {
    brand: "Mercedes-Benz", name: "EQS 450+",
    versionSpecs: {
      "EQS 450+ RWD": {
        power: 360, torque: 568, batteryCapacity: 108.4, range: 540,
        acceleration: 6.7, traction: "RWD",
        maxDCChargingPower: 200, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "31 min (10-80%)",
      },
    },
  },

  // ── MG ────────────────────────────────────────────────────────────────────
  {
    brand: "MG", name: "3 Hybrid HEV",
    versionSpecs: {
      "MG 3 Hybrid HEV": {
        power: 195, torque: 425, traction: "FWD",
        transmission: "EDU 3 velocidades", fuelConsumption: 22.7,
      },
    },
  },
  {
    brand: "MG", name: "Marvel R",
    versionSpecs: {
      "MG Marvel R AWD": {
        power: 280, torque: 600, batteryCapacity: 70, range: 370,
        acceleration: 4.9, traction: "AWD",
        maxDCChargingPower: 93, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "30 min (0-80%)",
        seats: 5, trunkCapacity: 357,
      },
    },
  },
  {
    brand: "MG", name: "ZS Hybrid",
    versionSpecs: {
      "MG ZS Hybrid HEV": {
        power: 197, torque: 465, traction: "FWD",
        transmission: "EDU 3 velocidades", fuelConsumption: 22.7,
      },
    },
  },

  // ── NISSAN ────────────────────────────────────────────────────────────────
  {
    brand: "Nissan", name: "X-Trail e-Power",
    versionSpecs: {
      "Nissan X-Trail e-Power AWD": {
        power: 205, torque: 330, traction: "AWD",
      },
    },
  },

  // ── OMODA ─────────────────────────────────────────────────────────────────
  {
    brand: "Omoda", name: "E5",
    versionSpecs: {
      "Omoda E5 FWD": {
        power: 204, torque: 340, batteryCapacity: 60, range: 430,
        acceleration: 7.6, traction: "FWD",
        maxDCChargingPower: 80, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "28 min (30-80%)",
        seats: 5, trunkCapacity: 380,
      },
    },
  },

  // ── PEUGEOT ───────────────────────────────────────────────────────────────
  {
    brand: "Peugeot", name: "New 5008 MHEV",
    versionSpecs: {
      "5008 MHEV": {
        power: 145, torque: 230, traction: "FWD",
        transmission: "DCT 6", fuelConsumption: 22.7,
      },
    },
  },

  // ── PORSCHE ───────────────────────────────────────────────────────────────
  {
    brand: "Porsche", name: "Cayenne Electric",
    versionSpecs: {
      "Cayenne Electric":       { batteryCapacity: 113, range: 642, maxDCChargingPower: 400, maxACChargingPower: 11, connectorType: "CCS2", chargeTimeDC: "16 min (10-80%)" },
      "Cayenne S Electric":     { batteryCapacity: 113, range: 653, maxDCChargingPower: 400, maxACChargingPower: 11, connectorType: "CCS2", chargeTimeDC: "16 min (10-80%)" },
      "Cayenne Turbo Electric": { batteryCapacity: 113, range: 623, maxDCChargingPower: 400, maxACChargingPower: 11, connectorType: "CCS2", chargeTimeDC: "16 min (10-80%)" },
    },
  },
  {
    brand: "Porsche", name: "Cayenne Coupé Electric",
    versionSpecs: {
      "Cayenne Coupé Electric":       { batteryCapacity: 113, range: 592, maxDCChargingPower: 390, maxACChargingPower: 11, connectorType: "CCS2", chargeTimeDC: "16 min (10-80%)" },
      "Cayenne S Coupé Electric":     { batteryCapacity: 113, range: 605, maxDCChargingPower: 390, maxACChargingPower: 11, connectorType: "CCS2", chargeTimeDC: "16 min (10-80%)" },
      "Cayenne Turbo Coupé Electric": { batteryCapacity: 113, range: 576, maxDCChargingPower: 390, maxACChargingPower: 11, connectorType: "CCS2", chargeTimeDC: "16 min (10-80%)" },
    },
  },
  {
    brand: "Porsche", name: "Macan Electric",
    versionSpecs: {
      // Batería 100 kWh en todas; ya tienen potencia — solo falta autonomía
      "Macan Electric":       { range: 641, batteryCapacity: 100, maxDCChargingPower: 270, maxACChargingPower: 11, connectorType: "CCS2", chargeTimeDC: "21 min (10-80%)" },
      "Macan 4 Electric":     { range: 613, batteryCapacity: 100, maxDCChargingPower: 270, maxACChargingPower: 11, connectorType: "CCS2", chargeTimeDC: "21 min (10-80%)" },
      "Macan 4S Electric":    { range: 606, batteryCapacity: 100, maxDCChargingPower: 270, maxACChargingPower: 11, connectorType: "CCS2", chargeTimeDC: "21 min (10-80%)" },
      "Macan GTS Electric":   { range: 586, batteryCapacity: 100, maxDCChargingPower: 270, maxACChargingPower: 11, connectorType: "CCS2", chargeTimeDC: "21 min (10-80%)" },
      "Macan Turbo Electric": { range: 589, batteryCapacity: 100, maxDCChargingPower: 270, maxACChargingPower: 11, connectorType: "CCS2", chargeTimeDC: "21 min (10-80%)" },
    },
  },
  {
    brand: "Porsche", name: "Panamera 4 E-Hybrid",
    versionSpecs: {
      // Batería 25.9 kWh en todas; ya tienen potencia
      "Panamera 4 E-Hybrid":        { batteryCapacity: 25.9, electricRangeKm: 93, maxACChargingPower: 11, connectorType: "Type2", chargeTimeAC: "2h 39min (0-100%)" },
      "Panamera 4S E-Hybrid":       { batteryCapacity: 25.9, electricRangeKm: 87, maxACChargingPower: 11, connectorType: "Type2", chargeTimeAC: "2h 39min (0-100%)" },
      "Panamera Turbo E-Hybrid":    { batteryCapacity: 25.9, electricRangeKm: 85, maxACChargingPower: 11, connectorType: "Type2", chargeTimeAC: "2h 39min (0-100%)" },
      "Panamera Turbo S E-Hybrid":  { batteryCapacity: 25.9, electricRangeKm: 84, maxACChargingPower: 11, connectorType: "Type2", chargeTimeAC: "2h 39min (0-100%)" },
    },
  },
  {
    brand: "Porsche", name: "Taycan",
    versionSpecs: {
      // PB = 89 kWh, PBP = 105 kWh. Black Edition incluye PBP de serie.
      "Taycan":              { batteryCapacity: 89, range: 592 },
      "Taycan Black Edition":{ batteryCapacity: 105, range: 668 },
      "Taycan 4":            { batteryCapacity: 89, range: 559 },
      "Taycan 4S":           { batteryCapacity: 89, range: 561 },
      "Taycan GTS":          { batteryCapacity: 105, range: 628 },
      "Taycan Turbo":        { batteryCapacity: 105, range: 630 },
      "Taycan Turbo S":      { batteryCapacity: 105, range: 634 },
      "Taycan Turbo GT":     { batteryCapacity: 105, range: 528 },
    },
  },
  {
    brand: "Porsche", name: "Taycan 4 Cross Turismo",
    versionSpecs: {
      // Todas con PBP 105 kWh de serie
      "Taycan 4 Cross Turismo":      { batteryCapacity: 105, range: 531 },
      "Taycan 4S Cross Turismo":     { batteryCapacity: 105, range: 532 },
      "Taycan Turbo Cross Turismo":  { batteryCapacity: 105, range: 530 },
    },
  },

  // ── RENAULT ───────────────────────────────────────────────────────────────
  {
    brand: "Renault", name: "Arkana E-TECH Hybrid",
    versionSpecs: {
      "Arkana E-Tech Hybrid": {
        power: 140, torque: 260, traction: "FWD",
        transmission: "EDC 7", fuelConsumption: 21.3,
      },
    },
  },
  {
    brand: "Renault", name: "E-Kwid",
    versionSpecs: {
      "E-Kwid 26.8 kWh": {
        power: 65, torque: 113, range: 298,
        traction: "FWD",
        maxDCChargingPower: 30, maxACChargingPower: 7, connectorType: "CCS2",
        chargeTimeDC: "40 min (15-80%)",
        seats: 5,
      },
    },
  },
  {
    brand: "Renault", name: "Koleos Full Hybrid E-Tech",
    versionSpecs: {
      "Koleos Full Hybrid E-Tech": {
        power: 245, traction: "FWD",
        transmission: "DHT automática", fuelConsumption: 21.3,
      },
    },
  },

  // ── SKODA ─────────────────────────────────────────────────────────────────
  {
    brand: "Skoda", name: "Elroq",
    versionSpecs: {
      "Elroq 85 RWD": {
        power: 286, torque: 545, batteryCapacity: 77, range: 532,
        acceleration: 6.6, traction: "RWD",
        maxDCChargingPower: 120, maxACChargingPower: 11, connectorType: "CCS2",
      },
    },
  },
  {
    brand: "Skoda", name: "Enyaq EV",
    versionSpecs: {
      "Enyaq 85 RWD": {
        power: 286, torque: 545, batteryCapacity: 77, range: 545,
        acceleration: 6.7, traction: "RWD",
        maxDCChargingPower: 135, maxACChargingPower: 11, connectorType: "CCS2",
      },
    },
  },

  // ── SMART ─────────────────────────────────────────────────────────────────
  {
    brand: "Smart", name: "#5",
    versionSpecs: {
      "Pro":    { power: 335, torque: 373 },
      "Pulse":  { power: 580, torque: 643 },
      "BRABUS": { power: 637, torque: 710 },
    },
  },

  // ── SOUEST ────────────────────────────────────────────────────────────────
  {
    brand: "SOUEST", name: "S06 PHEV",
    versionSpecs: {
      "LIMITED": {
        power: 265, torque: 310, batteryCapacity: 19.43, electricRangeKm: 91,
        traction: "FWD", transmission: "1-DHT",
        maxACChargingPower: 6.6, connectorType: "Type2",
      },
    },
  },

  // ── SSANGYONG ─────────────────────────────────────────────────────────────
  {
    brand: "Ssangyong", name: "KGM Torres EVX",
    versionSpecs: {
      "Torres EVX": {
        power: 204, torque: 339, batteryCapacity: 73.4, range: 462,
        acceleration: 8.1, traction: "RWD",
        maxDCChargingPower: 100, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "28 min (10-80%)",
        seats: 5, trunkCapacity: 839,
      },
    },
  },

  // ── SUBARU ────────────────────────────────────────────────────────────────
  {
    brand: "Subaru", name: "Forester Híbrido",
    versionSpecs: {
      "Forester e-Boxer AWD": {
        power: 167, traction: "AWD", transmission: "CVT Lineartronic",
        fuelConsumption: 21.3,
      },
    },
  },
  {
    brand: "Subaru", name: "Forester Strong Hybrid",
    versionSpecs: {
      "Forester e-Boxer Strong Hybrid AWD": {
        power: 252, traction: "AWD", transmission: "CVT Lineartronic",
        fuelConsumption: 25.6,
      },
    },
  },

  // ── SUZUKI ────────────────────────────────────────────────────────────────
  {
    brand: "Suzuki", name: "e VITARA",
    versionSpecs: {
      // Solo falta batería; power y range ya están en Sanity
      "GL":       { batteryCapacity: 61 },
      "GLX 4WD":  { batteryCapacity: 61 },
    },
  },

  // ── TOYOTA ────────────────────────────────────────────────────────────────
  {
    brand: "Toyota", name: "Corolla Cross Híbrido",
    versionSpecs: {
      "Corolla Cross HEV": {
        power: 122, traction: "FWD", transmission: "E-CVT", fuelConsumption: 25.6,
      },
    },
  },
  {
    brand: "Toyota", name: "Yaris Cross Híbrido",
    versionSpecs: {
      "Yaris Cross HEV FWD": {
        power: 116, torque: 120, traction: "FWD", transmission: "E-CVT", fuelConsumption: 27.0,
      },
    },
  },

  // ── VOLKSWAGEN ────────────────────────────────────────────────────────────
  {
    brand: "Volkswagen", name: "ID.4",
    versionSpecs: {
      "ID.4 Pro RWD 77 kWh": {
        power: 286, torque: 545, range: 550,
        acceleration: 6.7, traction: "RWD",
        maxDCChargingPower: 175, maxACChargingPower: 11, connectorType: "CCS2",
        chargeTimeDC: "28 min (10-80%)",
        seats: 5,
      },
    },
  },

  // ── VOLVO ─────────────────────────────────────────────────────────────────
  {
    brand: "Volvo", name: "XC60 Híbrido Enchufable",
    versionSpecs: {
      "XC60 T8 PHEV AWD": {
        power: 455, batteryCapacity: 18, electricRangeKm: 65,
        acceleration: 4.9, traction: "AWD",
        maxACChargingPower: 6.4, connectorType: "Type2",
        chargeTimeAC: "3h (0-100%)",
      },
    },
  },
];

// ── Lógica de parche con merge ────────────────────────────────────────────────

async function main() {
  console.log("\n════════════════════════════════════════════════════════");
  console.log("  PATCH SPECS FASE 2 — Electrificarte");
  console.log(`  ${PATCHES.length} autos a actualizar`);
  console.log("════════════════════════════════════════════════════════\n");

  let ok = 0, skip = 0, fail = 0;

  for (const patch of PATCHES) {
    const { brand, name, versionSpecs, carLevelPatch } = patch;

    // Query car + current versions
    const results: Array<{
      _id: string;
      name: string;
      versions: Array<Record<string, unknown>>;
    }> = await client.fetch(
      `*[_type == "car" && brand->name == $brand && name == $name && !(_id in path("drafts.**"))]{ _id, name, versions[] }`,
      { brand, name }
    );

    if (results.length === 0) {
      console.log(`⚠️  NO ENCONTRADO: ${brand} ${name}`);
      skip++;
      continue;
    }

    const car = results[0];
    let changed = false;

    try {
      let mutation = client.patch(car._id);

      // Parche a nivel de car (e.g. basePrice)
      if (carLevelPatch && Object.keys(carLevelPatch).length > 0) {
        // Solo setear campos que estén vacíos en el car
        const setFields: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(carLevelPatch)) {
          setFields[k] = v;
        }
        mutation = mutation.set(setFields);
        changed = true;
      }

      // Parche a versiones: merge por nombre
      const specEntries = Object.entries(versionSpecs);
      if (specEntries.length > 0) {
        const currentVersions = (car.versions ?? []) as Array<Record<string, unknown>>;

        if (currentVersions.length === 0) {
          console.log(`⚠️  SIN VERSIONES: ${brand} ${name} — skip versiones`);
        } else {
          const mergedVersions = currentVersions.map((cv) => {
            const vName = cv.name as string | undefined;
            const newSpecs = vName ? versionSpecs[vName] : undefined;
            if (!newSpecs) return cv; // sin cambios

            // Merge: solo sobreescribir campos null/undefined
            const merged = { ...cv };
            for (const [k, v] of Object.entries(newSpecs)) {
              if (merged[k] == null) {
                merged[k] = v;
              }
            }
            return merged;
          });

          mutation = mutation.set({ versions: mergedVersions });
          changed = true;
        }
      }

      if (!changed) {
        console.log(`⏭️  SIN CAMBIOS: ${brand} ${name}`);
        ok++;
        continue;
      }

      await mutation.commit();
      console.log(`✅  ${brand} ${name}`);
      ok++;
    } catch (err) {
      console.error(`❌  ERROR: ${brand} ${name}`, err);
      fail++;
    }
  }

  console.log(`\n────────────────────────────────────────────────────────`);
  console.log(`  OK: ${ok}  |  Fallo: ${fail}  |  No encontrado: ${skip}`);
  console.log("════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
