import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy singleton — se inicializa solo si las env vars están presentes.
// En local sin Redis, cae automáticamente al fallback in-memory.
let _ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (_ratelimit) return _ratelimit;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    prefix: "ev_chat_rl",
    analytics: false,
  });
  return _ratelimit;
}

// Fallback in-memory para dev local o si Redis no está configurado
const _mem = new Map<string, { n: number; resetAt: number }>();
const MEM_MAX = 20;
const MEM_WINDOW_MS = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _mem) if (now > v.resetAt) _mem.delete(k);
}, 5 * 60_000);

/**
 * Retorna true si la IP superó el límite de requests.
 * Usa Upstash Redis (sliding window) si está configurado, o in-memory como fallback.
 */
export async function checkChatRateLimit(ip: string): Promise<boolean> {
  const rl = getRatelimit();

  if (rl) {
    const { success } = await rl.limit(ip);
    return !success;
  }

  // Fallback in-memory
  const now = Date.now();
  const entry = _mem.get(ip);
  if (!entry || now > entry.resetAt) {
    _mem.set(ip, { n: 1, resetAt: now + MEM_WINDOW_MS });
    return false;
  }
  if (entry.n >= MEM_MAX) return true;
  entry.n++;
  return false;
}
