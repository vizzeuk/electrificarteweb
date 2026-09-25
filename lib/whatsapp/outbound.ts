import { WhatsAppClient } from "@kapso/whatsapp-cloud-api";

// ─── Envío saliente proactivo por WhatsApp (Kapso) ────────────────────────────
// El bot normal es reactivo (responde a entrantes). Este módulo permite ENVIAR
// mensajes que iniciamos nosotros — hoy solo el recordatorio de "queda 1 día".
//
// ⚠️ Ventana de 24h de WhatsApp: fuera de las 24h desde el último mensaje del
// cliente, Meta SOLO acepta PLANTILLAS aprobadas (no texto libre). Un nudge del
// día 9 casi siempre cae fuera de esa ventana, así que el camino real es una
// plantilla. Si no hay plantilla configurada, intentamos texto (solo funcionará
// para clientes que escribieron en las últimas 24h) y lo dejamos logueado.

const KAPSO_BASE_URL = process.env.KAPSO_BASE_URL ?? "https://api.kapso.ai/meta/whatsapp";

let _client: WhatsAppClient | null = null;
function getClient(): WhatsAppClient | null {
  if (_client) return _client;
  const kapsoApiKey = process.env.KAPSO_API_KEY;
  if (!kapsoApiKey) {
    console.warn("[outbound] KAPSO_API_KEY ausente — no se puede enviar proactivamente");
    return null;
  }
  _client = new WhatsAppClient({ kapsoApiKey, baseUrl: KAPSO_BASE_URL });
  return _client;
}

function phoneNumberId(): string | null {
  return process.env.KAPSO_PHONE_NUMBER_ID ?? null;
}

/** Envía texto libre. Solo llega si el cliente está dentro de la ventana de 24h. */
export async function sendProactiveText(phone: string, body: string): Promise<boolean> {
  const client = getClient();
  const from = phoneNumberId();
  if (!client || !from) return false;
  try {
    await client.messages.sendText({ phoneNumberId: from, to: phone, body });
    return true;
  } catch (err) {
    console.warn("[outbound] sendText falló:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Envía una imagen (por URL pública, ej. CDN de Sanity). Solo dentro de la ventana de 24h. */
export async function sendProactiveImage(phone: string, imageUrl: string, caption?: string): Promise<boolean> {
  const client = getClient();
  const from = phoneNumberId();
  if (!client || !from) return false;
  try {
    await client.messages.sendImage({ phoneNumberId: from, to: phone, image: { link: imageUrl, caption } });
    return true;
  } catch (err) {
    console.warn("[outbound] sendImage falló:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Envía una plantilla aprobada (funciona fuera de la ventana de 24h). */
export async function sendTemplate(
  phone: string,
  name: string,
  language: string,
  // Posicionales ({{1}}, {{2}}…) como arreglo, o con nombre ({{customer_name}}) como objeto.
  bodyParams: string[] | Record<string, string> = [],
): Promise<boolean> {
  const client = getClient();
  const from = phoneNumberId();
  if (!client || !from) return false;
  try {
    const parameters = Array.isArray(bodyParams)
      ? bodyParams.map((text) => ({ type: "text", text }))
      : Object.entries(bodyParams).map(([parameter_name, text]) => ({ type: "text", parameter_name, text }));
    const components = parameters.length > 0 ? [{ type: "body", parameters }] : undefined;
    await client.messages.sendTemplate({
      phoneNumberId: from,
      to: phone,
      // parameter_name (parámetros con nombre) no está en los tipos del SDK, pero la API de Meta lo acepta.
      template: { name, language: { code: language }, components } as never,
    });
    return true;
  } catch (err) {
    console.warn("[outbound] sendTemplate falló:", err instanceof Error ? err.message : err);
    return false;
  }
}

// ─── Recordatorio "queda 1 día" (asesoría $4.990) ─────────────────────────────

// Copy del mensaje. Para envío por plantilla, este texto debe coincidir con el
// cuerpo de la plantilla aprobada en Kapso/Meta (nombre en ASESORIA_REMINDER_TEMPLATE).
export const ASESORIA_REMINDER_TEXT =
  "Hola 👋 Soy *Francisco IA*, tu asesor de electrificarte.com. A tu asesoría le queda *1 día*. ¿Te puedo ayudar en algo antes de que termine? 🔋";

const REMINDER_TEMPLATE = process.env.ASESORIA_REMINDER_TEMPLATE; // ej: "asesoria_ultimo_dia"
const REMINDER_TEMPLATE_LANG = process.env.ASESORIA_REMINDER_TEMPLATE_LANG ?? "es";

/**
 * Envía el recordatorio del último día. Usa plantilla si está configurada
 * (recomendado, funciona fuera de la ventana de 24h); si no, cae a texto libre.
 */
export async function sendAsesoriaReminder(phone: string): Promise<boolean> {
  if (REMINDER_TEMPLATE) {
    const enviada = await sendTemplate(phone, REMINDER_TEMPLATE, REMINDER_TEMPLATE_LANG);
    if (enviada) return true;
    // La plantilla falló: aún sin aprobar por Meta, idioma que no calza, o nombre mal
    // escrito. Antes esto significaba NO enviar nada. Ahora caemos a texto libre, que
    // no reemplaza a la plantilla (solo llega dentro de la ventana de 24 h) pero es
    // mejor que quedarse callado. No hay riesgo de envío doble: solo entra acá si el
    // envío por plantilla no salió.
    console.warn(
      `[outbound] la plantilla "${REMINDER_TEMPLATE}" (${REMINDER_TEMPLATE_LANG}) falló — ` +
        "cayendo a texto libre. Revisar que esté APPROVED en Meta y que el idioma coincida.",
    );
  } else {
    console.warn(
      "[outbound] ASESORIA_REMINDER_TEMPLATE no configurada — usando texto libre " +
        "(solo llegará a clientes dentro de la ventana de 24h de WhatsApp)",
    );
  }
  return sendProactiveText(phone, ASESORIA_REMINDER_TEXT);
}

// ─── Confirmación de pago de la asesoría ($4.990) ─────────────────────────────
// La dispara n8n cuando Reveniu confirma el pago (vía /api/whatsapp/asesoria-confirmada), así la
// única credencial de Kapso que envía mensajes vive en la web.

const CONFIRM_TEMPLATE = process.env.ASESORIA_CONFIRM_TEMPLATE ?? "confirmacion_asesoria";
const CONFIRM_TEMPLATE_LANG = process.env.ASESORIA_CONFIRM_TEMPLATE_LANG ?? "es_AR";

export function asesoriaConfirmadaText(nombre: string): string {
  const saludo = nombre ? `Hola ${nombre.split(" ")[0]} 👋` : "Hola 👋";
  return `${saludo} Soy *Francisco IA*, tu asesor de electrificarte.com. Tu asesoría está confirmada: durante 10 días te ayudo a elegir tu auto electrificado. Cuéntame para qué lo usarías y cuál es tu presupuesto aproximado 🔋`;
}

/** Plantilla de confirmación; si falla, texto libre (solo llega dentro de la ventana de 24 h). */
export async function sendAsesoriaConfirmada(phone: string, nombre: string): Promise<"plantilla" | "texto" | null> {
  if (await sendTemplate(phone, CONFIRM_TEMPLATE, CONFIRM_TEMPLATE_LANG, { customer_name: nombre || "cliente" })) return "plantilla";
  console.warn(`[outbound] la plantilla "${CONFIRM_TEMPLATE}" (${CONFIRM_TEMPLATE_LANG}) falló — cayendo a texto libre`);
  return (await sendProactiveText(phone, asesoriaConfirmadaText(nombre))) ? "texto" : null;
}
