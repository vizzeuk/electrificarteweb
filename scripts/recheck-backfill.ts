/**
 * Backfill del re-check (Flujo C — docs/FLUJO-PDP-N8N.md).
 *
 *   npx tsx --env-file=.env.local scripts/recheck-backfill.ts            (solo reporta)
 *   npx tsx --env-file=.env.local scripts/recheck-backfill.ts --aplicar  (escribe checkSlot)
 *
 * Hace dos cosas:
 *  1. Le asigna `checkSlot` 0–27 a los autos publicados que no tienen. De ahí en
 *     adelante los autos nuevos lo reciben al crearse y esto no se vuelve a correr.
 *  2. Reporta las FAMILIAS: modelos partidos en varias PDPs que comparten una sola
 *     página oficial. En esas, el re-check no compara versiones hasta que alguien
 *     declare el reparto en Studio (`sourceVersionScope` / `sourceVersionExclude`).
 *     Sin eso, cada PDP vería las versiones de su hermana como "versión nueva"
 *     todas las semanas: ~30 hallazgos fantasma que hacen ilegible el digest.
 */

import { createClient } from "@sanity/client";
import { assignSlots, describeSlot, TOTAL_SLOTS } from "@/lib/catalog-recheck/slots";

const aplicar = process.argv.includes("--aplicar");

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
  checkSlot: number | null;
  sourceUrl: string | null;
  versions: string[] | null;
  scope: string[] | null;
  exclude: string[] | null;
}

/**
 * Lo que distingue a la PDP hija de la madre, listo para pegar en el campo de
 * reparto. Se descartan los designadores numéricos del principio: "Taycan 4
 * Cross Turismo" menos "Taycan" da "4 Cross Turismo", pero la página también
 * lista "Taycan Turbo Cross Turismo" — el token útil es "Cross Turismo".
 */
function distinguishingToken(padre: string, hijo: string): string {
  const tail = hijo.slice(padre.length).trim().split(/\s+/);
  while (tail.length > 1 && /^[0-9]+[a-zA-Z]?$/.test(tail[0])) tail.shift();
  return tail.join(" ");
}

async function main(): Promise<void> {
  const cars = await sanity.fetch<Car[]>(
    `*[_type == "car" && hidden != true && !(_id in path("drafts.**"))] | order(brand->name asc, name asc) {
      "id": _id, name, "brand": brand->name, checkSlot,
      "sourceUrl": sourceUrls[0], "versions": versions[].name,
      "scope": sourceVersionScope, "exclude": sourceVersionExclude
    }`
  );

  console.log(`\n${cars.length} autos publicados.\n`);

  // ── 1. Lotes ───────────────────────────────────────────────────────────────
  const counts: Record<number, number> = {};
  for (const c of cars) {
    if (typeof c.checkSlot === "number" && c.checkSlot >= 0 && c.checkSlot < TOTAL_SLOTS) {
      counts[c.checkSlot] = (counts[c.checkSlot] ?? 0) + 1;
    }
  }
  const sinSlot = cars.filter(
    (c) => !(typeof c.checkSlot === "number" && c.checkSlot >= 0 && c.checkSlot < TOTAL_SLOTS)
  );

  console.log(`\x1b[1m── Lotes de revisión ──\x1b[0m`);
  console.log(`  con lote: ${cars.length - sinSlot.length} · sin lote: ${sinSlot.length}`);

  if (sinSlot.length > 0) {
    const pairs = assignSlots(sinSlot.map((c) => c.id), counts);
    const porLote: Record<number, number> = { ...counts };
    for (const p of pairs) porLote[p.checkSlot] = (porLote[p.checkSlot] ?? 0) + 1;
    const tamaños = Object.values(porLote);
    console.log(
      `  reparto resultante: ${Math.min(...tamaños)}–${Math.max(...tamaños)} autos por lote ` +
        `(28 lotes, ${cars.length} autos)`
    );

    if (aplicar) {
      const tx = pairs.reduce(
        (t, { carId, checkSlot }) => t.patch(carId, (p) => p.set({ checkSlot })),
        sanity.transaction()
      );
      await tx.commit();
      console.log(`  \x1b[32m✓ asignados ${pairs.length}\x1b[0m`);
      const muestra = pairs.slice(0, 3);
      for (const p of muestra) {
        const c = sinSlot.find((x) => x.id === p.carId)!;
        console.log(`      ${c.brand} ${c.name} → ${describeSlot(p.checkSlot)}`);
      }
    } else {
      console.log(`  (no se escribió nada — correr con --aplicar)`);
    }
  }

  // ── 2. Familias que comparten página oficial ───────────────────────────────
  // Dos señales: mismo sourceUrl (medible), o un nombre que es prefijo de otro de
  // la misma marca (predictivo — los que todavía no tienen sourceUrl).
  console.log(`\n\x1b[1m── Familias: varias PDPs, una sola página oficial ──\x1b[0m`);

  const porUrl = new Map<string, Car[]>();
  for (const c of cars) {
    if (!c.sourceUrl) continue;
    const list = porUrl.get(c.sourceUrl) ?? [];
    list.push(c);
    porUrl.set(c.sourceUrl, list);
  }
  const compartidas = [...porUrl.entries()].filter(([, list]) => list.length > 1);

  const porMarca = new Map<string, Car[]>();
  for (const c of cars) {
    const list = porMarca.get(c.brand) ?? [];
    list.push(c);
    porMarca.set(c.brand, list);
  }
  const familias: { padre: Car; hijos: Car[] }[] = [];
  for (const [, list] of porMarca) {
    for (const padre of list) {
      const hijos = list.filter(
        (o) => o.id !== padre.id && o.name.toLowerCase().startsWith(`${padre.name.toLowerCase()} `)
      );
      if (hijos.length) familias.push({ padre, hijos });
    }
  }

  if (compartidas.length > 0) {
    console.log(`\n  \x1b[33mComprobadas (mismo sourceUrl):\x1b[0m`);
    for (const [url, list] of compartidas) {
      console.log(`    ${url}`);
      for (const c of list) {
        const declarado = c.scope?.length || c.exclude?.length ? " ✓ reparto declarado" : " ⚠ sin reparto";
        console.log(`      · ${c.brand} ${c.name} (${c.versions?.length ?? 0} versiones)${declarado}`);
      }
    }
  }

  if (familias.length > 0) {
    console.log(`\n  \x1b[33mProbables (nombre prefijo, misma marca) — revisar al poner sourceUrls:\x1b[0m`);
    for (const { padre, hijos } of familias) {
      const sugerencias = hijos.map((h) => distinguishingToken(padre.name, h.name));
      console.log(`    ${padre.brand}:`);
      console.log(
        `      · "${padre.name}" (${padre.versions?.length ?? 0} versiones) → excluir ${JSON.stringify(sugerencias)}`
      );
      for (const h of hijos) {
        const token = distinguishingToken(padre.name, h.name);
        console.log(
          `      · "${h.name}" (${h.versions?.length ?? 0} versiones) → scope ${JSON.stringify([token])}`
        );
      }
    }
  }

  const total = compartidas.length + familias.length;
  console.log(
    total === 0
      ? `\n  Ninguna. El re-check puede comparar versiones en todo el catálogo.\n`
      : `\n  ${total} familia(s). Mientras no declaren el reparto, el re-check compara precios pero NO versiones ahí.\n`
  );
}

void main();
