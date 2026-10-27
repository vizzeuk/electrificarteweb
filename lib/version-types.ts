// Versiones con otra electrificación o carrocería que el auto (ver VERSION_TYPES en
// lib/queries/car.ts). Los filtros son no excluyentes: el auto aparece en su tipo principal y en
// los de sus versiones. Estas funciones adaptan el auto crudo de Sanity para las PLP.

import { financiamientoDeVersion } from "@/lib/precios";

interface TypeRef { slug?: string | null; label?: string | null; tag?: string | null }

interface MatchVersion {
  _key?: string;
  name?: string;
  price?: number | null;
  discountPrice?: number | null;
  batteryCapacity?: number | null;
  range?: number | null;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  power?: number | null;
  traction?: string | null;
  seats?: number | null;
  electricType?: TypeRef | null;
  vehicleType?: TypeRef | null;
}

/** Lo mínimo que estas funciones leen del auto crudo (CAR_CARD_FIELDS). */
export interface RawTypedCar {
  basePrice?: number | null;
  discountPrice?: number | null;
  vehicleType?: TypeRef | null;
  electricType?: TypeRef | null;
  versionVehicleTypes?: TypeRef[] | null;
  versionElectricTypes?: TypeRef[] | null;
  matchVersion?: MatchVersion | null;
}

export interface ExtraTypes {
  extraVehicleTypes: { slug: string; label: string }[];
  extraElectricTypes: { tag: string; label: string }[];
}

function uniqueBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((t) => {
    const k = key(t);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Si el auto entra a una PLP por una versión y no por su tipo principal (ej. la E-Tense del DS 3
 * en /electrico/ev), la tarjeta muestra esa versión: su precio, sus specs y su tipo. Las specs
 * solo se heredan del auto si la versión es de la misma electrificación.
 */
export function showMatchVersion<T extends RawTypedCar & Record<string, unknown>>(car: T): T {
  const v = car.matchVersion;
  if (!v) return car;
  const sameElectric = (v.electricType?.tag ?? "") === (car.electricType?.tag ?? "");
  const pick = <K extends keyof MatchVersion>(k: K, carKey: string) =>
    v[k] ?? (sameElectric ? (car[carKey] as MatchVersion[K]) : null);
  return {
    ...car,
    // La card abre la ficha con esta versión elegida (ver AutoPageClient).
    versionKey: v._key ?? null,
    basePrice: v.price ?? car.basePrice,
    discountPrice: v.price ? financiamientoDeVersion(v, car) : car.discountPrice,
    range: pick("range", "range"),
    maxVersionRange: null,
    batteryCapacity: pick("batteryCapacity", "batteryCapacity"),
    electricRangeKm: pick("electricRangeKm", "electricRangeKm"),
    fuelConsumption: pick("fuelConsumption", "fuelConsumption"),
    rendimientoElectrico: pick("rendimientoElectrico", "rendimientoElectrico"),
    power: pick("power", "power"),
    traction: pick("traction", "traction"),
    seats: v.seats ?? (car.seats as number | null | undefined) ?? null,
    electricType: v.electricType ?? car.electricType,
    vehicleType: v.vehicleType ?? car.vehicleType,
    // El tipo principal original pasa a ser uno "extra" para los filtros.
    versionElectricTypes: [car.electricType, ...(car.versionElectricTypes ?? [])].filter(Boolean) as TypeRef[],
    versionVehicleTypes: [car.vehicleType, ...(car.versionVehicleTypes ?? [])].filter(Boolean) as TypeRef[],
  };
}

/** Tipos que suman las versiones, sin repetir el principal. Para `FacetCar`. */
export function extraTypes(car: RawTypedCar): ExtraTypes {
  const mainBody = car.vehicleType?.slug ?? "";
  const mainTag = (car.electricType?.tag ?? "").toUpperCase();
  return {
    extraVehicleTypes: uniqueBy(
      (car.versionVehicleTypes ?? [])
        .filter((t) => t?.slug && t.slug !== mainBody)
        .map((t) => ({ slug: t.slug as string, label: t.label ?? (t.slug as string) })),
      (t) => t.slug,
    ),
    extraElectricTypes: uniqueBy(
      (car.versionElectricTypes ?? [])
        .filter((t) => t?.tag && t.tag.toUpperCase() !== mainTag)
        .map((t) => ({ tag: (t.tag as string).toUpperCase(), label: t.label ?? (t.tag as string) })),
      (t) => t.tag,
    ),
  };
}
