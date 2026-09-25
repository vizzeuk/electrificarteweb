import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeElectricLabel(tag: string | null | undefined, label: string | null | undefined): string | null {
  if ((tag ?? "").toUpperCase() === "MHEV") return "Micro híbrido";
  return label ? sentenceCase(label) : null;
}

// Siglas y marcas que se escriben en mayúscula aunque el resto vaya en sentence case.
const UPPERCASE_WORDS = new Set([
  "EV", "BEV", "PHEV", "HEV", "MHEV", "REEV", "EREV", "SUV", "AWD", "RWD", "FWD", "CV", "DC", "AC",
  "BYD", "MG", "BMW", "GWM", "JAC", "GAC", "DFSK", "JMC", "IONIQ", "NCAP", "WLTP", "IA",
]);

/** Nombres propios que sentenceCase respeta aunque el texto venga en Title Case o MAYÚSCULA. */
const PROPER_WORDS = new Map(
  [
    "Tesla", "Hyundai", "Kia", "Volvo", "Porsche", "Toyota", "Nissan", "Renault", "Peugeot", "Citroën",
    "Chevrolet", "Ford", "Jeep", "Mazda", "Mercedes", "Benz", "Audi", "Volkswagen", "Mini", "Cupra",
    "Skoda", "Lexus", "Honda", "Subaru", "Suzuki", "Changan", "Chery", "Geely", "Jaecoo", "Omoda",
    "Deepal", "Zeekr", "Leapmotor", "Dongfeng", "Maxus", "Ora", "Haval", "Riddara", "Nammi", "Avatr",
    "Xpeng", "Polestar", "Fiat", "Opel", "Jetour", "Chile", "Santiago", "WhatsApp",
  ].map((w) => [w.toLowerCase(), w]),
);

function isAcronym(core: string): boolean {
  return UPPERCASE_WORDS.has(core.toUpperCase());
}

/**
 * Sentence case para textos que llegan en Title Case o MAYÚSCULA desde Sanity
 * ("Eléctrico Puro", "7 ASIENTOS"). Respeta siglas y marcas conocidas. Regla del
 * sistema de diseño: la mayúscula sostenida queda solo para siglas.
 * Si el texto ya viene en sentence case ("Lo mejor de Tesla") se devuelve tal cual,
 * para no pasar a minúscula nombres propios que no están en las listas.
 */
export function sentenceCase(text: string): string {
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}]/gu, ""))
    .filter((w) => w.length > 1);
  const allCaps = words.length > 0 && words.every((w) => w === w.toUpperCase());
  const rest = words.slice(1).filter((w) => !isAcronym(w));
  const capitalized = rest.filter((w) => /^\p{Lu}/u.test(w)).length;
  if (!allCaps && capitalized * 2 < rest.length) return text;

  let first = true;
  return text
    .split(/(\s+)/)
    .map((word) => {
      if (word === "" || /^\s+$/.test(word)) return word;
      const out = word
        .split("-")
        .map((part, i) => {
          const core = part.replace(/[^\p{L}\p{N}]/gu, "");
          if (!core) return part;
          if (isAcronym(core)) return part.toUpperCase();
          const proper = PROPER_WORDS.get(core.toLowerCase());
          if (proper) return part.replace(core, proper);
          const lower = part.toLowerCase();
          return first && i === 0 ? lower.replace(/\p{L}/u, (c) => c.toUpperCase()) : lower;
        })
        .join("-");
      if (/[\p{L}\p{N}]/u.test(word)) first = false;
      return out;
    })
    .join("");
}

/**
 * Reemplaza el punto medio como separador de listas ("Tang · Atto 8 · Shark") por comas.
 * Regla del sistema de diseño: el punto medio no se usa nunca, tampoco en contenido de Sanity.
 */
export function cleanSeparators(text: string | null | undefined): string {
  return (text ?? "").replace(/\s*·\s*/g, ", ").replace(/,\s*$/, "").trim();
}

/** Número en formato chileno: coma decimal y punto de miles (25,8 y 1.650). */
export function formatNumber(value: number | null | undefined, maxDecimals = 2): string {
  if (value == null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: maxDecimals }).format(value);
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
 * `opts.compact` prioriza las specs del hero de la PDP (eficiencia antes que batería
 * en los PHEV, 0 a 100 km/h antes que velocidad máxima). Cifras en formato chileno
 * (coma decimal) y etiquetas completas: sin abreviaturas tipo "Autón. e-".
 */
type StatCell = { label: string; value: string };
function buildStatPool(car: CarStatInput, opts: { compact?: boolean } = {}): StatCell[] {
  const compact = opts.compact ?? false;
  const tag = (car.electricTypeTag ?? "").toUpperCase();
  const cls = classifyElectric(car);

  const base   = car.range ?? 0;
  const maxVer = car.maxVersionRange ?? 0;
  const eff    = maxVer > base ? maxVer : base;
  const rangeLabel = maxVer > base ? `hasta ${formatNumber(eff)} km` : eff > 0 ? `${formatNumber(eff)} km` : null;

  const out: StatCell[] = [];
  const seen = new Set<string>();
  const add = (label: string, val: string | null | undefined) => {
    if (val && !seen.has(label)) { out.push({ label, value: val }); seen.add(label); }
  };

  const batteryVal = (car.battery ?? 0) >= 1 ? `${formatNumber(car.battery)} kWh` : null;
  const eficVal    = car.rendimientoElectrico ? `${formatNumber(car.rendimientoElectrico)} km/kWh` : null;

  // 1) Specs primarias según el tipo de auto.
  if (cls === "PHEV") {
    add("Autonomía eléctrica", (car.electricRangeKm ?? 0) > 0 ? `${formatNumber(car.electricRangeKm)} km` : null);
    if (compact) {
      // En el hero la eficiencia es la 2ª stat destacada del PHEV.
      add("Eficiencia eléctrica", eficVal);
      add("Batería", batteryVal);
    } else {
      add("Batería", batteryVal);
      add("Eficiencia eléctrica", eficVal);
    }
  } else if (cls === "HEV") {
    add("Rendimiento", car.fuelConsumption ? `${formatNumber(car.fuelConsumption)} km/L` : null);
    add("Batería", batteryVal);
  } else {
    add("Autonomía", rangeLabel);
    add("Batería", batteryVal);
    add("Eficiencia", eficVal);
  }

  // 2) Relleno con cualquier otra spec disponible.
  const powerVal  = (car.power ?? 0) > 0 ? `${car.power} CV` : null;
  const topVal    = (car.topSpeed ?? 0) > 0 ? `${car.topSpeed} km/h` : null;
  const torqueVal = (car.torque ?? 0) > 0 ? `${car.torque} Nm` : null;
  if (compact) {
    add("Potencia", powerVal);
    add("0 a 100 km/h", (car.acceleration ?? 0) > 0 ? `${formatNumber(car.acceleration)} s` : null);
    add("Torque",   torqueVal);
    add("Velocidad máxima", topVal);
    add("Tracción", car.traction || null);
    add("Autonomía", rangeLabel);
    // 3) Fillers garantizados (siempre presentes → jamás una celda vacía).
    add("Plazas",   `${car.seats || 5} plazas`);
    add("Segmento", car.category || null);
  } else {
    add("Potencia", powerVal);
    add("0 a 100 km/h", (car.acceleration ?? 0) > 0 ? `${formatNumber(car.acceleration)} s` : null);
    add("Velocidad máxima", topVal);
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
