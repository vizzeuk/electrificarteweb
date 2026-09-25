"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Estrellas reutilizables: modo lectura y modo selección (para el formulario).
 * Sistema de diseño v1: la estrella llena va en el color del texto (Tinta sobre claro,
 * Niebla sobre una banda oscura) y la vacía en línea fuerte. Nunca amarillas ni en acento.
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

const STAR_PATH = "M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z";

/** Una sola estrella. Útil para construir selectores personalizados. */
export function StarIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden
      className={cn("block transition-colors", filled ? "fill-current" : "fill-line-2")}
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

export function StarRating({ value, onChange, size = 16, className }: StarsProps) {
  const [hovered, setHovered] = useState(0);
  const interactive = typeof onChange === "function";

  if (!interactive) {
    return (
      <div className={cn("stars", className)} role="img" aria-label={`${value} de 5 estrellas`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} filled={i < value} size={size} />
        ))}
      </div>
    );
  }

  const shown = hovered || value;
  return (
    <div
      className={cn("flex gap-1 text-ink", className)}
      role="radiogroup"
      aria-label="Calificación"
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
