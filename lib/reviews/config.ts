/**
 * Configuración del sistema de reseñas UGC. Ver `docs/REVIEWS-UGC-PLAN.md`.
 */

/**
 * 🟡 STANDBY — gating por invitación.
 *
 * `false` (hoy) = el formulario está abierto: cualquiera puede dejar una reseña y
 *                 queda `pendiente` hasta que Francisco la apruebe a mano.
 * `true`        = solo se entra con un link de invitación firmado (`/resena?t=…`),
 *                 y la reseña nace con `compra_verificada = true`.
 *
 * El gating queda para cuando Francisco defina las reglas de negocio (a quién se
 * invita y con qué incentivo). Mientras tanto la moderación humana es el filtro:
 * NADA se publica sin que él lo apruebe, así que abrir el formulario no expone
 * el sitio a contenido no deseado.
 */
export const REVIEWS_REQUIRE_INVITE = false;

/** Largo del texto de la reseña. */
export const REVIEW_MIN_CHARS = 30;
export const REVIEW_MAX_CHARS = 1500;

/** Tope de fotos por reseña (la subida se implementa en la fase siguiente). */
export const REVIEW_MAX_PHOTOS = 5;
