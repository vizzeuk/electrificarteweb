"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActiveFacets, FacetCar, FacetId, SortKey } from "@/lib/filters/types";
import { FACETS_BY_ID } from "@/lib/filters/facets";
import {
  buildFacetOptions,
  carPasses,
  countActive,
  decodeFilters,
  encodeFilters,
  sortComparator,
  visibleFacetIds,
} from "@/lib/filters/engine";

interface UseCarFiltersOptions<T> {
  /** Adaptador estable (definir a nivel de módulo) raw → FacetCar. */
  toFacet: (car: T) => FacetCar;
  /** Facet propio de la página, se oculta. `null` = mostrar todos. */
  context: FacetId | null;
}

/**
 * Estado central de filtros de las PLP. Genérico sobre el shape de auto de cada
 * página: el filtrado/orden/opciones se calculan sobre la vista `FacetCar` y se
 * devuelve la lista original ya filtrada.
 *
 * Sincroniza con la URL sin navegar: lee `window.location.search` al montar y
 * escribe con `history.replaceState` (el filtrado es 100% cliente, así que no
 * queremos un round-trip de RSC por cada toggle). Esto preserva el prerender
 * del hero (no usa `useSearchParams`, que forzaría CSR bajo Suspense).
 */
export function useCarFilters<T>(cars: T[], { toFacet, context }: UseCarFiltersOptions<T>) {
  const [active, setActive] = useState<ActiveFacets>({});
  const [sort, setSort] = useState<SortKey>("default");
  const [hydrated, setHydrated] = useState(false);

  // Hidratar estado desde la URL una sola vez (post-mount → sin mismatch SSR).
  useEffect(() => {
    const { active: a, sort: s } = decodeFilters(window.location.search);
    if (Object.keys(a).length) setActive(a);
    if (s !== "default") setSort(s);
    setHydrated(true);
  }, []);

  // Reflejar el estado en la URL (sin recargar ni navegar).
  useEffect(() => {
    if (!hydrated) return;
    const qs = encodeFilters(active, sort);
    const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState(null, "", url);
  }, [active, sort, hydrated]);

  const facetCars = useMemo(
    () => cars.map((raw) => ({ raw, facet: toFacet(raw) })),
    [cars, toFacet]
  );
  const allFacets: FacetCar[] = useMemo(() => facetCars.map((x) => x.facet), [facetCars]);

  const visibleIds = useMemo(() => visibleFacetIds(allFacets, context), [allFacets, context]);
  const facetGroups = useMemo(
    () => buildFacetOptions(allFacets, visibleIds, active),
    [allFacets, visibleIds, active]
  );

  const filtered = useMemo(() => {
    const passing = facetCars.filter((x) => carPasses(x.facet, active));
    const cmp = sortComparator(sort);
    const ordered = cmp ? [...passing].sort((a, b) => cmp(a.facet, b.facet)) : passing;
    return ordered.map((x) => x.raw);
  }, [facetCars, active, sort]);

  const toggle = useCallback((facetId: FacetId, value: string) => {
    setActive((prev) => {
      const facet = FACETS_BY_ID[facetId];
      const cur = prev[facetId] ?? [];
      const next =
        facet.kind === "threshold"
          ? cur[0] === value
            ? []
            : [value] // single-select
          : cur.includes(value)
            ? cur.filter((v) => v !== value)
            : [...cur, value];
      const copy = { ...prev };
      if (next.length) copy[facetId] = next;
      else delete copy[facetId];
      return copy;
    });
  }, []);

  const clearGroup = useCallback((facetId: FacetId) => {
    setActive((prev) => {
      if (!prev[facetId]) return prev;
      const copy = { ...prev };
      delete copy[facetId];
      return copy;
    });
  }, []);

  const clearAll = useCallback(() => setActive({}), []);

  return {
    filtered,
    facetGroups,
    active,
    sort,
    setSort,
    toggle,
    clearGroup,
    clearAll,
    activeCount: countActive(active),
    total: cars.length,
    count: filtered.length,
  };
}

export type UseCarFiltersReturn<T> = ReturnType<typeof useCarFilters<T>>;
