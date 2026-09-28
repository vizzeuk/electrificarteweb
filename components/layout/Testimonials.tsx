import Link from "next/link";
import { sanityImg } from "@/lib/sanityImage";
import { Icon } from "@/components/ui/Icon";
import { ReviewCta } from "@/components/reviews/ReviewCta";
import { StarRating } from "@/components/reviews/StarRating";
import { cuentaResenas, formatNota } from "@/lib/reviews/categories";

/**
 * Reseñas destacadas del home.
 *
 * Quiénes opinan (feedback de Francisco, 27-sep-2026): son DUEÑOS de autos electrificados que
 * dejaron su reseña (cualquiera puede), no "clientes" de Electrificarte. El título y la bajada
 * lo dicen, y el resumen de arriba es el de TODAS las reseñas publicadas, no el de las tres
 * tarjetas.
 *
 * Solo reseñas reales. Si todavía no hay ninguna publicada, la sección queda en la invitación a
 * escribir la primera (antes caían testimonios de ejemplo escritos a mano: se quitaron).
 */

export interface TestimonialData {
  name: string;
  car: string;
  carSlug?: string;
  quote: string;
  rating: number;
  imageUrl?: string;
  /** Marca "Compra verificada" cuando la reseña vino por invitación. */
  verified?: boolean;
}

interface TestimonialsProps {
  title?: string;
  testimonials?: TestimonialData[];
  /** Resumen de todas las reseñas publicadas (nota promedio y total). */
  summary?: { promedio: number; total: number } | null;
}

export const TESTIMONIALS_TITLE = "Opiniones de dueños de autos electrificados";

function Avatar({ name }: { name: string }) {
  const initials = (name ?? "").split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <span aria-hidden className="avatar grid place-items-center bg-canvas-2 text-small font-semibold text-ink-2">
      {initials}
    </span>
  );
}

function VerifiedChip({ onMedia }: { onMedia?: boolean }) {
  return (
    <span className={onMedia ? "chip chip--media" : "chip"}>
      <Icon name="check" size="none" className="text-[16px]" />
      Compra verificada
    </span>
  );
}

export function Testimonials({ title = TESTIMONIALS_TITLE, testimonials, summary }: TestimonialsProps) {
  const items = testimonials ?? [];

  return (
    <section className="section section--subtle" aria-labelledby="testimonials-title">
      <div className="wrap">
        {/* ── Encabezado: quiénes opinan + resumen de todas las reseñas ── */}
        <div className="section-head">
          <div className="section-head__text">
            <h2 id="testimonials-title" className="t-h2">{title}</h2>
            <p className="t-lead">
              Personas que ya manejan un eléctrico o un híbrido en Chile cuentan cómo les ha ido. Cualquier dueño
              puede dejar la suya.
            </p>
          </div>
          {summary && summary.total > 0 && (
            <div className="section-head__side flex-col items-start gap-3 md:items-end">
              <div className="rating">
                <StarRating value={summary.promedio} size={16} />
                <span className="rating__num">{formatNota(summary.promedio)}</span>
                <span className="rating__count">{cuentaResenas(summary.total)}</span>
              </div>
              <Link href="/resenas/todas" className="link-arrow">
                Ver todas las reseñas
                <Icon name="arrow_forward" size="none" />
              </Link>
            </div>
          )}
        </div>

        {/* ── Tarjetas (en móvil, carrusel horizontal desde el CSS) ── */}
        {items.length > 0 && (
          <div className="reviews">
            {items.map((t, i) => (
              <article key={`${t.name}-${i}`} className="card review">
                {/* La foto es opcional: solo si la reseña trae. */}
                {t.imageUrl && (
                  <div className="review__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sanityImg(t.imageUrl, { w: 640, q: 75 })} alt={t.car} loading="lazy" decoding="async" />
                    {t.verified && <VerifiedChip onMedia />}
                  </div>
                )}

                <div className="review__body">
                  {/* min-h = alto del chip: la cita parte a la misma altura en todas las cards. */}
                  <div className="flex min-h-6 items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <StarRating value={t.rating} size={16} />
                      <span className="text-small font-semibold num">{formatNota(t.rating)}</span>
                    </div>
                    {!t.imageUrl && t.verified && <VerifiedChip />}
                  </div>
                  <blockquote className="review__quote line-clamp-6">{t.quote}</blockquote>

                  <div className="review__foot">
                    <div className="person">
                      <Avatar name={t.name} />
                      <div className="min-w-0">
                        <p className="person__name truncate">{t.name}</p>
                        {t.carSlug ? (
                          <Link href={`/auto/${t.carSlug}`} className="person__car">
                            {t.car}
                          </Link>
                        ) : (
                          <p className="person__car no-underline">{t.car}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ── CTA: dejar una reseña ── */}
        <div className="review-cta">
          <div>
            <h3 className="t-h3">¿Ya tienes tu auto electrificado?</h3>
            <p>
              Cuéntanos tu experiencia real: autonomía, confort, manejo y calidad. Ayudas a que el próximo
              comprador decida mejor.
            </p>
          </div>
          <ReviewCta source="home" className="btn btn--secondary btn--lg">
            <Icon name="edit_note" size="none" />
            Escribir mi reseña
          </ReviewCta>
        </div>
      </div>
    </section>
  );
}
