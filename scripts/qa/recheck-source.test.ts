/// <reference types="node" />
/**
 * Prueba en vivo de la lectura de fuente del re-check (lib/catalog-recheck/read-source.ts).
 * Gasta tokens de verdad y lee sitios de verdad. NO escribe nada en Sanity.
 *
 *   npx tsx --env-file=.env.local scripts/qa/recheck-source.test.ts
 *   npx tsx --env-file=.env.local scripts/qa/recheck-source.test.ts --slug gwm-ora-03
 *
 * Sin --slug toma los autos publicados que ya tienen sourceUrls. Por eso no va en
 * `npm test`: la suite tiene que poder correr sin red y sin costo.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import { decide } from "@/lib/catalog-recheck/diff";
import { readSource } from "@/lib/catalog-recheck/read-source";
import type { CarSnapshot } from "@/lib/catalog-recheck/types";

const argSlug = process.argv[process.argv.indexOf("--slug") + 1];
const slug = process.argv.includes("--slug") ? argSlug : undefined;
const limit = Number(process.argv[process.argv.indexOf("--limit") + 1]) || 3;

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

interface Row extends CarSnapshot {
  extraUrls?: string[];
}

const projection = `{
  "id": _id, "name": name, "brand": brand->name, "slug": slug.current,
  "sourceUrl": sourceUrls[0], "extraUrls": sourceUrls[1...3],
  basePrice, discountPrice, modelYear, sourceFailStreak,
  "versions": versions[]{ name, price }
}`;

async function main(): Promise<void> {
  const cars: Row[] = slug
    ? await sanity.fetch(`*[_type=="car" && slug.current==$slug][0...1] ${projection}`, { slug })
    : await sanity.fetch(
        `*[_type=="car" && hidden != true && !(_id in path("drafts.**")) && count(sourceUrls)>0][0...$limit] ${projection}`,
        { limit }
      );
  
  if (!cars.length) {
    console.error(
      slug
        ? `✗ No hay auto publicado con slug "${slug}".`
        : "✗ No hay ningún auto publicado con sourceUrls. Es el bloqueante de la Fase 0 (docs/FLUJO-PDP-N8N.md §0.1)."
    );
    process.exit(1);
  }
  
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const clp = (n?: number | null) => (typeof n === "number" ? `$${n.toLocaleString("es-CL")}` : "—");
  
  let fallos = 0;
  for (const car of cars) {
    console.log(`\n\x1b[1m▶ ${car.brand} ${car.name}\x1b[0m`);
    console.log(`  fuente: ${car.sourceUrl}`);
    console.log(`  tenemos: base ${clp(car.basePrice)} · año ${car.modelYear ?? "—"} · ${car.versions?.length ?? 0} versiones`);
  
    const t0 = Date.now();
    let report;
    try {
      report = await readSource({
        anthropic,
        brand: car.brand,
        model: car.name,
        sourceUrl: car.sourceUrl,
        extraUrls: car.extraUrls,
        log: (l) => console.log(`  ${l}`),
      });
    } catch (e) {
      fallos++;
      console.error(`  \x1b[31m✗ error de API: ${(e as Error).message}\x1b[0m`);
      continue;
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
  
    console.log(`  leyó en ${secs}s: fuente_ok=${report.fuente_ok} · vigente=${report.modelo_vigente} · base ${clp(report.precio_base)} · año ${report.anio_modelo ?? "—"}`);
    if (report.versiones.length) {
      for (const v of report.versiones) console.log(`    · ${v.nombre} — ${clp(v.precio)}`);
    }
    if (report.evidencia) console.log(`  evidencia: "${report.evidencia.slice(0, 120)}"`);
    if (report.nota) console.log(`  nota: ${report.nota}`);
  
    const d = decide(car, report);
    console.log(`  \x1b[1m→ ${d.outcome}\x1b[0m · flag=${d.flag} · urgente=${d.urgent} · ocultar=${d.hide} · re-extraer=${d.needsReextract}`);
    for (const f of d.findings) console.log(`    ⚑ ${f.kind}: ${f.detail}`);
  
    // La lectura tiene que ser accionable: o leyó un precio con cita, o dijo por qué no.
    if (report.fuente_ok && !report.precio_base && !report.nota) {
      fallos++;
      console.error("  \x1b[31m✗ leyó la fuente pero no reportó precio ni explicó por qué\x1b[0m");
    }
    if (report.precio_base && !report.evidencia) {
      fallos++;
      console.error("  \x1b[31m✗ reportó un precio sin cita textual — el diff lo va a descartar\x1b[0m");
    }
  }
  
  console.log(`\n${fallos === 0 ? "✓" : "✗"} ${cars.length} autos leídos, ${fallos} problemas\n`);
  process.exit(fallos === 0 ? 0 : 1);
  
}

void main();
