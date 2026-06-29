import { Redis } from "@upstash/redis";
import type { ChatMessage } from "@/lib/whatsapp/advisor";

// Conversation context stored in Redis, keyed by normalized phone number.
// TTL is 7 days — context survives cold starts, multiple serverless instances,
// and long gaps between messages (the ~1h Kapso API limit does not apply here).

const CTX_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MAX_STORED_MESSAGES = 60; // keep last 60 turns (~30 exchanges)

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
  return `wa_ctx:${phone}`;
}

export async function loadContext(phone: string): Promise<ChatMessage[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.get<ChatMessage[]>(contextKey(phone));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function saveContext(phone: string, messages: ChatMessage[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  // Keep only the last N messages to avoid unbounded growth
  const trimmed = messages.slice(-MAX_STORED_MESSAGES);
  try {
    await redis.set(contextKey(phone), trimmed, { ex: CTX_TTL_SECONDS });
  } catch {
    // Non-fatal: context save failure shouldn't break the response
  }
}

export async function clearContext(phone: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(contextKey(phone));
  } catch {
    // ignore
  }
}
