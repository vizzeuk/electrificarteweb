import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
}

export function carStats(car: CarStatInput): { label: string; value: string }[] {
  const tag = (car.electricTypeTag ?? "").toUpperCase();
  const base   = car.range ?? 0;
  const maxVer = car.maxVersionRange ?? 0;
  const eff    = maxVer > base ? maxVer : base;
  const rangeLabel = maxVer > base ? `hasta ${eff} km` : eff > 0 ? `${eff} km` : null;

  type S = { label: string; value: string };
  const out: S[] = [];
  const push = (label: string, val: string | null | undefined) => { if (val) out.push({ label, value: val }); };

  // BEV: autonomía → eficiencia → batería → potencia (tomar los 3 primeros con valor)
  const isBEV = tag === "BEV" || (!car.fuelConsumption && (car.battery ?? 0) >= 10 && tag !== "PHEV" && tag !== "HEV" && tag !== "MHEV" && tag !== "REEV");
  if (isBEV) {
    push("Autonomía",  rangeLabel);
    push("Eficiencia", car.rendimientoElectrico ? `${car.rendimientoElectrico} km/kWh` : null);
    push("Batería",    (car.battery ?? 0) >= 1 ? `${car.battery} kWh` : null);
    push("Potencia",   (car.power ?? 0) > 0 ? `${car.power} CV` : null);
    return out.slice(0, 3);
  }

  // PHEV / REEV: autonomía eléctrica → eficiencia e- → potencia
  // fuelConsumption for PHEVs is the WLTP ponderado value which can be unrealistically high (62+ km/L)
  // — prefer rendimientoElectrico (km/kWh) as the meaningful 2nd spec
  const isPHEV = tag === "PHEV" || tag === "REEV" || ((car.electricRangeKm ?? 0) > 0 && (car.fuelConsumption ?? 0) > 0);
  if (isPHEV) {
    if ((car.electricRangeKm ?? 0) > 0) push("Autonomía e-", `${car.electricRangeKm} km`);
    push("Eficiencia e-", car.rendimientoElectrico ? `${car.rendimientoElectrico} km/kWh` : null);
    push("Potencia",      (car.power ?? 0) > 0 ? `${car.power} CV` : null);
    return out.slice(0, 3);
  }

  // HEV / MHEV: rendimiento combustible → potencia → batería (si existe)
  const isHEV = tag === "HEV" || tag === "MHEV" || (car.fuelConsumption ?? 0) > 0;
  if (isHEV) {
    push("Rendimiento", car.fuelConsumption ? `${car.fuelConsumption} km/L` : null);
    push("Potencia",    (car.power ?? 0) > 0 ? `${car.power} CV` : null);
    push("Batería",     (car.battery ?? 0) > 0 ? `${car.battery} kWh` : null);
    return out.slice(0, 3);
  }

  // Fallback
  push("Batería",     (car.battery ?? 0) >= 1 ? `${car.battery} kWh` : null);
  push("Autonomía",   rangeLabel);
  push("Rendimiento", car.fuelConsumption ? `${car.fuelConsumption} km/L` : null);
  return out.slice(0, 3);
}
