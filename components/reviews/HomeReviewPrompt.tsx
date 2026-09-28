import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { StarRating, StarIcon } from "./StarRating";
import { cuentaResenas, formatNota } from "@/lib/reviews/categories";
import type { PublicReview, ReviewSummary } from "@/lib/reviews/queries";

/**
 * Franja del home que invita a dejar una reseña de cualquier auto electrificado.
 *
 * Va justo debajo de "Últimos lanzamientos" (Niebla), así que es blanca; la sección siguiente
 * (tipos de electrificado, también blanca) lleva hairline arriba. Sin Glaciar: el del home es
 * la llamada principal.
 *
 * Prueba social con datos REALES: la nota promedio y la cantidad de reseñas publicadas, más la
 * reseña más reciente que no esté ya en los testimonios de más abajo. Si todavía no hay reseñas
 * (o Supabase no responde), queda solo la invitación con estrellas vacías. Nada inventado.
 *
 * Las estrellas ya no precargan una nota (la reseña se califica en 4 categorías): todo lleva a
 * /resenas, que explica cómo funcionan, y de ahí a /resenas/escribir.
 */
export function HomeReviewPrompt({
  summary,
  latest,
}: {
  summary: ReviewSummary | null;
  /** Reseña reciente para citar (opcional). */
  latest?: PublicReview | null;
}) {
  const auto = latest ? [latest.carBrand, latest.carModel].filter(Boolean).join(" ") : "";

  return (
    <section className="section section--tight" aria-labelledby="home-review-title">
      <div className="wrap rv-strip">
        <div className="rv-strip__text">
          <h2 id="home-review-title" className="t-h2">¿Ya tienes un auto electrificado?</h2>
          <p className="t-body">
            Califica su autonomía, confort, agilidad y calidad, y cuenta cómo te ha ido. Tu experiencia ayuda al
            próximo comprador a elegir bien.
          </p>
          <div className="rv-strip__actions">
            <Link href="/resenas" className="btn btn--secondary">
              <Icon name="edit_note" size="none" />
              Dejar mi reseña
            </Link>
            {summary && (
              <Link href="/resenas/todas" className="link-arrow">
                Leer las reseñas
                <Icon name="arrow_forward" size="none" />
              </Link>
            )}
          </div>
        </div>

        {summary ? (
          <div className="card rv-strip__card">
            <div className="rv-strip__score">
              <p className="rv-sum__num">{formatNota(summary.promedio)}</p>
              <div>
                <StarRating value={summary.promedio} size={20} />
                <p className="rv-sum__count">{cuentaResenas(summary.total)} de dueños</p>
              </div>
            </div>
            {latest && (
              <figure className="rv-strip__quote">
                <blockquote className="line-clamp-3">&ldquo;{latest.body}&rdquo;</blockquote>
                <figcaption>
                  <p>
                    {latest.autor}
                    {auto && (
                      <>
                        {", "}
                        {latest.carSlug ? <Link href={`/auto/${latest.carSlug}`} className="link">{auto}</Link> : auto}
                      </>
                    )}
                  </p>
                </figcaption>
              </figure>
            )}
          </div>
        ) : (
          <Link href="/resenas" aria-label="Dejar mi reseña" className="flex items-center gap-1 justify-self-start rounded-chip p-0.5 text-link md:justify-self-end">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon key={i} filled={false} size={32} />
            ))}
          </Link>
        )}
      </div>
    </section>
  );
}
