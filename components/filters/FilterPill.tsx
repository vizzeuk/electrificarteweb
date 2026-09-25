"use client";

interface FilterPillProps {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  count?: number;
  children: React.ReactNode;
}

/**
 * Pill de filtro rápido del sistema de diseño v1 (app/styles/pages.css → .pill): 36 px de
 * alto, radio 8 y el conteo al lado. Activa = maciza en el acento, nunca translúcida.
 * Sin autos disponibles queda deshabilitada, salvo que esté activa (para poder quitarla).
 */
export function FilterPill({ active = false, disabled, onClick, count, children }: FilterPillProps) {
  return (
    <button
      type="button"
      className="pill"
      aria-pressed={active}
      disabled={disabled && !active}
      onClick={onClick}
    >
      {children}
      {count !== undefined && <span className="n">{count}</span>}
    </button>
  );
}
