/**
 * Firecrawl como FALLBACK de `web_fetch`, no como camino por defecto.
 *
 * El motivo no es ahorrar tokens: `web_fetch` entrega `text/plain` y no cobra
 * extra, así que el HTML de relleno nunca entra al contexto y limpiarlo antes no
 * ahorra casi nada (~US$1,2/mes sobre el catálogo completo).
 *
 * El motivo es que `web_fetch` **no ejecuta JavaScript** (documentado por
 * Anthropic) y lo bloquean varios sitios. Medido el 22-09-2026 sobre las marcas
 * con más autos: BYD (SPA Vue, 9 autos), Hyundai (7) y Kia (6) no traen ni un
 * precio en el HTML estático, y Volvo (7) responde 403. En esos autos el
 * re-check leería la página "bien" y sin precio, en silencio, todas las semanas.
 *
 * Firecrawl usa navegador real y rotación de proxies: resuelve las dos fallas.
 * Pero el free tier son 1.000 credits/mes y **una lectura cacheada igual cuesta
 * 1 credit** — el caché acelera, no ahorra. Pasar los 176 autos por acá serían
 * ~763 credits/mes (76% del tier, sin margen para la Fase 0 ni para crecer). Por
 * eso solo se invoca cuando `web_fetch` ya falló en traer un precio.
 */

const ENDPOINT = "https://api.firecrawl.dev/v2/scrape";

/** El tier gratis permite 2 concurrentes; el timeout evita colgar el request de Vercel. */
const TIMEOUT_MS = 45_000;

export interface FirecrawlResult {
  ok: boolean;
  markdown?: string;
  statusCode?: number;
  error?: string;
}

export function firecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

/**
 * Baja UNA página como markdown limpio. `onlyMainContent` saca nav, header y
 * footer, que es exactamente el ruido que confunde la extracción de precios
 * (los menús de otros modelos traen sus propios precios).
 */
export async function scrapeMarkdown(url: string): Promise<FirecrawlResult> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return { ok: false, error: "FIRECRAWL_API_KEY no configurada" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        // `waitFor` le da tiempo al JS de pintar el precio. Es el único motivo
        // por el que estamos acá, así que vale la latencia extra.
        waitFor: 2_500,
        timeout: 30_000,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // 402 = credits agotados, 429 = rate limit (10 req/min en el tier gratis).
      // Ninguno es "la fuente está caída": el auto no debe contar para la racha.
      return { ok: false, statusCode: res.status, error: `Firecrawl ${res.status}: ${body.slice(0, 200)}` };
    }

    const json = (await res.json()) as {
      success?: boolean;
      data?: { markdown?: string; metadata?: { statusCode?: number } };
      error?: string;
    };

    const markdown = json.data?.markdown?.trim();
    if (!json.success || !markdown) {
      return { ok: false, error: json.error ?? "Firecrawl no devolvió markdown" };
    }

    return { ok: true, markdown, statusCode: json.data?.metadata?.statusCode };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { ok: false, error: aborted ? `Firecrawl no respondió en ${TIMEOUT_MS / 1000}s` : String(err) };
  } finally {
    clearTimeout(timer);
  }
}
