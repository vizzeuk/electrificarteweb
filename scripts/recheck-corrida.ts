/**
 * Corrida del re-check contra la fuente oficial, en seco.
 *
 *   npx tsx --env-file=.env.local scripts/recheck-corrida.ts --limit 15
 *   npx tsx --env-file=.env.local scripts/recheck-corrida.ts --slug gwm-ora-03
 *   npx tsx --env-file=.env.local scripts/recheck-corrida.ts --limit 15 --aplicar
 *
 * Usa exactamente el mismo camino que /api/admin/recheck/car (readSource + decide),
 * así que lo que sale acá es lo que haría la corrida real. Sin `--aplicar` no
 * escribe nada en Sanity.
 *
 * Además del diff de precio, imprime la comparación VERSIÓN POR VERSIÓN contra la
 * fuente. Eso es lo que la auditoría no puede resolver sola: sabe que 29 autos
 * tienen versiones con specs idénticas, pero solo la fuente dice cuáles son las
 * versiones de verdad y a qué precio.
 *
 * Por defecto prioriza los autos que la auditoría marcó: los que tienen versiones
 * con specs repetidas o basePrice que no calza, que son los que más urge revisar.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { decide } from "@/lib/catalog-recheck/diff";
import { readSource } from "@/lib/catalog-recheck/read-source";
import { guardarCache, leerCache } from "@/lib/catalog-recheck/cache";
import type { CarSnapshot } from "@/lib/catalog-recheck/types";

const arg = (n: string) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const limite = Number(arg("--limit")) || 12;
const slug = arg("--slug");
const marca = arg("--marca");
const aplicar = process.argv.includes("--aplicar");
/**
 * Relee la pagina en vivo en vez de usar la lectura guardada. Sin esto, ajustar
 * la logica y volver a correr no cuesta ni una llamada a la API.
 */
const sinCache = process.argv.includes("--sin-cache");
/**
 * Toma las fuentes de un TSV de candidatas en vez de `sourceUrls` de Sanity.
 * Es lo que permite correr la revisión ANTES de que alguien apruebe las URLs:
 * hoy Sanity solo tiene 3 `sourceUrls` y las 158 candidatas viven en el archivo.
 * Así se ve qué dice cada fuente sin escribir una sola URL sin revisar.
 */
const archivoFuentes = arg("--fuentes");

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const clp = (n?: number | null) => (typeof n === "number" ? `$${n.toLocaleString("es-CL")}` : "—");
const norm = (s: string) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\+/g, " plus ").replace(/[^a-z0-9]/g, "");

interface Row extends CarSnapshot {
  extraUrls?: string[];
  hidden?: boolean | null;
}

const PROY = `{
  "id": _id, "name": name, "brand": brand->name, "slug": slug.current, hidden,
  "sourceUrl": sourceUrls[0], "extraUrls": sourceUrls[1...3],
  basePrice, discountPrice, modelYear, sourceFailStreak,
  "versions": versions[]{ name, price },
  "catalogFindings": catalogFindings[]{ kind, detail, proposedPrice, versionName, evidence },
  "versionScope": sourceVersionScope, "versionExclude": sourceVersionExclude,
  "sharedSource": defined(sourceUrls[0]) && count(*[_type == "car" && hidden != true && !(_id in path("drafts.**"))
                          && _id != ^._id && defined(sourceUrls[0]) && sourceUrls[0] == ^.sourceUrls[0]]) > 0
}`;

function leerFuentes(path: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const [mk, mod, url] = line.split("\t").map((x) => (x ?? "").split("#")[0].trim());
    if (mk && mod && url) m.set(norm(`${mk}${mod}`), url);
  }
  return m;
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Falta ANTHROPIC_API_KEY");
    process.exit(1);
  }

  const fuentes = archivoFuentes ? leerFuentes(archivoFuentes) : null;

  let cars: Row[] = slug
    ? await sanity.fetch(`*[_type == "car" && slug.current == $slug][0...1] ${PROY}`, { slug })
    : fuentes
      ? await sanity.fetch(
          `*[_type == "car" && hidden != true && !(_id in path("drafts.**"))
             ${marca ? "&& brand->name == $marca" : ""}]
           | order(brand->name asc, name asc) ${PROY}`,
          marca ? { marca } : {},
        )
      : await sanity.fetch(
          `*[_type == "car" && hidden != true && !(_id in path("drafts.**")) && count(sourceUrls) > 0
             ${marca ? "&& brand->name == $marca" : ""}]
           | order(coalesce(lastPriceCheckAt, "1970-01-01") asc) [0...$limite] ${PROY}`,
          { limite, ...(marca ? { marca } : {}) },
        );

  if (fuentes) {
    // Se prioriza lo que la auditoría marcó: los autos cuyas versiones tienen
    // specs repetidas son los que más urge contrastar contra la fuente.
    cars = cars
      .map((c) => ({ ...c, sourceUrl: fuentes.get(norm(`${c.brand}${c.name}`)) ?? c.sourceUrl }))
      .filter((c) => c.sourceUrl)
      .slice(0, limite);
  }

  if (!cars.length) {
    console.error("No hay autos con fuente para revisar.");
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  console.log(`\nRevisando ${cars.length} autos contra su fuente oficial${aplicar ? " (SE VA A ESCRIBIR)" : " (en seco)"}…\n`);

  const resumen = { sinCambios: 0, cambios: 0, fuenteCaida: 0, error: 0, descontinuado: 0 };
  const paraCorregir: string[] = [];

  for (const car of cars) {
    const etiqueta = `${car.brand} ${car.name}`;
    const t0 = Date.now();
    let read;
    try {
      const cacheado = sinCache ? null : leerCache(car.sourceUrl, car.name);
      if (cacheado) {
        read = { report: cacheado.report, via: cacheado.via as "web_fetch" | "firecrawl", text: cacheado.text };
      } else {
        read = await readSource({
          anthropic, brand: car.brand, model: car.name,
          sourceUrl: car.sourceUrl, extraUrls: car.extraUrls,
        });
        guardarCache(car.sourceUrl, car.name, { report: read.report, via: read.via, text: read.text });
      }
    } catch (e) {
      resumen.error++;
      console.log(`\x1b[1m▶ ${etiqueta}\x1b[0m\n  \x1b[31m✗ error de API: ${(e as Error).message.slice(0, 90)}\x1b[0m\n`);
      continue;
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    const r = read.report;
    const d = decide(car, r);
    resumen[d.outcome === "sin_cambios" ? "sinCambios" : d.outcome === "cambios" ? "cambios" : d.outcome === "descontinuado" ? "descontinuado" : "fuenteCaida"]++;

    console.log(`\x1b[1m▶ ${etiqueta}\x1b[0m  (${read.via}, ${secs}s)`);
    console.log(`  ${car.sourceUrl}`);
    console.log(`  precio lista   nosotros ${clp(car.basePrice)}   ·   la fuente ${clp(r.precio_base)}`);
    if (r.evidencia) console.log(`  evidencia      "${r.evidencia.replace(/\s+/g, " ").slice(0, 90)}"`);

    // ── Versiones: nuestra ficha contra la fuente ───────────────────────────
    const nuestras = car.versions ?? [];
    const suyas = r.versiones ?? [];
    if (nuestras.length || suyas.length) {
      const claves = [...new Set([...nuestras.map((v) => norm(v.name)), ...suyas.map((v) => norm(v.nombre))])];
      console.log(`  versiones      nosotros ${nuestras.length}   ·   la fuente ${suyas.length}`);
      for (const k of claves) {
        const mia = nuestras.find((v) => norm(v.name) === k);
        const suya = suyas.find((v) => norm(v.nombre) === k);
        const marca = mia && suya ? "=" : mia ? "sobra" : "FALTA";
        const izq = mia ? `${mia.name} ${clp(mia.price)}` : "—";
        const der = suya ? `${suya.nombre} ${clp(suya.precio)}` : "—";
        const distinto = mia && suya && mia.price && suya.precio && mia.price !== suya.precio;
        const color = marca === "=" ? (distinto ? "\x1b[33m" : "\x1b[90m") : "\x1b[36m";
        console.log(`    ${color}${marca.padEnd(6)}\x1b[0m ${izq.padEnd(42)} ${der}`);
      }
    }

    console.log(`  \x1b[1m→ ${d.outcome}\x1b[0m · flag=${d.flag}${d.autoApply ? ` · aplicaría ${clp(d.autoApply.from)} → ${clp(d.autoApply.to)}` : ""}`);
    for (const f of d.findings) console.log(`    ⚑ ${f.kind}: ${f.detail.slice(0, 120)}`);
    if (r.nota) console.log(`    nota: ${r.nota.replace(/\s+/g, " ").slice(0, 150)}`);

    if (d.findings.length) paraCorregir.push(etiqueta);

    if (aplicar) {
      await sanity.patch(car.id).set({
        lastPriceCheckAt: new Date().toISOString(),
        priceCheckFlag: d.flag,
        catalogFindings: d.findings.map((f, i) => ({ _key: `f${i}`, _type: "finding", ...f })),
        sourceFailStreak: d.sourceFailStreak,
        ...(d.note ? { priceCheckNote: d.note } : {}),
        ...(d.suggestedPrice ? { priceCheckSuggestedPrice: d.suggestedPrice } : {}),
        ...(d.needsReextract ? { needsReextract: true } : {}),
      }).commit();
    }
    console.log("");
  }

  console.log(`── Resumen ──`);
  console.log(`  sin cambios ${resumen.sinCambios} · con hallazgos ${resumen.cambios} · descontinuado ${resumen.descontinuado} · fuente caída ${resumen.fuenteCaida} · error ${resumen.error}`);
  if (paraCorregir.length) console.log(`  a revisar: ${paraCorregir.join(", ")}`);
  console.log(aplicar ? "\n  (campos de auditoría escritos en Sanity)\n" : "\n  (en seco — nada escrito; agregar --aplicar)\n");
}

void main();
