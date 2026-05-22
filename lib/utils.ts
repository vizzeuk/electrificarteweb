import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeElectricLabel(tag: string | null | undefined, label: string | null | undefined): string | null {
  if ((tag ?? "").toUpperCase() === "MHEV") return "Micro Híbrido";
  return label ?? null;
}

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
}

/**
 * Devuelve las specs para mostrar en las tarjetas. Siempre intenta llegar a 3
 * specs CON VALOR — primero las relevantes al tipo de auto, luego rellena con
 * cualquier otra disponible. Nunca devuelve filas vacías ni "—": si un dato
 * falta, simplemente usa el siguiente que sí exista.
 */
export function carStats(car: CarStatInput): { label: string; value: string }[] {
  const tag = (car.electricTypeTag ?? "").toUpperCase();
  const base   = car.range ?? 0;
  const maxVer = car.maxVersionRange ?? 0;
  const eff    = maxVer > base ? maxVer : base;
  const rangeLabel = maxVer > base ? `hasta ${eff} km` : eff > 0 ? `${eff} km` : null;

  type S = { label: string; value: string };
  const out: S[] = [];
  const seen = new Set<string>();
  const add = (label: string, val: string | null | undefined) => {
    if (val && !seen.has(label)) { out.push({ label, value: val }); seen.add(label); }
  };

  const isPHEV = tag === "PHEV" || tag === "REEV" || tag === "EREV" ||
    ((car.electricRangeKm ?? 0) > 0 && (car.fuelConsumption ?? 0) > 0);
  const isHEV  = !isPHEV && (tag === "HEV" || tag === "MHEV" || (car.fuelConsumption ?? 0) > 0);

  // 1) Specs primarias según el tipo de auto.
  // El orden importa: las tarjetas chicas (home) muestran solo las 2 primeras.
  if (isPHEV) {
    add("Autonomía e-", (car.electricRangeKm ?? 0) > 0 ? `${car.electricRangeKm} km` : null);
    add("Batería", (car.battery ?? 0) >= 1 ? `${car.battery} kWh` : null);
    add("Eficiencia e-", car.rendimientoElectrico ? `${car.rendimientoElectrico} km/kWh` : null);
  } else if (isHEV) {
    add("Rendimiento", car.fuelConsumption ? `${car.fuelConsumption} km/L` : null);
    add("Batería", (car.battery ?? 0) >= 1 ? `${car.battery} kWh` : null);
  } else {
    add("Autonomía", rangeLabel);
    add("Batería", (car.battery ?? 0) >= 1 ? `${car.battery} kWh` : null);
    add("Eficiencia", car.rendimientoElectrico ? `${car.rendimientoElectrico} km/kWh` : null);
  }

  // 2) Relleno con cualquier otra spec disponible hasta completar 3.
  add("Potencia", (car.power ?? 0) > 0 ? `${car.power} CV` : null);
  add("0-100",    (car.acceleration ?? 0) > 0 ? `${car.acceleration} s` : null);
  add("Vel. máx", (car.topSpeed ?? 0) > 0 ? `${car.topSpeed} km/h` : null);
  add("Torque",   (car.torque ?? 0) > 0 ? `${car.torque} Nm` : null);
  add("Tracción", car.traction || null);
  add("Plazas",   (car.seats ?? 0) > 0 ? `${car.seats} plazas` : null);
  add("Autonomía", rangeLabel);

  // 3) Filler garantizado: el tipo de tecnología (siempre presente).
  add("Tipo",
    tag === "PHEV" || tag === "REEV" || tag === "EREV" ? "Híbrido enchufable" :
    tag === "HEV"  || tag === "MHEV" ? "Híbrido" :
    tag === "BEV"  || tag === "EV"   ? "100% eléctrico" : null);

  return out.slice(0, 3);
}
