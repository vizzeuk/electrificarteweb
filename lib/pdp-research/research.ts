/**
 * M1 (Fase 1.2, Flujo A) — investiga specs reales de un modelo nuevo y crea su
 * ficha (PDP) en Sanity con hidden:true, lista para revisión manual en Studio.
 *
 * Pipeline:
 *   1. Claude + búsqueda web nativa ubica la ficha oficial del modelo en Chile. Si no hay nada
 *      usable en el sitio de fábrica, cae a un concesionario autorizado como respaldo.
 *   2. Playwright renderiza esas páginas (texto + imágenes + enlaces internos a ficha técnica/PDF)
 *      y sigue hasta 2 enlaces de specs adicionales por fuente; los PDF se parsean con pdf-parse.
 *   3. Claude extrae specs estructuradas SOLO de ese texto (nunca de memoria).
 *   4. Se resuelven referencias (marca/tipo), se suben las fotos candidatas y se crea el car.
 *
 * Módulo compartido entre `scripts/pdp-research.ts` (CLI local, Playwright con Chromium propio)
 * y `app/api/admin/pdp-research/route.ts` (Vercel Function, Chromium serverless) — quien invoca
 * pasa su propia estrategia de lanzar el browser vía `launchBrowser`.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { createClient } from "@sanity/client";
import type { Browser } from "playwright-core";
import { PDFParse } from "pdf-parse";

// ReturnType<typeof createClient> (en vez del tipo SanityClient exportado) para preservar
// exactamente el mismo tipo concreto que devuelve createClient() — con el tipo de clase genérico
// se pierden los overloads de fetch()/create() que dependen de const type parameters (TS 5).
type SanityClientInstance = ReturnType<typeof createClient>;

const MODEL = "claude-sonnet-5";
const MAX_SEARCH_USES = 5;
const MAX_SOURCE_URLS = 3;
const MAX_TEXT_CHARS_PER_SOURCE = 12_000;
const MAX_EXTRA_LINKS_PER_SOURCE = 2;
const MAX_IMAGE_CANDIDATES = 12;
const MIN_DESIRED_PHOTOS = 7; // 1 portada + 6 galería
const SCRAPE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

export interface ResearchContext {
  anthropic: Anthropic;
  sanity: SanityClientInstance;
  launchBrowser: () => Promise<Browser>;
  dryRun?: boolean;
  log?: (line: string) => void;
}

export interface ResearchResult {
  status: "created" | "dry_run" | "duplicate" | "not_found" | "no_content" | "not_electrified";
  message: string;
  carId?: string;
  slug?: string;
  studioUrl?: string;
  mainImageUrl?: string;
  photoCount?: number;
  filledFields?: number;
  totalFields?: number;
  usedDealerFallback?: boolean;
}

// ─── Helpers reutilizados del patrón de import-cars.ts ────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// El modelo a veces devuelve un placeholder de texto en vez de omitir el campo
// (ej. "<UNKNOWN>", "N/A") pese a la instrucción de dejarlo ausente — se filtra
// como red de seguridad adicional para no escribir datos no confirmados.
const PLACEHOLDER_RE = /^[<[]?(unknown|n\/?a|no\s*disponible|no\s*data|null|undefined|desconocido|sin\s*datos?|no\s*aplica)[>\]]?$/i;

function isPlaceholder(v: unknown): boolean {
  return typeof v === "string" && PLACEHOLDER_RE.test(v.trim());
}

function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === "" || isPlaceholder(v)) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

async function getOrCreateBrand(ctx: ResearchContext, name: string): Promise<string> {
  const slug = slugify(name);
  const existing = await ctx.sanity.fetch<string | null>(
    `*[_type == "brand" && slug.current == $slug && !(_id in path("drafts.**"))][0]._id`,
    { slug }
  );
  if (existing) return existing;
  if (ctx.dryRun) {
    ctx.log?.(`    · marca "${name}" no existe — se crearía`);
    return `dry-brand-${slug}`;
  }
  const doc = await ctx.sanity.create({ _type: "brand", name, slug: { _type: "slug", current: slug } });
  ctx.log?.(`    · marca "${name}" creada (${doc._id})`);
  return doc._id;
}

async function resolveVehicleType(ctx: ResearchContext, label: string | null): Promise<string | null> {
  if (!label) return null;
  return ctx.sanity.fetch<string | null>(
    `*[_type == "vehicleType" && lower(label) == $label && !(_id in path("drafts.**"))][0]._id`,
    { label: label.toLowerCase().trim() }
  );
}

async function resolveElectricType(ctx: ResearchContext, tag: string | null): Promise<string | null> {
  if (!tag) return null;
  // "tag" como nombre de parámetro GROQ choca con la opción reservada QueryParams.tag de
  // @sanity/client (tagging de requests) — se usa $electricTag para evitar el choque de tipos.
  return ctx.sanity.fetch<string | null>(
    `*[_type == "electricType" && upper(tag) == $electricTag && !(_id in path("drafts.**"))][0]._id`,
    { electricTag: tag.toUpperCase().trim() }
  );
}

function imageRef(assetId: string, key?: string) {
  return {
    _type: "image" as const,
    ...(key ? { _key: key } : {}),
    asset: { _type: "reference" as const, _ref: assetId },
  };
}

async function uploadImage(ctx: ResearchContext, url: string): Promise<{ id: string; url: string } | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": SCRAPE_UA } });
    if (!res.ok) {
      ctx.log?.(`    ! foto ${res.status}: ${url}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const filename = decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? "image.jpg");
    const asset = await ctx.sanity.assets.upload("image", buf, { filename });
    return { id: asset._id, url: asset.url };
  } catch (err) {
    ctx.log?.(`    ! error descargando foto ${url}: ${(err as Error).message}`);
    return null;
  }
}

// ─── Paso 1 — ubicar la fuente oficial ─────────────────────────────────────────

interface SourceReport {
  found: boolean;
  urls: string[];
  note?: string;
}

const OFFICIAL_SYSTEM_PROMPT =
  `Buscas la página oficial (sitio de la marca, para Chile) de un modelo de auto específico — ` +
  `precio de lista y ficha técnica. SOLO sitios oficiales de la marca. Nunca marketplaces de ` +
  `terceros, foros, ni portales de reventa. Si el modelo no se vende oficialmente en Chile o no ` +
  `encuentras una fuente oficial confiable, repórtalo con found:false — no inventes una URL. ` +
  `Cuidado con sitios regionales genéricos (LatAm/Hispanoamérica) que NO son específicos de ` +
  `Chile aunque estén en español — verifica que el sitio corresponda efectivamente al mercado ` +
  `chileno (dominio .cl es la señal más confiable; si el dominio no es .cl, confirma ` +
  `explícitamente en el contenido que el país/mercado es Chile antes de aceptarlo).`;

const DEALER_SYSTEM_PROMPT =
  `Buscas el sitio de un concesionario o distribuidor AUTORIZADO de una marca de auto específica, ` +
  `en Chile — se usa como respaldo porque el sitio oficial de fábrica no tuvo información ` +
  `disponible. El sitio debe confirmar explícitamente su condición de representante autorizado de ` +
  `la marca (ej. "concesionario oficial", "distribuidor autorizado"). Nunca marketplaces de ` +
  `terceros, portales de clasificados, ni reventa particular. Si no encuentras uno confiable, ` +
  `repórtalo con found:false — no inventes una URL. Mismo cuidado con sitios regionales genéricos ` +
  `que no son específicos de Chile (dominio .cl es la señal más confiable).`;

async function runSourceSearch(
  ctx: ResearchContext,
  systemPrompt: string,
  brand: string,
  model: string
): Promise<SourceReport> {
  const response = await ctx.anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: `Marca: ${brand}\nModelo: ${model}\nPaís: Chile` }],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: MAX_SEARCH_USES,
        user_location: { type: "approximate", country: "CL" },
      },
      {
        name: "report_sources",
        description: "Reporta el resultado final de la búsqueda de la ficha oficial.",
        input_schema: {
          type: "object",
          properties: {
            found: { type: "boolean", description: "true si se encontró al menos una fuente oficial confiable." },
            urls: {
              type: "array",
              items: { type: "string" },
              description: `Hasta ${MAX_SOURCE_URLS} URLs oficiales (ficha técnica y/o precio). Vacío si found:false.`,
            },
            note: { type: "string", description: "Nota breve si no se encontró, o cualquier ambigüedad relevante." },
          },
          required: ["found", "urls"],
        },
      },
    ],
  });

  const reportBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "report_sources"
  );

  if (!reportBlock) {
    return { found: false, urls: [], note: "El modelo no llamó a report_sources." };
  }
  const input = reportBlock.input as { found: boolean; urls?: string[]; note?: string };
  let urls = (input.urls ?? []).slice(0, MAX_SOURCE_URLS);

  // Red de seguridad: solo confiamos en dominios .cl (o con /cl explícito en la ruta, como
  // volvocars.com/cl) — un sitio regional LatAm sin esa señal no se acepta como fuente para
  // Chile aunque el modelo lo haya reportado como tal (ver caso Zeekr/Colombia).
  const clUrls = urls.filter((u) => /\.cl(\/|$)/i.test(u) || /\/cl(\/|$)/i.test(u));
  if (urls.length > 0 && clUrls.length === 0) {
    return {
      found: false,
      urls: [],
      note: `Se descartaron ${urls.length} URL(s) por no confirmar dominio .cl (posible sitio regional, no específico de Chile): ${urls.join(", ")}`,
    };
  }
  urls = clUrls;

  return { found: !!input.found && urls.length > 0, urls, note: input.note };
}

async function findOfficialSources(ctx: ResearchContext, brand: string, model: string): Promise<SourceReport> {
  ctx.log?.(`\n▶ Buscando ficha oficial de ${brand} ${model} en Chile...`);
  return runSourceSearch(ctx, OFFICIAL_SYSTEM_PROMPT, brand, model);
}

async function findAuthorizedDealerSources(ctx: ResearchContext, brand: string, model: string): Promise<SourceReport> {
  ctx.log?.(`▶ Buscando concesionario autorizado de ${brand} en Chile (respaldo)...`);
  return runSourceSearch(ctx, DEALER_SYSTEM_PROMPT, brand, model);
}

// ─── Paso 2 — scraping con Playwright + PDFs (mismo patrón que fetch-cars-spa.ts) ──

const MIN_USEFUL_CHARS = 400;
const BLOCKED_RE = /access denied|403 forbidden|enable javascript and cookies|attention required|verificando que eres humano|are you a human/i;
const SPEC_LINK_RE = /ficha\s*t[eé]cnica|especificaciones|caracter[ií]sticas\s*t[eé]cnicas|\bspecs\b/i;
const IMAGE_SKIP_RE = /logo|icon|favicon|sprite|placeholder/i;
const THUMB_SUFFIX_RE = /-\d{2,3}x\d{2,3}\.(jpe?g|png|webp)(\?|$)/i;

function isUsableScrape(text: string): boolean {
  return text.length >= MIN_USEFUL_CHARS && !BLOCKED_RE.test(text);
}

function isUsableImage(url: string): boolean {
  if (url.startsWith("data:")) return false;
  if (/\.svg(\?|$)/i.test(url)) return false;
  if (IMAGE_SKIP_RE.test(url)) return false;
  if (THUMB_SUFFIX_RE.test(url)) return false;
  return /\.(jpe?g|png|webp)(\?|$)/i.test(url);
}

interface PageScrape {
  text: string;
  images: string[];
  specLinks: string[];
}

/** Renderiza una página, extrae texto + imágenes + enlaces internos a specs/PDF. */
async function scrapePage(url: string, browser: Browser, log?: (line: string) => void): Promise<PageScrape | null> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, userAgent: SCRAPE_UA });
  try {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
    } catch {
      // Algunos sitios mantienen conexiones abiertas (chat widgets, trackers) y nunca llegan a
      // "networkidle" — con el DOM ya cargado alcanza para extraer el texto visible.
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(3000);
    }
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let y = 0;
        const step = 600;
        const timer = setInterval(() => {
          window.scrollBy(0, step);
          y += step;
          if (y >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });
    await page.waitForTimeout(1500);

    const text = (await page.evaluate(() => document.body.innerText)) ?? "";

    const images: string[] = await page.evaluate(() => {
      // Excluye nav/header/footer/carruseles de "otros modelos" — en sitios de marca con varios
      // autos, esas zonas muestran fotos de modelos DISTINTOS al que se está investigando.
      // Nota: sin funciones nombradas dentro del closure — el transform de tsx/esbuild inyecta
      // un helper __name() que no existe en el contexto del navegador y rompe el evaluate().
      const EXCLUDE_SELECTOR =
        'nav, header, footer, [class*="nav"], [class*="menu"], [id*="nav"], [id*="menu"], ' +
        '[class*="relacionad"], [class*="similar"], [class*="otros-modelos"], [class*="carousel-relacion"]';

      const urls = new Set<string>();
      for (const img of Array.from(document.querySelectorAll("img"))) {
        if (img.closest(EXCLUDE_SELECTOR)) continue;
        const el = img as HTMLImageElement;
        if (el.currentSrc) urls.add(el.currentSrc);
        if (el.src) urls.add(el.src);
      }
      for (const s of Array.from(document.querySelectorAll("source"))) {
        if (s.closest(EXCLUDE_SELECTOR)) continue;
        const ss = (s as HTMLSourceElement).srcset;
        if (ss) ss.split(",").forEach((p) => urls.add(p.trim().split(" ")[0]));
      }
      for (const el of Array.from(document.querySelectorAll("*"))) {
        if (el.closest(EXCLUDE_SELECTOR)) continue;
        const bg = getComputedStyle(el).backgroundImage;
        const m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (m) urls.add(m[1]);
      }
      return [...urls].filter((u) => /^https?:\/\//.test(u));
    });

    const rawLinks: { href: string; text: string }[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]")).map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: (a.textContent || "").trim(),
      }))
    );
    const host = new URL(url).hostname;
    const specLinkSet = new Set<string>();
    for (const { href, text: linkText } of rawLinks) {
      if (!href) continue;
      let abs: URL;
      try {
        abs = new URL(href, url);
      } catch {
        continue;
      }
      if (abs.hostname !== host) continue;
      const isPdf = /\.pdf($|\?)/i.test(abs.pathname);
      if (isPdf || SPEC_LINK_RE.test(linkText) || SPEC_LINK_RE.test(abs.pathname)) {
        specLinkSet.add(abs.href);
      }
    }

    return {
      text: text.replace(/\n{3,}/g, "\n\n").slice(0, MAX_TEXT_CHARS_PER_SOURCE),
      images: images.filter(isUsableImage),
      specLinks: [...specLinkSet].slice(0, MAX_EXTRA_LINKS_PER_SOURCE),
    };
  } catch (err) {
    log?.(`    ✗ ${url} — ${(err as Error).message}`);
    return null;
  } finally {
    await page.close();
  }
}

/** Descarga y parsea una ficha técnica en PDF (fichas oficiales chilenas suelen publicarlas así). */
async function fetchPdfText(url: string, log?: (line: string) => void): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": SCRAPE_UA } });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    await parser.destroy();
    return result.text.replace(/\n{3,}/g, "\n\n").slice(0, MAX_TEXT_CHARS_PER_SOURCE);
  } catch (err) {
    log?.(`    ✗ ${url} (PDF) — ${(err as Error).message}`);
    return null;
  }
}

interface FetchedPage {
  text: string;
  images: string[];
  specLinks: string[];
}

async function fetchOne(url: string, browser: Browser, log?: (line: string) => void): Promise<FetchedPage | null> {
  const isPdf = /\.pdf($|\?)/i.test(new URL(url).pathname);
  if (isPdf) {
    const text = await fetchPdfText(url, log);
    if (!text || !isUsableScrape(text)) return null;
    log?.(`    ✓ ${url} (PDF) — ${text.length} chars`);
    return { text: `### Fuente: ${url}\n${text}`, images: [], specLinks: [] };
  }
  const scraped = await scrapePage(url, browser, log);
  if (!scraped || !isUsableScrape(scraped.text)) {
    if (scraped) log?.(`    ✗ ${url} — página bloqueada o sin contenido útil (${scraped.text.length} chars), se descarta`);
    return null;
  }
  log?.(
    `    ✓ ${url} — ${scraped.text.length} chars, ${scraped.images.length} imagen(es), ${scraped.specLinks.length} enlace(s) de specs`
  );
  return { text: `### Fuente: ${url}\n${scraped.text}`, images: scraped.images, specLinks: scraped.specLinks };
}

/** Fuente principal + hasta 2 enlaces internos de specs/PDF que encuentre en esa misma página. */
async function gatherSource(
  url: string,
  browser: Browser,
  visited: Set<string>,
  log?: (line: string) => void
): Promise<{ texts: string[]; images: string[] } | null> {
  if (visited.has(url)) return null;
  visited.add(url);
  const primary = await fetchOne(url, browser, log);
  if (!primary) return null;

  const texts = [primary.text];
  const images = [...primary.images];

  for (const link of primary.specLinks) {
    if (visited.has(link)) continue;
    visited.add(link);
    const extra = await fetchOne(link, browser, log);
    if (extra) {
      texts.push(extra.text);
      images.push(...extra.images);
    }
  }

  return { texts, images };
}

async function gatherAll(
  urls: string[],
  browser: Browser,
  visited: Set<string>,
  log?: (line: string) => void
): Promise<{ texts: string[]; images: string[] }> {
  const texts: string[] = [];
  const images: string[] = [];
  for (const url of urls) {
    const gathered = await gatherSource(url, browser, visited, log);
    if (gathered) {
      texts.push(...gathered.texts);
      images.push(...gathered.images);
    }
  }
  return { texts, images };
}

// ─── Paso 3 — extracción estructurada ──────────────────────────────────────────

const EXTRACT_SCHEMA = {
  type: "object" as const,
  properties: {
    modelYear: { type: "number", description: "Año del modelo." },
    vehicleType: { type: "string", description: 'Ej: "SUV", "Sedán", "City Car", "Pickup".' },
    electricType: {
      type: "string",
      enum: ["EV", "PHEV", "HEV", "EREV", "MHEV"],
      description:
        "Solo si el texto confirma explícitamente que ESTA versión/trim específica (no el modelo en " +
        "general, que puede tener variantes a combustión pura junto a variantes híbridas/eléctricas) " +
        "tiene motor eléctrico y/o batería. Si el texto es ambiguo sobre si esta versión puntual es " +
        "electrificada, omitir el campo — nunca inferirlo del nombre del modelo o de otras versiones.",
    },
    tagline: { type: "string" },
    description: { type: "string" },
    basePrice: { type: "number", description: "Precio de lista oficial en CLP, sin descuentos." },
    motorDescription: { type: "string" },
    transmission: { type: "string" },
    batteryCapacity: { type: "number", description: "kWh" },
    batteryType: { type: "string", enum: ["LFP", "NMC", "NCA", "NMCA", "other"] },
    range: { type: "number", description: "Autonomía WLTP en km." },
    electricRangeKm: { type: "number", description: "Solo PHEV/EREV: km en modo 100% eléctrico." },
    fuelConsumption: { type: "number", description: "Solo HEV/PHEV/MHEV, km/L." },
    rendimientoElectrico: { type: "number", description: "Solo BEV/PHEV, km/kWh." },
    power: { type: "number", description: "CV/HP." },
    torque: { type: "number", description: "Nm." },
    acceleration: { type: "number", description: "0-100 km/h en segundos." },
    topSpeed: { type: "number", description: "km/h." },
    traction: { type: "string", enum: ["FWD", "RWD", "AWD"] },
    seats: { type: "number" },
    cargo: { type: "number", description: "Maletero en litros." },
    warranty: { type: "string" },
    connectorType: { type: "string", enum: ["CCS2", "Type2", "CHAdeMO", "GBT", "NACS", "Type1"] },
    maxDCChargingPower: { type: "number", description: "kW." },
    maxACChargingPower: { type: "number", description: "kW." },
    chargeTimeDC: { type: "string", description: 'Ej: "18 min (10-80%)".' },
    chargeTimeAC: { type: "string", description: 'Ej: "7h (0-100%)".' },
    euroNcap: { type: "number", description: "Estrellas 1-5, solo si está explícito en la fuente." },
    safetyFeatures: { type: "array", items: { type: "string" } },
    techFeatures: { type: "array", items: { type: "string" } },
    comfortFeatures: { type: "array", items: { type: "string" } },
    versions: {
      type: "array",
      description: "Una entrada por versión/trim distinta si el material lista varias.",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: "number" },
          batteryCapacity: { type: "number" },
          range: { type: "number" },
          power: { type: "number" },
          traction: { type: "string", enum: ["FWD", "RWD", "AWD"] },
          acceleration: { type: "number" },
        },
        required: ["name"],
      },
    },
  },
};

async function extractSpecs(ctx: ResearchContext, brand: string, model: string, corpus: string): Promise<Record<string, unknown>> {
  ctx.log?.(`▶ Extrayendo specs desde el material recolectado (${corpus.length} caracteres)...`);

  const response = await ctx.anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system:
      `Extraes specs técnicas de un auto a partir de texto de páginas oficiales de marca. Regla ` +
      `estricta: usa SOLO datos que aparezcan explícitamente en el texto entregado. Cualquier campo ` +
      `que no puedas confirmar textualmente en la fuente queda ausente/null — nunca lo inventes, ` +
      `nunca lo estimes por comparación con otros modelos, nunca uses tu conocimiento general. Es ` +
      `preferible dejar un campo vacío a arriesgar un dato incorrecto. Si el texto fuente no trae ` +
      `información útil (ej. página bloqueada, error de acceso, "Access Denied"), NO llames a la ` +
      `herramienta con placeholders como "<UNKNOWN>", "N/A" o similares — en ese caso llama a la ` +
      `herramienta sin ningún campo (objeto vacío), directamente omitiendo cada propiedad.`,
    messages: [{ role: "user", content: `Marca: ${brand}\nModelo: ${model}\n\n--- MATERIAL FUENTE ---\n${corpus}` }],
    tool_choice: { type: "tool", name: "extract_car_specs" },
    tools: [
      { name: "extract_car_specs", description: "Registra las specs confirmadas del auto.", input_schema: EXTRACT_SCHEMA },
    ],
  });

  const block = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "extract_car_specs"
  );
  return (block?.input as Record<string, unknown>) ?? {};
}

// ─── Entry point compartido ───────────────────────────────────────────────────

export async function researchCar(brand: string, model: string, ctx: ResearchContext): Promise<ResearchResult> {
  const slug = slugify(`${brand} ${model}`);

  const existing = await ctx.sanity.fetch<string | null>(
    `*[_type == "car" && slug.current == $slug && !(_id in path("drafts.**"))][0]._id`,
    { slug }
  );
  if (existing) {
    return { status: "duplicate", message: `Ya existe un auto con slug "${slug}" (${existing}).`, carId: existing, slug };
  }

  let sources = await findOfficialSources(ctx, brand, model);
  if (sources.found && sources.urls.length > 0) {
    ctx.log?.(`  ✓ ${sources.urls.length} fuente(s):`);
    sources.urls.forEach((u) => ctx.log?.(`    - ${u}`));
  } else {
    ctx.log?.(`  No se encontró fuente oficial confiable.${sources.note ? ` Nota: ${sources.note}` : ""}`);
  }

  ctx.log?.(`\n▶ Renderizando páginas con Chromium...`);
  const browser = await ctx.launchBrowser();
  const visited = new Set<string>();

  let { texts: chunks, images: allImages } = sources.urls.length
    ? await gatherAll(sources.urls, browser, visited, ctx.log)
    : { texts: [] as string[], images: [] as string[] };
  let usedDealerFallback = false;

  if (chunks.length === 0) {
    ctx.log?.("\n▶ Sin contenido útil del sitio oficial — probando concesionario autorizado como respaldo...");
    const dealerSources = await findAuthorizedDealerSources(ctx, brand, model);
    if (dealerSources.found && dealerSources.urls.length > 0) {
      ctx.log?.(`  ✓ ${dealerSources.urls.length} fuente(s) de concesionario:`);
      dealerSources.urls.forEach((u) => ctx.log?.(`    - ${u}`));
      const dealerResult = await gatherAll(dealerSources.urls, browser, visited, ctx.log);
      chunks = dealerResult.texts;
      allImages = dealerResult.images;
      usedDealerFallback = chunks.length > 0;
      if (usedDealerFallback) sources = dealerSources;
    } else if (dealerSources.note) {
      ctx.log?.(`  Nota (fallback): ${dealerSources.note}`);
    }
  }
  await browser.close();

  if (chunks.length === 0) {
    return {
      status: "no_content",
      message: `Ninguna fuente (oficial ni concesionario) devolvió contenido útil para ${brand} ${model}.`,
    };
  }
  if (usedDealerFallback) {
    ctx.log?.("\n  ⚠ Datos obtenidos de un concesionario autorizado, no del sitio oficial de fábrica — verificar en la revisión.");
  }

  const specs = await extractSpecs(ctx, brand, model, chunks.join("\n\n"));

  const brandId = await getOrCreateBrand(ctx, brand);
  const vehicleTypeId = await resolveVehicleType(ctx, (specs.vehicleType as string) ?? null);
  const electricTypeId = await resolveElectricType(ctx, (specs.electricType as string) ?? null);
  if (!vehicleTypeId) ctx.log?.(`  ! tipo de vehículo "${specs.vehicleType}" no encontrado — queda vacío`);

  // Regla de alcance de negocio (CLAUDE.md): Electrificarte excluye autos 100% a combustión.
  // Si no se pudo confirmar un tipo eléctrico válido en el texto fuente, no se crea la ficha —
  // más vale revisar a mano que publicar (oculto) un auto fuera de alcance.
  if (!electricTypeId) {
    return {
      status: "not_electrified",
      message:
        `No se pudo confirmar un tipo de electrificación válido (EV/PHEV/HEV/EREV/MHEV) para ` +
        `${brand} ${model} en el material fuente (electricType: "${specs.electricType ?? "—"}"). ` +
        `Electrificarte solo cataloga autos electrificados.`,
    };
  }

  const versions = ((specs.versions as Array<Record<string, unknown>>) ?? []).map((v, i) => ({
    _type: "version",
    _key: slugify(String(v.name ?? "")) || `v${i}`,
    ...clean(v),
  }));

  // ─── Fotos: portada + galería (mínimo deseado 7 = 1 portada + 6 galería) ────
  const uniqueImages = [...new Set(allImages)].slice(0, MAX_IMAGE_CANDIDATES);
  let mainImage: ReturnType<typeof imageRef> | null = null;
  let gallery: ReturnType<typeof imageRef>[] = [];
  let mainImageUploadedUrl: string | undefined;

  if (ctx.dryRun) {
    ctx.log?.(`\n▶ ${uniqueImages.length} imagen(es) candidata(s) encontradas (no se suben en --dry):`);
    uniqueImages.forEach((u) => ctx.log?.(`    - ${u}`));
    if (uniqueImages.length < MIN_DESIRED_PHOTOS) {
      ctx.log?.(`  ⚠ Menos de ${MIN_DESIRED_PHOTOS} candidatas (1 portada + 6 galería mínimo deseado).`);
    }
  } else {
    ctx.log?.(`\n▶ Subiendo fotos (${uniqueImages.length} candidata(s))...`);
    const uploaded: { id: string; url: string }[] = [];
    for (const imgUrl of uniqueImages) {
      const asset = await uploadImage(ctx, imgUrl);
      if (asset) uploaded.push(asset);
    }
    if (uploaded.length > 0) {
      mainImage = imageRef(uploaded[0].id);
      mainImageUploadedUrl = uploaded[0].url;
      // La galería incluye la portada primero, igual que el resto del catálogo.
      gallery = uploaded.map((a, i) => imageRef(a.id, `img${i}`));
    }
    if (gallery.length < MIN_DESIRED_PHOTOS) {
      ctx.log?.(`  ⚠ Solo ${gallery.length}/${MIN_DESIRED_PHOTOS} fotos subidas — completar manualmente en Studio.`);
    } else {
      ctx.log?.(`  ✓ ${gallery.length} fotos subidas (incluye portada).`);
    }
  }

  const doc = clean({
    _type: "car",
    name: model,
    slug: { _type: "slug", current: slug },
    brand: { _type: "reference", _ref: brandId },
    vehicleType: vehicleTypeId ? { _type: "reference", _ref: vehicleTypeId } : null,
    electricType: electricTypeId ? { _type: "reference", _ref: electricTypeId } : null,
    hidden: true,
    aiGenerated: true,
    sourceUrls: sources.urls,
    mainImage,
    gallery: gallery.length ? gallery : null,
    modelYear: specs.modelYear ?? null,
    tagline: specs.tagline ?? null,
    description: specs.description ?? null,
    basePrice: specs.basePrice ?? null,
    motorDescription: specs.motorDescription ?? null,
    transmission: specs.transmission ?? null,
    batteryCapacity: specs.batteryCapacity ?? null,
    batteryType: specs.batteryType ?? null,
    range: specs.range ?? null,
    electricRangeKm: specs.electricRangeKm ?? null,
    fuelConsumption: specs.fuelConsumption ?? null,
    rendimientoElectrico: specs.rendimientoElectrico ?? null,
    power: specs.power ?? null,
    torque: specs.torque ?? null,
    acceleration: specs.acceleration ?? null,
    topSpeed: specs.topSpeed ?? null,
    traction: specs.traction ?? null,
    seats: specs.seats ?? null,
    cargo: specs.cargo ?? null,
    warranty: specs.warranty ?? null,
    connectorType: specs.connectorType ?? null,
    maxDCChargingPower: specs.maxDCChargingPower ?? null,
    maxACChargingPower: specs.maxACChargingPower ?? null,
    chargeTimeDC: specs.chargeTimeDC ?? null,
    chargeTimeAC: specs.chargeTimeAC ?? null,
    euroNcap: specs.euroNcap ?? null,
    safetyFeatures: specs.safetyFeatures ?? null,
    techFeatures: specs.techFeatures ?? null,
    comfortFeatures: specs.comfortFeatures ?? null,
    versions: versions.length ? versions : null,
  });

  const totalFields = Object.keys(EXTRACT_SCHEMA.properties).length;
  const filledFields = Object.keys(doc).filter((k) => (specs as Record<string, unknown>)[k] !== undefined).length;
  ctx.log?.(`\n▶ Mapeo: ${filledFields}/${totalFields} campos de specs confirmados por la fuente.`);

  if (ctx.dryRun) {
    ctx.log?.("\n[DRY RUN] Documento que se crearía:\n");
    ctx.log?.(JSON.stringify(doc, null, 2));
    ctx.log?.("\n(nada se escribió en Sanity)\n");
    return {
      status: "dry_run",
      message: "Dry run — nada se escribió en Sanity.",
      slug,
      filledFields,
      totalFields,
      usedDealerFallback,
      photoCount: uniqueImages.length,
    };
  }

  // clean() devuelve Partial<T> (_type opcional) — sabemos que siempre está seteado ("car"),
  // el cast evita el choque de tipos contra SanityDocumentStub sin perder seguridad real.
  const result = await ctx.sanity.create(doc as typeof doc & { _type: string });
  const studioBase = `https://${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}.sanity.studio`;
  const studioUrl = `${studioBase}/structure/car;${result._id}`;
  ctx.log?.(`\n✓ Creado: ${result._id}`);
  ctx.log?.(`  Revisar en Studio: ${studioUrl}`);
  ctx.log?.(`  (hidden:true — no aparece en el sitio hasta que lo publiques)\n`);

  return {
    status: "created",
    message: `Creado como borrador oculto: ${result._id}`,
    carId: result._id,
    slug,
    studioUrl,
    mainImageUrl: mainImageUploadedUrl,
    photoCount: gallery.length,
    filledFields,
    totalFields,
    usedDealerFallback,
  };
}
