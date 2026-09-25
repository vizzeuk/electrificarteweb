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
import { guardarCache, leerCache } from "@/lib/catalog-recheck/cache";
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
 * Relee la pagina en vivo en vez de usar la lectura guardada. Sin esto, ajustar
 * la logica y volver a correr no cuesta ni una llamada a la API.
 */
const sinCache = process.argv.includes("--sin-cache");
/**
 * Agregar versiones que la fuente lista y nosotros no tenemos va detrás de su
 * propio flag. Es de donde salen los duplicados: la fuente escribe "1.2 GL" y
 * nosotros "1.2 GL MT", el calce difuso no las une, y terminan las dos en la
 * ficha. Corregir precios es seguro; agregar filas no.
 */
const agregarVersiones = process.argv.includes("--agregar-versiones");
/**
 * Reemplaza la lista de versiones por la de la fuente, en vez de intentar
 * casarlas. Es lo correcto cuando la fuente publica la gama completa con precios:
 * los nombres oficiales son los de la marca, y los nuestros vienen de una
 * lectura vieja. Ejemplos reales: nosotros "43kWh COM" y MG "MG 4 Urban EV 43kW
 * COM"; nosotros "EX2 Pro" y Geely "Geely EX2 Pro". Casarlas token a token falla
 * y agregarlas duplica, asi que se reemplaza y se arrastran las specs de la
 * version que mejor calce.
 */
const reemplazarVersiones = process.argv.includes("--reemplazar-versiones");

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

/**
 * Versiones que NO deben entrar al catálogo, aunque la fuente las liste.
 *
 * Las páginas de marca cubren la gama completa del modelo, no solo lo
 * electrificado. El CX-60 trajo un "PRIME 2.5 GASOLINA" y el Arkana un
 * "1.3 4×2 at intens mhev (precio especial)": el primero está fuera del alcance
 * (el catálogo excluye 100% combustión) y el segundo no es una versión sino una
 * etiqueta de campaña.
 */
const ELECTRIFICADO = /hev|phev|mhev|bev|reev|hibrid|hybrid|electric|electrico|kwh|\bev\b|e-?tech|e-?power|idd|dht|dm-?i|plug/i;
const COMBUSTION = /\bgasolina\b|\bbencina\b|\bdi[eé]sel\b|\bturbo\b(?!.*(hev|hybrid|hibrid))/i;
const PROMO = /precio especial|oferta|bono|descuento|campa[ñn]a|desde \$|promoci/i;

function versionAceptable(nombre: string, modelo: string): { ok: boolean; motivo?: string } {
  if (PROMO.test(nombre)) return { ok: false, motivo: "parece una etiqueta de campaña, no una versión" };
  // Si el nombre dice explícitamente combustión y no dice nada electrificado,
  // es de otra gama del mismo modelo.
  if (COMBUSTION.test(nombre) && !ELECTRIFICADO.test(`${nombre} ${modelo}`)) {
    return { ok: false, motivo: "es una versión a combustión, fuera del alcance del catálogo" };
  }
  return { ok: true };
}

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
  // Unidades: "43kWh COM" y "43kW COM" son la misma versión.
  "kw", "kwh", "km", "cv", "hp",
]);

function claveVersion(nombre: string, modelo = "", marca = ""): string {
  // Ni la marca ni el modelo distinguen una versión de otra: la fuente escribe
  // "Geely EX2 Pro" y nosotros "EX2 Pro", o "Urban" contra "LBX Urban".
  // Descontarlos es lo que las hace calzar y lo que permite conservar las specs
  // al reemplazar por los nombres oficiales.
  const delModelo = new Set(
    `${marca} ${modelo}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .split(/[^a-z0-9]+/).filter(Boolean),
  );
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
    .filter((t) => !delModelo.has(t))
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  const clave = [...new Set(tokens)].sort().join("-");
  // Si al descontar el modelo no queda nada, la versión ES el modelo (placeholder).
  return clave || "__base__";
}

interface VersionDoc {
  _key?: string;
  name?: string;
  price?: number | null;
  [k: string]: unknown;
}

interface Car {
  id: string;
  sharedSource?: boolean;
  discountPrice?: number | null;
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
  reemplazo?: { nombre: string; precio: number; base?: VersionDoc }[];
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
      discountPrice,
      "versions": versions[]{ _key, name, price },
      // Otra PDP publicada lee la MISMA pagina. Pasa en 7 familias del catalogo.
      "sharedSource": defined(sourceUrls[0]) && count(*[_type == "car" && hidden != true
        && !(_id in path("drafts.**")) && _id != ^._id
        && defined(sourceUrls[0]) && sourceUrls[0] == ^.sourceUrls[0]]) > 0
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
      const cacheado = sinCache ? null : leerCache(car.sourceUrl, car.name);
      if (cacheado) {
        r = cacheado.report;
      } else {
        const read = await readSource({
          anthropic, brand: car.brand, model: car.name,
          sourceUrl: car.sourceUrl, extraUrls: car.extraUrls,
        });
        r = read.report;
        guardarCache(car.sourceUrl, car.name, { report: read.report, via: read.via, text: read.text });
      }
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

    // Con la fuente compartida entre varias PDPs, el unico "precio lista" que
    // publica la pagina no se puede atribuir a un modelo: el Volvo EX30 y el
    // EX30 Cross Country leen la misma pagina y no valen lo mismo. Se reporta y
    // lo resuelve una persona.
    if (nuevoBase && nuevoBase !== car.basePrice) {
      // Bajar el precio de lista puede dejarlo BAJO el precio con descuento, y
      // entonces la PDP muestra una "oferta" mas cara que la lista. Paso con el
      // SOUEAST S06: la fuente bajo la lista a $17.990.000 y el descuento
      // guardado era $21.990.000. El descuento es el numero negociado de
      // Francisco, asi que no se toca: se avisa y decide una persona.
      if (typeof car.discountPrice === "number" && nuevoBase <= car.discountPrice) {
        console.log(`  \x1b[33m~\x1b[0m ${etiqueta.padEnd(34)} basePrice ${clp(car.basePrice)} → ${clp(nuevoBase)} NO aplicado: quedaria bajo el descuento ${clp(car.discountPrice)}`);
      } else if (car.sharedSource) {
        console.log(`  \x1b[33m~\x1b[0m ${etiqueta.padEnd(34)} basePrice ${clp(car.basePrice)} → ${clp(nuevoBase)} NO aplicado: la fuente cubre varias PDPs`);
      } else {
        cambio.basePrice = { de: car.basePrice, a: nuevoBase };
      }
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
        mias.find((m) => !usadas.has(m._key ?? m.name ?? "") && claveVersion(m.name ?? "", car.name, car.brand) === claveVersion(s.nombre, car.name, car.brand));
      if (mia) {
        usadas.add(mia._key ?? mia.name ?? "");
        if (mia.price !== p) cambio.precios.push({ version: mia.name ?? "", de: mia.price ?? null, a: p });
      } else if (versionAceptable(s.nombre, car.name).ok) {
        cambio.nuevas.push({ nombre: s.nombre, precio: p });
      }
    }
    for (const m of mias) {
      const k = m._key ?? m.name ?? "";
      if (usadas.has(k)) continue;
      if (!suyas.some((s) => claveVersion(s.nombre, car.name, car.brand) === claveVersion(m.name ?? "", car.name, car.brand))) {
        cambio.sinCalce.push(m.name ?? "");
      }
    }

    // Reemplazo: solo si la fuente trae la gama completa con precio en TODAS.
    // Si trae menos versiones que las nuestras, es una pagina parcial y
    // reemplazar perderia versiones que si se venden.
    const rechazadas: string[] = [];
    const suyasConPrecio = suyas.filter((v) => {
      if (!plausible(v.precio)) return false;
      const j = versionAceptable(v.nombre, car.name);
      if (!j.ok) {
        rechazadas.push(`"${v.nombre}" (${j.motivo})`);
        return false;
      }
      return true;
    });
    if (
      reemplazarVersiones &&
      suyasConPrecio.length >= Math.max(1, mias.length) &&
      suyasConPrecio.length === suyas.length
    ) {
      const distinto =
        suyasConPrecio.length !== mias.length ||
        suyasConPrecio.some((v) => {
          const m = mias.find((x) => claveVersion(x.name ?? "", car.name, car.brand) === claveVersion(v.nombre, car.name, car.brand));
          return !m || m.price !== plausible(v.precio);
        });
      if (distinto) {
        // Con una sola version de cada lado son obviamente la misma, aunque el
        // nombre no calce ("Elroq 85 RWD" contra "Elroq 85 - Design"). Casarlas
        // por posicion conserva sus specs, que es lo que se perdia antes.
        const unoAUno = suyasConPrecio.length === 1 && mias.length === 1;
        cambio.reemplazo = suyasConPrecio.map((v, i) => ({
          nombre: v.nombre,
          precio: plausible(v.precio)!,
          base: unoAUno
            ? mias[i]
            : mias.find((x) => claveVersion(x.name ?? "", car.name, car.brand) === claveVersion(v.nombre, car.name, car.brand)),
        }));
        cambio.precios = [];
        cambio.nuevas = [];
        cambio.sinCalce = [];
      }
    }

    const hayAlgo =
      Boolean(cambio.basePrice) ||
      cambio.precios.length > 0 ||
      Boolean(cambio.reemplazo) ||
      (agregarVersiones && cambio.nuevas.length > 0);
    if (!hayAlgo && !cambio.sinCalce.length) {
      console.log(`  \x1b[32m✓\x1b[0m ${etiqueta.padEnd(34)} ya calza con la fuente`);
      continue;
    }

    console.log(`  \x1b[1m▸ ${etiqueta}\x1b[0m`);
    if (cambio.basePrice) console.log(`      basePrice   ${clp(cambio.basePrice.de)} → ${clp(cambio.basePrice.a)}`);
    if (rechazadas.length) console.log(`      \x1b[33mrechazadas: ${rechazadas.join(" · ")}\x1b[0m`);
    if (cambio.reemplazo) {
      console.log(`      \x1b[35mreemplaza\x1b[0m   ${mias.length} versiones nuestras por las ${cambio.reemplazo.length} de la fuente:`);
      for (const v of cambio.reemplazo) {
        const antes = v.base ? `${v.base.name} ${clp(v.base.price)}` : "\x1b[36m(nueva)\x1b[0m";
        const despues = v.base ? `${v.base.name} ${clp(v.precio)}` : `"${v.nombre}" ${clp(v.precio)}`;
        console.log(`        ${antes.padEnd(46)} → ${despues}`);
      }
      const huerfanas = mias.filter((m) => !cambio.reemplazo!.some((v) => v.base?._key === m._key));
      if (huerfanas.length) console.log(`        \x1b[33mse pierden: ${huerfanas.map((h) => h.name).join(", ")}\x1b[0m`);
    }
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
    if (c.reemplazo) {
      // Las specs se arrastran de la version que mejor calzo; las que no calzan
      // quedan solo con nombre y precio, que es mejor que heredar specs ajenas.
      set.versions = c.reemplazo.map((v, i) => ({
        ...(v.base ?? {}),
        _key: v.base?._key ?? `rp${Date.now().toString(36)}${i}`,
        _type: "version",
        // Si la version ya existia, se conserva NUESTRO nombre: el de la fuente
        // suele repetir marca y modelo ("Geely EX2 Pro" cuando la PDP ya dice
        // Geely EX2). El nombre de la fuente solo se usa para las nuevas.
        name: v.base?.name ?? v.nombre,
        price: v.precio,
      }));
    } else if (c.precios.length || (agregarVersiones && c.nuevas.length)) {
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
