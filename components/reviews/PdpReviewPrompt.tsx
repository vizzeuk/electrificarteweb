"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StarIcon } from "./StarRating";
import { useReview } from "./ReviewProvider";

/**
 * Franja de la PDP que invita a reseñar ESTE auto.
 *
 * Va justo debajo del bloque de compra, así que es deliberadamente BAJA: una sola línea
 * en desktop. Tiene que estar presente sin robarle protagonismo a la ficha. Sistema v1:
 * franja Niebla (`section--tight section--subtle`), estrellas en Tinta, botón secundario.
 *
 * Truco de conversión: las estrellas son el disparador. Al elegir una, el popup
 * abre ya con esa calificación puesta: la persona siente que "ya empezó".
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
    <section className="section section--tight section--subtle" aria-labelledby="pdp-review-title">
      <div className="wrap flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <p id="pdp-review-title" className="t-body">
          <strong className="font-semibold text-ink">¿Tienes un {carName}?</strong>{" "}
          Cuéntanos tu experiencia y ayuda al próximo comprador.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div
            className="flex items-center gap-1 text-ink"
            onMouseLeave={() => setHovered(0)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(0);
            }}
          >
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
                  className="rounded-chip p-0.5"
                >
                  <StarIcon filled={n <= hovered} size={24} />
                </button>
              );
            })}
          </div>

          <button type="button" onClick={() => open(prefill)} className="btn btn--secondary">
            <Icon name="star" size="none" filled />
            Escribir una reseña
          </button>
        </div>
      </div>
    </section>
  );
}
