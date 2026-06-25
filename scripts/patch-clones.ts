/**
 * patch-clones.ts
 *
 * Actualiza los specs de versiones en Sanity para los 27 autos con versiones
 * clonas (specs idénticos/vacíos). También corrige el tipo eléctrico del
 * Suzuki Across (MHEV, no PHEV).
 *
 * Fuentes: webs oficiales chilenas + autocosmos.cl + rutamotor.com
 *
 * Uso: npx tsx --env-file=.env.local scripts/patch-clones.ts
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
// Cada entrada: { brand, name, versions[] }
// brand = nombre exacto de la marca en Sanity
// name  = nombre exacto del auto en Sanity

const patches: Array<{
  brand: string;
  name: string;
  versions: V[];
  extraSet?: Record<string, unknown>; // campos top-level adicionales a setear
}> = [

  // ── GEELY ─────────────────────────────────────────────────────────────────
  {
    brand: "Geely",
    name: "EX5",
    versions: [
      v({ name: "EX5 Pro", price: 30990000, batteryCapacity: 60.22, batteryType: "LFP",
          range: 425, power: 218, torque: 320, acceleration: 6.9, topSpeed: 175,
          traction: "FWD", maxDCChargingPower: 100, maxACChargingPower: 11,
          connectorType: "CCS2", chargeTimeDC: "20 min (30-80%)", chargeTimeAC: "6h (10-100%)",
          seats: 5, trunkCapacity: 461 }),
      v({ name: "EX5 Max", price: 33990000, batteryCapacity: 60.22, batteryType: "LFP",
          range: 430, power: 218, torque: 320, acceleration: 7.1, topSpeed: 175,
          traction: "FWD", maxDCChargingPower: 110, maxACChargingPower: 11,
          connectorType: "CCS2", chargeTimeDC: "20 min (30-80%)", chargeTimeAC: "6h (10-100%)",
          seats: 5, trunkCapacity: 461 }),
    ],
  },
  {
    brand: "Geely",
    name: "EX5 EM-i",
    versions: [
      v({ name: "EX5 EM-i Pro", price: 22490000, batteryCapacity: 18.4, batteryType: "LFP",
          electricRangeKm: 105, power: 215, torque: 262, acceleration: 8.2,
          traction: "FWD", maxDCChargingPower: 30, maxACChargingPower: 6.6,
          motorDescription: "Motor Eléctrico 215 HP + Motor 1.5L 98 HP",
          seats: 5, trunkCapacity: 528 }),
      v({ name: "EX5 EM-i Max", price: 24490000, batteryCapacity: 18.4, batteryType: "LFP",
          electricRangeKm: 105, power: 215, torque: 262, acceleration: 8.0,
          traction: "FWD", maxDCChargingPower: 60, maxACChargingPower: 6.6,
          motorDescription: "Motor Eléctrico 215 HP + Motor 1.5L 98 HP",
          seats: 5, trunkCapacity: 528 }),
      v({ name: "EX5 EM-i Max+", price: 26990000, batteryCapacity: 29.8, batteryType: "LFP",
          electricRangeKm: 170, power: 215, torque: 262, acceleration: 8.0,
          traction: "FWD", maxDCChargingPower: 60, maxACChargingPower: 6.6,
          motorDescription: "Motor Eléctrico 215 HP + Motor 1.5L 98 HP",
          seats: 5, trunkCapacity: 528 }),
    ],
  },
  {
    // E-DMi no existe en Chile como modelo separado — ocultar
    brand: "Geely",
    name: "EX5 E-DMi",
    versions: [],
    extraSet: { hidden: true },
  },
  {
    brand: "Geely",
    name: "EX2",
    versions: [
      v({ name: "EX2 Pro", price: 18990000, batteryCapacity: 39.4, batteryType: "LFP",
          range: 325, power: 114, torque: 150, acceleration: 11.5, topSpeed: 130,
          traction: "RWD", maxDCChargingPower: 70,
          connectorType: "CCS2", chargeTimeDC: "21 min (30-80%)", chargeTimeAC: "6h 30min (10-100%)",
          seats: 5, trunkCapacity: 375, frunkCapacity: 70 }),
      v({ name: "EX2 Max", price: 20490000, batteryCapacity: 39.4, batteryType: "LFP",
          range: 325, power: 114, torque: 150, acceleration: 11.5, topSpeed: 130,
          traction: "RWD", maxDCChargingPower: 70,
          connectorType: "CCS2", chargeTimeDC: "21 min (30-80%)", chargeTimeAC: "6h 30min (10-100%)",
          seats: 5, trunkCapacity: 375, frunkCapacity: 70 }),
    ],
  },

  // ── NAMMI ─────────────────────────────────────────────────────────────────
  {
    brand: "Nammi",
    name: "001",
    versions: [
      v({ name: "001 SR", price: 18990000, batteryCapacity: 31.4, batteryType: "LFP",
          range: 330, power: 94, torque: 160, acceleration: 12.5, topSpeed: 140,
          traction: "FWD", connectorType: "CCS2",
          chargeTimeDC: "30 min (20-80%)", chargeTimeAC: "9h 30min (0-100%)",
          seats: 5, trunkCapacity: 326 }),
      v({ name: "001 LR Full", price: 22990000, batteryCapacity: 42.3, batteryType: "LFP",
          range: 403, power: 94, torque: 160, acceleration: 12.5, topSpeed: 140,
          traction: "FWD", connectorType: "CCS2", chargeTimeDC: "30 min (20-80%)",
          seats: 5, trunkCapacity: 326 }),
      v({ name: "001 LR 6AB Elite", price: 23990000, batteryCapacity: 42.3, batteryType: "LFP",
          range: 430, power: 95, torque: 160, acceleration: 12.5, topSpeed: 140,
          traction: "FWD", maxDCChargingPower: 87, connectorType: "CCS2",
          chargeTimeDC: "30 min (20-80%)", seats: 5, trunkCapacity: 326 }),
    ],
  },

  // ── SUZUKI ────────────────────────────────────────────────────────────────
  {
    brand: "Suzuki",
    name: "Vitara Hybrid",
    versions: [
      v({ name: "GL MT 4x2", price: 19990000, power: 101, torque: 137,
          traction: "FWD", transmission: "MT 5 velocidades", fuelConsumption: 17.2,
          motorDescription: "1.5L Dualjet MHEV SHVS 12V", seats: 5, trunkCapacity: 310 }),
      v({ name: "GL AT 4x2", price: 21290000, power: 101, torque: 137,
          traction: "FWD", transmission: "AT 6 velocidades", fuelConsumption: 18.5,
          motorDescription: "1.5L Dualjet MHEV SHVS 12V", seats: 5, trunkCapacity: 310 }),
      v({ name: "GLX MT 4x2", price: 21690000, power: 101, torque: 137,
          traction: "FWD", transmission: "MT 5 velocidades", fuelConsumption: 17.2,
          motorDescription: "1.5L Dualjet MHEV SHVS 12V", seats: 5, trunkCapacity: 310 }),
      v({ name: "GLX AT 4x2", price: 23290000, power: 101, torque: 137,
          traction: "FWD", transmission: "AT 6 velocidades", fuelConsumption: 18.5,
          motorDescription: "1.5L Dualjet MHEV SHVS 12V", seats: 5, trunkCapacity: 310 }),
      v({ name: "Limited AT 4x4", price: 25590000, power: 101, torque: 137,
          traction: "AWD", transmission: "AT 6 velocidades", fuelConsumption: 18.5,
          motorDescription: "1.5L Dualjet MHEV SHVS 12V", seats: 5, trunkCapacity: 310 }),
    ],
  },
  {
    brand: "Suzuki",
    name: "Fronx Hybrid",
    versions: [
      v({ name: "GL MT", price: 17790000, power: 102, torque: 137,
          traction: "FWD", transmission: "MT 5 velocidades", fuelConsumption: 19.2,
          motorDescription: "1.5L Dualjet MHEV SHVS 12V", seats: 5, trunkCapacity: 304 }),
      v({ name: "GL AT", price: 19190000, power: 102, torque: 137,
          traction: "FWD", transmission: "AT 6 velocidades", fuelConsumption: 18.9,
          motorDescription: "1.5L Dualjet MHEV SHVS 12V", seats: 5, trunkCapacity: 304 }),
      v({ name: "GLX MT", price: 19290000, power: 102, torque: 137,
          traction: "FWD", transmission: "MT 5 velocidades", fuelConsumption: 19.2,
          motorDescription: "1.5L Dualjet MHEV SHVS 12V", seats: 5, trunkCapacity: 304 }),
      v({ name: "GLX AT", price: 20690000, power: 102, torque: 137,
          traction: "FWD", transmission: "AT 6 velocidades", fuelConsumption: 18.9,
          motorDescription: "1.5L Dualjet MHEV SHVS 12V", seats: 5, trunkCapacity: 304 }),
    ],
  },
  {
    brand: "Suzuki",
    name: "New Swift Hybrid",
    versions: [
      v({ name: "1.2 GL MT", price: 15090000, power: 80, torque: 112,
          traction: "FWD", transmission: "MT 5 velocidades", fuelConsumption: 23.3,
          motorDescription: "1.2L DualJet MHEV SHVS 12V", seats: 5, trunkCapacity: 265 }),
      v({ name: "1.2 GLX MT", price: 16290000, power: 80, torque: 112,
          traction: "FWD", transmission: "MT 5 velocidades", fuelConsumption: 23.3,
          motorDescription: "1.2L DualJet MHEV SHVS 12V", seats: 5, trunkCapacity: 265 }),
      v({ name: "1.2 GL CVT", price: 16590000, power: 80, torque: 112,
          traction: "FWD", transmission: "CVT", fuelConsumption: 22.7,
          motorDescription: "1.2L DualJet MHEV SHVS 12V", seats: 5, trunkCapacity: 265 }),
      v({ name: "1.2 GLX CVT", price: 17790000, power: 80, torque: 112,
          traction: "FWD", transmission: "CVT", fuelConsumption: 22.7,
          motorDescription: "1.2L DualJet MHEV SHVS 12V", seats: 5, trunkCapacity: 265 }),
    ],
  },
  {
    // Across Hybrid es MHEV (no PHEV) — sin carga externa, sin autonomía eléctrica
    brand: "Suzuki",
    name: "Across Hybrid",
    versions: [
      v({ name: "GL 5MT", price: 18490000, power: 101, torque: 137,
          traction: "FWD", transmission: "MT 5 velocidades", fuelConsumption: 16.5,
          motorDescription: "1.5L K15C MHEV SHVS 12V", seats: 5, trunkCapacity: 347 }),
      v({ name: "GL 6AT", price: 19990000, power: 101, torque: 137,
          traction: "FWD", transmission: "AT 6 velocidades", fuelConsumption: 15.8,
          motorDescription: "1.5L K15C MHEV SHVS 12V", seats: 5, trunkCapacity: 347 }),
      v({ name: "GLX 5MT", price: 19790000, power: 101, torque: 137,
          traction: "FWD", transmission: "MT 5 velocidades", fuelConsumption: 16.5,
          motorDescription: "1.5L K15C MHEV SHVS 12V", seats: 5, trunkCapacity: 333 }),
      v({ name: "GLX 6AT", price: 21690000, power: 101, torque: 137,
          traction: "FWD", transmission: "AT 6 velocidades", fuelConsumption: 15.8,
          motorDescription: "1.5L K15C MHEV SHVS 12V", seats: 5, trunkCapacity: 333 }),
    ],
  },

  // ── MG ────────────────────────────────────────────────────────────────────
  {
    brand: "MG",
    name: "4 Urban EV",
    versions: [
      v({ name: "43kWh COM", price: 18490000, batteryCapacity: 43, batteryType: "LFP",
          range: 325, power: 161, torque: 250, acceleration: 8.7, topSpeed: 160,
          traction: "FWD", maxDCChargingPower: 82, maxACChargingPower: 6.6,
          connectorType: "CCS2", chargeTimeDC: "28 min (10-80%)", seats: 5, trunkCapacity: 480 }),
      v({ name: "43kWh LUX", price: 19490000, batteryCapacity: 43, batteryType: "LFP",
          range: 325, power: 161, torque: 250, acceleration: 8.7, topSpeed: 160,
          traction: "FWD", maxDCChargingPower: 82, maxACChargingPower: 6.6,
          connectorType: "CCS2", chargeTimeDC: "28 min (10-80%)", seats: 5, trunkCapacity: 480 }),
    ],
  },
  {
    brand: "MG",
    name: "S5 EV",
    versions: [
      v({ name: "49kWh COM", price: 25490000, batteryCapacity: 49,
          range: 340, power: 168, torque: 250, acceleration: 8.0, topSpeed: 180,
          traction: "RWD", maxDCChargingPower: 139, maxACChargingPower: 11,
          connectorType: "CCS2", chargeTimeDC: "24 min (10-80%)", seats: 5, trunkCapacity: 453 }),
      v({ name: "49kWh LUX", price: 26490000, batteryCapacity: 49,
          range: 340, power: 168, torque: 250, acceleration: 8.0, topSpeed: 180,
          traction: "RWD", maxDCChargingPower: 139, maxACChargingPower: 11,
          connectorType: "CCS2", chargeTimeDC: "24 min (10-80%)", seats: 5, trunkCapacity: 453 }),
      v({ name: "62kWh LUX", price: 28490000, batteryCapacity: 62,
          range: 430, power: 168, torque: 250, acceleration: 8.0, topSpeed: 180,
          traction: "RWD", maxACChargingPower: 11,
          connectorType: "CCS2", seats: 5, trunkCapacity: 453 }),
    ],
  },

  // ── LEXUS ─────────────────────────────────────────────────────────────────
  {
    brand: "Lexus",
    name: "NX",
    versions: [
      v({ name: "NX 350h Premium 4x2", price: 48021708, power: 240, torque: 243,
          acceleration: 8.7, topSpeed: 200, traction: "FWD",
          motorDescription: "2.5L HEV 4 cilindros (Atkinson)", fuelConsumption: 20.0,
          seats: 5, trunkCapacity: 520 }),
      v({ name: "NX 350h Premium 4x4", price: 61133140, power: 240, torque: 243,
          acceleration: 7.7, topSpeed: 200, traction: "AWD",
          motorDescription: "2.5L HEV 4 cilindros (Atkinson)", fuelConsumption: 18.5,
          seats: 5, trunkCapacity: 520 }),
      v({ name: "NX 350h Luxury", price: 66133140, power: 240, torque: 243,
          acceleration: 7.7, topSpeed: 200, traction: "AWD",
          motorDescription: "2.5L HEV 4 cilindros (Atkinson)", fuelConsumption: 18.5,
          seats: 5, trunkCapacity: 520 }),
      v({ name: "NX 350h F Sport", price: 70633140, power: 240, torque: 243,
          acceleration: 7.7, topSpeed: 200, traction: "AWD",
          motorDescription: "2.5L HEV 4 cilindros (Atkinson)", fuelConsumption: 18.5,
          seats: 5, trunkCapacity: 520 }),
      v({ name: "NX 450h+ PHEV", price: 65493506, batteryCapacity: 18.1,
          electricRangeKm: 87, power: 304, acceleration: 6.3,
          traction: "AWD", maxACChargingPower: 6.6,
          chargeTimeAC: "2h 42min (0-100%)",
          motorDescription: "2.5L + 2 Motores Eléctricos E-Four",
          seats: 5, trunkCapacity: 520 }),
    ],
  },
  {
    brand: "Lexus",
    name: "UX",
    versions: [
      v({ name: "UX 300h Premium", price: 37248632, power: 196, torque: 202,
          acceleration: 8.1, topSpeed: 177, traction: "FWD",
          motorDescription: "2.0L HEV 4 cilindros (5ª generación)", fuelConsumption: 21.8,
          seats: 5, trunkCapacity: 220 }),
      v({ name: "UX 300h Luxury", price: 44809162, power: 196, torque: 202,
          acceleration: 7.9, topSpeed: 177, traction: "AWD",
          motorDescription: "2.0L HEV 4 cilindros (5ª generación)", fuelConsumption: 22.7,
          seats: 5, trunkCapacity: 220 }),
    ],
  },
  {
    brand: "Lexus",
    name: "LBX",
    versions: [
      v({ name: "LBX Urban", price: 29715615, power: 134, torque: 185,
          acceleration: 9.2, topSpeed: 170, traction: "FWD",
          motorDescription: "1.5L HEV 3 cilindros (5ª generación)", fuelConsumption: 26.3,
          seats: 5, trunkCapacity: 332 }),
      v({ name: "LBX Active", price: 32715615, power: 134, torque: 185,
          acceleration: 9.2, topSpeed: 170, traction: "FWD",
          motorDescription: "1.5L HEV 3 cilindros (5ª generación)", fuelConsumption: 26.3,
          seats: 5, trunkCapacity: 332 }),
    ],
  },

  // ── TOYOTA ────────────────────────────────────────────────────────────────
  {
    brand: "Toyota",
    name: "Corolla Híbrido",
    versions: [
      v({ name: "1.8 XLI HEV", price: 24790000, power: 122, torque: 142,
          acceleration: 12.2, topSpeed: 182, traction: "FWD",
          motorDescription: "1.8L HEV 4 cilindros (Atkinson)", fuelConsumption: 22.6,
          transmission: "eCVT", seats: 5, trunkCapacity: 470 }),
      v({ name: "1.8 XEI HEV", price: 25790000, power: 122, torque: 142,
          acceleration: 12.2, topSpeed: 182, traction: "FWD",
          motorDescription: "1.8L HEV 4 cilindros (Atkinson)", fuelConsumption: 22.6,
          transmission: "eCVT", seats: 5, trunkCapacity: 470 }),
      v({ name: "1.8 SEG HEV", price: 28290000, power: 122, torque: 142,
          acceleration: 12.2, topSpeed: 182, traction: "FWD",
          motorDescription: "1.8L HEV 4 cilindros (Atkinson)", fuelConsumption: 22.6,
          transmission: "eCVT", seats: 5, trunkCapacity: 470 }),
    ],
  },

  // ── PORSCHE ───────────────────────────────────────────────────────────────
  {
    brand: "Porsche",
    name: "Cayenne E-Hybrid",
    versions: [
      v({ name: "Cayenne E-Hybrid", price: 126700000, batteryCapacity: 25.9,
          electricRangeKm: 83, power: 470, torque: 650, acceleration: 4.9, topSpeed: 254,
          traction: "AWD", maxACChargingPower: 11, connectorType: "Type2",
          chargeTimeAC: "2h 12min (0-100%)", motorDescription: "3.0L V6 + Motor Eléctrico 177 CV",
          seats: 5, trunkCapacity: 627 }),
      v({ name: "Cayenne E-Hybrid Black Edition", price: 129500000, batteryCapacity: 25.9,
          electricRangeKm: 83, power: 470, torque: 650, acceleration: 4.9, topSpeed: 254,
          traction: "AWD", maxACChargingPower: 11, connectorType: "Type2",
          chargeTimeAC: "2h 12min (0-100%)", motorDescription: "3.0L V6 + Motor Eléctrico 177 CV",
          seats: 5, trunkCapacity: 627 }),
      v({ name: "Cayenne S E-Hybrid", price: 142100000, batteryCapacity: 25.9,
          electricRangeKm: 82, power: 519, torque: 750, acceleration: 4.7, topSpeed: 263,
          traction: "AWD", maxACChargingPower: 11, connectorType: "Type2",
          chargeTimeAC: "2h 12min (0-100%)", motorDescription: "3.0L V6 turbo 354 CV + Motor Eléctrico 177 CV",
          seats: 5, trunkCapacity: 627 }),
      v({ name: "Cayenne S E-Hybrid Black Edition", price: 145900000, batteryCapacity: 25.9,
          electricRangeKm: 82, power: 519, torque: 750, acceleration: 4.7, topSpeed: 263,
          traction: "AWD", maxACChargingPower: 11, connectorType: "Type2",
          chargeTimeAC: "2h 12min (0-100%)", motorDescription: "3.0L V6 turbo 354 CV + Motor Eléctrico 177 CV",
          seats: 5, trunkCapacity: 627 }),
      v({ name: "Cayenne Turbo E-Hybrid", price: 194900000, batteryCapacity: 25.9,
          electricRangeKm: 70, power: 739, torque: 950, acceleration: 3.7, topSpeed: 295,
          traction: "AWD", maxACChargingPower: 11, connectorType: "Type2",
          chargeTimeAC: "2h 30min (0-100%)", motorDescription: "4.0L V8 Biturbo + Motor Eléctrico 177 CV",
          seats: 5, trunkCapacity: 627 }),
    ],
  },
  {
    brand: "Porsche",
    name: "Cayenne E-Hybrid Coupé",
    versions: [
      v({ name: "Cayenne E-Hybrid Coupé", price: 127500000, batteryCapacity: 25.9,
          electricRangeKm: 74, power: 470, torque: 650, acceleration: 4.9, topSpeed: 254,
          traction: "AWD", maxACChargingPower: 11, connectorType: "Type2",
          chargeTimeAC: "2h 12min (0-100%)", motorDescription: "3.0L V6 + Motor Eléctrico 177 CV",
          seats: 4, trunkCapacity: 434 }),
      v({ name: "Cayenne E-Hybrid Coupé Black Edition", price: 130900000, batteryCapacity: 25.9,
          electricRangeKm: 74, power: 470, torque: 650, acceleration: 4.9, topSpeed: 254,
          traction: "AWD", maxACChargingPower: 11, connectorType: "Type2",
          chargeTimeAC: "2h 12min (0-100%)", motorDescription: "3.0L V6 + Motor Eléctrico 177 CV",
          seats: 4, trunkCapacity: 434 }),
      v({ name: "Cayenne S E-Hybrid Coupé", price: 144900000, batteryCapacity: 25.9,
          electricRangeKm: 77, power: 519, torque: 750, acceleration: 4.7, topSpeed: 263,
          traction: "AWD", maxACChargingPower: 11, connectorType: "Type2",
          chargeTimeAC: "2h 12min (0-100%)", motorDescription: "3.0L V6 turbo 354 CV + Motor Eléctrico 177 CV",
          seats: 4, trunkCapacity: 434 }),
      v({ name: "Cayenne S E-Hybrid Coupé Black Edition", price: 149900000, batteryCapacity: 25.9,
          electricRangeKm: 77, power: 519, torque: 750, acceleration: 4.7, topSpeed: 263,
          traction: "AWD", maxACChargingPower: 11, connectorType: "Type2",
          chargeTimeAC: "2h 12min (0-100%)", motorDescription: "3.0L V6 turbo 354 CV + Motor Eléctrico 177 CV",
          seats: 4, trunkCapacity: 434 }),
      v({ name: "Cayenne Turbo E-Hybrid Coupé", price: 196700000, batteryCapacity: 25.9,
          electricRangeKm: 70, power: 739, torque: 950, acceleration: 3.7, topSpeed: 295,
          traction: "AWD", maxACChargingPower: 11, connectorType: "Type2",
          chargeTimeAC: "2h 30min (0-100%)", motorDescription: "4.0L V8 Biturbo + Motor Eléctrico 177 CV",
          seats: 4, trunkCapacity: 434 }),
    ],
  },

  // ── VOLVO ─────────────────────────────────────────────────────────────────
  {
    brand: "Volvo",
    name: "XC90 Plug-in Hybrid",
    versions: [
      v({ name: "XC90 T8 Core", price: 82900000, batteryCapacity: 18.8,
          electricRangeKm: 71, power: 455, torque: 709, acceleration: 5.4, topSpeed: 180,
          traction: "AWD", maxACChargingPower: 6.4, connectorType: "Type2",
          chargeTimeAC: "3h (0-100%)", motorDescription: "2.0L Turbo 310 CV + Motor Eléctrico Trasero 145 CV",
          seats: 7, seatRows: 3 }),
      v({ name: "XC90 T8 Plus", price: 89900000, batteryCapacity: 18.8,
          electricRangeKm: 71, power: 455, torque: 709, acceleration: 5.4, topSpeed: 180,
          traction: "AWD", maxACChargingPower: 6.4, connectorType: "Type2",
          chargeTimeAC: "3h (0-100%)", motorDescription: "2.0L Turbo 310 CV + Motor Eléctrico Trasero 145 CV",
          seats: 7, seatRows: 3 }),
      v({ name: "XC90 T8 Ultra", price: 94900000, batteryCapacity: 18.8,
          electricRangeKm: 71, power: 455, torque: 709, acceleration: 5.4, topSpeed: 180,
          traction: "AWD", maxACChargingPower: 6.4, connectorType: "Type2",
          chargeTimeAC: "3h (0-100%)", motorDescription: "2.0L Turbo 310 CV + Motor Eléctrico Trasero 145 CV",
          seats: 7, seatRows: 3 }),
      v({ name: "XC90 T8 Ultra Dark", price: 95900000, batteryCapacity: 18.8,
          electricRangeKm: 71, power: 455, torque: 709, acceleration: 5.4, topSpeed: 180,
          traction: "AWD", maxACChargingPower: 6.4, connectorType: "Type2",
          chargeTimeAC: "3h (0-100%)", motorDescription: "2.0L Turbo 310 CV + Motor Eléctrico Trasero 145 CV",
          seats: 7, seatRows: 3 }),
    ],
  },

  // ── PEUGEOT ───────────────────────────────────────────────────────────────
  {
    brand: "Peugeot",
    name: "NEW 3008 MHEV",
    versions: [
      v({ name: "Allure", price: 30790000, power: 136, torque: 230,
          acceleration: 10.2, topSpeed: 201, traction: "FWD",
          motorDescription: "1.2L PureTech + Motor 48V 28 CV", fuelConsumption: 18.2,
          transmission: "e-DCS6 6 velocidades", seats: 5, trunkCapacity: 520 }),
      v({ name: "Premiere", price: 31290000, power: 136, torque: 230,
          acceleration: 10.2, topSpeed: 201, traction: "FWD",
          motorDescription: "1.2L PureTech + Motor 48V 28 CV", fuelConsumption: 18.2,
          transmission: "e-DCS6 6 velocidades", seats: 5, trunkCapacity: 520 }),
      v({ name: "GT", price: 37290000, power: 136, torque: 230,
          acceleration: 10.2, topSpeed: 201, traction: "FWD",
          motorDescription: "1.2L PureTech + Motor 48V 28 CV", fuelConsumption: 18.2,
          transmission: "e-DCS6 6 velocidades", seats: 5, trunkCapacity: 520 }),
    ],
  },

  // ── AUDI ──────────────────────────────────────────────────────────────────
  {
    brand: "Audi",
    name: "Q4 Sportback e-tron",
    versions: [
      v({ name: "Q4 Sportback 45 e-tron", price: 66990000, batteryCapacity: 82,
          range: 546, power: 286, torque: 545, acceleration: 6.7, topSpeed: 180,
          traction: "RWD", maxDCChargingPower: 175, maxACChargingPower: 11,
          connectorType: "CCS2", chargeTimeDC: "30 min (0-80%)", chargeTimeAC: "7h (0-100%)",
          motorDescription: "Motor Eléctrico Trasero 210 kW",
          seats: 5, trunkCapacity: 520 }),
      v({ name: "Q4 Sportback 45 e-tron S line", price: 71990000, batteryCapacity: 82,
          range: 546, power: 286, torque: 545, acceleration: 6.7, topSpeed: 180,
          traction: "RWD", maxDCChargingPower: 175, maxACChargingPower: 11,
          connectorType: "CCS2", chargeTimeDC: "30 min (0-80%)", chargeTimeAC: "7h (0-100%)",
          motorDescription: "Motor Eléctrico Trasero 210 kW",
          seats: 5, trunkCapacity: 520 }),
    ],
  },

  // ── BAIC ──────────────────────────────────────────────────────────────────
  {
    brand: "BAIC",
    name: "BJ60 MHEV",
    versions: [
      v({ name: "2.0T Luxury 5S 8AT", price: 41490000, power: 252, torque: 400,
          traction: "AWD", transmission: "AT 8 velocidades", fuelConsumption: 8.8,
          motorDescription: "2.0L Turbo + Motor 48V BSG", seats: 5 }),
      v({ name: "2.0T Exclusive 7S 8AT", price: 45990000, power: 252, torque: 400,
          traction: "AWD", transmission: "AT 8 velocidades", fuelConsumption: 8.8,
          motorDescription: "2.0L Turbo + Motor 48V BSG", seats: 7, seatRows: 3 }),
      v({ name: "2.0T Flagship 7S 8AT", price: 49990000, power: 252, torque: 400,
          traction: "AWD", transmission: "AT 8 velocidades", fuelConsumption: 8.8,
          motorDescription: "2.0L Turbo + Motor 48V BSG", seats: 7, seatRows: 3 }),
    ],
  },

  // ── BMW ───────────────────────────────────────────────────────────────────
  {
    // xDrive40 Atelier fue reemplazado por xDrive45 Atelier en jun 2025
    brand: "BMW",
    name: "iX xDrive40 Atelier",
    versions: [
      v({ name: "iX xDrive45 Atelier", price: 106900000, batteryCapacity: 94.8,
          range: 602, power: 408, torque: 700, acceleration: 5.1, topSpeed: 200,
          traction: "AWD", maxDCChargingPower: 175, maxACChargingPower: 11,
          connectorType: "CCS2", chargeTimeDC: "35 min (10-80%)",
          motorDescription: "2 Motores Eléctricos xDrive",
          seats: 5 }),
    ],
    extraSet: { name: "iX xDrive45 Atelier" }, // renombrar el documento también
  },

  // ── CHANGAN ───────────────────────────────────────────────────────────────
  {
    brand: "Changan",
    name: "Eado Plus iDD",
    versions: [
      v({ name: "iDD Luxury", price: 22990000, batteryCapacity: 18.4, batteryType: "LFP",
          electricRangeKm: 120, power: 266, torque: 463, traction: "FWD",
          motorDescription: "Motor Eléctrico 212 HP + Motor 1.5L 105 HP", maxACChargingPower: 6.6,
          seats: 5 }),
      v({ name: "iDD Elite", price: 24990000, batteryCapacity: 18.4, batteryType: "LFP",
          electricRangeKm: 120, power: 266, torque: 463, traction: "FWD",
          motorDescription: "Motor Eléctrico 212 HP + Motor 1.5L 105 HP", maxACChargingPower: 6.6,
          seats: 5 }),
    ],
  },

  // ── CUPRA ─────────────────────────────────────────────────────────────────
  {
    brand: "Cupra",
    name: "Terramar",
    versions: [
      v({ name: "1.5 TSI mHEV AT 150hp", price: 37990000, power: 150, torque: 250,
          acceleration: 9.3, traction: "FWD", transmission: "DSG 7 velocidades",
          motorDescription: "1.5L TSI + Motor 48V", fuelConsumption: 19.6,
          seats: 5 }),
      v({ name: "High 1.5 TSI mHEV AT 150hp", price: 41990000, power: 150, torque: 250,
          acceleration: 9.3, traction: "FWD", transmission: "DSG 7 velocidades",
          motorDescription: "1.5L TSI + Motor 48V", fuelConsumption: 19.6,
          seats: 5 }),
      v({ name: "High 1.5 TSI mHEV AT | Pintura Mate", price: 43490000, power: 150, torque: 250,
          acceleration: 9.3, traction: "FWD", transmission: "DSG 7 velocidades",
          motorDescription: "1.5L TSI + Motor 48V", fuelConsumption: 19.6,
          seats: 5 }),
    ],
  },

  // ── FORD ──────────────────────────────────────────────────────────────────
  {
    brand: "Ford",
    name: "Territory",
    versions: [
      v({ name: "Trend 1.5L AT", price: 22590000, power: 158, torque: 248,
          traction: "FWD", transmission: "DCT 7 velocidades",
          motorDescription: "1.5L EcoBoost Turbo", seats: 5 }),
      v({ name: "Titanium 1.5L AT", price: 29190000, power: 158, torque: 248,
          traction: "FWD", transmission: "DCT 7 velocidades",
          motorDescription: "1.5L EcoBoost Turbo", seats: 5 }),
      v({ name: "Titanium Híbrida 1.5L FHEV", price: 32590000, power: 212, torque: 315,
          acceleration: 8.5, traction: "FWD", transmission: "DHT 2 velocidades",
          motorDescription: "1.5L EcoBoost Miller + Motor Eléctrico 212 HP", fuelConsumption: 17.9,
          seats: 5 }),
    ],
  },

  // ── HYUNDAI ───────────────────────────────────────────────────────────────
  {
    brand: "Hyundai",
    name: "All New Palisade Híbrido",
    versions: [
      v({ name: "Limited", price: 58990000, power: 330, torque: 460,
          traction: "AWD", transmission: "Automática 6 velocidades",
          motorDescription: "2.5T Turbo + 2 Motores Eléctricos HTRAC", fuelConsumption: 12.1,
          seats: 8, seatRows: 3 }),
      v({ name: "Calligraphy", price: 64990000, power: 330, torque: 460,
          traction: "AWD", transmission: "Automática 6 velocidades",
          motorDescription: "2.5T Turbo + 2 Motores Eléctricos HTRAC", fuelConsumption: 12.1,
          seats: 8, seatRows: 3 }),
      v({ name: "Calligraphy 7P", price: 65990000, power: 330, torque: 460,
          traction: "AWD", transmission: "Automática 6 velocidades",
          motorDescription: "2.5T Turbo + 2 Motores Eléctricos HTRAC", fuelConsumption: 12.1,
          seats: 7, seatRows: 3 }),
    ],
  },

  // ── JAECOO ────────────────────────────────────────────────────────────────
  {
    // Jaecoo C5 SHS = OMODA C5 SHS-H que es HEV (no PHEV). Ocultar duplicado.
    // El modelo real en Chile es OMODA C5 SHS-H — se actualiza en la entrada OMODA.
    brand: "Jaecoo",
    name: "C5 SHS",
    versions: [],
    extraSet: { hidden: true },
  },

  // ── OMODA ─────────────────────────────────────────────────────────────────
  {
    // OMODA C5 SHS-H es HEV autorrecargable — NO PHEV, NO autonomía eléctrica
    brand: "Omoda",
    name: "C5 SHS",
    versions: [
      v({ name: "C5 SHS-H Comfort 1.5T DHT", price: 19490000, power: 215, torque: 310,
          acceleration: 7.9, topSpeed: 175, traction: "FWD",
          motorDescription: "1.5T Turbo + Motor Eléctrico DHT", fuelConsumption: 18.8,
          transmission: "DHT automática", seats: 5 }),
      v({ name: "C5 SHS-H Luxury 1.5T DHT", price: 21490000, power: 215, torque: 310,
          acceleration: 7.9, topSpeed: 175, traction: "FWD",
          motorDescription: "1.5T Turbo + Motor Eléctrico DHT", fuelConsumption: 18.8,
          transmission: "DHT automática", seats: 5 }),
    ],
  },
];

// ── Ejecutar ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n════════════════════════════════════════════════");
  console.log("  PATCH VERSIONES CLONES — Electrificarte");
  console.log(`  ${patches.length} autos a actualizar`);
  console.log("════════════════════════════════════════════════\n");

  let ok = 0, fail = 0, skip = 0;

  for (const patch of patches) {
    const { brand, name, versions, extraSet } = patch;

    // Buscar el auto por marca + nombre exacto
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
        // Si versions está vacío solo aplicamos extraSet (ej: hidden: true)
        mutation = mutation.unset(["versions"]);
      }

      if (extraSet) {
        mutation = mutation.set(extraSet);
      }

      await mutation.commit();
      const label = (extraSet?.hidden === true)
        ? `🚫 OCULTO`
        : `✅ ${versions.length} versión(es)`;
      console.log(`${label}  ${brand} ${name}`);
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
