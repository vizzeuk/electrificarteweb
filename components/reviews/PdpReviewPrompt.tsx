"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StarIcon } from "./StarRating";
import { useReview } from "./ReviewProvider";

/**
 * Franja de la PDP que invita a reseñar ESTE auto.
 *
 * Va justo debajo del hero, así que es deliberadamente BAJA: una sola línea en
 * desktop. Tiene que estar presente sin robarle protagonismo a la ficha.
 *
 * Truco de conversión: las estrellas son el disparador. Al elegir una, el popup
 * abre ya con esa calificación puesta — la persona siente que "ya empezó".
 */

interface PdpReviewPromptProps {
  carSlug: string;
  carSanityId?: string;
  carBrand?: string;
  carModel?: string;
  /** Nombre para mostrar, ej. "BYD Dolphin". */
  carName: string;
}

export function PdpReviewPrompt({ carSlug, carSanityId, carBrand, carModel, carName }: PdpReviewPromptProps) {
  const { open } = useReview();
  const [hovered, setHovered] = useState(0);

  const prefill = { carSlug, carSanityId, carBrand, carModel, source: "pdp" };

  return (
    <section className="border-y border-gray-100 bg-surface" aria-labelledby="pdp-review-title">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-5 text-center sm:flex-row sm:justify-between sm:gap-6 sm:py-4 sm:text-left md:px-8">

        <p id="pdp-review-title" className="text-sm leading-snug text-text-main">
          <span className="font-headline font-bold">¿Tienes un {carName}?</span>{" "}
          <span className="text-text-muted">Cuéntanos tu experiencia y ayuda al próximo comprador.</span>
        </p>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
            {Array.from({ length: 5 }).map((_, i) => {
              const n = i + 1;
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`Calificar con ${n} ${n === 1 ? "estrella" : "estrellas"}`}
                  onMouseEnter={() => setHovered(n)}
                  onFocus={() => setHovered(n)}
                  onClick={() => open({ ...prefill, rating: n })}
                  className="rounded transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <StarIcon filled={n <= hovered} size={22} />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => open(prefill)}
            className="inline-flex flex-shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary-deep transition-colors hover:text-primary"
          >
            Escribir reseña
            <Icon name="chevron_right" className="text-[16px]" />
          </button>
        </div>
      </div>
    </section>
  );
}
