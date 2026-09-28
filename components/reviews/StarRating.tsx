"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatNota } from "@/lib/reviews/categories";

/**
 * Estrellas reutilizables: modo lectura y modo selección (para el formulario).
 *
 * Color (27-sep-2026, pedido de Francisco): la estrella llena va en Laguna vía el token
 * semántico `--link` (`text-link`), que dentro de una banda `.theme-dark` pasa solo a Glaciar.
 * La vacía, en línea fuerte. Nunca amarillas.
 *
 * En lectura acepta decimales: 4,3 pinta cuatro estrellas llenas y un 30 % de la quinta, como
 * en las reseñas de Google.
 */

interface StarsProps {
  /** Valor actual (0-5). En lectura puede tener decimales. */
  value: number;
  /** Si se pasa, las estrellas son interactivas. */
  onChange?: (value: number) => void;
  /** Tamaño del ícono en px. */
  size?: number;
  /** Nombre accesible del grupo interactivo (ej. "Autonomía"). */
  label?: string;
  /** Marca el grupo interactivo como inválido (formulario enviado sin elegir). */
  invalid?: boolean;
  className?: string;
}

const STAR_PATH = "M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z";

function Star({ className, size }: { className: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className={cn("block transition-colors", className)}>
      <path d={STAR_PATH} />
    </svg>
  );
}

/**
 * Una sola estrella. `filled` puede ser booleano o una fracción 0-1 (estrella parcial).
 * Útil para construir selectores personalizados.
 */
export function StarIcon({ filled, size = 16 }: { filled: boolean | number; size?: number }) {
  const f = typeof filled === "number" ? Math.max(0, Math.min(1, filled)) : filled ? 1 : 0;
  if (f >= 0.95) return <Star className="fill-current" size={size} />;
  if (f <= 0.05) return <Star className="fill-line-2" size={size} />;
  return (
    <span aria-hidden className="relative block flex-none" style={{ width: size, height: size }}>
      <Star className="fill-line-2" size={size} />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${f * 100}%` }}>
        <Star className="fill-current" size={size} />
      </span>
    </span>
  );
}

export function StarRating({ value, onChange, size = 16, label, invalid, className }: StarsProps) {
  const [hovered, setHovered] = useState(0);
  const interactive = typeof onChange === "function";

  if (!interactive) {
    return (
      <div className={cn("stars", className)} role="img" aria-label={`${formatNota(value)} de 5 estrellas`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} filled={value - i} size={size} />
        ))}
      </div>
    );
  }

  const shown = hovered || value;
  return (
    <div
      className={cn("flex gap-1 text-link", className)}
      role="radiogroup"
      aria-label={label ?? "Calificación"}
      aria-invalid={invalid || undefined}
      onMouseLeave={() => setHovered(0)}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
            onMouseEnter={() => setHovered(n)}
            onClick={() => onChange?.(n)}
            className="rounded-chip p-0.5"
          >
            <StarIcon filled={n <= shown} size={size} />
          </button>
        );
      })}
    </div>
  );
}
