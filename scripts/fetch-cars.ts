/**
 * Descarga el material crudo de cada PDP del CSV para alimentar la extracción.
 *
 * Uso:
 *   npx tsx scripts/fetch-cars.ts                 (procesa todo el CSV)
 *   npx tsx scripts/fetch-cars.ts --only=dongfeng-vigo
 *   npx tsx scripts/fetch-cars.ts --section=nuevos|actualizar
 *
 * Por cada auto deja en data/scrape/<slug>/:
 *   meta.json    — marca, modelo, tipo, url, slug, notas
 *   page.txt     — HTML de la PDP limpio a texto plano
 *   images.txt   — todas las URLs de imágenes encontradas (1 por línea)
 *   ficha-N.pdf  — fichas técnicas en PDF enlazadas desde la página
 *
 * NO usa LLM ni Sanity — solo descarga. La extracción a JSON va en otro paso.
 */

import * as fs from "fs";
import * as path from "path";

const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] ?? null;
const SECTION = process.argv.find((a) => a.startsWith("--section="))?.split("=")[1] ?? null;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const CSV_PATH = path.resolve(
  __dirname,
  "../data/Actualización y creación nuevos modelos electrificarte.com-2.xlsx - Carga y actualización modelos e.csv"
);
const OUT_DIR = path.resolve(__dirname, "../data/scrape");

const TYPE_MAP: Record<string, string> = {
  EV: "EV",
  PHEV: "PHEV",
  HEV: "HEV",
  MHEV: "MHEV",
  REEV: "EREV",
};

interface CarRow {
  priority: number | null;
  brand: string;
  model: string;
  electricType: string | null;
  sourceUrl: string;
  secondaryUrl: string | null;
  notes: string | null;
  section: "nuevos" | "actualizar" | "ocultar";
  slug: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseCsv(): CarRow[] {
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const rows: CarRow[] = [];
  let section: CarRow["section"] = "nuevos";

  for (const line of raw.split(/\r?\n/)) {
    const cols = line.split(",");
    const joined = line.toLowerCase();
    if (joined.includes("modelos a actualizar")) section = "actualizar";
    else if (joined.includes("modelos a ocultar")) section = "ocultar";

    const brand = (cols[2] ?? "").trim();
    const model = (cols[3] ?? "").trim();
    const url = (cols[5] ?? "").trim();
    if (!brand || !model) continue;
    if (!url.startsWith("http")) continue; // descarta encabezados y la fila "ocultar"

    const typeRaw = (cols[4] ?? "").trim().toUpperCase();
    const typeKey = Object.keys(TYPE_MAP).find((k) => typeRaw.startsWith(k)) ?? null;
    const secondary = (cols[6] ?? "").trim();
    const priority = Number(cols[1]);

    rows.push({
      priority: Number.isFinite(priority) ? priority : null,
      brand,
      model,
      electricType: typeKey ? TYPE_MAP[typeKey] : null,
      sourceUrl: url,
      secondaryUrl: secondary.startsWith("http") ? secondary : null,
      notes: secondary && !secondary.startsWith("http") ? secondary : null,
      section,
      slug: slugify(`${brand}-${model}`),
    });
  }

  // Desambigua slugs repetidos (ej: Chevrolet Captiva PHEV vs EV) con el tipo eléctrico.
  const seen = new Map<string, number>();
  for (const r of rows) seen.set(r.slug, (seen.get(r.slug) ?? 0) + 1);
  for (const r of rows) {
    if ((seen.get(r.slug) ?? 0) > 1 && r.electricType) {
      r.slug = slugify(`${r.brand}-${r.model}-${r.electricType}`);
    }
  }
  return rows;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/gi, "á").replace(/&eacute;/gi, "é").replace(/&iacute;/gi, "í")
    .replace(/&oacute;/gi, "ó").replace(/&uacute;/gi, "ú").replace(/&ntilde;/gi, "ñ")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 1)
    .join("\n");
}

function extractImages(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const patterns = [
    /(?:src|data-src|data-lazy|data-original)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi,
    /<source[^>]+srcset\s*=\s*["']([^"' ]+\.(?:jpg|jpeg|png|webp)[^"' ]*)["']/gi,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
    /background-image:\s*url\(["']?([^"')]+\.(?:jpg|jpeg|png|webp)[^"')]*)["']?\)/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      try {
        urls.add(new URL(m[1], baseUrl).href);
      } catch {
        /* url inválida, ignorar */
      }
    }
  }
  return [...urls];
}

function extractPdfLinks(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const re = /href\s*=\s*["']([^"']+\.pdf)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      urls.add(new URL(m[1], baseUrl).href);
    } catch {
      /* ignorar */
    }
  }
  return [...urls];
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function processCar(car: CarRow) {
  const dir = path.join(OUT_DIR, car.slug);
  fs.mkdirSync(dir, { recursive: true });

  const htmlBuf = await download(car.sourceUrl);
  if (!htmlBuf) {
    console.log(`  ✗ ${car.brand} ${car.model} — no se pudo descargar la página`);
    fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ ...car, fetchError: true }, null, 2));
    return;
  }

  const html = htmlBuf.toString("utf-8");
  const text = htmlToText(html);
  const images = extractImages(html, car.sourceUrl);
  const pdfs = extractPdfLinks(html, car.sourceUrl);

  fs.writeFileSync(path.join(dir, "page.txt"), text);
  fs.writeFileSync(path.join(dir, "images.txt"), images.join("\n"));

  let pdfCount = 0;
  for (const pdfUrl of pdfs.slice(0, 4)) {
    const buf = await download(pdfUrl);
    if (buf && buf.subarray(0, 4).toString() === "%PDF") {
      pdfCount++;
      fs.writeFileSync(path.join(dir, `ficha-${pdfCount}.pdf`), buf);
    }
  }

  fs.writeFileSync(
    path.join(dir, "meta.json"),
    JSON.stringify(
      { ...car, textLength: text.length, imageCount: images.length, pdfCount, pdfUrls: pdfs },
      null,
      2
    )
  );

  const warn = text.length < 800 ? "  ⚠ poco contenido (¿SPA?)" : "";
  console.log(
    `  ✓ ${car.brand} ${car.model} — ${text.length} chars · ${images.length} imgs · ${pdfCount} PDF${warn}`
  );
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`\nNo se encontró el CSV:\n${CSV_PATH}\n`);
    process.exit(1);
  }
  let cars = parseCsv();
  if (SECTION) cars = cars.filter((c) => c.section === SECTION);
  if (ONLY) cars = cars.filter((c) => c.slug === ONLY);

  console.log(`\nDescargando ${cars.length} auto(s) → data/scrape/\n`);
  for (const car of cars) {
    await processCar(car);
  }
  console.log(`\nListo. Material crudo en data/scrape/\n`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
