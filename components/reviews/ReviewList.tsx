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
 * Mismo patrón que `LatestLaunches`: scroll horizontal con snap + `hide-scrollbar`,
 * flechas solo en desktop (en móvil se desliza con el dedo). Sin autoplay a propósito:
 * las reseñas se leen, no conviene que se muevan solas.
 */

const CARD_W = 340;
const GAP = 20;

function fecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", { year: "numeric", month: "long" });
  } catch {
    return "";
  }
}

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

  const mover = (dir: "left" | "right") =>
    trackRef.current?.scrollBy({ left: (dir === "left" ? -1 : 1) * (CARD_W + GAP), behavior: "smooth" });

  return (
    <section className="py-12 md:py-14 bg-white overflow-hidden" aria-labelledby="reviews-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        <div className="mb-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Opiniones reales</p>
            <h2 id="reviews-title" className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tight">
              Lo que dicen del {carName}
            </h2>
          </div>
          {summary && (
            <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-surface px-5 py-2.5 self-start sm:self-auto">
              <StarRating value={Math.round(summary.promedio)} size={18} />
              <span className="font-headline text-lg font-black leading-none">{summary.promedio.toFixed(1)}</span>
              <span className="h-4 w-px bg-gray-200" />
              <span className="text-sm text-text-muted whitespace-nowrap">
                {summary.total} {summary.total === 1 ? "reseña" : "reseñas"}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => mover("left")}
            disabled={!canLeft}
            aria-label="Reseña anterior"
            className="hidden sm:flex flex-shrink-0 w-11 h-11 rounded-full bg-black hover:bg-primary text-white hover:text-black items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none"
          >
            <Icon name="chevron_left" className="text-[22px]" />
          </button>

          <div className="flex-1 overflow-hidden">
            <div
              ref={trackRef}
              className="flex gap-5 overflow-x-auto pb-2 hide-scrollbar"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {reviews.map((r) => (
                <article
                  key={r.id}
                  style={{ width: CARD_W, scrollSnapAlign: "start" }}
                  className="flex-shrink-0 rounded-2xl border border-gray-100 p-5 md:p-6 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-headline font-bold leading-tight truncate">{r.autor}</p>
                        {r.compraVerificada && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-deep">
                            <Icon name="verified" className="text-[12px]" />
                            Verificada
                          </span>
                        )}
                      </div>
                      <p className="text-text-ghost text-xs mt-0.5 truncate">
                        {[r.carVersion, r.carYear, r.carColor].filter(Boolean).join(" · ") || fecha(r.createdAt)}
                      </p>
                    </div>
                    <StarRating value={r.rating} size={14} className="flex-shrink-0 mt-1" />
                  </div>

                  <p className="text-text-main text-sm leading-relaxed line-clamp-6">{r.body}</p>

                  {r.photoUrls.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      {r.photoUrls.slice(0, 3).map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt={`Foto de ${r.autor}`}
                          className="h-20 w-20 flex-shrink-0 rounded-lg border border-gray-100 object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => mover("right")}
            disabled={!canRight}
            aria-label="Reseña siguiente"
            className="hidden sm:flex flex-shrink-0 w-11 h-11 rounded-full bg-black hover:bg-primary text-white hover:text-black items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none"
          >
            <Icon name="chevron_right" className="text-[22px]" />
          </button>
        </div>
      </div>
    </section>
  );
}
