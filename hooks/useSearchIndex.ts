"use client";

import { useEffect, useMemo, useState } from "react";

export interface SearchCar {
  name: string;
  slug: string;
  brand: string | null;
  brandSlug: string | null;
  brandLogo: string | null;
  basePrice: number | null;
  discountPrice: number | null;
  type: string | null;
  versions: (string | null)[] | null;
}

export const normSearch = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// Una sola descarga por visita, compartida entre el buscador del navbar y el del hero.
let indexPromise: Promise<SearchCar[]> | null = null;

function loadIndex(): Promise<SearchCar[]> {
  indexPromise ??= fetch("/api/search-index")
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => {
      indexPromise = null; // permite reintentar en la próxima apertura
      return [];
    });
  return indexPromise;
}

/**
 * Índice liviano del catálogo (`/api/search-index`). Se descarga recién cuando `enabled`
 * pasa a true (al abrir o enfocar un buscador), así no pesa en la carga inicial.
 */
export function useSearchIndex(enabled: boolean, query: string, limit = 8) {
  const [index, setIndex] = useState<SearchCar[] | null>(null);
  const loading = enabled && index === null;

  useEffect(() => {
    if (!enabled || index) return;
    let alive = true;
    loadIndex().then((data) => alive && setIndex(data));
    return () => { alive = false; };
  }, [enabled, index]);

  const results = useMemo(() => {
    const q = normSearch(query);
    if (!index || !q) return [];
    return index
      .filter((c) =>
        normSearch(`${c.brand ?? ""} ${c.name} ${(c.versions ?? []).filter(Boolean).join(" ")}`).includes(q),
      )
      .slice(0, limit);
  }, [index, query, limit]);

  return { index, loading, results };
}
