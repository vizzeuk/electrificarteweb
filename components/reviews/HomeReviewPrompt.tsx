"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { StarIcon } from "./StarRating";

/**
 * Franja del home que invita a dejar una reseña de cualquier auto electrificado.
 *
 * Primo general de PdpReviewPrompt: allá el popup abre directo con el auto de la ficha; acá la
 * persona pasa primero por /resenas (qué son y cómo funcionan) y de ahí a /resenas/escribir.
 * Las estrellas son el disparador: la calificación elegida viaja en ?calificacion=N hasta el
 * formulario, que se abre con ella puesta.
 *
 * Va entre "¿Qué tipo de electrificado buscas?" y "Oportunidades del momento" (ambas blancas):
 * franja Niebla baja, estrellas en Tinta, botón secundario. Sin Glaciar: el del home es la
 * llamada principal.
 */
export function HomeReviewPrompt() {
  const [hovered, setHovered] = useState(0);

  return (
    <section className="section section--tight section--subtle" aria-labelledby="home-review-title">
      <div className="wrap flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="max-w-[36rem]">
          <h2 id="home-review-title" className="t-h3">¿Ya tienes un auto electrificado?</h2>
          <p className="t-body mt-2">
            Cuéntanos cómo te ha ido: la autonomía real, dónde cargas y cuánto gastas. Tu experiencia ayuda
            al próximo comprador a elegir bien.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5">
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
                <Link
                  key={n}
                  href={`/resenas?calificacion=${n}`}
                  aria-label={`Calificar con ${n} ${n === 1 ? "estrella" : "estrellas"}`}
                  onMouseEnter={() => setHovered(n)}
                  onFocus={() => setHovered(n)}
                  className="rounded-chip p-0.5"
                >
                  <StarIcon filled={n <= hovered} size={26} />
                </Link>
              );
            })}
          </div>

          <Link href="/resenas" className="btn btn--secondary">
            <Icon name="star" size="none" filled />
            Dejar mi reseña
          </Link>
        </div>
      </div>
    </section>
  );
}
