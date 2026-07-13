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
