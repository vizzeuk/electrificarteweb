"use client";

import { cn } from "@/lib/utils";

interface FilterPillProps {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  count?: number;
  children: React.ReactNode;
}

/**
 * Pill de filtro, misma estética que las pills del catálogo:
 * activo = sólido primary-deep; inactivo = blanco con borde gris.
 */
export function FilterPill({ active, disabled, onClick, count, children }: FilterPillProps) {
  return (
    <button
      type="button"
      disabled={disabled && !active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 border",
        active
          ? "bg-primary-deep text-white border-primary-deep shadow-sm"
          : disabled
            ? "bg-white text-text-ghost/50 border-gray-100 cursor-not-allowed"
            : "bg-white text-text-muted border-gray-200 hover:border-primary/40 hover:text-primary-deep"
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "text-[10px] font-black",
            active ? "opacity-70" : "text-text-ghost"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
