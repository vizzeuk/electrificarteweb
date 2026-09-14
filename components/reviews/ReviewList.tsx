import { Icon } from "@/components/ui/Icon";
import { StarRating } from "./StarRating";
import type { PublicReview, ReviewSummary } from "@/lib/reviews/queries";

/**
 * Lista de reseñas aprobadas de un auto (server component: solo lectura).
 * El CTA para dejar una reseña vive aparte, en `PdpReviewPrompt`.
 */

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
  if (reviews.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-white" aria-labelledby="reviews-title">
      <div className="max-w-4xl mx-auto px-4 md:px-8">

        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
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
              <span className="text-sm text-text-muted">
                {summary.total} {summary.total === 1 ? "reseña" : "reseñas"}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {reviews.map((r) => (
            <article key={r.id} className="rounded-2xl border border-gray-100 p-6 md:p-7 transition-colors hover:border-primary/30">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-headline font-bold leading-tight">{r.autor}</p>
                    {r.compraVerificada && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-deep">
                        <Icon name="verified" className="text-[12px]" />
                        Compra verificada
                      </span>
                    )}
                  </div>
                  <p className="text-text-ghost text-xs mt-0.5">
                    {[r.carVersion, r.carYear, r.carColor].filter(Boolean).join(" · ") || fecha(r.createdAt)}
                  </p>
                </div>
                <StarRating value={r.rating} size={15} className="flex-shrink-0 mt-1" />
              </div>

              <p className="text-text-main text-sm leading-relaxed whitespace-pre-line">{r.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
