/**
 * Ejecuta `fn` con hasta `retries` reintentos y backoff exponencial.
 * Solo aplica a llamadas idempotentes (Sanity). No usar con Anthropic.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  baseDelayMs = 300,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
      }
    }
  }
  throw lastErr;
}

/**
 * Wrapper para fetches de Sanity: timeout + retry + fallback.
 * Si la llamada tarda más de `timeoutMs` o falla tras reintentos, devuelve `fallback`.
 */
export function sanityFetch<T>(
  fn: () => Promise<T>,
  fallback: T,
  timeoutMs = 5_000,
): Promise<T> {
  const fetchWithRetry = withRetry(fn);

  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`sanity_timeout:${timeoutMs}`)), timeoutMs),
  );

  return Promise.race([fetchWithRetry, timeout]).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("sanity_timeout:")) {
      console.warn("[sanity] timeout after", timeoutMs, "ms — usando fallback");
    } else {
      console.warn("[sanity] fetch error:", msg, "— usando fallback");
    }
    return fallback;
  });
}
