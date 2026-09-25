"use client";

import { useEffect, useEffectEvent, useId, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ActiveFacets, FacetGroupOptions, FacetId } from "@/lib/filters/types";
import { Icon } from "@/components/ui/Icon";

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  facetGroups: FacetGroupOptions[];
  active: ActiveFacets;
  onToggle: (id: FacetId, value: string) => void;
  onClearAll: () => void;
  count: number;
  activeCount: number;
}

/**
 * Panel de filtros del sistema v1 (app/styles/pages.css → .drawer, .fgroup, .fopt): drawer
 * claro a la derecha en escritorio y hoja inferior en móvil (bajo `md`), con checks macizos.
 * El deslizamiento es CSS (`filter-panel-enter`, en globals.css: desde abajo en móvil y
 * desde la derecha en escritorio); framer solo hace el fundido del velo al abrir y cerrar.
 */
export function FilterPanel({
  open,
  onClose,
  facetGroups,
  active,
  onToggle,
  onClearAll,
  count,
  activeCount,
}: FilterPanelProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onEscape = useEffectEvent(() => onClose());

  // Bloqueo de scroll, cierre con Escape y foco inicial en el botón de cerrar.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="filter-drawer"
          className="drawer is-open max-md:items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="drawer__panel filter-panel-enter max-md:h-auto max-md:max-h-[92svh] max-md:w-full max-md:rounded-t-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer__head">
              <h2 id={titleId}>Filtros</h2>
              <button
                ref={closeRef}
                type="button"
                className="btn btn--secondary btn--icon btn--sm"
                onClick={onClose}
                aria-label="Cerrar filtros"
              >
                <Icon name="close" size="none" />
              </button>
            </div>

            <div className="drawer__body">
              {facetGroups.length === 0 ? (
                <p className="t-small py-8 text-center">No hay filtros disponibles para este catálogo.</p>
              ) : (
                facetGroups.map((group) => (
                  <PanelGroup
                    key={group.id}
                    group={group}
                    active={active[group.id] ?? []}
                    onToggle={onToggle}
                  />
                ))
              )}
            </div>

            <div className="drawer__foot">
              <button type="button" className="btn btn--secondary" onClick={onClearAll} disabled={activeCount === 0}>
                Limpiar
              </button>
              <button type="button" className="btn btn--primary" onClick={onClose}>
                Ver {count} {count === 1 ? "auto" : "autos"}
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

// ─── Grupo de opciones ───────────────────────────────────────────────────────
// `multi` = checkboxes (varios valores). `threshold` = radios de un solo umbral, con
// "Cualquiera" para quitarlo: el hook alterna el valor activo, así que volver a
// "Cualquiera" es togglear el umbral que está puesto.
function PanelGroup({
  group,
  active,
  onToggle,
}: {
  group: FacetGroupOptions;
  active: string[];
  onToggle: (id: FacetId, value: string) => void;
}) {
  const titleId = useId();
  const isThreshold = group.kind === "threshold";
  const current = active[0];

  return (
    <div className="fgroup" role="group" aria-labelledby={titleId}>
      <p className="fgroup__title" id={titleId}>
        {group.label}
      </p>
      <div className={cn("fopts", group.id === "marca" && "fopts--grid")}>
        {isThreshold && (
          <label className="fopt">
            <input
              type="radio"
              name={titleId}
              checked={!current}
              onChange={() => current && onToggle(group.id, current)}
            />
            <span className="box">
              <Icon name="check" size="none" />
            </span>
            <span className="lbl">Cualquiera</span>
          </label>
        )}
        {group.options.map((opt) => {
          const isActive = active.includes(opt.value);
          const disabled = opt.count === 0 && !isActive;
          return (
            <label key={opt.value} className={cn("fopt", disabled && "is-empty")}>
              <input
                type={isThreshold ? "radio" : "checkbox"}
                name={isThreshold ? titleId : undefined}
                checked={isActive}
                disabled={disabled}
                onChange={() => onToggle(group.id, opt.value)}
              />
              <span className="box">
                <Icon name="check" size="none" />
              </span>
              <span className="lbl">{opt.label}</span>
              <span className="n">{opt.count}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
