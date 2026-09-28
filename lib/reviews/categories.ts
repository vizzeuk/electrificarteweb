/**
 * Las 4 categorías con que se califica una reseña (feedback de Francisco, 27-sep-2026).
 *
 * La nota final de la reseña (`rating`) es el PROMEDIO de las cuatro, con un decimal. Lo calcula
 * el servidor en /api/reviews (nunca se confía en el cliente) y n8n lo guarda en `reviews.rating`
 * (numeric(2,1)). Las reseñas anteriores a este cambio no tienen categorías: conservan su nota
 * y sus categorías vienen en null. Ver scripts/sql/2026-09-27_resenas_categorias_y_waitlist_vendedores.sql.
 *
 * Archivo sin dependencias de servidor: lo usan el formulario (cliente), la API y las lecturas.
 */

export const REVIEW_CATEGORIES = [
  { key: "autonomia", field: "ratingAutonomia", label: "Autonomía", hint: "Cuánto rinde la carga en tu día a día" },
  { key: "confort", field: "ratingConfort", label: "Confort", hint: "Asientos, ruido, suspensión y espacio" },
  { key: "agilidad", field: "ratingAgilidad", label: "Agilidad", hint: "Aceleración, manejo y maniobras" },
  { key: "calidad", field: "ratingCalidad", label: "Calidad", hint: "Terminaciones, materiales y confiabilidad" },
] as const;

export type ReviewCategoryKey = (typeof REVIEW_CATEGORIES)[number]["key"];
export type ReviewCategoryField = (typeof REVIEW_CATEGORIES)[number]["field"];

/** Notas por categoría. `null` = la reseña no la trae (reseñas antiguas). */
export type CategoryScores = Record<ReviewCategoryKey, number | null>;

/** Promedio de las notas con un decimal (4, 4, 5, 4 → 4,3). `null` si no hay ninguna. */
export function promedioNotas(values: (number | null | undefined)[]): number | null {
  const ok = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (ok.length === 0) return null;
  return Math.round((ok.reduce((a, b) => a + b, 0) / ok.length) * 10) / 10;
}

const notaFmt = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Nota en formato chileno, siempre con un decimal: 4 → "4,0", 4.25 → "4,3". */
export function formatNota(n: number): string {
  return notaFmt.format(n);
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "marzo de 2025". Determinista (partes UTC): mismo texto en el servidor y en el cliente. */
export function fechaResena(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/** "1 reseña", "12 reseñas". */
export const cuentaResenas = (n: number) => `${n} ${n === 1 ? "reseña" : "reseñas"}`;
