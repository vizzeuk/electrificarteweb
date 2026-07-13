"use client";

import { useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ActiveFacets, FacetGroupOptions, FacetId } from "@/lib/filters/types";

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
 * Panel de filtros: drawer lateral derecho en desktop (≥768px, breakpoint `md`),
 * bottom-sheet en mobile. El deslizamiento usa transiciones CSS (no framer) para
 * ser determinista en todos los navegadores; el eje lo decide el breakpoint `md`
 * vía clases Tailwind, no JS. El fade del overlay sí usa framer.
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
  // `onClose` cambia de identidad en cada render del padre; lo leemos por ref
  // para que el efecto dependa sólo de `open`.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Bloqueo de scroll + cierre con Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="filter-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center md:items-stretch md:justify-end"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Filtros"
        >
          <div
            className={cn(
              "filter-panel-enter relative bg-white w-full flex flex-col max-h-[92svh] rounded-t-3xl shadow-2xl will-change-transform",
              "md:max-h-none md:h-full md:w-[400px] md:max-w-[90vw] md:rounded-t-none md:rounded-l-3xl"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary-deep">tune</span>
                <h2 className="font-headline font-bold text-lg">Filtros</h2>
                {activeCount > 0 && (
                  <span className="bg-primary-deep text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar filtros"
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-text-muted">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-5 py-2 divide-y divide-gray-100">
              {facetGroups.length === 0 ? (
                <p className="text-sm text-text-ghost py-8 text-center">
                  No hay filtros disponibles para este catálogo.
                </p>
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

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 flex-shrink-0">
              {activeCount > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-sm font-semibold text-text-muted hover:text-primary-deep transition-colors whitespace-nowrap"
                >
                  Limpiar
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 bg-primary hover:bg-primary-dark text-black font-bold py-3 rounded-xl text-sm transition-colors"
              >
                Ver {count} auto{count !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

// ─── Grupo colapsable ─────────────────────────────────────────────────────────
function PanelGroup({
  group,
  active,
  onToggle,
}: {
  group: FacetGroupOptions;
  active: string[];
  onToggle: (id: FacetId, value: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="py-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-text-ghost group-hover:text-primary-deep transition-colors">
            {group.icon}
          </span>
          <span className="font-semibold text-sm text-text-main">{group.label}</span>
          {active.length > 0 && (
            <span className="bg-primary/10 text-primary-deep text-[10px] font-black rounded-full px-1.5 py-0.5">
              {active.length}
            </span>
          )}
        </span>
        <span
          className={cn(
            "material-symbols-outlined text-[18px] text-text-ghost transition-transform duration-200",
            open ? "rotate-180" : ""
          )}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="flex flex-wrap gap-1.5 pt-3">
          {group.options.map((opt) => {
            const isActive = active.includes(opt.value);
            const disabled = opt.count === 0 && !isActive;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(group.id, opt.value)}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 border",
                  isActive
                    ? "bg-primary-deep text-white border-primary-deep shadow-sm"
                    : disabled
                      ? "bg-white text-text-ghost/40 border-gray-100 cursor-not-allowed"
                      : "bg-white text-text-muted border-gray-200 hover:border-primary/40 hover:text-primary-deep"
                )}
              >
                {opt.label}
                <span className={isActive ? "text-[10px] font-black opacity-70" : "text-[10px] font-black text-text-ghost"}>
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
