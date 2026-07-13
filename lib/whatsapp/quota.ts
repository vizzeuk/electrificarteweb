import { Redis } from "@upstash/redis";

// ─── Cuota diaria por número ──────────────────────────────────────────────────
// Tope de turnos de asesor por teléfono y por día. Acota el costo de Anthropic:
// cada turno es una llamada a Sonnet (más el loop de tools), así que sin esto un
// suscriptor —o alguien spoofeando un número con el secreto filtrado— podría
// quemar el presupuesto. Va DESPUÉS del gating: solo los suscriptores consumen.
//
// Usa Upstash Redis (persistente entre invocaciones serverless). Si no está
// configurado, cae a un contador in-memory (solo útil en dev; en prod hay que
// tener KV_REST_API_URL/TOKEN para que el tope sea real).

const DAILY_LIMIT = Number(process.env.ADVISOR_DAILY_LIMIT ?? 80);
const DAY_TTL_SECONDS = 60 * 60 * 26; // ~26h, cubre el día con holgura de zona horaria

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// Fallback in-memory (por instancia; solo dev)
const _mem = new Map<string, { count: number; resetAt: number }>();

function todayKey(phone: string): string {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return `wa_daily:${phone}:${day}`;
}

/**
 * Incrementa el contador del día y retorna true si el número SUPERÓ la cuota.
 * Llamar una vez por turno de asesor (justo antes de runAdvisor).
 */
export async function exceedsDailyQuota(phone: string): Promise<boolean> {
  if (!Number.isFinite(DAILY_LIMIT) || DAILY_LIMIT <= 0) return false; // 0/NaN = sin tope
  const key = todayKey(phone);
  const redis = getRedis();

  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, DAY_TTL_SECONDS);
    return count > DAILY_LIMIT;
  }

  // Fallback in-memory
  const now = Date.now();
  const entry = _mem.get(key);
  if (!entry || now > entry.resetAt) {
    _mem.set(key, { count: 1, resetAt: now + DAY_TTL_SECONDS * 1000 });
    return false;
  }
  entry.count++;
  return entry.count > DAILY_LIMIT;
}

/**
 * Devuelve una unidad de cuota. Llamar cuando el turno se contabilizó (incr) pero
 * runAdvisor falló, para no penalizar al usuario por un error nuestro.
 */
export async function refundDailyQuota(phone: string): Promise<void> {
  if (!Number.isFinite(DAILY_LIMIT) || DAILY_LIMIT <= 0) return;
  const key = todayKey(phone);
  const redis = getRedis();

  if (redis) {
    try {
      await redis.decr(key);
    } catch {
      // no fatal
    }
    return;
  }

  const entry = _mem.get(key);
  if (entry && entry.count > 0) entry.count--;
}

export const DAILY_QUOTA_MESSAGE =
  "Por hoy llegamos al límite de consultas de tu asesoría 🙏. Mañana seguimos donde quedamos — cuéntame y te ayudo a avanzar con tu próximo auto eléctrico.";
