import type { ChatMessage } from "@/lib/whatsapp/advisor";

// ─── Cliente de la API de Kapso ───────────────────────────────────────────────
// Kapso guarda los mensajes de WhatsApp y los expone vía API paginada. Cuando el
// workflow de Kapso dispara con un mensaje entrante, nos manda el conversation_id;
// acá traemos el historial reciente y lo mapeamos al formato del asesor.
//
// Docs: GET /{phone_number_id}/messages?conversation_id=...
//       kapso.direction: "inbound" (cliente) | "outbound" (bot)

const KAPSO_BASE = process.env.KAPSO_API_BASE ?? "https://api.kapso.ai/meta/whatsapp/v24.0";
const FETCH_TIMEOUT_MS = 8_000;

interface KapsoMessage {
  from?: string | null;
  to?: string | null;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  kapso?: {
    direction?: "inbound" | "outbound";
    content?: string | null;
    phone_number?: string | null;
  };
}

// Tipos de mensaje que NO son conversación real (ruido que no debe ir al LLM)
const SKIP_TYPES = new Set(["errors", "reaction", "unsupported", "system", "unknown"]);

export interface KapsoHistory {
  messages: ChatMessage[];
  /** Teléfono del cliente, detectado del último mensaje entrante (formato Kapso, sin "+"). */
  userPhone: string | null;
}

/**
 * Trae el historial reciente de una conversación de Kapso y lo mapea a ChatMessage[].
 * Fail-soft: si Kapso no está configurado o falla, devuelve historial vacío.
 */
export async function fetchKapsoHistory(conversationId: string, limit = 20): Promise<KapsoHistory> {
  const apiKey = process.env.KAPSO_API_KEY;
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
  if (!apiKey || !phoneNumberId) {
    console.warn("[advisor] Kapso no configurado (KAPSO_API_KEY / KAPSO_PHONE_NUMBER_ID)");
    return { messages: [], userPhone: null };
  }

  const url =
    `${KAPSO_BASE}/${encodeURIComponent(phoneNumberId)}/messages` +
    `?conversation_id=${encodeURIComponent(conversationId)}&limit=${Math.min(Math.max(limit, 1), 100)}`;

  let raw: KapsoMessage[] = [];
  try {
    const res = await fetch(url, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn("[advisor] Kapso messages HTTP", res.status);
      return { messages: [], userPhone: null };
    }
    const data = (await res.json()) as { data?: KapsoMessage[] };
    raw = Array.isArray(data?.data) ? data.data : [];
  } catch (err) {
    console.warn("[advisor] error consultando Kapso:", err instanceof Error ? err.message : err);
    return { messages: [], userPhone: null };
  }

  // Orden cronológico ascendente (la API devuelve lo más reciente primero)
  const sorted = raw
    .slice()
    .sort((a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0));

  const messages: ChatMessage[] = [];
  let userPhone: string | null = null;

  for (const m of sorted) {
    const dir = m.kapso?.direction;
    if (dir !== "inbound" && dir !== "outbound") continue;
    // El teléfono del contacto viene en ambos sentidos (más confiable que `from`)
    const contactPhone = m.kapso?.phone_number ?? (dir === "inbound" ? m.from : null);
    if (contactPhone) userPhone = contactPhone;

    if (m.type && SKIP_TYPES.has(m.type)) continue; // ignora errores/reacciones/etc.
    const content = (m.kapso?.content ?? m.text?.body ?? "").trim();
    if (!content) continue; // ignora media/no-texto/vacíos
    messages.push({ role: dir === "inbound" ? "user" : "assistant", content });
  }

  // El último mensaje debe ser del usuario (el que disparó el webhook).
  // Si quedaron mensajes salientes al final, los recortamos.
  while (messages.length > 0 && messages.at(-1)!.role === "assistant") messages.pop();

  return { messages, userPhone };
}
