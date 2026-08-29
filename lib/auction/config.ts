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

/** Horas tras la aceptación para preguntar si la venta se concretó (OOS, default 48). */
export const OOS_HOURS = Number(process.env.AUCTION_OOS_HOURS ?? 48);

/** URL del panel de vendedores (botón "Ir al panel" de los correos). */
export const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "https://www.electrificarte.com";

/** Link de WhatsApp del negocio (botón "Responder por WhatsApp" de los correos al cliente).
 *  Configurar WHATSAPP_LINK con el wa.me real del número de Electrificarte. */
export const WHATSAPP_LINK = process.env.WHATSAPP_LINK ?? "https://wa.me/56900000000";
