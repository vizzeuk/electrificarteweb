"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ReviewSummaryPanel } from "./ReviewSummary";
import { ReviewFeed } from "./ReviewFeed";
import { PdpReviewPrompt } from "./PdpReviewPrompt";
import { useReview } from "./ReviewProvider";
import type { PublicReview, ReviewSummary } from "@/lib/reviews/queries";

/**
 * Reseñas en la ficha de un auto (va justo debajo del bloque de compra).
 *
 *   - Sin reseñas: solo la franja baja que invita a escribir la primera (PdpReviewPrompt).
 *   - Con reseñas: sección estilo Google. A la izquierda el resumen (nota, distribución 5→1,
 *     promedio por categoría) con el botón para escribir; a la derecha la lista con fotos grandes.
 *
 * Fondo Niebla: entre el bloque de compra y "Sobre el modelo", ambos blancos.
 */

interface CarReviewsProps {
  reviews: PublicReview[];
  summary: ReviewSummary | null;
  carSlug: string;
  carSanityId?: string;
  carBrand?: string;
  carModel?: string;
  /** Nombre para mostrar, ej. "Hyundai IONIQ 5". */
  carName: string;
}

export function CarReviews({ reviews, summary, carSlug, carSanityId, carBrand, carModel, carName }: CarReviewsProps) {
  const { open } = useReview();

  if (reviews.length === 0 || !summary) {
    return <PdpReviewPrompt carSlug={carSlug} carSanityId={carSanityId} carBrand={carBrand} carModel={carModel} carName={carName} />;
  }

  return (
    <section id="resenas" className="section section--subtle" aria-labelledby="reviews-title">
      <div className="wrap">
        <div className="section-head">
          <div className="section-head__text">
            <h2 id="reviews-title" className="t-h2">Reseñas del {carName}</h2>
            <p className="t-lead">Lo que cuentan quienes ya lo manejan: autonomía real, confort, manejo y calidad.</p>
          </div>
        </div>

        <div className="rv-layout">
          <aside className="rv-layout__side" aria-label="Resumen de las reseñas">
            <ReviewSummaryPanel summary={summary} className="card">
              <button
                type="button"
                onClick={() => open({ carSlug, carSanityId, carBrand, carModel, source: "pdp" })}
                className="btn btn--secondary btn--block"
              >
                <Icon name="edit_note" size="none" />
                Escribir una reseña
              </button>
              <Link href="/resenas/todas" className="link-arrow">
                Reseñas de otros autos
                <Icon name="arrow_forward" size="none" />
              </Link>
            </ReviewSummaryPanel>
          </aside>

          <div className="card rv-layout__list">
            <ReviewFeed reviews={reviews} pageSize={5} />
          </div>
        </div>
      </div>
    </section>
  );
}
