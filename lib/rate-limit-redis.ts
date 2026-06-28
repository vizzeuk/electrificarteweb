import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

interface Options {
  max: number;
  windowSeconds: number;
  bucket: string;
}

// One Redis instance shared across all rate limiters
let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// Per-bucket Ratelimit instances (lazy)
const _limiters = new Map<string, Ratelimit>();
function getLimiter(opts: Options): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${opts.bucket}:${opts.max}:${opts.windowSeconds}`;
  if (!_limiters.has(key)) {
    _limiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(opts.max, `${opts.windowSeconds} s`),
        prefix: `ev_rl_${opts.bucket}`,
        analytics: false,
      }),
    );
  }
  return _limiters.get(key)!;
}

// In-memory fallback (per-bucket, per-IP)
const _mem = new Map<string, { n: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _mem) if (now > v.resetAt) _mem.delete(k);
}, 5 * 60_000);

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Async rate limiter that uses Upstash Redis (sliding window) when configured,
 * falling back to in-memory for local dev. Returns a 429 Response if limited,
 * or null if the request may proceed.
 */
export async function checkRateLimitRedis(
  req: Request,
  opts: Options,
): Promise<Response | null> {
  const ip = getClientIp(req);
  const limiter = getLimiter(opts);

  if (limiter) {
    const { success } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta en un momento." },
        { status: 429, headers: { "Retry-After": String(opts.windowSeconds) } },
      );
    }
    return null;
  }

  // In-memory fallback
  const now = Date.now();
  const memKey = `${opts.bucket}:${ip}`;
  const entry = _mem.get(memKey);
  if (!entry || now > entry.resetAt) {
    _mem.set(memKey, { n: 1, resetAt: now + opts.windowSeconds * 1000 });
    return null;
  }
  if (entry.n >= opts.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta en un momento." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  entry.n++;
  return null;
}
