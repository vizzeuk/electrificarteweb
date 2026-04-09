"use client";

import { AnimatePresence, motion } from "framer-motion";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
}

export type ActiveFilters = Record<string, string>; // groupId → selected value ("" = all)

interface CatalogFiltersProps {
  groups: FilterGroup[];
  active: ActiveFilters;
  onChange: (groupId: string, value: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  total: number;
  count: number;
}

const SORT_OPTIONS = [
  { value: "default",   label: "Relevancia" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc",label: "Precio: mayor a menor" },
  { value: "range-desc",label: "Mayor autonomía" },
];

export function CatalogFilters({
  groups,
  active,
  onChange,
  sort,
  onSortChange,
  total,
  count,
}: CatalogFiltersProps) {
  const hasActiveFilters = Object.values(active).some((v) => v !== "");

  function clearAll() {
    groups.forEach((g) => onChange(g.id, ""));
  }

  return (
    <div className="mb-8 space-y-3">
      {/* Filter rows */}
      {groups.map((group) => (
        <div key={group.id} className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-widest font-bold text-text-ghost flex-shrink-0 w-28 hidden sm:block">
            {group.label}
          </span>
          {/* Mobile label */}
          <span className="text-[11px] uppercase tracking-widest font-bold text-text-ghost sm:hidden">
            {group.label}:
          </span>
          {/* Scroll container */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-1 min-w-0 pb-0.5">
            {/* "Todos" pill */}
            <PillButton
              active={!active[group.id]}
              onClick={() => onChange(group.id, "")}
            >
              Todos
            </PillButton>
            {group.options.map((opt) => (
              <PillButton
                key={opt.value}
                active={active[group.id] === opt.value}
                onClick={() =>
                  onChange(group.id, active[group.id] === opt.value ? "" : opt.value)
                }
              >
                {opt.label}
                {opt.count !== undefined && (
                  <span className={[
                    "ml-1 text-[10px] font-black",
                    active[group.id] === opt.value ? "opacity-70" : "text-text-ghost",
                  ].join(" ")}>
                    {opt.count}
                  </span>
                )}
              </PillButton>
            ))}
          </div>
        </div>
      ))}

      {/* Bottom bar: sort + count + clear */}
      <div className="flex items-center justify-between pt-1 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Result count */}
          <AnimatePresence mode="wait">
            <motion.p
              key={count}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="text-sm text-text-ghost"
            >
              <span className="font-bold text-text-main">{count}</span>
              {count !== total && (
                <span className="text-text-ghost"> de {total}</span>
              )}{" "}
              auto{count !== 1 ? "s" : ""}
            </motion.p>
          </AnimatePresence>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs font-semibold text-primary-deep hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-ghost hidden sm:block">Ordenar:</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="text-xs font-semibold text-text-main bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary/40 cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-0.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 flex-shrink-0 border",
        active
          ? "bg-primary-deep text-white border-primary-deep shadow-sm"
          : "bg-white text-text-muted border-gray-200 hover:border-primary/40 hover:text-primary-deep",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
