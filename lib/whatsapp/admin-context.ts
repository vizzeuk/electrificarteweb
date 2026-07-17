import { Redis } from "@upstash/redis";
import type { ChatMessage } from "@/lib/whatsapp/advisor";

// Historial conversacional del modo administrador, separado del historial de clientes
// (lib/whatsapp/context.ts, prefijo wa_ctx:) para no mezclar sesiones si Francisco alguna vez
// prueba el bot de cliente desde el mismo número. Mismo patrón (Redis/Upstash, TTL 7 días).

const CTX_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_STORED_MESSAGES = 60;

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

function contextKey(phone: string): string {
  return `admin_ctx:${phone}`;
}

export async function loadAdminContext(phone: string): Promise<ChatMessage[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.get<ChatMessage[]>(contextKey(phone));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function saveAdminContext(phone: string, messages: ChatMessage[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const trimmed = messages.slice(-MAX_STORED_MESSAGES);
  try {
    await redis.set(contextKey(phone), trimmed, { ex: CTX_TTL_SECONDS });
  } catch {
    // no bloquea la respuesta
  }
}
