/**
 * Rate limiter in-memory por IP. Comparte el mapa entre instancias dentro
 * de la misma Lambda; tras un cold start, el contador se reinicia (aceptable
 * para una primera línea anti-spam — no es DDoS protection profesional).
 *
 * Uso típico en una API route:
 *
 *   const limited = checkRateLimit(req, { max: 10, windowMs: 60_000 });
 *   if (limited) return limited;  // ya devuelve 429
 */

const buckets = new Map<string, Map<string, { n: number; resetAt: number }>>();

function getBucket(name: string): Map<string, { n: number; resetAt: number }> {
  let b = buckets.get(name);
  if (!b) {
    b = new Map();
    buckets.set(name, b);
    // Auto-limpieza para que el mapa no crezca infinito
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of b!) if (now > v.resetAt) b!.delete(k);
    }, 5 * 60_000);
  }
  return b;
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

interface Options {
  /** Cantidad máxima de requests en la ventana. */
  max: number;
  /** Ancho de la ventana en milisegundos. */
  windowMs: number;
  /** Nombre del bucket — separar por endpoint evita que /chat consuma cupo de /leads. */
  bucket: string;
}

/**
 * Devuelve `null` si la request puede continuar.
 * Devuelve una `Response` 429 lista para retornar si la IP excedió el cupo.
 */
export function checkRateLimit(
  req: Request,
  opts: Options,
): Response | null {
  const ip = getClientIp(req);
  const map = getBucket(opts.bucket);
  const now = Date.now();
  const entry = map.get(ip);

  if (!entry || now > entry.resetAt) {
    map.set(ip, { n: 1, resetAt: now + opts.windowMs });
    return null;
  }

  if (entry.n >= opts.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({ error: "Demasiadas solicitudes. Intenta en un momento." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  entry.n++;
  return null;
}
