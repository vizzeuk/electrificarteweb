"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "./StarRating";
import type { PublicReview, ReviewSummary } from "@/lib/reviews/queries";

/**
 * Carrusel de reseñas aprobadas de un auto.
 *
 * Es cliente (necesita las flechas y el estado del scroll), así que NO puede importar
 * `storage`: las URLs de las fotos vienen ya resueltas desde el servidor en `photoUrls`.
 *
 * Scroll horizontal con snap; flechas solo en desktop (en móvil se desliza con el dedo y
 * la fila sangra hasta el borde, como las reseñas del home). Sin autoplay a propósito:
 * las reseñas se leen, no conviene que se muevan solas. Piel del sistema v1: cards con
 * hairline sobre Niebla, estrellas en Tinta, chips macizos.
 */

const CARD_W = 340;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "marzo de 2025". Determinista (partes UTC): mismo texto en el servidor y en el cliente. */
function fecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

const promedioFmt = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function ReviewList({
  reviews,
  summary,
  carName,
}: {
  reviews: PublicReview[];
  summary: ReviewSummary | null;
  carName: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, reviews.length]);

  if (reviews.length === 0) return null;

  const mover = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? CARD_W) + gap), behavior: "smooth" });
  };

  const showArrows = canLeft || canRight;

  return (
    <section className="section section--subtle section--rule" aria-labelledby="reviews-title">
      <div className="wrap">
        <div className="section-head">
          <div className="section-head__text">
            <h2 id="reviews-title" className="t-h2">Lo que dicen del {carName}</h2>
          </div>
          {(summary || showArrows) && (
            <div className="section-head__side">
              {summary && (
                <div className="rating">
                  <StarRating value={Math.round(summary.promedio)} size={16} />
                  <span className="rating__num">{promedioFmt.format(summary.promedio)}</span>
                  <span className="rating__count">
                    {summary.total} {summary.total === 1 ? "reseña" : "reseñas"}
                  </span>
                </div>
              )}
              {showArrows && (
                <div className="hidden gap-2 md:flex">
                  <button
                    type="button"
                    onClick={() => mover(-1)}
                    disabled={!canLeft}
                    aria-label="Reseña anterior"
                    className="btn btn--secondary btn--icon btn--sm"
                  >
                    <Icon name="chevron_left" size="none" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(1)}
                    disabled={!canRight}
                    aria-label="Reseña siguiente"
                    className="btn btn--secondary btn--icon btn--sm"
                  >
                    <Icon name="chevron_right" size="none" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          ref={trackRef}
          className="hide-scrollbar -mx-[var(--gutter)] flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-[var(--grid-gap)] overflow-x-auto px-[var(--gutter)] md:mx-0 md:scroll-px-0 md:px-0"
        >
          {reviews.map((r) => {
            const detalle = [r.carVersion, r.carYear, r.carColor].filter(Boolean).join(", ") || fecha(r.createdAt);
            return (
              <article key={r.id} className="card review w-[min(84vw,340px)] flex-none snap-start">
                <div className="review__body">
                  <StarRating value={r.rating} size={16} />
                  <blockquote className="review__quote line-clamp-6">{r.body}</blockquote>

                  {r.photoUrls.length > 0 && (
                    <div className="flex gap-2">
                      {r.photoUrls.slice(0, 3).map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt={`Foto de ${r.autor}`}
                          className="h-[72px] w-[72px] flex-none rounded-control border border-line object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ))}
                    </div>
                  )}

                  <div className="review__foot">
                    <div className="min-w-0">
                      <p className="person__name truncate">{r.autor}</p>
                      {detalle && <p className="t-label truncate">{detalle}</p>}
                    </div>
                    {r.compraVerificada && (
                      <span className="chip chip--soft flex-none">
                        <Icon name="verified" className="text-[14px]" />
                        Verificada
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
