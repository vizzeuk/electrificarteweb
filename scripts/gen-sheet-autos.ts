/**
 * Genera los TSV para el Sheet de PDPs (docs/FLUJO-PDP-N8N.md §3.2).
 *
 *   npx tsx --env-file=.env.local scripts/gen-sheet-autos.ts
 *   npx tsx --env-file=.env.local scripts/gen-sheet-autos.ts --sin-descubrir   (rápido, sin red)
 *
 * Sale en .context/sheet/*.tsv, listo para pegar en cada pestaña del Sheet.
 *
 * Además del volcado del catálogo, hace el trabajo pesado de la Fase 0: PROPONE
 * la URL oficial de cada auto. No la inventa con patrones (eso da 404 casi
 * siempre porque cada marca arma sus rutas distinto): entra a la home de la
 * marca, junta los links internos, y elige el que mejor calza con el nombre del
 * modelo. Después valida el candidato y mira si el precio está en el HTML
 * estático — así el Sheet ya viene con la columna que dice qué autos van a
 * necesitar navegador real (Firecrawl) y cuáles no.
 */

import { createClient } from "@sanity/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { isChileConfirmedUrl } from "@/lib/chile-url";
import { describeSlot } from "@/lib/catalog-recheck/slots";

const descubrir = !process.argv.includes("--sin-descubrir");
const OUT = ".context/sheet";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

interface Car {
  id: string;
  name: string;
  brand: string;
  brandSlug: string;
  website: string | null;
  slug: string;
  hidden: boolean | null;
  modelYear: number | null;
  vehicleType: string | null;
  electricType: string | null;
  checkSlot: number | null;
  sourceUrls: string[] | null;
  versions: { name: string; price: number | null }[] | null;
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Los TSV no soportan tabs ni saltos dentro de una celda. */
const cell = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v).replace(/[\t\r\n]+/g, " ").trim();

const tsv = (rows: unknown[][]): string => rows.map((r) => r.map(cell).join("\t")).join("\n") + "\n";

function tokens(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

async function get(url: string, timeoutMs = 20_000): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, "accept-language": "es-CL,es;q=0.9" },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = res.ok ? await res.text() : "";
    return { status: res.status, body };
  } catch {
    return { status: 0, body: "" };
  } finally {
    clearTimeout(timer);
  }
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += n) {
    out.push(...(await Promise.all(items.slice(i, i + n).map(fn))));
  }
  return out;
}

/** ¿Hay precios chilenos en el HTML que llega sin ejecutar JavaScript? */
function hasStaticPrices(html: string): boolean {
  return /\$\s?[0-9]{1,3}(?:[.,][0-9]{3}){2,}/.test(html);
}

// ─── Descubrimiento de la URL oficial ─────────────────────────────────────────

interface Link {
  url: string;
  text: string;
}

/** Links internos de una página, con su texto de ancla. */
function extractLinks(html: string, base: string): Link[] {
  const out = new Map<string, string>();
  const host = new URL(base).hostname;
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    let href = m[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const u = new URL(href, base);
      if (u.hostname !== host) continue;
      u.hash = "";
      href = u.toString();
    } catch {
      continue;
    }
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    // Se queda el ancla más largo: suele ser el nombre completo del modelo.
    if (!out.has(href) || out.get(href)!.length < text.length) out.set(href, text);
  }
  return [...out].map(([url, text]) => ({ url, text }));
}

/**
 * URLs del sitemap. Vale la pena antes que la home: un sitemap es XML estático
 * por definición, así que lista todas las páginas incluso en sitios que renderizan
 * todo con JavaScript — que son justo los que no dejan ver ni un link en la home.
 */
async function sitemapUrls(site: string): Promise<string[]> {
  const candidates = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml", "/sitemap/sitemap.xml"];
  const host = new URL(site).hostname;
  const found = new Set<string>();

  const locs = (xml: string): string[] =>
    [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);

  for (const path of candidates) {
    let root: string;
    try {
      root = new URL(path, site).toString();
    } catch {
      continue;
    }
    const res = await get(root, 15_000);
    if (res.status !== 200 || !res.body.includes("<loc")) continue;

    const top = locs(res.body);
    // Un índice de sitemaps apunta a más sitemaps. Se sigue un nivel, y solo los
    // que parecen de contenido (no imágenes ni noticias).
    const nested = top.filter((u) => /\.xml($|\?)/i.test(u)).slice(0, 8);
    for (const u of top) {
      if (/\.xml($|\?)/i.test(u)) continue;
      try {
        if (new URL(u).hostname === host) found.add(u);
      } catch { /* url basura en el sitemap */ }
    }
    for (const sm of nested) {
      if (/image|video|news|noticia/i.test(sm)) continue;
      const child = await get(sm, 15_000);
      if (child.status !== 200) continue;
      for (const u of locs(child.body)) {
        try {
          if (new URL(u).hostname === host) found.add(u);
        } catch { /* url basura */ }
      }
    }
    if (found.size) break;
  }
  return [...found].slice(0, 4_000);
}

/**
 * Elige el link que mejor calza con el modelo. Puntaje: todos los tokens del
 * modelo presentes en la ruta valen más que en el texto del ancla (la ruta es
 * estable, el ancla puede ser "Ver más"), y se penaliza la profundidad para
 * preferir /modelos/ioniq-5 sobre /modelos/ioniq-5/accesorios/alfombras.
 */
function bestLink(model: string, links: Link[], sitePrefix: string): Link | null {
  const want = tokens(model);
  if (!want.length) return null;

  // Rutas que NO son la ficha de venta del modelo. `stories` y `blog` son las
  // que más duelen: de un newsroom salió el "precio oficial" de $151.900 que
  // motivó el piso de plausibilidad del código.
  const RUIDO =
    /accesorio|repuesto|post|blog|news|noticia|stories|historia|prensa|press|servicio|taller|cotiz|contacto|test-?drive|garantia|reciclaje|sustentab/i;
  // Subpáginas de una ficha que existen, pero no son donde está el precio.
  const SUBPAGINA = /dimension|equipamiento|galeria|gallery|interior|exterior|seguridad|tecnolog|financiamiento|accesorios/i;

  let best: Link | null = null;
  let bestScore = 0;

  for (const link of links) {
    const path = new URL(link.url).pathname;

    // Mercado equivocado. Los sitemaps de las marcas globales (kia.com,
    // hyundai.com) listan TODOS los países, así que sin este filtro el Sheet se
    // llenaba de /us/en/ev6 y /kr/vehicles/ev5. Es la misma red de seguridad que
    // ya usan pdp-research y price-check.
    if (!isChileConfirmedUrl(link.url)) continue;
    // Y si el sitio de la marca vive bajo un prefijo (ej. byd.com/cl), el
    // candidato tiene que estar bajo ese mismo prefijo.
    if (sitePrefix && !path.toLowerCase().startsWith(sitePrefix)) continue;

    const pathTokens = tokens(path);
    const textTokens = tokens(link.text);

    // El primer token del modelo es el distintivo ("i4", "EX30", "Taycan"). Si no
    // aparece, el calce es casual: así "i4 eDrive40 Gran Coupé" dejaba de elegir
    // /modelos/2-gran-coupe, que es otro auto.
    const head = want[0];
    if (!pathTokens.includes(head) && !textTokens.includes(head)) continue;

    const inPath = want.filter((t) => pathTokens.includes(t)).length;
    const inText = want.filter((t) => textTokens.includes(t)).length;
    if (inPath === 0 && inText < want.length) continue;

    let score = (inPath / want.length) * 10 + (inText / want.length) * 3;
    // Ruta que es exactamente el modelo (sin tokens de sobra) → premio.
    if (inPath === want.length && pathTokens.length <= want.length + 2) score += 4;
    score -= Math.max(0, path.split("/").filter(Boolean).length - 2) * 0.8;
    if (RUIDO.test(path)) score -= 12;
    if (SUBPAGINA.test(path)) score -= 5;
    if (score > bestScore) {
      bestScore = score;
      best = link;
    }
  }
  return bestScore >= 6 ? best : null;
}

interface Suggestion {
  url: string;
  status: number;
  staticPrices: boolean;
  nota: string;
}

async function discover(cars: Car[]): Promise<Map<string, Suggestion>> {
  const result = new Map<string, Suggestion>();

  const byBrand = new Map<string, Car[]>();
  for (const c of cars) {
    const list = byBrand.get(c.brand) ?? [];
    list.push(c);
    byBrand.set(c.brand, list);
  }

  const brands = [...byBrand.entries()];
  console.log(`\nDescubriendo URLs en ${brands.length} marcas...\n`);

  for (const [brand, brandCars] of brands) {
    const site = brandCars[0].website;
    if (!site) {
      for (const c of brandCars) {
        result.set(c.id, { url: "", status: 0, staticPrices: false, nota: "la marca no tiene sitio web en Sanity" });
      }
      console.log(`  ${brand.padEnd(14)} — sin sitio web en Sanity`);
      continue;
    }

    // La home no siempre lista los modelos; se prueban también las rutas de
    // catálogo más comunes en Chile.
    const roots = ["", "/modelos", "/vehiculos", "/autos", "/models"].map((p) => {
      try {
        return new URL(p || "/", site).toString();
      } catch {
        return "";
      }
    }).filter(Boolean);

    const links = new Map<string, string>();

    // 1. Sitemap: estático, completo, y funciona en sitios 100% JavaScript.
    const fromSitemap = await sitemapUrls(site);
    for (const u of fromSitemap) links.set(u, "");

    // 2. Home y rutas de catálogo: aportan el texto del ancla, que ayuda a
    //    desambiguar cuando la ruta no dice el nombre completo del modelo.
    const pages = await pool(roots, 3, (u) => get(u));
    let reachable = fromSitemap.length > 0;
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].status !== 200 || !pages[i].body) continue;
      reachable = true;
      for (const l of extractLinks(pages[i].body, roots[i])) {
        if (!links.has(l.url) || (links.get(l.url) ?? "").length < l.text.length) links.set(l.url, l.text);
      }
    }

    if (!reachable) {
      const status = pages.find((p) => p.status !== 0)?.status ?? 0;
      for (const c of brandCars) {
        result.set(c.id, {
          url: "",
          status,
          staticPrices: false,
          nota: status === 403 ? "el sitio bloquea bots — buscar a mano" : "el sitio no respondió",
        });
      }
      console.log(`  ${brand.padEnd(14)} — sitio no accesible (${status || "timeout"})`);
      continue;
    }

    const all = [...links].map(([url, text]) => ({ url, text }));
    // "/" no es prefijo útil; "/cl" sí.
    const rawPrefix = new URL(site).pathname.replace(/\/+$/, "").toLowerCase();
    const sitePrefix = rawPrefix.length > 1 ? rawPrefix : "";
    const picks = brandCars.map((c) => ({ car: c, link: bestLink(c.name, all, sitePrefix) }));

    const validated = await pool(picks.filter((p) => p.link), 3, async (p) => {
      const r = await get(p.link!.url);
      return { car: p.car, url: p.link!.url, status: r.status, prices: hasStaticPrices(r.body) };
    });

    for (const v of validated) {
      result.set(v.car.id, {
        url: v.url,
        status: v.status,
        staticPrices: v.prices,
        nota:
          v.status !== 200
            ? `el candidato responde ${v.status || "timeout"} — revisar`
            : v.prices
              ? "ok"
              : "sin precio en el HTML estático — va a necesitar navegador (Firecrawl)",
      });
    }
    for (const p of picks.filter((x) => !x.link)) {
      result.set(p.car.id, {
        url: "",
        status: 0,
        staticPrices: false,
        nota: `no se encontró un link que calce con "${p.car.name}" en ${all.length} links`,
      });
    }

    const ok = validated.filter((v) => v.status === 200).length;
    console.log(
      `  ${brand.padEnd(14)} ${ok}/${brandCars.length} candidatos válidos ` +
        `(${all.length} links${fromSitemap.length ? `, ${fromSitemap.length} del sitemap` : ", sin sitemap"})`
    );
  }

  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const cars = await sanity.fetch<Car[]>(
    `*[_type == "car" && !(_id in path("drafts.**"))] | order(brand->name asc, name asc) {
      "id": _id, name, "brand": brand->name, "brandSlug": brand->slug.current,
      "website": brand->website, "slug": slug.current, hidden, modelYear,
      "vehicleType": vehicleType->name, "electricType": electricType->name,
      checkSlot, sourceUrls, "versions": versions[]{ name, price }
    }`
  );

  console.log(`\n${cars.length} autos en Sanity (${cars.filter((c) => c.hidden !== true).length} publicados).`);

  const sugerencias = descubrir ? await discover(cars) : new Map<string, Suggestion>();

  mkdirSync(OUT, { recursive: true });

  // ── autos ────────────────────────────────────────────────────────────────
  const AUTOS_HEADER = [
    "estado", "pdp_id", "marca", "modelo", "anio", "tipo", "electrificacion",
    "url_oficial", "url_sugerida", "revision_url", "necesita_navegador",
    "versiones", "publicado", "lote", "detalle", "link_studio",
  ];

  const autos = cars.map((c) => {
    const s = sugerencias.get(c.id);
    const actual = c.sourceUrls?.[0] ?? "";
    return [
      // Vacío a propósito: el cron del Flujo v2 solo toma las filas en "listo".
      // Estas 182 ya existen como PDP; no hay que volver a crearlas.
      "",
      c.id,
      c.brand,
      c.name,
      c.modelYear,
      c.vehicleType,
      c.electricType,
      actual,
      actual ? "" : (s?.url ?? ""),
      actual ? "ya tiene fuente" : (s?.nota ?? (descubrir ? "" : "sin descubrir")),
      s && s.status === 200 && !s.staticPrices ? "SI" : "",
      (c.versions ?? []).map((v) => `${v.name}|${v.price ?? ""}`).join(", "),
      c.hidden === true ? "no" : "si",
      typeof c.checkSlot === "number" ? describeSlot(c.checkSlot) : "",
      "",
      `https://electrificarte.com/studio/structure/car;${c.id}`,
    ];
  });

  writeFileSync(`${OUT}/autos.tsv`, tsv([AUTOS_HEADER, ...autos]));

  // ── corridas / faltan fuentes (solo encabezados; los llena n8n) ──────────
  writeFileSync(
    `${OUT}/corridas.tsv`,
    tsv([["fecha", "runId", "lote", "del_lote", "relleno", "revisados", "sin_cambios", "con_cambios", "fuente_caida", "errores", "detalle"]])
  );
  writeFileSync(
    `${OUT}/faltan-fuentes.tsv`,
    tsv([["fecha", "marca", "modelo", "slug", "carId", "url_oficial"]])
  );

  // ── instrucciones ────────────────────────────────────────────────────────
  writeFileSync(
    `${OUT}/instrucciones.tsv`,
    tsv([
      ["Columna", "Quién la llena", "Qué va"],
      ["estado", "n8n", 'Vacío = la fila no se procesa. Poner "listo" SOLO para crear una PDP nueva. Las 182 filas precargadas ya existen como PDP: dejar vacío.'],
      ["pdp_id", "automático", "ID del documento en Sanity. Lleno = el auto ya existe (solo se le actualiza la fuente). Vacío = PDP nueva por crear."],
      ["marca / modelo / anio / tipo / electrificacion", "Francisco", "Tienen que existir como referencias en Sanity. Una fila = un modelo = una PDP, nunca una fila por versión."],
      ["url_oficial", "Francisco", "LA COLUMNA IMPORTANTE. Página oficial de precios, configurador o ficha de venta. Nunca un newsroom, nota de prensa ni artículo: de ahí salen cifras que no son el precio de lista."],
      ["url_sugerida", "automático", "Candidato encontrado entrando a la home de la marca. Revisar y, si está bien, copiar a url_oficial."],
      ["revision_url", "automático", "Qué pasó con el candidato: ok, responde 404, el sitio bloquea bots, o no se encontró link."],
      ["necesita_navegador", "automático", 'SI = la página carga pero el precio lo pinta JavaScript. Esas se leen con Firecrawl. No hay que hacer nada: el flujo lo detecta solo.'],
      ["versiones", "Francisco", 'Formato: nombre|precio, nombre|precio. Ej: GLX|24990000, GLS AWD|27490000. Precio en pesos, sin puntos ni símbolos.'],
      ["publicado", "informativo", "si / no. Los que dicen no están ocultos del sitio."],
      ["lote", "informativo", "Cuál de las 28 corridas semanales revisa este auto. Se asigna solo."],
      ["detalle / link_studio", "n8n", "Resultado del procesamiento y link directo a la ficha en Studio."],
      ["", "", ""],
      ["REGLA DURA", "", "Un auto se crea siempre OCULTO. Publicar es siempre acto humano."],
      ["REGLA DURA", "", "Nunca inventar un dato: specs, precio o tipo salen de la fuente o quedan vacíos."],
    ])
  );

  // ── Resumen ──────────────────────────────────────────────────────────────
  const conFuente = cars.filter((c) => c.sourceUrls?.[0]).length;
  const sug = [...sugerencias.values()];
  const utiles = sug.filter((s) => s.status === 200);
  const navegador = utiles.filter((s) => !s.staticPrices);

  console.log(`\n── Resumen ──`);
  console.log(`  con url_oficial ya en Sanity:  ${conFuente}`);
  if (descubrir) {
    console.log(`  candidatos propuestos y válidos: ${utiles.length} / ${cars.length - conFuente} pendientes`);
    console.log(`  de esos, necesitan navegador:    ${navegador.length} (${Math.round((navegador.length / Math.max(utiles.length, 1)) * 100)}%)`);
    console.log(`  sin candidato (buscar a mano):   ${sug.length - utiles.length}`);
  }
  console.log(`\n  Archivos en ${OUT}/ : autos.tsv · corridas.tsv · faltan-fuentes.tsv · instrucciones.tsv\n`);
}

void main();
