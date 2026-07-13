import { Redis } from "@upstash/redis";

// ─── Idempotencia + serialización por teléfono ────────────────────────────────
// Dos problemas que el harness reactivo tiene en serverless:
//
// 1. DOBLE PROCESAMIENTO: Kapso reintenta webhooks y puede haber varias instancias
//    concurrentes. El dedup del SDK vive en memoria por instancia, así que el mismo
//    mensaje puede procesarse dos veces → doble respuesta, doble cuota, doble costo.
//    `alreadyProcessed(messageId)` marca cada message-id en Redis (compartido).
//
// 2. RACE DE CONTEXTO: loadContext → runAdvisor → saveContext es read-modify-write
//    sin lock. Ráfagas de mensajes del mismo número pisan el historial. `withPhoneLock`
//    serializa por teléfono con un lock en Redis (SET NX PX + reintentos).
//
// Sin Redis (dev), ambos degradan a no-op seguros (mejor esfuerzo).

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

const SEEN_TTL_SECONDS = 60 * 15; // 15 min: cubre reintentos de webhook

/**
 * Marca el message-id como procesado. Retorna true si YA estaba procesado
 * (⇒ el caller debe descartar el mensaje). Atómico vía SET NX.
 */
export async function alreadyProcessed(messageId: string): Promise<boolean> {
  if (!messageId) return false;
  const redis = getRedis();
  if (!redis) return false; // sin Redis no podemos deduplicar; seguimos
  try {
    const ok = await redis.set(`wa_seen:${messageId}`, "1", {
      nx: true,
      ex: SEEN_TTL_SECONDS,
    });
    return ok === null; // null ⇒ ya existía
  } catch {
    return false;
  }
}

const LOCK_TTL_MS = 30_000;   // el lock expira solo por si una instancia muere
const LOCK_RETRIES = 12;      // ~6s de espera máxima
const LOCK_RETRY_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ejecuta `fn` con exclusión mutua por teléfono. Reintenta adquirir el lock un
 * rato; si no lo logra (otra instancia colgada), procede igual best-effort.
 */
export async function withPhoneLock<T>(phone: string, fn: () => Promise<T>): Promise<T> {
  const redis = getRedis();
  if (!redis) return fn(); // sin Redis no hay lock distribuido

  const key = `wa_lock:${phone}`;
  let acquired = false;
  for (let i = 0; i < LOCK_RETRIES; i++) {
    try {
      const ok = await redis.set(key, "1", { nx: true, px: LOCK_TTL_MS });
      if (ok !== null) {
        acquired = true;
        break;
      }
    } catch {
      break; // ante error de Redis, no bloqueamos el flujo
    }
    await sleep(LOCK_RETRY_MS);
  }

  if (!acquired) {
    console.warn("[concurrency] no se pudo adquirir lock; procesando sin exclusión");
  }

  try {
    return await fn();
  } finally {
    if (acquired) {
      try {
        await redis.del(key);
      } catch {
        // el TTL lo libera igual
      }
    }
  }
}
