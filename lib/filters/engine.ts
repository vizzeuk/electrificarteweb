// ─── Motor de filtros (funciones puras, sin React ni dependencias) ───────────

import type {
  ActiveFacets,
  FacetCar,
  FacetGroupOptions,
  FacetId,
  FacetOption,
  SortKey,
} from "./types";
import { FACETS, FACETS_BY_ID, type Facet } from "./facets";

// ─── Matching ────────────────────────────────────────────────────────────────

/** ¿El auto cumple el facet activo indicado? (grupo vacío = pasa) */
function matchesFacet(car: FacetCar, facet: Facet, values: string[]): boolean {
  if (!values || values.length === 0) return true;
  if (facet.kind === "multi") {
    const entry = facet.getEntry(car);
    return entry != null && values.includes(entry.value);
  }
  // threshold: single-select, el auto debe alcanzar el umbral elegido
  const tier = facet.tiers.find((t) => t.value === values[0]);
  if (!tier) return true;
  const m = facet.metric(car);
  return m != null && m >= tier.min;
}

/** ¿El auto pasa TODOS los facets activos (opcionalmente ignorando uno)? */
function matchesActive(car: FacetCar, active: ActiveFacets, exceptId?: FacetId): boolean {
  for (const facet of FACETS) {
    if (facet.id === exceptId) continue;
    const values = active[facet.id];
    if (values && values.length && !matchesFacet(car, facet, values)) return false;
  }
  return true;
}

/** ¿El auto pasa todos los filtros activos? (predicado público) */
export function carPasses(car: FacetCar, active: ActiveFacets): boolean {
  return matchesActive(car, active);
}

/** Filtra la lista completa por el estado activo. */
export function filterCars(cars: FacetCar[], active: ActiveFacets): FacetCar[] {
  return cars.filter((c) => matchesActive(c, active));
}

// ─── Orden ───────────────────────────────────────────────────────────────────

export function sortComparator(sort: SortKey): ((a: FacetCar, b: FacetCar) => number) | null {
  switch (sort) {
    case "price-asc":  return (a, b) => a.price - b.price;
    case "price-desc": return (a, b) => b.price - a.price;
    case "range-desc": return (a, b) => b.range - a.range;
    default:           return null; // "default" conserva el orden original (GROQ)
  }
}

// ─── Construcción de opciones con conteo contextual ──────────────────────────

/**
 * Para cada facet visible arma sus opciones. El SET de opciones sale del
 * universo completo (estable, no desaparece al seleccionar); el CONTEO sale de
 * los autos que pasan los *demás* filtros activos (faceted search real).
 */
export function buildFacetOptions(
  allCars: FacetCar[],
  facetIds: FacetId[],
  active: ActiveFacets
): FacetGroupOptions[] {
  return facetIds.map((id) => {
    const facet = FACETS_BY_ID[id];
    const others = allCars.filter((c) => matchesActive(c, active, id));

    if (facet.kind === "multi") {
      // Conjunto estable de valores desde el universo completo.
      const labelByValue = new Map<string, string>();
      for (const c of allCars) {
        const e = facet.getEntry(c);
        if (e && !labelByValue.has(e.value)) labelByValue.set(e.value, e.label);
      }
      // Conteo contra los demás filtros.
      const countByValue = new Map<string, number>();
      for (const c of others) {
        const e = facet.getEntry(c);
        if (e) countByValue.set(e.value, (countByValue.get(e.value) ?? 0) + 1);
      }
      let options: FacetOption[] = [...labelByValue].map(([value, label]) => ({
        value,
        label,
        count: countByValue.get(value) ?? 0,
      }));

      if (facet.optionSort) {
        options.sort(facet.optionSort);
      } else if (facet.order) {
        const idx = (v: string) => {
          const i = facet.order!.indexOf(v);
          return i === -1 ? 999 : i;
        };
        options.sort((a, b) => idx(a.value) - idx(b.value));
      } else {
        options.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"));
      }
      return { id, label: facet.label, icon: facet.icon, kind: "multi", options };
    }

    // threshold: tiers fijos; se muestran los que tienen datos en el universo.
    const options: FacetOption[] = facet.tiers
      .filter((t) => allCars.some((c) => { const m = facet.metric(c); return m != null && m >= t.min; }))
      .map((t) => ({
        value: t.value,
        label: t.label,
        count: others.filter((c) => { const m = facet.metric(c); return m != null && m >= t.min; }).length,
      }));
    return { id, label: facet.label, icon: facet.icon, kind: "threshold", options };
  });
}

/**
 * Facets que deben mostrarse: no es el facet de contexto de la página y tiene
 * suficientes datos (≥2 valores distintos para multi, ≥2 tiers con datos para
 * threshold).
 */
export function visibleFacetIds(allCars: FacetCar[], context: FacetId | null): FacetId[] {
  return FACETS.filter((facet) => {
    if (facet.id === context) return false;
    if (facet.kind === "multi") {
      const values = new Set<string>();
      for (const c of allCars) {
        const e = facet.getEntry(c);
        if (e) values.add(e.value);
        if (values.size >= 2) return true;
      }
      return false;
    }
    const tiersWithData = facet.tiers.filter((t) =>
      allCars.some((c) => { const m = facet.metric(c); return m != null && m >= t.min; })
    ).length;
    return tiersWithData >= 2;
  }).map((f) => f.id);
}

// ─── Utilidades de estado ────────────────────────────────────────────────────

export function countActive(active: ActiveFacets): number {
  return Object.values(active).reduce((n, vals) => n + (vals?.length ?? 0), 0);
}

// ─── Serialización a/desde la URL ────────────────────────────────────────────

const FACET_IDS = FACETS.map((f) => f.id);
const VALID_SORTS: SortKey[] = ["default", "price-asc", "price-desc", "range-desc"];

/** active + sort → query string (sin el "?" inicial). */
export function encodeFilters(active: ActiveFacets, sort: SortKey): string {
  const params = new URLSearchParams();
  for (const id of FACET_IDS) {
    const vals = active[id];
    if (vals && vals.length) params.set(id, vals.join(","));
  }
  if (sort !== "default") params.set("orden", sort);
  return params.toString();
}

/** query string → { active, sort }. Ignora claves/valores inválidos. */
export function decodeFilters(search: string): { active: ActiveFacets; sort: SortKey } {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const active: ActiveFacets = {};
  for (const id of FACET_IDS) {
    const raw = params.get(id);
    if (!raw) continue;
    const facet = FACETS_BY_ID[id];
    const valid =
      facet.kind === "multi"
        ? null // multi: cualquier valor no vacío se acepta (los inválidos filtran a 0)
        : new Set(facet.tiers.map((t) => t.value));
    let values = raw.split(",").map((v) => v.trim()).filter(Boolean);
    if (valid) values = values.filter((v) => valid.has(v)).slice(0, 1); // threshold: 1 valor
    if (values.length) active[id] = values;
  }
  const orden = params.get("orden") as SortKey | null;
  const sort: SortKey = orden && VALID_SORTS.includes(orden) ? orden : "default";
  return { active, sort };
}
