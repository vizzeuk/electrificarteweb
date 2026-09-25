"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FilterPill } from "./FilterPill";
import { FilterPanel } from "./FilterPanel";
import { SORT_OPTIONS } from "@/lib/filters/facets";
import type { ActiveFacets, FacetGroupOptions, FacetId, SortKey } from "@/lib/filters/types";
import { sentenceCase } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

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

/** Pills rápidas visibles en la barra (las más frecuentes; las activas siempre quedan). */
const QUICK_PILLS = 8;

/**
 * Etiqueta de una opción tal como se muestra. Solo presentación: el valor y la lógica del
 * facet no cambian. Tipos y tecnologías llegan de Sanity en Title Case; los rangos se
 * escriben en palabras ("$20M a $30M", "300 km o más", "7 o más").
 */
function optionLabel(id: FacetId, label: string): string {
  switch (id) {
    case "tipo":
    case "tecnologia":
      return sentenceCase(label);
    case "precio":
      return label.replace(/\s*[–—-]\s*/g, " a ");
    case "autonomia":
      return label.replace(/^(\d+)\+\s*km$/, "$1 km o más");
    case "asientos":
      return label.replace(/^(\d+)\+$/, "$1 o más");
    default:
      return label;
  }
}

/**
 * Barra de filtros del catálogo (sistema v1, app/styles/pages.css → .toolbar, .results):
 * botón "Filtros" con la cantidad activa, pills rápidas del facet principal, orden, contador
 * de resultados y tags removibles de lo activo. El panel completo vive en FilterPanel.
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  // Grupos con las etiquetas de presentación.
  const groups = useMemo(
    () =>
      facetGroups.map((g) => ({
        ...g,
        options: g.options.map((o) => ({ ...o, label: optionLabel(g.id, o.label) })),
      })),
    [facetGroups]
  );

  // Facet principal para acceso rápido (primer multi con ≥2 opciones): las más frecuentes.
  const quick = useMemo(() => groups.find((g) => g.kind === "multi" && g.options.length > 1), [groups]);
  const quickOptions = useMemo(() => {
    if (!quick) return [];
    const on = active[quick.id] ?? [];
    const top = [...quick.options]
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"))
      .slice(0, QUICK_PILLS);
    const extra = quick.options.filter((o) => on.includes(o.value) && !top.includes(o));
    return [...top, ...extra];
  }, [quick, active]);

  // Tags de filtros activos (etiqueta resuelta desde las opciones).
  const tags = useMemo(() => {
    const out: { id: FacetId; value: string; label: string }[] = [];
    for (const group of groups) {
      for (const value of active[group.id] ?? []) {
        const opt = group.options.find((o) => o.value === value);
        out.push({ id: group.id, value, label: opt?.label ?? value });
      }
    }
    return out;
  }, [groups, active]);

  const unit = (count !== total ? total : count) === 1 ? "auto" : "autos";

  return (
    <>
      <div className="toolbar">
        <button
          ref={triggerRef}
          type="button"
          className="btn btn--secondary"
          onClick={() => setPanelOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={panelOpen}
        >
          <Icon name="tune" size="none" />
          Filtros
          {activeCount > 0 && <span className="badge">{activeCount}</span>}
        </button>

        {quick && (
          <div className="pills" role="group" aria-label={quick.label}>
            {quickOptions.map((opt) => (
              <FilterPill
                key={opt.value}
                active={(active[quick.id] ?? []).includes(opt.value)}
                disabled={opt.count === 0}
                count={opt.count}
                onClick={() => onToggle(quick.id, opt.value)}
              >
                {opt.label}
              </FilterPill>
            ))}
          </div>
        )}

        <label className={quick ? "select" : "select ml-auto"}>
          <span className="sr-only">Ordenar</span>
          <select value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Icon name="expand_more" size="none" />
        </label>
      </div>

      <div className="results">
        <p className="results__count" aria-live="polite">
          <strong>{count}</strong>
          {count !== total && ` de ${total}`} {unit}
        </p>
        {tags.map((tag) => (
          <button
            key={`${tag.id}:${tag.value}`}
            type="button"
            className="tag-x"
            onClick={() => onToggle(tag.id, tag.value)}
            aria-label={`Quitar filtro: ${tag.label}`}
          >
            {tag.label}
            <Icon name="close" size="none" />
          </button>
        ))}
        {activeCount > 0 && (
          <button type="button" className="clear-all" onClick={onClearAll}>
            Limpiar filtros
          </button>
        )}
      </div>

      <FilterPanel
        open={panelOpen}
        onClose={closePanel}
        facetGroups={groups}
        active={active}
        onToggle={onToggle}
        onClearAll={onClearAll}
        count={count}
        activeCount={activeCount}
      />
    </>
  );
}

/**
 * "Ver más" del catálogo (sistema v1 → .more): barra de avance, "Mostrando N de M" y el
 * botón para cargar la página siguiente. Se oculta el botón cuando ya se ve todo.
 */
export function LoadMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (total === 0) return null;
  const pct = Math.min(100, Math.round((shown / total) * 100));
  return (
    <div className="more">
      <div className="more__bar" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </div>
      <p>
        Mostrando {shown} de {total}
      </p>
      {shown < total && (
        <button type="button" className="btn btn--secondary" onClick={onMore}>
          Ver más autos
          <Icon name="expand_more" size="none" />
        </button>
      )}
    </div>
  );
}
