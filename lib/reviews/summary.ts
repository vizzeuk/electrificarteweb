import { REVIEW_CATEGORIES, promedioNotas, type CategoryScores } from "./categories";
import type { PublicReview, ReviewSummary } from "./queries";

/**
 * Cálculos puros sobre reseñas ya leídas. Sin dependencias de servidor: los usan las páginas
 * (servidor) y los filtros de /resenas/todas (cliente), que recalculan el resumen al filtrar.
 */

/** Resumen estilo Google: promedio, total, distribución 5→1 y promedio por categoría. */
export function summarize(reviews: PublicReview[]): ReviewSummary | null {
  const conNota = reviews.filter((r) => r.rating >= 1);
  if (conNota.length === 0) return null;
  const distribucion: ReviewSummary["distribucion"] = [0, 0, 0, 0, 0];
  for (const r of conNota) distribucion[Math.min(5, Math.max(1, Math.round(r.rating))) - 1]++;
  const categorias = Object.fromEntries(
    REVIEW_CATEGORIES.map((c) => [c.key, promedioNotas(conNota.map((r) => r.categorias[c.key]))]),
  ) as CategoryScores;
  return {
    promedio: promedioNotas(conNota.map((r) => r.rating)) ?? 0,
    total: conNota.length,
    distribucion,
    categorias,
  };
}

/** Las mejores reseñas (nota 4 o más; a igual nota, la más reciente). Para los testimonios del home. */
export function topReviews(reviews: PublicReview[], limit = 3): PublicReview[] {
  return reviews
    .filter((r) => r.rating >= 4)
    .sort((a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
