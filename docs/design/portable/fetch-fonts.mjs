// Descarga Cabinet Grotesk y Switzer desde Fontshare a app/fonts/fontshare/ (gitignored).
//
// POR QUÉ NO SE VERSIONAN
// Las dos familias están bajo la ITF Free Font License (FFL) v2.0. La licencia permite
// auto-hospedarlas para el sitio propio ("Self-hosting ... is permitted and recommended"),
// pero prohíbe distribuirlas por un "repository ... or publicly accessible servers". Este
// repo es público, así que los .woff2 no pueden vivir en git: se bajan del servicio oficial
// en cada build y next/font/local los sirve desde el propio dominio.
//
// Corre solo antes de `npm run dev` y `npm run build` (hooks predev/prebuild).
// Si los archivos ya existen no hace nada. Manual: node scripts/fetch-fonts.mjs
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd(); // correr desde la raíz del proyecto
// Destino configurable: en un proyecto con src/, FONTS_OUT=src/app/fonts/fontshare.
const OUT = path.join(ROOT, process.env.FONTS_OUT ?? "app/fonts/fontshare");

/** Familia de Fontshare → pesos que usa el sitio. El nombre de archivo lo lee app/layout.tsx.
 *  Se pide una familia por request y se filtra por `name`: la respuesta de la API trae además
 *  @font-face de otras familias (Satoshi, Sentient) con los mismos pesos. Sin ese filtro
 *  Switzer 400 terminaba siendo Sentient Italic y Cabinet 700, Satoshi Bold. */
const FAMILIES = [
  { slug: "cabinet-grotesk", name: "Cabinet Grotesk", file: "CabinetGrotesk", weights: [700, 800] },
  { slug: "switzer", name: "Switzer", file: "Switzer", weights: [400, 500, 600, 700] },
];

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function get(url, as) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
      return as === "text" ? await res.text() : Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  throw lastError;
}

function target(family, weight) {
  return path.join(OUT, `${family.file}-${weight}.woff2`);
}

async function main() {
  const missing = FAMILIES.flatMap((f) =>
    f.weights.filter((w) => !(existsSync(target(f, w)) && statSync(target(f, w)).size > 1000)).map((w) => [f, w])
  );
  if (missing.length === 0) return;

  mkdirSync(OUT, { recursive: true });
  for (const family of FAMILIES) {
    const pending = missing.filter(([f]) => f === family).map(([, w]) => w);
    if (pending.length === 0) continue;

    const css = await get(`https://api.fontshare.com/v2/css?f[]=${family.slug}@${pending.join(",")}&display=swap`, "text");
    for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const name = block.match(/font-family:\s*'([^']+)'/)?.[1];
      const weight = Number(block.match(/font-weight:\s*(\d+)/)?.[1]);
      const url = block.match(/url\('(\/\/cdn\.fontshare\.com\/[^']+?\.woff2)'\)/)?.[1];
      if (name !== family.name || !pending.includes(weight) || !url) continue;
      writeFileSync(target(family, weight), await get(`https:${url}`, "buffer"));
    }
  }

  const stillMissing = missing.filter(([f, w]) => !existsSync(target(f, w)));
  if (stillMissing.length) {
    throw new Error(`No se pudieron bajar: ${stillMissing.map(([f, w]) => `${f.slug}@${w}`).join(", ")}`);
  }
  console.log(`fetch-fonts: ${missing.length} archivos descargados de Fontshare en app/fonts/fontshare/`);
}

main().catch((err) => {
  console.error(`\nfetch-fonts: ${err.message}`);
  console.error("Las fuentes de marca (Cabinet Grotesk y Switzer) se bajan de api.fontshare.com antes de cada build.");
  console.error("Revisa la conexión o reintenta. Ver scripts/fetch-fonts.mjs.\n");
  process.exit(1);
});
