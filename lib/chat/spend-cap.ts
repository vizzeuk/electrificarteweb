import { Redis } from "@upstash/redis";

// ─── Tope global diario del chatbot del sitio ─────────────────────────────────
// El rate limit por IP (20/min) acota a UN visitante, pero no al total: el chatbot está
// abierto a internet sin auth, así que un pico de tráfico real (RRSS, prensa) o un abuso
// distribuido puede disparar la factura de Anthropic sin ningún techo. Esto cuenta los
// turnos de LLM de todo el sitio por día y, al pasarse, degrada a respuestas estáticas en
// vez de seguir gastando.
//
// Es intencionalmente distinto de lib/whatsapp/quota.ts, que topea POR TELÉFONO a usuarios
// que ya pagaron. Acá el usuario es anónimo y el tope es global.

const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LLM_LIMIT ?? 3_000);
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

function todayKey(): string {
  return `chat_llm_daily:${new Date().toISOString().slice(0, 10)}`; // YYYY-MM-DD (UTC)
}

/**
 * Incrementa el contador global del día y retorna true si YA se superó el tope.
 * Llamar una vez por turno que vaya a gastar tokens (no en las respuestas estáticas).
 *
 * Falla ABIERTO ante un error de Redis: es preferible gastar de más un rato que dejar el
 * chatbot mudo justo en un pico de tráfico.
 */
export async function exceedsGlobalChatQuota(): Promise<boolean> {
  if (!Number.isFinite(DAILY_LIMIT) || DAILY_LIMIT <= 0) return false; // 0/NaN = sin tope
  const redis = getRedis();
  if (!redis) return false; // sin Redis no hay contador compartido posible

  try {
    const count = await redis.incr(todayKey());
    if (count === 1) await redis.expire(todayKey(), DAY_TTL_SECONDS);
    if (count > DAILY_LIMIT) {
      console.warn(`[chat] tope diario global superado (${count}/${DAILY_LIMIT}) — degradando a respuestas estáticas`);
      return true;
    }
    return false;
  } catch (err) {
    console.error("[chat] error consultando tope global, dejando pasar:", err);
    return false;
  }
}

/** Respuesta cuando se agotó el presupuesto del día — mantiene los caminos de conversión. */
export const CHAT_QUOTA_MESSAGE =
  `Estoy con muchísimas consultas hoy y por ahora no puedo responder en detalle 🙏.\n\n` +
  `Igual puedes avanzar por acá:\n\n` +
  `[MENU]\n` +
  `1. Ver el catálogo completo → /marcas\n` +
  `2. Negociar el mejor precio de un modelo → /solicitar\n` +
  `3. Escribirnos directamente → /contacto\n` +
  `[/MENU]`;
