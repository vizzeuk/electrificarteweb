// ─── Tipos compartidos del sistema de filtros de las PLP ─────────────────────
//
// El motor de filtros trabaja siempre sobre una vista normalizada `FacetCar`.
// Cada PLP tiene su propio shape de auto (TipoCarData / ElectricoCarData /
// BrandCarData) y provee un adaptador `toFacet(car) => FacetCar` al hook
// `useCarFilters`, de modo que el motor no conoce las diferencias entre páginas.

/** Vista normalizada de un auto para facetear. */
export interface FacetCar {
  slug: string;
  brandSlug: string;
  brandName: string;
  vehicleTypeSlug: string;
  vehicleTypeLabel: string;
  electricTypeTag: string;
  electricTypeLabel: string;
  /** Precio efectivo para buckets/orden: discountPrice ?? basePrice. */
  price: number;
  basePrice: number;
  discountPrice: number;
  /** Autonomía efectiva: max(range, maxVersionRange). */
  range: number;
  seats: number | null;
  /** Euro NCAP en estrellas (1–5). */
  euroNcap: number | null;
  /** Tracción cruda: FWD / RWD / AWD (o "" si no hay dato). */
  traction: string;
  isHotDeal: boolean;
  isNew: boolean;
}

/** id de cada facet — también es el nombre del query param en la URL. */
export type FacetId =
  | "marca"
  | "tipo"
  | "tecnologia"
  | "precio"
  | "autonomia"
  | "asientos"
  | "seguridad"
  | "traccion";

/** Estado activo: por cada facet, lista de valores seleccionados. */
export type ActiveFacets = Partial<Record<FacetId, string[]>>;

export type SortKey = "default" | "price-asc" | "price-desc" | "range-desc";

/** Una opción concreta dentro de un facet (con su conteo contextual). */
export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

/** Opciones agrupadas por facet, listas para renderizar. */
export interface FacetGroupOptions {
  id: FacetId;
  label: string;
  icon: string;
  /** `multi` = varios valores; `threshold` = un umbral (single-select ≥). */
  kind: "multi" | "threshold";
  options: FacetOption[];
}
