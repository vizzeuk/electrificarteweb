"use client";

/**
 * Estrellas reutilizables: modo lectura y modo selección (para el formulario).
 * Extraído del `StarRating` local de `Testimonials.tsx`, que no era exportable.
 */

interface StarsProps {
  /** Valor actual (0-5). */
  value: number;
  /** Si se pasa, las estrellas son interactivas. */
  onChange?: (value: number) => void;
  /** Tamaño del ícono en px. */
  size?: number;
  className?: string;
}

const FILLED = "#F59E0B";
const EMPTY = "#D1D5DB";

/** Una sola estrella. Útil para construir selectores personalizados. */
export function StarIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return <Star filled={filled} size={size} />;
}

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={filled ? FILLED : EMPTY} aria-hidden>
      <path d="M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
    </svg>
  );
}

export function StarRating({ value, onChange, size = 16, className }: StarsProps) {
  const interactive = typeof onChange === "function";

  if (!interactive) {
    return (
      <div className={`flex gap-0.5 ${className ?? ""}`} aria-label={`${value} de 5 estrellas`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} filled={i < value} size={size} />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex gap-1 ${className ?? ""}`} role="radiogroup" aria-label="Calificación">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
            onClick={() => onChange?.(n)}
            className="rounded transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <Star filled={n <= value} size={size} />
          </button>
        );
      })}
    </div>
  );
}
