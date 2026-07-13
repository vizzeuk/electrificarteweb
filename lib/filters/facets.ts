// ─── Catálogo declarativo de facets ──────────────────────────────────────────
//
// Cada facet sabe cómo extraer su valor de un `FacetCar` y cómo se muestra.
// El motor (engine.ts) es genérico: recorre este catálogo sin conocer los
// campos concretos. Agregar un facet nuevo = agregar una entrada acá.

import type { FacetCar, FacetId, FacetOption, SortKey } from "./types";

// ─── Facet "multi": varios valores seleccionables (OR dentro del grupo) ──────
interface MultiFacet {
  id: FacetId;
  label: string;
  icon: string; // Material Symbols
  kind: "multi";
  /** Valor+etiqueta de este auto para el facet, o null si no aplica. */
  getEntry: (car: FacetCar) => { value: string; label: string } | null;
  /** Orden fijo de valores (para buckets); si falta se ordena por conteo. */
  order?: string[];
  /** Comparador custom de opciones (tiene prioridad sobre `order`/conteo). */
  optionSort?: (a: FacetOption, b: FacetOption) => number;
}

// ─── Facet "threshold": un umbral mínimo, single-select (métrica ≥ min) ──────
interface ThresholdFacet {
  id: FacetId;
  label: string;
  icon: string;
  kind: "threshold";
  /** Métrica numérica del auto (o null si no tiene dato). */
  metric: (car: FacetCar) => number | null;
  /** Escalones disponibles, de mayor a menor exigencia según convenga. */
  tiers: { value: string; label: string; min: number }[];
}

export type Facet = MultiFacet | ThresholdFacet;

// ─── Buckets de precio (CLP) ─────────────────────────────────────────────────
export const PRICE_BUCKETS: { value: string; label: string; min: number; max: number }[] = [
  { value: "lt20",  label: "Menos de $20M", min: 0,          max: 20_000_000 },
  { value: "20-30", label: "$20M – $30M",   min: 20_000_000, max: 30_000_000 },
  { value: "30-40", label: "$30M – $40M",   min: 30_000_000, max: 40_000_000 },
  { value: "40-50", label: "$40M – $50M",   min: 40_000_000, max: 50_000_000 },
  { value: "gt50",  label: "Más de $50M",   min: 50_000_000, max: Infinity },
];

// ─── Labels de tracción ──────────────────────────────────────────────────────
export const TRACTION_LABELS: Record<string, string> = {
  FWD: "Delantera (FWD)",
  RWD: "Trasera (RWD)",
  AWD: "Total (AWD)",
};

// ─── Catálogo ────────────────────────────────────────────────────────────────
export const FACETS: Facet[] = [
  {
    id: "marca",
    label: "Marca",
    icon: "sell",
    kind: "multi",
    getEntry: (c) =>
      c.brandSlug ? { value: c.brandSlug, label: c.brandName || c.brandSlug } : null,
    optionSort: (a, b) => a.label.localeCompare(b.label, "es"),
  },
  {
    id: "tipo",
    label: "Tipo de vehículo",
    icon: "directions_car",
    kind: "multi",
    getEntry: (c) =>
      c.vehicleTypeSlug
        ? { value: c.vehicleTypeSlug, label: c.vehicleTypeLabel || c.vehicleTypeSlug }
        : null,
  },
  {
    id: "tecnologia",
    label: "Tecnología",
    icon: "bolt",
    kind: "multi",
    getEntry: (c) => {
      const tag = (c.electricTypeTag || "").toUpperCase();
      if (!tag) return null;
      return { value: tag, label: c.electricTypeLabel || tag };
    },
  },
  {
    id: "precio",
    label: "Precio",
    icon: "payments",
    kind: "multi",
    getEntry: (c) => {
      const b = PRICE_BUCKETS.find((x) => c.price >= x.min && c.price < x.max);
      return b ? { value: b.value, label: b.label } : null;
    },
    order: PRICE_BUCKETS.map((b) => b.value),
  },
  {
    id: "autonomia",
    label: "Autonomía",
    icon: "route",
    kind: "threshold",
    metric: (c) => (c.range > 0 ? c.range : null),
    tiers: [
      { value: "200", label: "200+ km", min: 200 },
      { value: "300", label: "300+ km", min: 300 },
      { value: "400", label: "400+ km", min: 400 },
      { value: "500", label: "500+ km", min: 500 },
    ],
  },
  {
    id: "asientos",
    label: "Asientos",
    icon: "airline_seat_recline_normal",
    kind: "multi",
    getEntry: (c) => {
      if (!c.seats || c.seats < 1) return null;
      return c.seats >= 7
        ? { value: "7plus", label: "7+" }
        : { value: String(c.seats), label: String(c.seats) };
    },
    optionSort: (a, b) => seatOrder(a.value) - seatOrder(b.value),
  },
  {
    id: "seguridad",
    label: "Seguridad",
    icon: "shield",
    kind: "threshold",
    metric: (c) => (c.euroNcap && c.euroNcap > 0 ? c.euroNcap : null),
    tiers: [
      { value: "5", label: "5 ★ Euro NCAP", min: 5 },
      { value: "4", label: "4 ★ o más", min: 4 },
      { value: "3", label: "3 ★ o más", min: 3 },
    ],
  },
  {
    id: "traccion",
    label: "Tracción",
    icon: "settings_input_composite",
    kind: "multi",
    getEntry: (c) => {
      const t = (c.traction || "").toUpperCase();
      if (!t) return null;
      return { value: t, label: TRACTION_LABELS[t] ?? c.traction };
    },
    order: ["FWD", "RWD", "AWD"],
  },
];

export const FACETS_BY_ID: Record<FacetId, Facet> = FACETS.reduce(
  (acc, f) => ({ ...acc, [f.id]: f }),
  {} as Record<FacetId, Facet>
);

function seatOrder(value: string): number {
  return value === "7plus" ? 7 : Number(value);
}

// ─── Opciones de orden (se conservan las existentes) ─────────────────────────
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default",    label: "Relevancia" },
  { value: "price-asc",  label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "range-desc", label: "Mayor autonomía" },
];
