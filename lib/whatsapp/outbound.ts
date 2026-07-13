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

/** Envía una plantilla aprobada (funciona fuera de la ventana de 24h). */
export async function sendTemplate(
  phone: string,
  name: string,
  language: string,
  bodyParams: string[] = [],
): Promise<boolean> {
  const client = getClient();
  const from = phoneNumberId();
  if (!client || !from) return false;
  try {
    const components =
      bodyParams.length > 0
        ? [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }]
        : undefined;
    await client.messages.sendTemplate({
      phoneNumberId: from,
      to: phone,
      template: { name, language: { code: language }, components },
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
    return sendTemplate(phone, REMINDER_TEMPLATE, REMINDER_TEMPLATE_LANG);
  }
  console.warn(
    "[outbound] ASESORIA_REMINDER_TEMPLATE no configurada — usando texto libre " +
      "(solo llegará a clientes dentro de la ventana de 24h de WhatsApp)",
  );
  return sendProactiveText(phone, ASESORIA_REMINDER_TEXT);
}
