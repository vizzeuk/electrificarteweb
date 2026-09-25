/**
 * Extrae precios de lista de los PDFs oficiales de lista de precios.
 *
 *   npx tsx --env-file=.env.local scripts/precios-desde-pdf.ts
 *   npx tsx --env-file=.env.local scripts/precios-desde-pdf.ts --aplicar
 *   npx tsx --env-file=.env.local scripts/precios-desde-pdf.ts --marca MG
 *
 * Existe porque la web de varias marcas solo publica el precio promocional (con
 * bonos de marca y financiamiento ya descontados) o un "desde", mientras que el
 * PDF de lista de precios trae la gama completa con el precio de lista real por
 * versión. Es el único lugar donde está ese dato.
 *
 * Usa context.dev `/v1/parse`: devuelve el PDF como markdown con las TABLAS
 * preservadas, por 1 credit. Eso importa — `web_fetch` de Anthropic también lee
 * PDFs pero devuelve prosa, y sobre una tabla el diff se hace en aritmética, sin
 * meter un modelo en medio (regla C4 del flujo).
 *
 * Los PDFs salen de data/fichas-tecnicas.tsv (scripts/buscar-fichas.ts).
 */

import { createClient } from "@sanity/client";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const aplicar = process.argv.includes("--aplicar");
const forzar = process.argv.includes("--forzar");
const fresco = process.argv.includes("--sin-cache");
const soloMarca = process.argv.includes("--marca")
  ? process.argv[process.argv.indexOf("--marca") + 1]?.toLowerCase()
  : null;

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const clp = (n?: number | null) => (typeof n === "number" ? `$${n.toLocaleString("es-CL")}` : "—");
const PISO = 3_000_000;
const MAX_DERIVA = 0.25;

/**
 * Tokens comparables. Separa el borde dígito/letra ("49kW" → "49" "kw") porque
 * la web escribe "49kW" y el PDF "49 KWh" — sin eso, ninguna versión calza.
 */
function tokens(s: string, quitar: string[] = []): string[] {
  const fuera = new Set([
    "mg", "new", "all", "nuevo", "nueva", "the",
    "kwh", "kw", "khw", "wh", "hp", "cc", "l", "t", "cv",
    ...quitar,
  ]);
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/(\d)([a-z])/g, "$1 $2").replace(/([a-z])(\d)/g, "$1 $2")
    .split(/[^a-z0-9.]+/).filter(Boolean)
    .map((t) => t.replace(/[^a-z0-9]/g, "")).filter(Boolean)
    .filter((t) => !fuera.has(t))
    // "Hybrid", "Híbrido" y "HEV" son la misma palabra según quién escriba:
    // nosotros ponemos "ZS Hybrid" donde el PDF pone "ZS 1.5L HEV LUX".
    .map((t) => (/^(hev|hybrid|hibrido|hibrida)$/.test(t) ? "hev" : t));
}

/** Jaccard sobre los tokens que sobran del nombre del modelo. */
function similitud(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((t) => B.has(t)).length;
  return inter / (A.size + B.size - inter);
}

/**
 * Cache en disco del markdown ya parseado. Un PDF de lista de precios cambia
 * una vez al mes como mucho, y cada re-lectura cuesta un credit: iterar el
 * matcher sobre la misma lista no debe volver a pagarse.
 */
const CACHE = ".context/cache-pdf";

function rutaCache(url: string): string {
  return `${CACHE}/${createHash("sha1").update(url).digest("hex").slice(0, 16)}.md`;
}

async function parsePdf(url: string, fresco: boolean): Promise<{ markdown: string; credits: number } | { error: string }> {
  if (!fresco && existsSync(rutaCache(url))) {
    return { markdown: readFileSync(rutaCache(url), "utf8"), credits: 0 };
  }
  const key = (process.env.CONTEXT_API_KEY ?? "").trim();
  if (!key) return { error: "CONTEXT_API_KEY no configurada" };
  try {
    const pdf = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
      redirect: "follow",
      signal: AbortSignal.timeout(60_000),
    });
    if (!pdf.ok) return { error: `el PDF responde ${pdf.status}` };
    const bytes = Buffer.from(await pdf.arrayBuffer());

    const res = await fetch("https://api.context.dev/v1/parse", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/pdf" },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(180_000),
    });
    const j = (await res.json()) as {
      success?: boolean; markdown?: string; message?: unknown;
      key_metadata?: { credits_consumed?: number };
    };
    if (!res.ok || !j.markdown) return { error: `context.dev ${res.status}: ${JSON.stringify(j.message ?? j).slice(0, 140)}` };
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(rutaCache(url), j.markdown);
    return { markdown: j.markdown, credits: j.key_metadata?.credits_consumed ?? 1 };
  } catch (e) {
    return { error: String((e as Error).message).slice(0, 120) };
  }
}

/**
 * Una fila de la tabla con su primer precio. En estas listas el PRIMER precio es
 * el de lista y el segundo el de campaña con bonos — verificado contra el sitio
 * de MG, donde la ZS HEV LUX figura a $21.990.000 de lista.
 */
const LETRA_CHICA = /cuot|bono|pie de|v[aá]lido|incluye|financiamiento|%|t[eé]rminos|sujeto/i;

function filasConPrecio(markdown: string): { etiqueta: string; lista: number; promo?: number }[] {
  const out: { etiqueta: string; lista: number; promo?: number }[] = [];
  const vistas = new Set<string>();
  for (const linea of markdown.split("\n")) {
    // La letra chica repite los mismos precios dentro de las condiciones del
    // bono y del crédito; si entra, duplica cada versión varias veces.
    if (LETRA_CHICA.test(linea)) continue;
    const precios = [...linea.matchAll(/\$\s?([0-9]{1,3}(?:[.,][0-9]{3})+)/g)]
      .map((m) => Number(m[1].replace(/[.,]/g, "")))
      .filter((n) => n >= PISO);
    if (!precios.length) continue;
    // La etiqueta es la primera celda de la fila.
    const celdas = linea.split("|").map((c) => c.trim()).filter(Boolean);
    const etiqueta = (celdas[0] ?? "").replace(/\$.*/, "").trim();
    if (etiqueta.length < 3) continue;
    const clave = `${etiqueta}|${precios[0]}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    out.push({ etiqueta, lista: precios[0], promo: precios[1] });
  }
  return out;
}

interface Car {
  _id: string; name: string; brand: string;
  basePrice: number | null;
  versions: { _key?: string; name?: string; price?: number | null; [k: string]: unknown }[] | null;
}

async function main(): Promise<void> {
  const lineas = readFileSync("data/fichas-tecnicas.tsv", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split("\t"))
    .filter((c) => c[1] === "precios");

  // Un mismo PDF sirve a varios autos (el de MG cubre toda la gama): se parsea
  // una sola vez y se paga un solo credit.
  const porUrl = new Map<string, string[]>();
  for (const [auto, , url] of lineas) {
    if (soloMarca && !auto.toLowerCase().startsWith(soloMarca)) continue;
    porUrl.set(url, [...(porUrl.get(url) ?? []), auto]);
  }

  if (!porUrl.size) {
    console.error("No hay listas de precios para esa marca en data/fichas-tecnicas.tsv");
    process.exit(1);
  }

  const cars = await sanity.fetch<Car[]>(
    `*[_type == "car" && hidden != true && !(_id in path("drafts.**"))]{
      _id, name, "brand": brand->name, basePrice, "versions": versions[]{ ... }
    }`
  );

  console.log(`\n${porUrl.size} lista(s) de precios · ${porUrl.size} credit(s) de context.dev\n`);

  let credits = 0;
  let cambios: { car: Car; versiones: { nombre: string; de: number | null; a: number }[]; nuevas: { nombre: string; precio: number }[] }[] = [];

  for (const [url, autos] of porUrl) {
    const marca = autos[0].split(" ")[0];
    const r = await parsePdf(url, fresco);
    if ("error" in r) {
      console.log(`  \x1b[31m✗\x1b[0m ${marca.padEnd(12)} ${r.error}`);
      continue;
    }
    credits += r.credits;
    const filas = filasConPrecio(r.markdown);
    console.log(`  \x1b[1m${marca}\x1b[0m — ${filas.length} filas con precio (${r.credits ? `${r.credits} credit` : "cache"})`);

    const deLaMarca = cars.filter((c) => c.brand.toLowerCase() === marca.toLowerCase());

    // Cada fila del PDF va al auto MÁS específico que la nombra: "MG4 URBAN EV
    // 43 KWh COM" menciona el modelo "4" y el modelo "4 Urban EV", y es del
    // segundo. Gana el que aporta más tokens.
    const porAuto = new Map<string, { fila: (typeof filas)[number]; resto: string[] }[]>();
    const huerfanas: typeof filas = [];
    for (const f of filas) {
      const tf = tokens(f.etiqueta, [marca.toLowerCase()]);
      let duenio: { c: Car; claves: string[] } | null = null;
      for (const c of deLaMarca) {
        const claves = tokens(c.name);
        if (!claves.length || !claves.every((k) => tf.includes(k))) continue;
        if (!duenio || claves.length > duenio.claves.length) duenio = { c, claves };
      }
      if (!duenio) { huerfanas.push(f); continue; }
      porAuto.set(duenio.c._id, [
        ...(porAuto.get(duenio.c._id) ?? []),
        { fila: f, resto: tf.filter((t) => !duenio!.claves.includes(t)) },
      ]);
    }

    for (const c of deLaMarca) {
      const suyas = porAuto.get(c._id) ?? [];
      if (!suyas.length) continue;
      const clavesAuto = tokens(c.name);

      const versiones: { nombre: string; de: number | null; a: number }[] = [];
      const nuevas: { nombre: string; precio: number }[] = [];

      // Asignación global: se puntean todos los pares fila×versión y se toman
      // de mayor a menor. El desempate por cercanía de precio es lo que
      // distingue "CYBERSTER 77 KHw" (2WD) de su gemela AWD, que comparten
      // todos los tokens comparables.
      const libres = (c.versions ?? []).map((v, i) => ({
        v, i,
        tv: tokens(String(v.name ?? ""), [c.brand.toLowerCase()]).filter((t) => !clavesAuto.includes(t)),
      }));
      const pares = suyas.flatMap((f, fi) =>
        libres.map((l) => ({
          fi, li: l.i, v: l.v, fila: f.fila,
          s: similitud(f.resto, l.tv),
          d: Math.abs((l.v.price ?? 0) - f.fila.lista),
        })),
      ).sort((a, b) => (b.d === 0 ? 1 : 0) - (a.d === 0 ? 1 : 0) || b.s - a.s || a.d - b.d);

      const filaUsada = new Set<number>(), verUsada = new Set<number>();
      // Un auto con una sola versión y una sola fila calza por descarte: es el
      // caso del Marvel R, donde el PDF dice "DLX" y nosotros "AWD".
      const umbral = suyas.length === 1 && libres.length === 1 ? 0 : 0.34;
      for (const par of pares) {
        // Precio idéntico dentro del mismo modelo es evidencia más fuerte que
        // los tokens: el PDF abrevia "STD"/"DLX" donde nosotros escribimos
        // "Standard"/"Deluxe", y esas filas calzan al peso.
        if ((par.s < umbral && par.d !== 0) || filaUsada.has(par.fi) || verUsada.has(par.li)) continue;
        filaUsada.add(par.fi); verUsada.add(par.li);
        if (par.v.price !== par.fila.lista) {
          versiones.push({ nombre: String(par.v.name), de: par.v.price ?? null, a: par.fila.lista });
        }
      }
      suyas.forEach((f, fi) => {
        if (!filaUsada.has(fi)) nuevas.push({ nombre: f.fila.etiqueta, precio: f.fila.lista });
      });

      if (!versiones.length && !nuevas.length) {
        console.log(`      \x1b[32m✓\x1b[0m ${c.name.padEnd(20)} calza con el PDF`);
        continue;
      }
      console.log(`      \x1b[1m▸ ${c.name}\x1b[0m`);
      for (const v of versiones) {
        // Un salto grande casi siempre es un mal emparejamiento, no un cambio
        // de precio real — se marca para que nadie lo aplique a ciegas.
        const salto = v.de ? Math.abs(v.a - v.de) / v.de : 0;
        const marca = salto > 0.25 ? " \x1b[33m⚠ revisar\x1b[0m" : "";
        console.log(`          "${v.nombre}"  ${clp(v.de)} → ${clp(v.a)}${marca}`);
      }
      for (const n of nuevas) console.log(`          \x1b[36m? el PDF lista\x1b[0m "${n.nombre}" ${clp(n.precio)} \x1b[90m(sin calce)\x1b[0m`);
      if (versiones.length) cambios.push({ car: c, versiones, nuevas });
    }

    // Filas que ningún auto del catálogo reclama. Casi siempre es una versión
    // que no tenemos, o un modelo cuyo nombre comercial no coincide con el
    // nuestro ("Forester Híbrido" acá es "2.0i Hybrid AWD CVT ..."). No se
    // puede resolver sola, pero es justo el dato que se venía a buscar.
    if (huerfanas.length) {
      console.log(`      \x1b[90m· ${huerfanas.length} fila(s) sin auto en el catálogo:\x1b[0m`);
      for (const f of huerfanas) console.log(`          \x1b[90m${f.etiqueta} — ${clp(f.lista)}\x1b[0m`);
    }
  }

  console.log(`\n── ${credits} credit(s) usados · ${cambios.length} auto(s) con precios a corregir ──`);

  if (!aplicar || !cambios.length) {
    console.log(aplicar ? "\n  nada que escribir\n" : "\n  (en seco — agregar --aplicar)\n");
    return;
  }

  // Una deriva grande es más veces un mal emparejamiento que una subida real
  // de precio. Se aplica sola solo si alguien ya la miró y pasó --forzar.
  if (!forzar) {
    for (const c of cambios) {
      c.versiones = c.versiones.filter((v) => !v.de || Math.abs(v.a - v.de) / v.de <= MAX_DERIVA);
    }
    const frenados = cambios.filter((c) => !c.versiones.length);
    cambios = cambios.filter((c) => c.versiones.length);
    if (frenados.length) {
      console.log(`  \x1b[33m${frenados.length} auto(s) frenados por deriva >25% — revisar y repetir con --forzar\x1b[0m`);
    }
    if (!cambios.length) { console.log("\n  nada que escribir\n"); return; }
  }

  const ids = cambios.map((c) => c.car._id);
  const previo = await sanity.fetch(`*[_id in $ids]`, { ids });
  const archivo = `.context/respaldo-pdf-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  writeFileSync(archivo, JSON.stringify(previo, null, 2));
  console.log(`  respaldo → ${archivo}`);

  let tx = sanity.transaction();
  for (const c of cambios) {
    const mapa = new Map(c.versiones.map((v) => [v.nombre, v.a]));
    const versions = (c.car.versions ?? []).map((v) => {
      const p = mapa.get(String(v.name));
      return p ? { ...v, price: p } : v;
    });
    const precios = versions.map((v) => v.price).filter((p): p is number => typeof p === "number" && p >= PISO);
    tx = tx.patch(c.car._id, (p) =>
      p.set({ versions, ...(precios.length ? { basePrice: Math.min(...precios) } : {}) }),
    );
  }
  await tx.commit();
  console.log(`\n\x1b[32m✓ ${cambios.length} autos corregidos desde el PDF oficial\x1b[0m\n`);
}

void main();
