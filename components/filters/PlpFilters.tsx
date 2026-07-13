"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, m } from "framer-motion";
import { FilterPill } from "./FilterPill";
import { FilterPanel } from "./FilterPanel";
import { SORT_OPTIONS } from "@/lib/filters/facets";
import type { ActiveFacets, FacetGroupOptions, FacetId, SortKey } from "@/lib/filters/types";

interface PlpFiltersProps {
  facetGroups: FacetGroupOptions[];
  active: ActiveFacets;
  sort: SortKey;
  onToggle: (id: FacetId, value: string) => void;
  onSortChange: (s: SortKey) => void;
  onClearAll: () => void;
  activeCount: number;
  total: number;
  count: number;
}

/**
 * Barra de filtros sobre la grilla: botón "Filtros (N)" que abre el panel, pills
 * rápidas del facet principal (desktop), chips removibles de lo activo, contador
 * de resultados y orden. Alineada al diseño del catálogo.
 */
export function PlpFilters({
  facetGroups,
  active,
  sort,
  onToggle,
  onSortChange,
  onClearAll,
  activeCount,
  total,
  count,
}: PlpFiltersProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  // Facet principal para acceso rápido (primer multi con ≥2 opciones).
  const quick = useMemo(
    () => facetGroups.find((g) => g.kind === "multi" && g.options.length > 1),
    [facetGroups]
  );

  // Chips de filtros activos (label resuelto desde las opciones).
  const chips = useMemo(() => {
    const out: { id: FacetId; value: string; label: string }[] = [];
    for (const group of facetGroups) {
      for (const value of active[group.id] ?? []) {
        const opt = group.options.find((o) => o.value === value);
        out.push({ id: group.id, value, label: opt?.label ?? value });
      }
    }
    return out;
  }, [facetGroups, active]);

  return (
    <div className="mb-8">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPanelOpen(true)}
          className="inline-flex items-center gap-2 flex-shrink-0 bg-white border border-gray-200 hover:border-primary/40 text-text-main font-semibold text-sm rounded-xl px-4 py-2 transition-all"
        >
          <span className="material-symbols-outlined text-[18px] text-primary-deep">tune</span>
          Filtros
          {activeCount > 0 && (
            <span className="bg-primary-deep text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {/* Pills rápidas del facet principal (desktop) */}
        {quick && (
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-1 min-w-0">
            {quick.options.slice(0, 8).map((opt) => {
              const isActive = (active[quick.id] ?? []).includes(opt.value);
              return (
                <FilterPill
                  key={opt.value}
                  active={isActive}
                  disabled={opt.count === 0}
                  count={opt.count}
                  onClick={() => onToggle(quick.id, opt.value)}
                >
                  {opt.label}
                </FilterPill>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0 ml-auto md:ml-0">
          <span className="text-xs text-text-ghost hidden sm:block">Ordenar:</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="text-xs font-semibold text-text-main bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary/40 cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Chips activos + contador ── */}
      <div className="flex items-center flex-wrap gap-2 mt-3">
        <AnimatePresence mode="wait">
          <m.p
            key={count}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="text-sm text-text-ghost mr-1"
          >
            <span className="font-bold text-text-main">{count}</span>
            {count !== total && <span className="text-text-ghost"> de {total}</span>} auto
            {count !== 1 ? "s" : ""}
          </m.p>
        </AnimatePresence>

        {chips.map((chip) => (
          <button
            key={`${chip.id}:${chip.value}`}
            onClick={() => onToggle(chip.id, chip.value)}
            className="inline-flex items-center gap-1 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary-deep border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            {chip.label}
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        ))}

        {activeCount > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-primary-deep transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Limpiar filtros
          </button>
        )}
      </div>

      <FilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        facetGroups={facetGroups}
        active={active}
        onToggle={onToggle}
        onClearAll={onClearAll}
        count={count}
        activeCount={activeCount}
      />
    </div>
  );
}
