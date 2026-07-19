import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeElectricLabel(tag: string | null | undefined, label: string | null | undefined): string | null {
  if ((tag ?? "").toUpperCase() === "MHEV") return "Micro Híbrido";
  return label ?? null;
}

// Etiqueta junto al badge HOT DEAL cuando Sanity aún no tiene el campo
// hotDealUrgencyLabel configurado. Nunca hardcodear una cantidad exacta acá.
export const DEFAULT_HOT_DEAL_LABEL = "Bonos exclusivos por tiempo limitado";

export function formatCLP(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "Consultar precio";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * Formatea una fecha ISO de forma DETERMINISTA — mismo resultado en el
 * servidor y en el cliente. Usa las partes UTC + nombres de mes fijos en vez
 * de `toLocaleDateString`, que depende del ICU/zona horaria de cada entorno
 * y provoca errores de hidratación.
 */
export function formatFecha(iso: string | null | undefined, long = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getUTCDate();
  const mi = d.getUTCMonth();
  return long
    ? `${day} de ${MESES_LARGO[mi]} de ${d.getUTCFullYear()}`
    : `${day} ${MESES_CORTO[mi]}`;
}

export function calculateDiscount(original: number, discounted: number): number {
  return Math.round(((original - discounted) / original) * 100);
}

/**
 * Quita un sufijo "| Electrificarte" al final de un título. El root layout ya
 * agrega ese sufijo vía metadata.title.template, así que los títulos (propios o
 * de Sanity) no deben incluirlo o saldría duplicado en la pestaña del navegador.
 */
export function stripBrandSuffix(title: string): string {
  return title.replace(/\s*\|\s*Electrificarte\s*$/i, "").trim();
}

interface AdCarInput {
  basePrice?: number | null;
  discountPrice?: number | null;
  isHotDeal?: boolean | null;
}

/**
 * Elige el auto destacado ("Publicidad") de una PLP cuando Sanity no define uno
 * manualmente (heroFeaturedCar). El objetivo es coherencia con el mensaje "El
 * mejor precio del mercado garantizado" y con el badge "Desde $X": prioriza una
 * oferta real, nunca el auto más caro del catálogo.
 *   1) Hot deals (mayor descuento primero)
 *   2) Cualquier auto con descuento real (mayor descuento primero)
 *   3) El más accesible (menor precio) — jamás el más caro
 */
export function pickFeaturedAdCar<T extends AdCarInput>(cars: T[] | null | undefined): T | undefined {
  if (!cars?.length) return undefined;
  const priceOf = (c: T) => c.discountPrice ?? c.basePrice ?? 0;
  const discountOf = (c: T) => Math.max(0, (c.basePrice ?? 0) - (c.discountPrice ?? c.basePrice ?? 0));

  const hotDeals = cars.filter((c) => c.isHotDeal);
  if (hotDeals.length) {
    return hotDeals.slice().sort((a, b) => discountOf(b) - discountOf(a))[0];
  }
  const discounted = cars.filter((c) => discountOf(c) > 0);
  if (discounted.length) {
    return discounted.slice().sort((a, b) => discountOf(b) - discountOf(a))[0];
  }
  return cars.slice().sort((a, b) => priceOf(a) - priceOf(b))[0];
}

export interface CarStatInput {
  battery?: number | null;
  range?: number | null;
  maxVersionRange?: number | null;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  electricTypeTag?: string | null;
  power?: number | null;
  acceleration?: number | null;
  topSpeed?: number | null;
  torque?: number | null;
  traction?: string | null;
  seats?: number | null;
  category?: string | null;
}

/**
 * Clasifica el auto en una de las tres familias de presentación a partir del
 * tag REAL de Sanity (EV / HEV / PHEV / MHEV / EREV), con heurística de respaldo
 * por specs. Única fuente de verdad — la usan carStats, heroStats y la PDP, para
 * no repetir el mapeo de tags (y no volver a chequear tags que no existen como
 * "BEV"/"REEV"). Devuelve la familia con la nomenclatura del sitio: "EV"
 * (100% eléctrico), "PHEV" (enchufable, incl. REEV/EREV) o "HEV" (híbrido/mild).
 */
export function classifyElectric(car: CarStatInput): "EV" | "PHEV" | "HEV" {
  const tag = (car.electricTypeTag ?? "").toUpperCase();
  const isPHEV = tag === "PHEV" || tag === "REEV" || tag === "EREV" ||
    ((car.electricRangeKm ?? 0) > 0 && (car.fuelConsumption ?? 0) > 0);
  if (isPHEV) return "PHEV";
  const isHEV = tag === "HEV" || tag === "MHEV" || (car.fuelConsumption ?? 0) > 0;
  if (isHEV) return "HEV";
  return "EV";
}

/**
 * Arma el pool COMPLETO de stats con valor, en orden de relevancia y sin
 * duplicados. Nunca incluye un dato faltante ("—"): si una spec no existe,
 * simplemente no entra y el pool sigue con la siguiente. `carStats` y
 * `heroStats` cortan este pool a N celdas.
 *
 * `opts.compact` usa las etiquetas y formatos cortos del hero de la PDP
 * (p. ej. "Autón. e-", "0–100", "5 plz"); sin él produce la salida de tarjeta
 * de catálogo, byte-idéntica a la histórica de `carStats`.
 */
type StatCell = { label: string; value: string };
function buildStatPool(car: CarStatInput, opts: { compact?: boolean } = {}): StatCell[] {
  const compact = opts.compact ?? false;
  const tag = (car.electricTypeTag ?? "").toUpperCase();
  const cls = classifyElectric(car);

  const base   = car.range ?? 0;
  const maxVer = car.maxVersionRange ?? 0;
  const eff    = maxVer > base ? maxVer : base;
  const rangeLabel = maxVer > base ? `hasta ${eff} km` : eff > 0 ? `${eff} km` : null;

  const out: StatCell[] = [];
  const seen = new Set<string>();
  const add = (label: string, val: string | null | undefined) => {
    if (val && !seen.has(label)) { out.push({ label, value: val }); seen.add(label); }
  };

  const batteryVal = (car.battery ?? 0) >= 1 ? `${car.battery} kWh` : null;
  const eficVal    = car.rendimientoElectrico ? `${car.rendimientoElectrico} km/kWh` : null;

  // 1) Specs primarias según el tipo de auto.
  if (cls === "PHEV") {
    add(compact ? "Autón. e-" : "Autonomía e-", (car.electricRangeKm ?? 0) > 0 ? `${car.electricRangeKm} km` : null);
    if (compact) {
      // En el hero la eficiencia es la 2ª stat destacada del PHEV.
      add("Efic. e-", eficVal);
      add("Batería", batteryVal);
    } else {
      add("Batería", batteryVal);
      add("Eficiencia e-", eficVal);
    }
  } else if (cls === "HEV") {
    add("Rendimiento", car.fuelConsumption ? `${car.fuelConsumption} km/L` : null);
    add("Batería", batteryVal);
  } else {
    add("Autonomía", rangeLabel);
    add("Batería", batteryVal);
    add(compact ? "Efic. e-" : "Eficiencia", eficVal);
  }

  // 2) Relleno con cualquier otra spec disponible.
  const powerVal  = (car.power ?? 0) > 0 ? `${car.power} CV` : null;
  const topVal    = (car.topSpeed ?? 0) > 0 ? `${car.topSpeed} km/h` : null;
  const torqueVal = (car.torque ?? 0) > 0 ? `${car.torque} Nm` : null;
  if (compact) {
    add("Potencia", powerVal);
    add("0–100",    (car.acceleration ?? 0) > 0 ? `${car.acceleration}s` : null);
    add("Torque",   torqueVal);
    add("Vel. máx", topVal);
    add("Tracción", car.traction || null);
    add("Autonomía", rangeLabel);
    // 3) Fillers garantizados (siempre presentes → jamás una celda vacía).
    add("Plazas",   `${car.seats || 5} plz`);
    add("Segmento", car.category || null);
  } else {
    add("Potencia", powerVal);
    add("0-100",    (car.acceleration ?? 0) > 0 ? `${car.acceleration} s` : null);
    add("Vel. máx", topVal);
    add("Torque",   torqueVal);
    add("Tracción", car.traction || null);
    add("Plazas",   (car.seats ?? 0) > 0 ? `${car.seats} plazas` : null);
    add("Autonomía", rangeLabel);
  }

  // Filler final por tecnología (siempre presente salvo tag desconocido).
  add("Tipo",
    tag === "PHEV" || tag === "REEV" || tag === "EREV" ? "Híbrido enchufable" :
    tag === "HEV"  || tag === "MHEV" ? "Híbrido" :
    tag === "BEV"  || tag === "EV"   ? "100% eléctrico" : null);

  return out;
}

/**
 * Specs para las tarjetas de catálogo/comparador. Siempre 3 celdas con valor,
 * priorizadas por tipo. Salida idéntica a la histórica (delega en buildStatPool).
 */
export function carStats(car: CarStatInput): { label: string; value: string }[] {
  return buildStatPool(car).slice(0, 3);
}

/**
 * Specs destacadas del hero de la PDP. Devuelve hasta `count` celdas, TODAS con
 * valor real — nunca un "—". Version-aware: el caller pasa los campos de la
 * versión seleccionada con fallback al auto.
 */
export function heroStats(car: CarStatInput, count = 4): { label: string; value: string }[] {
  return buildStatPool(car, { compact: true }).slice(0, count);
}
