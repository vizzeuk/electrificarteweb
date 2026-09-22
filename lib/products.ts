// Fuente única de verdad para los links/precios de los dos productos.
// La página /asesoria y el chatbot (app/api/chat/route.ts) deben usar
// SIEMPRE esta constante para no divergir. Para cambiar el destino de pago
// sin tocar código, define NEXT_PUBLIC_ASESORIA_CHECKOUT_URL en el entorno.

/**
 * Link a la Asesoría IA ($4.990). Antes apuntaba directo a un checkout-link
 * externo de Reveniu (el usuario llenaba sus datos ahí); ahora apunta a
 * nuestro propio formulario (/asesoria/contratar), que manda los datos a
 * n8n como "pendiente" antes de pasar a pago — mismo patrón que /solicitar.
 */
export const ASESORIA_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_ASESORIA_CHECKOUT_URL ?? "/asesoria/contratar";

/** Precios de display (el precio real vive en el plan de Reveniu). */
export const ASESORIA_PRICE = "$4.990";
export const OFERTA_PRICE = "$19.990";

/**
 * 🔴 INTERRUPTOR DEL GIRO (septiembre 2026) — ver `docs/PIVOT-WAITLIST-PLAN.md`.
 *
 * `true`  = la Oferta Exclusiva ($19.990) está en STANDBY: no se vende. Todos los CTAs que
 *           antes iban a `/solicitar` abren el **popup de waitlist**, y `/solicitar` queda
 *           oculta (sin links que lleguen ahí).
 * `false` = se reactiva el flujo pagado y los CTAs vuelven a `/solicitar`.
 *
 * El código del flujo pagado (`/solicitar`, `LeadForm`, `/api/checkout` rama lead,
 * `app/api/auction/*`) NO se borró: sigue completo y testeado (`npm test`). Reactivar es
 * cambiar esta línea, no re-editar los ~40 CTAs.
 */
export const OFERTA_STANDBY = true;

/**
 * 🔴 INTERRUPTOR — superficies promocionales de "Hot Deal" (septiembre 2026).
 *
 * `false` (hoy) = se ocultan la sección Hot Deal de la home, el popup promocional,
 *                 los bloques de "deal cards" de las PLP y los badges "HOT DEAL".
 * `true`        = vuelven todas.
 *
 * ⚠️ Esto NO toca la lógica de PRECIOS. El campo `isHotDeal` de Sanity sigue
 * controlando si una ficha muestra precio con descuento o precio de lista — eso se
 * dejó intacto a propósito, porque apagarlo cambiaría el precio mostrado de todos
 * los autos, que es una decisión de negocio, no de UI.
 */
export const HOT_DEALS_ENABLED = false;
