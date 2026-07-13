// Fuente única de verdad para los links/precios de los dos productos.
// La página /asesoria y el chatbot (app/api/chat/route.ts) deben usar
// SIEMPRE esta constante para no divergir. Para cambiar el destino de pago
// sin tocar código, define NEXT_PUBLIC_ASESORIA_CHECKOUT_URL en el entorno.

/** Link de pago Reveniu de la Asesoría IA ($4.990). */
export const ASESORIA_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_ASESORIA_CHECKOUT_URL ??
  "https://app.reveniu.com/checkout-custom-link/nd1Zh0zfeNfi1b1yJgH8XeI94hJqycjB";

/** Precios de display (el precio real vive en el plan de Reveniu). */
export const ASESORIA_PRICE = "$4.990";
export const OFERTA_PRICE = "$19.990";
