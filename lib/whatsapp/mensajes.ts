// Mensajes fijos del bot de WhatsApp (los que no pasan por el modelo) y las URLs
// que el bot puede mandar. Compartidos por lib/whatsapp/bot.ts y la ruta legada
// /api/whatsapp/advisor, para que no diverjan.
//
// Giro sep-2026: la Oferta $19.990 está en STANDBY hasta nuevo aviso. A quien no
// ha pagado se le ofrece SOLO la Asesoría $4.990, y nunca se nombra la Oferta.

export const SITIO = "https://www.electrificarte.com";
/**
 * Siempre el formulario propio, nunca el checkout directo de Reveniu: el
 * formulario genera el orderId con el que n8n activa la asesoría. Antes esto
 * salía de ADVISOR_SUBSCRIBE_URL, que apuntaba a Reveniu.
 */
export const ASESORIA_URL = `${SITIO}/asesoria/contratar`;
export const CONTACTO_URL = `${SITIO}/contacto`;
export const WAITLIST_URL = `${SITIO}/?waitlist=1`;

/** Para quien escribe sin asesoría: la invitación a contratarla. */
export function mensajeBienvenida(): string {
  return (
    "¡Hola! 👋 Soy *Francisco IA*, el asesor experto en autos electrificados de electrificarte.com.\n\n" +
    "Con la *Asesoría 1:1 por $4.990* te acompaño 10 días por este WhatsApp para elegir tu próximo auto: " +
    "vemos cómo lo usas, tu presupuesto y dónde vas a cargar, y te recomiendo modelos reales del catálogo, con sus fichas.\n\n" +
    `Actívala acá y partimos:\n${ASESORIA_URL}`
  );
}

/** Para quien tuvo asesoría y se le acabaron los 10 días. */
export function mensajeAsesoriaVencida(venceEl: Date): string {
  const fecha = venceEl.toLocaleDateString("es-CL", { day: "numeric", month: "long", timeZone: "America/Santiago" });
  return (
    `¡Hola de nuevo! 👋 Tu asesoría de 10 días terminó el *${fecha}*, así que por ahora no puedo seguir asesorándote por acá.\n\n` +
    `Si quieres retomar donde quedamos, puedes activar una nueva por $4.990:\n${ASESORIA_URL}\n\n` +
    `Y si tienes una consulta sobre tu asesoría, escríbenos en ${CONTACTO_URL}`
  );
}

/** Cuando el modelo falla (sin créditos, timeout): que el cliente tenga a dónde ir. */
export const MENSAJE_ERROR =
  `Disculpa, tuve un problema para responderte. ¿Me lo repites? Si sigue pasando, escríbenos en ${CONTACTO_URL}`;

/** Lo que el cliente SIEMPRE recibe cuando el asesor lo deriva a una persona. */
export const MENSAJE_DERIVACION =
  `Tu solicitud quedó registrada y la va a revisar una persona de nuestro equipo. ` +
  `Si quieres agregar algo, también puedes escribirnos en ${CONTACTO_URL}`;
