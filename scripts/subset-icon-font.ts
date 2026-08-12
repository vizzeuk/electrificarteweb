/**
 * Genera dos cosas a partir de la fuente completa de Material Symbols:
 *   1. app/fonts/material-symbols-outlined.woff2 — subset con SOLO los íconos que se usan.
 *   2. lib/icon-codepoints.ts — mapa nombre → codepoint, que usa components/ui/Icon.tsx.
 *
 * POR QUÉ EXISTE
 * La fuente completa pesa ~3,9 MB (≈6.590 glifos). Además, el modo habitual de usarla es
 * por LIGADURAS: se escribe el texto "home" y la fuente lo sustituye por el glifo. Eso
 * tiene un problema visible en móvil — mientras la fuente no llega, el navegador muestra
 * la palabra "home" como texto.
 *
 * Este script ataca las dos causas a la vez:
 *   · Subsetea por CODEPOINT (cada ícono tiene el suyo en el área privada Unicode), lo que
 *     baja la fuente a decenas de KB. Subsetear por ligadura no sirve: el "closure" de
 *     ligaduras arrastra los 6.590 glifos, y desactivarlo deja los glifos sin ligadura, o
 *     sea íconos inalcanzables.
 *   · Al renderizar el codepoint en vez del nombre, el DOM nunca contiene la palabra
 *     "home" — si la fuente fallara se vería un cuadrito, nunca texto.
 *
 * CUÁNDO CORRERLO
 * Cada vez que se agregue un ícono nuevo, en el código o desde Sanity (los campos
 * "Ícono (Material Symbol)" son texto libre). Si un ícono no está en el mapa generado, el
 * componente no lo dibuja — el script avisa de los nombres inválidos antes de que lleguen
 * a producción.
 *
 *   npx tsx --env-file=.env.local scripts/subset-icon-font.ts
 *
 * REQUISITOS
 *   pip3 install fonttools brotli
 *   app/fonts/material-symbols-outlined-full.woff2  (la fuente completa, sin subsetear)
 *
 * La fuente completa NO se versiona (pesa 3,9 MB): descargarla de
 * https://fonts.google.com/icons  →  "Material Symbols Outlined", variable, formato woff2.
 */

import { execFileSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { readdir } from "fs/promises";
import path from "path";
import { createClient } from "@sanity/client";

const ROOT = path.resolve(import.meta.dirname, "..");
const FULL_FONT = path.join(ROOT, "app/fonts/material-symbols-outlined-full.woff2");
const OUT_FONT = path.join(ROOT, "app/fonts/material-symbols-outlined.woff2");
const OUT_MAP = path.join(ROOT, "lib/icon-codepoints.ts");

// Directorios donde buscar nombres de ícono en el código.
const SCAN_DIRS = ["app", "components", "lib"];
const SCAN_EXT = new Set([".ts", ".tsx"]);

/**
 * Nombres de ícono usados en el código.
 *
 * Busca TODO literal de string que coincida con un nombre real de Material Symbols, en vez
 * de intentar reconocer las formas sintácticas de uso. Se hizo así porque los patrones
 * (`<Icon name="x">`, `icon: "x"`, `<span class="material-symbols-outlined">x</span>`) se
 * quedaban cortos con los casos reales del repo: spans multilínea, ternarios
 * (`name={abierto ? "pause_circle" : "play_circle"}`) y fallbacks (`{t.icon ?? "bolt"}`).
 *
 * El cruce con la lista de glifos de la fuente es lo que lo hace preciso. Puede colar algún
 * falso positivo (una palabra como "search" usada como string cualquiera) y eso solo suma
 * unos KB — mucho más barato que omitir un ícono y que salga roto en producción.
 */
async function iconsFromCode(validNames: Set<string>): Promise<Set<string>> {
  const found = new Set<string>();
  const STRING_LITERAL = /["'`]([a-z][a-z0-9_]{1,39})["'`]/g;

  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(full); continue; }
      if (!SCAN_EXT.has(path.extname(entry.name))) continue;
      const src = readFileSync(full, "utf8");
      for (const m of src.matchAll(STRING_LITERAL)) {
        if (validNames.has(m[1])) found.add(m[1]);
      }
    }
  }

  for (const d of SCAN_DIRS) await walk(path.join(ROOT, d));
  return found;
}

/** Nombres de ícono guardados como contenido en Sanity (campos de texto libre). */
async function iconsFromSanity(): Promise<Set<string>> {
  const found = new Set<string>();
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) {
    console.warn("⚠️  Sin NEXT_PUBLIC_SANITY_PROJECT_ID — se omiten los íconos del CMS.");
    return found;
  }
  const sanity = createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2025-01-01",
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
  });

  // Cualquier campo llamado "icon" a cualquier profundidad, en cualquier documento.
  const docs = await sanity.fetch<unknown[]>("*[]");
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (k === "icon" && typeof val === "string" && /^[a-z0-9_]+$/.test(val)) found.add(val);
      else walk(val);
    }
  };
  docs.forEach(walk);
  return found;
}

/** Mapa nombre de ícono → codepoint, leído de la tabla cmap de la fuente completa. */
function codepointsInFont(): Map<string, number> {
  const json = execFileSync("python3", ["-c", `
from fontTools.ttLib import TTFont
import json, sys
f = TTFont(${JSON.stringify(FULL_FONT)})
out = {}
for cp, gn in f.getBestCmap().items():
    out.setdefault(gn, cp)   # el primero gana: variantes .fill quedan fuera por nombre
json.dump(out, sys.stdout)
`], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return new Map(Object.entries(JSON.parse(json) as Record<string, number>));
}

async function main() {
  if (!existsSync(FULL_FONT)) {
    console.error(`\n❌ Falta la fuente completa: ${path.relative(ROOT, FULL_FONT)}`);
    console.error("   Descárgala de https://fonts.google.com/icons (Material Symbols Outlined, variable, woff2)");
    console.error("   y guárdala con ese nombre. No se versiona porque pesa ~3,9 MB.\n");
    process.exit(1);
  }

  const available = codepointsInFont();
  const [code, cms] = await Promise.all([iconsFromCode(new Set(available.keys())), iconsFromSanity()]);
  const wanted = new Set([...code, ...cms]);

  // Un ícono que no existe en la fuente no se puede dibujar — hay que detectarlo acá y no
  // en producción.
  const invalid = [...wanted].filter((n) => !available.has(n)).sort();
  const valid = [...wanted].filter((n) => available.has(n)).sort();

  console.log(`\nÍconos detectados: ${wanted.size}  (código: ${code.size}, Sanity: ${cms.size})`);
  if (invalid.length) {
    console.error(`\n❌ ${invalid.length} ícono(s) NO existen en Material Symbols:`);
    invalid.forEach((n) => console.error(`   · ${n}`));
    console.error("\n   Corrígelos (en el código o en Sanity) y vuelve a correr el script.\n");
    process.exit(1);
  }

  // Subset por CODEPOINT + reconstrucción manual de las ligaduras.
  //
  // Por qué no se puede subsetear por ligadura directamente: el "closure" de pyftsubset,
  // partiendo de las letras a-z, alcanza TODOS los íconos y devuelve una fuente de ~3,6 MB.
  // Y con --no-layout-closure se van los lookups completos, dejando los glifos sin ninguna
  // ligadura que los alcance. Así que se subsetea por codepoint (chico y correcto) y
  // después se inyectan solo las 80-90 ligaduras que hacen falta.
  //
  // Se conservan las ligaduras porque hay ~180 usos directos de
  // <span className="material-symbols-outlined">nombre</span> en el código que las
  // necesitan. Los que pasan por <Icon> usan el codepoint y no dependen de esto.
  const iconCps = valid.map((n) => available.get(n)!);
  const componentCps = [..."abcdefghijklmnopqrstuvwxyz0123456789_ "].map((c) => c.codePointAt(0)!);
  const unicodes = [...new Set([...iconCps, ...componentCps])].map((c) => c.toString(16)).join(",");

  execFileSync("python3", [
    "-m", "fontTools.subset", FULL_FONT,
    `--unicodes=${unicodes}`,
    "--layout-features=*", "--no-layout-closure",
    // Sin esto pyftsubset renombra los glifos a uniXXXX y las reglas de ligadura de más
    // abajo (que los referencian por nombre) no compilan.
    "--glyph-names",
    "--flavor=woff2",
    `--output-file=${OUT_FONT}`,
  ], { stdio: "inherit" });

  // Los nombres de glifo de los componentes no son obvios (el dígito "2" es "digit_two",
  // no "two"), así que se leen del cmap de la fuente ya subseteada en vez de adivinarlos.
  const glyphNames = JSON.parse(execFileSync("python3", ["-c", `
from fontTools.ttLib import TTFont
import json, sys
cm = TTFont(${JSON.stringify(OUT_FONT)}).getBestCmap()
json.dump({chr(cp): gn for cp, gn in cm.items() if cp < 0x2000}, sys.stdout)
`], { encoding: "utf8" })) as Record<string, string>;

  const rules = valid
    .map((n) => `    sub ${[...n].map((ch) => glyphNames[ch] ?? ch).join(" ")} by ${n};`)
    .join("\n");
  const fea = `feature liga {\n${rules}\n} liga;\n`;

  execFileSync("python3", ["-c", `
import sys
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
font = TTFont(${JSON.stringify(OUT_FONT)})
addOpenTypeFeaturesFromString(font, sys.stdin.read())
font.flavor = "woff2"
font.save(${JSON.stringify(OUT_FONT)})
`], { input: fea, stdio: ["pipe", "inherit", "inherit"] });

  const entries = valid.map((n) => `  ${JSON.stringify(n)}: "\\u${available.get(n)!.toString(16).padStart(4, "0")}",`).join("\n");
  writeFileSync(OUT_MAP, `// GENERADO POR scripts/subset-icon-font.ts — no editar a mano.
// Mapa nombre de ícono → codepoint en la fuente subseteada que servimos.
// Si agregas un ícono (en código o en Sanity), vuelve a correr el script.

export const ICON_CODEPOINTS: Record<string, string> = {
${entries}
};
`);

  const kb = statSync(OUT_FONT).size / 1024;
  const fullKb = statSync(FULL_FONT).size / 1024;
  console.log(`\n✅ ${valid.length} íconos · ${kb.toFixed(1)} KB (antes ${fullKb.toFixed(1)} KB — ${(fullKb / kb).toFixed(0)}× más liviana)`);
  console.log(`   mapa escrito en ${path.relative(ROOT, OUT_MAP)}\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
