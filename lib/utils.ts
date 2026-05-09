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
  const base = car.range ?? 0;
  const maxVer = car.maxVersionRange ?? 0;
  const effectiveRange = maxVer > base ? maxVer : base;
  const rangeLabel = maxVer > base ? `hasta ${effectiveRange} km` : effectiveRange > 0 ? `${effectiveRange} km` : null;

  const stat = (label: string, value: string | null | undefined) =>
    value ? { label, value } : null;

  // BEV — batería + autonomía
  const isBEV = tag === "BEV" || (!car.fuelConsumption && (car.battery ?? 0) >= 10 && tag !== "PHEV" && tag !== "HEV" && tag !== "MHEV" && tag !== "REEV");
  if (isBEV) {
    return [
      stat("Batería",   (car.battery ?? 0) >= 1 ? `${car.battery} kWh` : null),
      stat("Autonomía", rangeLabel),
    ].filter(Boolean) as { label: string; value: string }[];
  }

  // PHEV / REEV — autonomía eléctrica + rendimiento combinado
  const isPHEV = tag === "PHEV" || tag === "REEV" || ((car.electricRangeKm ?? 0) > 0 && (car.fuelConsumption ?? 0) > 0);
  if (isPHEV) {
    return [
      stat("Autonomía e-",  (car.electricRangeKm ?? 0) > 0 ? `${car.electricRangeKm} km` : null)
        ?? stat("Eficiencia e-", car.rendimientoElectrico ? `${car.rendimientoElectrico} km/kWh` : null),
      stat("Rendimiento", car.fuelConsumption ? `${car.fuelConsumption} km/L` : null),
    ].filter(Boolean) as { label: string; value: string }[];
  }

  // HEV / MHEV — rendimiento combustible + potencia
  const isHEV = tag === "HEV" || tag === "MHEV" || (car.fuelConsumption ?? 0) > 0;
  if (isHEV) {
    return [
      stat("Rendimiento", car.fuelConsumption ? `${car.fuelConsumption} km/L` : null),
      stat("Potencia",    (car.power ?? 0) > 0 ? `${car.power} CV` : null),
    ].filter(Boolean) as { label: string; value: string }[];
  }

  // Fallback — lo que haya disponible
  return [
    stat("Batería",   (car.battery ?? 0) >= 1 ? `${car.battery} kWh` : null),
    stat("Autonomía", rangeLabel),
    stat("Rendimiento", car.fuelConsumption ? `${car.fuelConsumption} km/L` : null),
  ].filter(Boolean).slice(0, 2) as { label: string; value: string }[];
}
