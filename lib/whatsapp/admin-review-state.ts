import { Redis } from "@upstash/redis";

// Estado de la revisión conversacional de un auto recién investigado (M3.2, Fase 1.2 Flujo A).
// Separado del historial de chat (admin-context.ts) — esto es una máquina de estados chica
// ("qué auto, qué paso"), no mensajes. Mismo patrón Redis/Upstash, TTL más corto (24h: da tiempo
// a que Francisco lo revise sin dejar reseñas viejas colgando indefinidamente).

const REVIEW_TTL_SECONDS = 60 * 60 * 24;

export interface AdminReviewState {
  carId: string;
  brand: string;
  model: string;
  step: "specs" | "photos";
  /** _key de cada foto de la galería, en el orden que se le mostró a Francisco — índice+1 = "foto N". */
  galleryKeys: string[];
}

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
  return `admin_review:${phone}`;
}

export async function loadReviewState(phone: string): Promise<AdminReviewState | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<AdminReviewState>(key(phone));
  } catch {
    return null;
  }
}

export async function saveReviewState(phone: string, state: AdminReviewState): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key(phone), state, { ex: REVIEW_TTL_SECONDS });
  } catch {
    // no fatal
  }
}

export async function clearReviewState(phone: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key(phone));
  } catch {
    // ignore
  }
}
