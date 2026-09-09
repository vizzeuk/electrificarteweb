"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StarIcon } from "./StarRating";
import { useReview } from "./ReviewProvider";

/**
 * Bloque de la PDP que invita a reseñar ESTE auto.
 *
 * Truco de conversión: las estrellas son el disparador. Al elegir una, el popup
 * abre ya con esa calificación puesta — la persona siente que "ya empezó" y el
 * formulario deja de ser el primer paso.
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
    <section className="py-16 md:py-20 bg-surface" aria-labelledby="pdp-review-title">
      <div className="max-w-3xl mx-auto px-4 md:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-6 py-9 md:px-10 md:py-11 text-center">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-[80px]" />

          <div className="relative">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Icon name="star" className="text-[24px] text-primary-deep" />
            </div>

            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">
              Tu experiencia
            </p>
            <h2 id="pdp-review-title" className="font-headline text-2xl md:text-3xl font-black tracking-tight mb-3">
              ¿Tienes un {carName}?
            </h2>
            <p className="text-text-muted text-sm md:text-base leading-relaxed max-w-lg mx-auto mb-7">
              Cuéntanos cómo ha sido: autonomía real, carga, manejo, lo bueno y lo malo. Tu reseña
              ayuda a que el próximo comprador decida mejor.
            </p>

            {/* Estrellas como disparador */}
            <div
              className="flex flex-col items-center gap-2.5"
              onMouseLeave={() => setHovered(0)}
            >
              <div className="flex gap-1.5">
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
                      className="rounded p-0.5 transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <StarIcon filled={n <= hovered} size={34} />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-text-ghost h-4">
                {hovered > 0 ? `Calificar con ${hovered} de 5` : "Toca una estrella para empezar"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => open(prefill)}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-text-main transition-colors hover:border-primary/50 hover:text-primary-deep"
            >
              Escribir reseña completa
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
