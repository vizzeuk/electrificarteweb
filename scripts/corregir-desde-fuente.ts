/**
 * Corrige precios del catálogo leyendo la fuente oficial de cada auto.
 *
 *   npx tsx --env-file=.env.local scripts/corregir-desde-fuente.ts --limit 20
 *   npx tsx --env-file=.env.local scripts/corregir-desde-fuente.ts --limit 20 --aplicar
 *   npx tsx --env-file=.env.local scripts/corregir-desde-fuente.ts --marca Suzuki --aplicar
 *
 * Usa el mismo lector que el re-check (readSource), así que hereda sus guardas:
 * un precio sin cita textual se descarta, uno bajo $3.000.000 también, y el
 * promocional nunca se confunde con el de lista.
 *
 * QUÉ CORRIGE
 *  - `basePrice`, cuando la fuente publica un precio de lista con evidencia.
 *  - El precio de las versiones cuyo nombre calza con el de la fuente.
 *  - Agrega las versiones que la fuente lista con precio y nosotros no tenemos.
 *
 * QUÉ NO TOCA
 *  - No borra versiones. Que la fuente no liste una no prueba que no se venda:
 *    puede ser una página parcial. Se reporta y decide una persona.
 *  - No escribe specs. La fuente casi nunca las publica por versión, y ese es
 *    justamente el dato que quedó mal copiado — inventarlo sería repetir el error.
 *  - No toca `discountPrice`: es el precio negociado, no sale de la fuente.
 *
 * Antes de escribir deja un respaldo completo de cada documento tocado en
 * `.context/respaldo-<fecha>.json`. Sin eso, una corrección masiva de versiones
 * no tiene vuelta atrás.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import { writeFileSync } from "node:fs";
import { readSource } from "@/lib/catalog-recheck/read-source";
import { MIN_PLAUSIBLE_PRICE } from "@/lib/catalog-recheck/diff";

const arg = (n: string) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const limite = Number(arg("--limit")) || 200;
const marca = arg("--marca");
const desde = Number(arg("--desde")) || 0;
const aplicar = process.argv.includes("--aplicar");
/**
 * Agregar versiones que la fuente lista y nosotros no tenemos va detrás de su
 * propio flag. Es de donde salen los duplicados: la fuente escribe "1.2 GL" y
 * nosotros "1.2 GL MT", el calce difuso no las une, y terminan las dos en la
 * ficha. Corregir precios es seguro; agregar filas no.
 */
const agregarVersiones = process.argv.includes("--agregar-versiones");

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const clp = (n?: number | null) => (typeof n === "number" ? `$${n.toLocaleString("es-CL")}` : "—");
const norm = (s: string) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\+/g, " plus ").replace(/[^a-z0-9]/g, "");


/**
 * Clave canónica de una versión, para reconocer la misma versión escrita
 * distinto en nuestra ficha y en la fuente.
 *
 * Los tres casos que aparecen de verdad en las páginas chilenas:
 *  - la caja se escribe con o sin número de marchas: "GL 5MT" = "GL MT"
 *  - la cilindrada a veces va y a veces no: "1.5 GL" = "GL"
 *  - el tren motriz se repite del nombre del modelo: "GL HEV" = "GL"
 *
 * Sin esto, cada diferencia de notación agregaba una versión duplicada en vez
 * de corregir la que ya estaba.
 */
const RUIDO_VERSION = new Set([
  "hev", "phev", "mhev", "bev", "reev", "ev", "hibrido", "hibrida", "hybrid",
  "electrico", "electrica", "electric",
]);

function claveVersion(nombre: string): string {
  const tokens = (nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .split(/[^a-z0-9.]+/)
    .filter(Boolean)
    .map((t) => t.replace(/^\d+(mt|at|dct|cvt|amt)$/, "$1"))
    .filter((t) => !/^\d+(\.\d+)?$/.test(t))
    .filter((t) => !RUIDO_VERSION.has(t))
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  return [...new Set(tokens)].sort().join("-");
}

interface VersionDoc {
  _key?: string;
  name?: string;
  price?: number | null;
  [k: string]: unknown;
}

interface Car {
  id: string;
  name: string;
  brand: string;
  slug: string;
  basePrice: number | null;
  sourceUrl: string;
  extraUrls?: string[];
  versions: VersionDoc[] | null;
}

interface Cambio {
  car: Car;
  basePrice?: { de: number | null; a: number };
  precios: { version: string; de: number | null; a: number }[];
  nuevas: { nombre: string; precio: number }[];
  sinCalce: string[];
  evidencia: string;
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Falta ANTHROPIC_API_KEY");
    process.exit(1);
  }

  const cars = await sanity.fetch<Car[]>(
    `*[_type == "car" && hidden != true && !(_id in path("drafts.**")) && count(sourceUrls) > 0
       ${marca ? "&& brand->name == $marca" : ""}]
     | order(brand->name asc, name asc) [$desde...$hasta] {
      "id": _id, name, "brand": brand->name, "slug": slug.current, basePrice,
      "sourceUrl": sourceUrls[0], "extraUrls": sourceUrls[1...3],
      "versions": versions[]{ _key, name, price }
    }`,
    { desde, hasta: desde + limite, ...(marca ? { marca } : {}) }
  );

  if (!cars.length) {
    console.error("No hay autos con sourceUrls en ese rango.");
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  console.log(`\n${cars.length} autos (desde ${desde})${aplicar ? " — SE VA A ESCRIBIR" : " — en seco"}\n`);

  const cambios: Cambio[] = [];
  const respaldo: unknown[] = [];
  let leidos = 0;
  let fallidos = 0;

  for (const car of cars) {
    const etiqueta = `${car.brand} ${car.name}`;
    let r;
    try {
      r = (await readSource({
        anthropic, brand: car.brand, model: car.name,
        sourceUrl: car.sourceUrl, extraUrls: car.extraUrls,
      })).report;
    } catch (e) {
      fallidos++;
      console.log(`  \x1b[31m✗\x1b[0m ${etiqueta.padEnd(34)} error: ${(e as Error).message.slice(0, 60)}`);
      continue;
    }
    leidos++;

    if (!r.fuente_ok) {
      console.log(`  \x1b[90m·\x1b[0m ${etiqueta.padEnd(34)} fuente no legible`);
      continue;
    }

    const plausible = (n: number | null | undefined) =>
      typeof n === "number" && Number.isFinite(n) && n >= MIN_PLAUSIBLE_PRICE ? Math.round(n) : null;

    const nuevoBase = r.evidencia ? plausible(r.precio_base) : null;
    const cambio: Cambio = {
      car, precios: [], nuevas: [], sinCalce: [], evidencia: r.evidencia ?? "",
    };

    if (nuevoBase && nuevoBase !== car.basePrice) {
      cambio.basePrice = { de: car.basePrice, a: nuevoBase };
    }

    const mias = car.versions ?? [];
    const suyas = (r.versiones ?? []).filter((v) => v?.nombre);
    const usadas = new Set<string>();

    for (const s of suyas) {
      const p = plausible(s.precio);
      if (!p) continue;
      // Exacto primero; si no, por clave canónica (misma versión, otra notación).
      const mia =
        mias.find((m) => norm(m.name ?? "") === norm(s.nombre)) ??
        mias.find((m) => !usadas.has(m._key ?? m.name ?? "") && claveVersion(m.name ?? "") === claveVersion(s.nombre));
      if (mia) {
        usadas.add(mia._key ?? mia.name ?? "");
        if (mia.price !== p) cambio.precios.push({ version: mia.name ?? "", de: mia.price ?? null, a: p });
      } else {
        cambio.nuevas.push({ nombre: s.nombre, precio: p });
      }
    }
    for (const m of mias) {
      const k = m._key ?? m.name ?? "";
      if (usadas.has(k)) continue;
      if (!suyas.some((s) => claveVersion(s.nombre) === claveVersion(m.name ?? ""))) {
        cambio.sinCalce.push(m.name ?? "");
      }
    }

    const hayAlgo = Boolean(cambio.basePrice) || cambio.precios.length > 0 || (agregarVersiones && cambio.nuevas.length > 0);
    if (!hayAlgo && !cambio.sinCalce.length) {
      console.log(`  \x1b[32m✓\x1b[0m ${etiqueta.padEnd(34)} ya calza con la fuente`);
      continue;
    }

    console.log(`  \x1b[1m▸ ${etiqueta}\x1b[0m`);
    if (cambio.basePrice) console.log(`      basePrice   ${clp(cambio.basePrice.de)} → ${clp(cambio.basePrice.a)}`);
    for (const p of cambio.precios) console.log(`      precio      "${p.version}"  ${clp(p.de)} → ${clp(p.a)}`);
    for (const n of cambio.nuevas) {
      console.log(`      \x1b[36m${agregarVersiones ? "+ versión" : "? la fuente tiene"}\x1b[0m   "${n.nombre}"  ${clp(n.precio)}`);
    }
    if (cambio.sinCalce.length) console.log(`      \x1b[90m? sin calce en la fuente: ${cambio.sinCalce.join(", ")}\x1b[0m`);

    if (hayAlgo) cambios.push(cambio);
  }

  console.log(`\n── ${leidos} leídos · ${fallidos} fallidos · ${cambios.length} con correcciones ──`);

  if (!aplicar || !cambios.length) {
    console.log(aplicar ? "\n  nada que escribir\n" : "\n  (en seco — agregar --aplicar)\n");
    return;
  }

  // Respaldo antes de tocar nada. Una corrección masiva de versiones sin esto
  // no tiene vuelta atrás.
  const ids = cambios.map((c) => c.car.id);
  const previo = await sanity.fetch(`*[_id in $ids]`, { ids });
  respaldo.push(...(previo as unknown[]));
  const archivo = `.context/respaldo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  writeFileSync(archivo, JSON.stringify(respaldo, null, 2));
  console.log(`\n  respaldo de ${respaldo.length} documentos → ${archivo}`);

  let tx = sanity.transaction();
  for (const c of cambios) {
    const set: Record<string, unknown> = {};
    if (c.basePrice) {
      set.basePrice = c.basePrice.a;
      set.priceCheckPreviousBasePrice = c.basePrice.de ?? undefined;
    }
    if (c.precios.length || (agregarVersiones && c.nuevas.length)) {
      const porNombre = new Map(c.precios.map((p) => [norm(p.version), p.a]));
      const actualizadas: VersionDoc[] = (c.car.versions ?? []).map((v) => {
        const nuevo = porNombre.get(norm(v.name ?? ""));
        return nuevo ? { ...v, price: nuevo } : v;
      });
      const agregadas: VersionDoc[] = (agregarVersiones ? c.nuevas : []).map((n, i) => ({
        _key: `src${Date.now().toString(36)}${i}`,
        _type: "version",
        name: n.nombre,
        price: n.precio,
      }));
      set.versions = [...actualizadas, ...agregadas];
    }
    set.lastPriceCheckAt = new Date().toISOString();
    tx = tx.patch(c.car.id, (p) => p.set(set));
  }
  await tx.commit();
  console.log(`\n\x1b[32m✓ ${cambios.length} autos corregidos desde su fuente oficial\x1b[0m\n`);
}

void main();
