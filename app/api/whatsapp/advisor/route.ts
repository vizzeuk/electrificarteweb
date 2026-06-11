import { NextRequest, NextResponse } from "next/server";
import { checkChatRateLimit } from "@/lib/chat/rate-limit-redis";
import { detectInjection, INJECTION_RESPONSE } from "@/lib/chat/guards";
import { isSubscribed, normalizePhone } from "@/lib/whatsapp/subscription";
import { runAdvisor, type ChatMessage } from "@/lib/whatsapp/advisor";
import { fetchKapsoHistory } from "@/lib/whatsapp/kapso";
import { exceedsDailyQuota, DAILY_QUOTA_MESSAGE } from "@/lib/whatsapp/quota";

// ─── Validación de payload ────────────────────────────────────────────────────

const MAX_MSG_LEN = 1_500;
const MAX_HISTORY = 30;

function validateMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_HISTORY) return null;
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.length === 0 || content.length > MAX_MSG_LEN) return null;
    out.push({ role, content });
  }
  // El último mensaje debe ser del usuario
  if (out.at(-1)?.role !== "user") return null;
  return out;
}

/** Recorta a los últimos MAX_HISTORY y exige que el último sea del usuario. */
function finalizeHistory(msgs: ChatMessage[]): ChatMessage[] | null {
  const trimmed = msgs.slice(-MAX_HISTORY);
  if (trimmed.length === 0 || trimmed.at(-1)?.role !== "user") return null;
  return trimmed;
}

/**
 * Resuelve el historial de la conversación a partir del payload.
 *
 * Soporta dos formas:
 *  - Kapso (producción): { conversation_id, phone?, message? } → trae el hilo desde Kapso.
 *  - Directo (n8n / pruebas): { phone, messages: [...] } → usa el array tal cual.
 *
 * Devuelve { phone, messages } o null si no se puede resolver.
 */
async function resolveConversation(
  body: Record<string, unknown>,
): Promise<{ phone: string; messages: ChatMessage[] } | null> {
  const bodyPhone = typeof body.phone === "string" ? body.phone : "";

  // Forma directa: messages[] explícito
  if (Array.isArray(body.messages)) {
    const messages = validateMessages(body.messages);
    if (!messages || normalizePhone(bodyPhone).length < 6) return null;
    return { phone: bodyPhone, messages };
  }

  // Forma Kapso: conversation_id
  if (typeof body.conversation_id === "string" && body.conversation_id.trim()) {
    const { messages: history, userPhone } = await fetchKapsoHistory(body.conversation_id.trim());
    const phone = normalizePhone(bodyPhone).length >= 6 ? bodyPhone : (userPhone ?? "");
    if (normalizePhone(phone).length < 6) return null;

    let messages = history;
    // Respaldo: si Kapso no devolvió historial pero vino el mensaje actual, úsalo
    if (messages.length === 0 && typeof body.message === "string" && body.message.trim()) {
      messages = [{ role: "user", content: body.message.trim().slice(0, MAX_MSG_LEN) }];
    }
    const finalized = finalizeHistory(messages);
    if (!finalized) return null;
    return { phone, messages: finalized };
  }

  return null;
}

function subscribeMessage(): string {
  const url = process.env.ADVISOR_SUBSCRIBE_URL;
  const base =
    "¡Hola! 👋 Soy el asesor experto en autos eléctricos de Electrificarte. La asesoría 1:1 por WhatsApp es un servicio para suscriptores.";
  return url
    ? `${base}\n\nActiva tu asesoría acá y te ayudo a encontrar tu auto ideal:\n${url}`
    : `${base}\n\nEscríbenos para activar tu asesoría.`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth: secreto compartido con n8n
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const resolved = await resolveConversation((body ?? {}) as Record<string, unknown>);
  if (!resolved) {
    return NextResponse.json({ error: "Payload inválido (falta conversation_id/phone o mensajes)." }, { status: 400 });
  }
  const { phone, messages } = resolved;

  // 2. Rate limit por número
  if (await checkChatRateLimit(`wa:${normalizePhone(phone)}`)) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un momento." }, { status: 429 });
  }

  try {
    // 3. Gating: autoridad server-side contra Supabase
    if (!(await isSubscribed(phone))) {
      return NextResponse.json({ message: subscribeMessage(), subscribed: false });
    }

    // 4. Guard de inyección sobre el último mensaje del usuario
    const last = messages.at(-1)?.content ?? "";
    if (detectInjection(last)) {
      return NextResponse.json({ message: INJECTION_RESPONSE, subscribed: true });
    }

    // 5. Cuota diaria por número (control de costo; solo suscriptores consumen)
    if (await exceedsDailyQuota(normalizePhone(phone))) {
      return NextResponse.json({ message: DAILY_QUOTA_MESSAGE, subscribed: true });
    }

    // 6. Motor advisor
    const message = await runAdvisor(messages);
    return NextResponse.json({ message, subscribed: true });
  } catch (err) {
    console.error("[whatsapp advisor]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
