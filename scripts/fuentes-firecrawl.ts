/**
 * Busca las `url_oficial` que faltan usando Firecrawl (navegador real).
 *
 *   npx tsx --env-file=.env.local scripts/fuentes-firecrawl.ts            (solo reporta)
 *   npx tsx --env-file=.env.local scripts/fuentes-firecrawl.ts --aplicar  (escribe candidatos)
 *   ... --marca JAC --marca Smart                                        (solo esas)
 *
 * Es el último recurso del descubrimiento, después del sitemap y de la home
 * (gen-sheet-autos.ts). Se usa acá porque las marcas que quedan son justo las que
 * no exponen el catálogo sin JavaScript: `formats: ["links"]` devuelve los links
 * de la página YA renderizada, por 1 credit.
 *
 * El dominio de cada marca lo toma de Sanity (`brand.website`) — corregido en 22
 * marcas por scripts/fix-brand-websites.ts. Cuando la home igual no lista modelos,
 * CATALOGOS apunta a la ruta más profunda donde sí están.
 */

import { createClient } from "@sanity/client";
import { appendFileSync, readFileSync } from "node:fs";
import { isChileConfirmedUrl } from "@/lib/chile-url";

const aplicar = process.argv.includes("--aplicar");
const soloMarcas = process.argv.reduce<string[]>((acc, a, i, arr) => {
  if (a === "--marca" && arr[i + 1]) acc.push(arr[i + 1].toLowerCase());
  return acc;
}, []);

const PERSISTIDO = "data/fuentes-candidatas.tsv";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

/**
 * Marcas cuyo `website` en Sanity no sirve. Cada línea es un hallazgo, no una
 * preferencia: el dominio propio no resuelve, o el importador chileno vende bajo
 * otra marca. Vale más que la URL en sí — corregir esto en Sanity arregla también
 * el enlace de la página de marca del sitio.
 */
/**
 * Páginas de CATÁLOGO donde buscar, cuando la home de la marca no lista modelos.
 * El `website` de cada marca ya está corregido en Sanity (scripts/fix-brand-websites.ts),
 * así que acá solo van los casos en que hay que entrar a una ruta más profunda.
 */
const CATALOGOS: Record<string, { url: string; motivo: string }> = {
  leapmotor: { url: "https://www.leapmotorchile.cl/modelos.html", motivo: "la home no lista modelos" },
  baic: { url: "https://www.baic.cl/modelos/", motivo: "los modelos están bajo /modelos/" },
  gac: { url: "https://www.gacautos.cl/modelos/electricos/", motivo: "los eléctricos están en una sección aparte" },
  dongfeng: { url: "https://dongfengindumotora.cl/cotizador.html", motivo: "el catálogo vive en el cotizador" },
  nammi: { url: "https://dongfengindumotora.cl/cotizador.html", motivo: "en Chile el E70 lo vende Dongfeng/Indumotora" },
  jmc: { url: "https://jmcchile.cl/electricos/", motivo: "los eléctricos están en una sección aparte" },
  maxus: { url: "https://maxus.cl/modelos", motivo: "la home no lista modelos" },
  jac: { url: "https://www.jacautoschile.cl/modelos/electricos/", motivo: "sección de eléctricos" },
  ford: { url: "https://www.ford.cl/suvs-crossovers/", motivo: "el Escape está en SUVs" },
  fiat: { url: "https://www.fiat.cl/modelos.html", motivo: "la home no lista modelos" },
  dfsk: { url: "https://www.dfsk.cl/vehiculos/", motivo: "los modelos están bajo /vehiculos/" },
  tesla: { url: "https://www.tesla.com/es_cl/inventory/new/my", motivo: "no tiene dominio .cl; el precio vive en el inventario" },
  ssangyong: { url: "https://www.kgm.cl/modelos/", motivo: "Ssangyong pasó a llamarse KGM" },
  renault: { url: "https://renault.cl/todos-los-modelos/", motivo: "para confirmar si el Kwid sigue en el catálogo" },
  audi: { url: "https://www.audi.cl/modelos/", motivo: "el Q8 e-tron no aparece en la home" },
  gwm: { url: "https://www.gwm.cl/poer/", motivo: "la Poer tiene su propia sección" },
  haval: { url: "https://www.gwm.cl/haval/", motivo: "en Chile se vende bajo GWM" },
  bmw: { url: "https://www.bmw.cl/bmw-i", motivo: "los eléctricos están bajo /bmw-i" },
  byd: { url: "https://www.byd.com/cl/car", motivo: "las fichas viven bajo /car" },
};

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const tokens = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

let credits = 0;

/**
 * El tier gratis de Firecrawl permite 10 req/min. Sin espaciar las llamadas, a
 * partir de la décima marca todo devuelve 429 — pasó en la primera corrida: 26
 * marcas quedaron sin revisar. 6 por minuto deja margen.
 */
const MS_ENTRE_LLAMADAS = 10_000;
let ultimaLlamada = 0;

async function throttle(): Promise<void> {
  const espera = ultimaLlamada + MS_ENTRE_LLAMADAS - Date.now();
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  ultimaLlamada = Date.now();
}

/** Links de una página YA renderizada. 1 credit (solo json/question/highlights cobran extra). */
async function scrapeLinks(url: string): Promise<{ links: string[]; error?: string }> {
  const key = (process.env.FIRECRAWL_API_KEY ?? "").trim();
  if (!key) return { links: [], error: "FIRECRAWL_API_KEY no configurada" };
  await throttle();
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["links"], onlyMainContent: false, waitFor: 3_000, timeout: 60_000 }),
      signal: AbortSignal.timeout(90_000),
    });
    // Un 429 no consume credit: la petición se rechaza antes de abrir navegador.
    if (!res.ok) return { links: [], error: `Firecrawl ${res.status}: ${(await res.text()).slice(0, 120)}` };
    credits++;
    const json = (await res.json()) as { data?: { links?: string[] }; error?: string };
    return { links: json.data?.links ?? [], error: json.error };
  } catch (e) {
    return { links: [], error: String((e as Error).message).slice(0, 120) };
  }
}

/**
 * Palabras de versión y tren motriz que casi nunca están en la URL del modelo.
 * "Escape HEV" vive en /all-new-escape/, "i7 M70 xDrive Berlina" en /modelos/i7.
 * Se sacan de lo EXIGIDO, pero si aparecen en la ruta igual suman puntaje — hay
 * marcas que sí las usan (jolion-hev, tiggo-7-pro-max-phev).
 */
const RUIDO_NOMBRE = new Set([
  "hev", "phev", "mhev", "bev", "reev", "ev", "hibrido", "hibrida", "hybrid", "electrico",
  "electrica", "electric", "enchufable", "plug", "in", "pure", "full", "tech", "etech",
  "xdrive", "4matic", "awd", "4wd", "fwd", "rwd", "berlina", "sedan", "coupe", "sport",
  "msport", "atelier", "xline", "hea", "new", "all", "nuevo", "nueva", "juniper",
]);

/** Mismos filtros y penalizaciones que gen-sheet-autos.ts, sin el texto del ancla. */
function bestLink(model: string, links: string[], sitePrefix: string): string | null {
  const want = tokens(model);
  if (!want.length) return null;
  // Lo que identifica al modelo, sin los sufijos de versión.
  const core = want.filter((w) => !RUIDO_NOMBRE.has(w));
  if (!core.length) return null;
  /**
   * Los números que van SOLOS sí son obligatorios: "Tiggo 8 Pro" no puede calzar
   * con /tiggo-7-pro-max-phev/, ni "Tank 500" con /poer-500/. Los alfanuméricos
   * mezclados (i7, ix1, xdrive45) no se exigen más allá del primero, porque son
   * designaciones de versión que la ruta suele omitir.
   */
  const numerosSolos = core.filter((w) => /^\d+$/.test(w));
  const RUIDO =
    /accesorio|repuesto|post|blog|news|noticia|stories|historia|prensa|press|servicio|taller|contacto|test-?drive|garantia|reciclaje|sustentab|legal|cookie|privac/i;
  const SUBPAGINA = /dimension|equipamiento|galeria|gallery|interior|exterior|seguridad|tecnolog|financiamiento/i;
  const PRECIOS = /precio|order|ordenar|configurador|cotizador|comprar|version/i;

  let best: string | null = null;
  let bestScore = 0;
  for (const link of links) {
    let path: string;
    try {
      path = new URL(link).pathname;
    } catch {
      continue;
    }
    if (!isChileConfirmedUrl(link)) continue;
    if (sitePrefix && !path.toLowerCase().startsWith(sitePrefix)) continue;

    const pt = tokens(path);
    if (!pt.includes(core[0])) continue;
    if (numerosSolos.length && !numerosSolos.every((w) => pt.includes(w))) continue;

    // Calzar el identificador del modelo vale la base del puntaje; los demás
    // tokens suman. Un calce parcial legítimo ("i7" de "i7 M70 xDrive Berlina")
    // tiene que pasar, porque M70 es la versión y la ruta no la lleva.
    const otrosCore = core.slice(1).filter((t) => pt.includes(t)).length;
    const extras = want.filter((t) => !core.includes(t) && pt.includes(t)).length;

    // Y lo que la ruta trae DE MÁS penaliza: /modelos/hatchback/gr_yaris calzaba
    // con "Yaris Sedán Híbrido" y es el GR Yaris, un auto a combustión distinto.
    // "gr" no está en el nombre, y eso es la señal.
    const GENERICO = new Set([
      "modelos", "modelo", "models", "model", "vehiculo", "vehiculos", "vehicles", "autos",
      "auto", "car", "cars", "w", "es", "cl", "index", "html", "php", "gama", "order",
      "ordenar", "precio", "precios", "configurador", "cotizador", "comprar", "version",
      "versiones", "electricos", "electrico", "hibridos", "hibrido", "suv", "suvs", "pickup",
      "pickups", "sedan", "hatchback", "crossovers", "camionetas", "nuevo", "nueva", "all", "new",
    ]);
    const ultimo = tokens(path.split("/").filter(Boolean).at(-1) ?? "");
    const sobrantes = ultimo.filter(
      (x) => !want.includes(x) && !GENERICO.has(x) && !RUIDO_NOMBRE.has(x)
    ).length;

    let score = 10 + otrosCore * 2 + extras * 1.5 - sobrantes * 3;
    score -= Math.max(0, path.split("/").filter(Boolean).length - 3) * 0.8;
    if (RUIDO.test(path)) score -= 12;
    if (SUBPAGINA.test(path)) score -= 5;
    if (PRECIOS.test(path)) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = link;
    }
  }
  return bestScore >= 8 ? best : null;
}

async function validar(url: string): Promise<{ status: number; prices: number; final: string }> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, "accept-language": "es-CL,es;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
    const body = res.ok ? await res.text() : "";
    return {
      status: res.status,
      prices: new Set(body.match(/\$\s?[0-9]{1,3}(?:[.,][0-9]{3}){2,}/g) ?? []).size,
      final: res.url,
    };
  } catch {
    return { status: 0, prices: 0, final: url };
  }
}

async function main(): Promise<void> {
  const hoja = readFileSync(".context/sheet/AUTOS.tsv", "utf8").split(/\r?\n/).filter(Boolean);
  const h = hoja[0].split("\t");
  const [iMarca, iModelo, iUrl, iSug] = ["marca", "modelo", "url_oficial", "url_sugerida"].map((n) => h.indexOf(n));

  const faltan = hoja
    .slice(1)
    .map((l) => l.split("\t"))
    .filter((c) => !c[iUrl] && !c[iSug])
    .map((c) => ({ marca: c[iMarca], modelo: c[iModelo] }));

  const sitios = await sanity.fetch<{ name: string; website: string | null }[]>(
    `*[_type == "brand"]{ name, website }`
  );
  const porMarca = new Map(sitios.map((s) => [norm(s.name), s.website]));

  const grupos = new Map<string, string[]>();
  for (const f of faltan) {
    if (soloMarcas.length && !soloMarcas.includes(f.marca.toLowerCase())) continue;
    grupos.set(f.marca, [...(grupos.get(f.marca) ?? []), f.modelo]);
  }

  console.log(`\n${faltan.length} autos sin fuente · ${grupos.size} marcas a revisar con Firecrawl\n`);

  const encontrados: string[] = [];

  for (const [marca, modelos] of [...grupos].sort((a, b) => b[1].length - a[1].length)) {
    const over = CATALOGOS[marca.toLowerCase()];
    const site = over?.url ?? porMarca.get(norm(marca)) ?? null;
    if (!site) {
      console.log(`  ${marca.padEnd(14)} — sin sitio (ni en Sanity ni override)`);
      continue;
    }

    const { links, error } = await scrapeLinks(site);
    if (error || links.length === 0) {
      console.log(`  ${marca.padEnd(14)} — Firecrawl no devolvió links${error ? `: ${error}` : ""}  [${site}]`);
      continue;
    }

    const rawPrefix = new URL(site).pathname.replace(/\/+$/, "").toLowerCase();
    const sitePrefix = rawPrefix.length > 1 && !rawPrefix.endsWith(".html") ? rawPrefix : "";
    const picks = modelos.map((m) => ({ modelo: m, url: bestLink(m, links, sitePrefix) }));
    const conPick = picks.filter((p) => p.url);

    const validados = [];
    for (const p of conPick) {
      const v = await validar(p.url!);
      validados.push({ ...p, ...v });
    }
    const ok = validados.filter((v) => v.status === 200);

    console.log(
      `  ${marca.padEnd(14)} ${ok.length}/${modelos.length}  (${links.length} links renderizados${over ? ` · override: ${over.motivo}` : ""})`
    );
    for (const v of ok) {
      const nav = v.prices === 0 ? " \t# necesita navegador" : "";
      console.log(`      ✓ ${v.modelo.padEnd(26)} ${v.final}${v.prices ? ` (${v.prices} precios)` : " (sin precio estático)"}`);
      encontrados.push(`${marca}\t${v.modelo}\t${v.final}${nav}`);
    }
    for (const v of validados.filter((x) => x.status !== 200)) {
      console.log(`      ✗ ${v.modelo.padEnd(26)} ${v.status || "timeout"}  ${v.url}`);
    }
    for (const p of picks.filter((x) => !x.url)) {
      console.log(`      — ${p.modelo.padEnd(26)} sin link que calce`);
    }
  }

  console.log(`\n── Resumen ──`);
  console.log(`  credits de Firecrawl usados: ${credits}`);
  console.log(`  fuentes nuevas encontradas:  ${encontrados.length}`);

  if (!encontrados.length) {
    console.log("");
    return;
  }
  if (aplicar) {
    appendFileSync(
      PERSISTIDO,
      `\n# ── Encontradas con Firecrawl (${new Date().toISOString().slice(0, 10)}) ──\n${encontrados.join("\n")}\n`
    );
    console.log(`  \x1b[32m✓ agregadas a ${PERSISTIDO}\x1b[0m`);
    console.log(`  Ahora: npx tsx --env-file=.env.local scripts/validar-fuentes.ts ${PERSISTIDO}\n`);
  } else {
    console.log(`  (no se escribió nada — correr con --aplicar)\n`);
  }
}

void main();
