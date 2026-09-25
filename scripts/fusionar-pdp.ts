/**
 * Fusiona dos PDPs que son el mismo modelo base en una sola.
 *
 *   npx tsx --env-file=.env.local scripts/fusionar-pdp.ts            (reporta)
 *   npx tsx --env-file=.env.local scripts/fusionar-pdp.ts --aplicar
 *
 * Aplica la regla R1 del board: 1 modelo = 1 PDP. Cuando la marca publica una
 * sola página para el modelo y sus variantes, partirlo en dos PDPs obliga a
 * mantener el reparto de versiones a mano en cada corrida del re-check, y
 * duplica el precio base en dos documentos que después divergen.
 *
 * La PDP absorbida NO se borra: se oculta. Su slug sigue existiendo en Sanity por
 * si hay que volver atrás, y el contenido queda intacto.
 */

import { createClient } from "@sanity/client";
import { writeFileSync } from "node:fs";

const aplicar = process.argv.includes("--aplicar");

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const clp = (n?: number | null) => (typeof n === "number" ? `$${n.toLocaleString("es-CL")}` : "—");

/** Misma clave canónica que el corrector: reconoce la versión escrita distinto. */
function clave(nombre: string): string {
  return (nombre ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\+/g, " plus ")
    .split(/[^a-z0-9.]+/).filter(Boolean)
    .filter((t) => !/^\d+(\.\d+)?$/.test(t))
    .filter((t) => !["kwh", "km", "ora", "ex30", "volvo", "gwm"].includes(t))
    .map((t) => t.replace(/[^a-z0-9]/g, "")).filter(Boolean)
    .sort().join("-");
}

interface Version { _key?: string; name?: string; price?: number | null; [k: string]: unknown }
interface Car {
  _id: string; name: string; brand: string; slug: string;
  hidden: boolean | null; basePrice: number | null; versions: Version[] | null;
}

/** [slug que sobrevive, slug que se absorbe, por qué] */
const FUSIONES: [string, string, string][] = [
  ["volvo-ex30", "volvo-ex30-cross-country",
   "volvocars.com/cl/cars/ex30-electric/ es una sola página para el EX30 y el Cross Country: es una variante de tracción total del mismo modelo, no un modelo aparte."],
  ["ora-03", "gwm-ora-03-gt",
   "gwm.cl/vehiculo/ora/ora-03/ es una sola página para el Ora 03 y el GT: el GT es un trim, no un modelo aparte. Además el doc del GT traía la versión SR duplicada y con el precio del GT."],
];

async function main(): Promise<void> {
  const slugs = FUSIONES.flatMap(([a, b]) => [a, b]);
  const cars = await sanity.fetch<Car[]>(
    `*[_type == "car" && slug.current in $slugs]{
      _id, name, "brand": brand->name, "slug": slug.current, hidden, basePrice,
      "versions": versions[]{ ... }
    }`, { slugs }
  );
  const porSlug = new Map(cars.map((c) => [c.slug, c]));

  const acciones: { survivor: Car; absorbed: Car; versions: Version[]; basePrice: number | null; motivo: string }[] = [];

  for (const [sSlug, aSlug, motivo] of FUSIONES) {
    const survivor = porSlug.get(sSlug);
    const absorbed = porSlug.get(aSlug);
    if (!survivor || !absorbed) {
      console.log(`  \x1b[33msaltado: falta ${!survivor ? sSlug : aSlug}\x1b[0m`);
      continue;
    }

    const merged: Version[] = [...(survivor.versions ?? [])];
    const vistas = new Set(merged.map((v) => clave(v.name ?? "")));
    const descartadas: string[] = [];

    for (const v of absorbed.versions ?? []) {
      const k = clave(v.name ?? "");
      if (vistas.has(k)) {
        // Ya existe en el que sobrevive: la del absorbido es la copia con el
        // precio equivocado (así estaba el "ORA 03 SR" del GT, a $26.490.000
        // cuando la real vale $16.990.000).
        descartadas.push(`${v.name} ${clp(v.price)}`);
        continue;
      }
      vistas.add(k);
      merged.push({ ...v, _key: `mg${Math.random().toString(36).slice(2, 9)}` });
    }

    const precios = merged.map((v) => v.price).filter((p): p is number => typeof p === "number" && p > 0);
    const base = precios.length ? Math.min(...precios) : survivor.basePrice;

    console.log(`\n\x1b[1m${survivor.brand} ${survivor.name}\x1b[0m  ← absorbe  ${absorbed.brand} ${absorbed.name}`);
    console.log(`  \x1b[90m${motivo}\x1b[0m`);
    console.log(`  versiones: ${survivor.versions?.length ?? 0} + ${absorbed.versions?.length ?? 0} → ${merged.length}`);
    for (const v of merged) console.log(`    · ${v.name} ${clp(v.price)}`);
    if (descartadas.length) console.log(`    \x1b[33mdescartadas por duplicadas: ${descartadas.join(", ")}\x1b[0m`);
    if (base !== survivor.basePrice) console.log(`  basePrice ${clp(survivor.basePrice)} → ${clp(base)} (la versión más barata)`);
    console.log(`  /${absorbed.slug} queda OCULTO (no se borra)`);

    acciones.push({ survivor, absorbed, versions: merged, basePrice: base ?? null, motivo });
  }

  if (!aplicar || !acciones.length) {
    console.log(aplicar ? "\n  nada que fusionar\n" : "\n  (en seco — agregar --aplicar)\n");
    return;
  }

  const ids = acciones.flatMap((a) => [a.survivor._id, a.absorbed._id]);
  const previo = await sanity.fetch(`*[_id in $ids]`, { ids });
  const archivo = `.context/respaldo-fusion-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  writeFileSync(archivo, JSON.stringify(previo, null, 2));
  console.log(`\n  respaldo → ${archivo}`);

  let tx = sanity.transaction();
  for (const a of acciones) {
    tx = tx.patch(a.survivor._id, (p) =>
      p.set({ versions: a.versions, ...(a.basePrice ? { basePrice: a.basePrice } : {}) }),
    );
    tx = tx.patch(a.absorbed._id, (p) => p.set({ hidden: true, hiddenByCheck: false }));
  }
  await tx.commit();
  console.log(`\n\x1b[32m✓ ${acciones.length} fusiones aplicadas\x1b[0m\n`);
}

void main();
