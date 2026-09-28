"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StarIcon } from "./StarRating";
import { useReview } from "./ReviewProvider";

/**
 * Franja de la PDP que invita a reseñar ESTE auto cuando todavía no tiene reseñas (con reseñas,
 * la invitación vive en el resumen de CarReviews).
 *
 * Va justo debajo del bloque de compra, así que es deliberadamente BAJA: una sola línea
 * en desktop. Sistema v1: franja Niebla (`section--tight section--subtle`), estrellas en
 * Laguna, botón secundario.
 *
 * Las estrellas son solo la invitación: cualquiera abre el popup. Ya no precargan una nota,
 * porque la reseña se califica en 4 categorías (autonomía, confort, agilidad, calidad).
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
  const [hover, setHover] = useState(false);

  const abrir = () => open({ carSlug, carSanityId, carBrand, carModel, source: "pdp" });

  return (
    <section className="section section--tight section--subtle" aria-labelledby="pdp-review-title">
      <div className="wrap flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <p id="pdp-review-title" className="t-body">
          <strong className="font-semibold text-ink">¿Tienes un {carName}?</strong>{" "}
          Sé el primero en contar cómo te ha ido y ayuda al próximo comprador.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={abrir}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            aria-label={`Calificar el ${carName}`}
            className="flex items-center gap-1 rounded-chip p-0.5 text-link"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon key={i} filled={hover} size={24} />
            ))}
          </button>

          <button type="button" onClick={abrir} className="btn btn--secondary">
            <Icon name="edit_note" size="none" />
            Escribir una reseña
          </button>
        </div>
      </div>
    </section>
  );
}
