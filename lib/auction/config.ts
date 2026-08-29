/**
 * Parámetros de la subasta. Configurables por variables de entorno para
 * ajustarlos sin redeploy.
 */

/** Duración de la ventana de puja por lead, en horas (default 48). */
export const WINDOW_HOURS = Number(process.env.AUCTION_WINDOW_HOURS ?? 48);

/** Desde cuántas horas antes del cierre se empieza a presionar (default 24). */
export const PRESSURE_HOURS_BEFORE = Number(process.env.AUCTION_PRESSURE_HOURS_BEFORE ?? 24);

/** Mínimo de horas entre presiones a una misma oferta (anti-spam, default 12). */
export const PRESSURE_THROTTLE_HOURS = Number(process.env.AUCTION_PRESSURE_THROTTLE_HOURS ?? 12);
