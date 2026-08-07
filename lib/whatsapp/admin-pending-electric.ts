import { Redis } from "@upstash/redis";
import type { PendingElectricConfirm } from "@/lib/pdp-research/research";

// Guarda lo ya investigado (specs/fotos/fuentes) cuando researchCar() no pudo confirmar el tipo de
// electrificación desde el texto fuente, para que Francisco pueda confirmarlo a mano por WhatsApp
// ("es EV") sin repetir la búsqueda completa. Mismo patrón que admin-review-state.ts, TTL más
// corto (2h): el dato es pesado (specs completas) y solo sirve mientras Francisco decide.

const PENDING_TTL_SECONDS = 60 * 60 * 2;

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

function key(phone: string): string {
  return `admin_pending_electric:${phone}`;
}

export async function loadPendingElectric(phone: string): Promise<PendingElectricConfirm | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<PendingElectricConfirm>(key(phone));
  } catch {
    return null;
  }
}

export async function savePendingElectric(phone: string, state: PendingElectricConfirm): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key(phone), state, { ex: PENDING_TTL_SECONDS });
  } catch {
    // no fatal
  }
}

export async function clearPendingElectric(phone: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key(phone));
  } catch {
    // ignore
  }
}
