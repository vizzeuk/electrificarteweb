/**
 * Saca la versión del NOMBRE DEL MODELO y la deja en el campo de versión.
 *
 *   npx tsx --env-file=.env.local scripts/separar-version-del-nombre.ts
 *   npx tsx --env-file=.env.local scripts/separar-version-del-nombre.ts --aplicar
 *
 * 60 autos tienen el nombre del modelo con la versión pegada: "i5 eDrive40
 * Berlina M Sport" en vez de modelo "i5" + versión "eDrive40 Berlina M Sport".
 * Además de verse mal en el sitio, es lo que hacía fallar el calce de URLs en la
 * Fase 0: ninguna marca pone la versión en la ruta del modelo.
 *
 * NO toca el slug. /auto/<slug> ya está indexado y cambiarlo rompería la URL
 * pública y los enlaces existentes.
 *
 * Es conservador a propósito: solo separa cuando reconoce un designador de
 * versión claro, y nunca corta un nombre de modelo de dos palabras.
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

/**
 * Sufijos de tren motriz que SÍ son parte del nombre comercial del modelo en
 * Chile: "Tiggo 4 HEV" y "Tiggo 7 Pro Max PHEV" son modelos distintos en el
 * catálogo de la marca, no versiones del mismo. Cortarlos fusionaría PDPs que
 * deben seguir separadas.
 */
const TREN_MOTRIZ = /^(hev|phev|mhev|bev|reev|ev|e-?tech|e-?power|idd|dht|dm-?i|híbrido|hibrido|hybrid|eléctrico|electrico|electric|enchufable|plug-?in)$/i;

/**
 * Designadores de versión INEQUÍVOCOS: códigos de tren motriz que ninguna marca
 * usa como nombre de modelo.
 *
 * La lista arrancó mucho más amplia (premium, sport, cross, coupé, plus, pro…) y
 * hubo que angostarla: cortaba "Corolla Cross Híbrido" en "Corolla" — que es OTRO
 * modelo — y dejaba dos autos llamados "Yaris". Con palabras genéricas no se
 * puede distinguir un trim de un nombre de modelo sin conocer la gama.
 */
const DESIGNADOR = /^(edrive\d*|xdrive\d*|sdrive\d*|quattro|4matic|4motion)$/i;

interface Car {
  _id: string;
  name: string;
  brand: string;
  slug: string;
  versions: { _key?: string; name?: string; [k: string]: unknown }[] | null;
}

const norm = (s: string) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Devuelve [modelo, versión] o null si no hay un corte claro. */
function separar(nombre: string): [string, string] | null {
  const t = nombre.trim().split(/\s+/);
  if (t.length < 3) return null;

  // El corte va en el primer designador de versión, pero nunca antes del
  // segundo token: "Q4 Sportback e-tron" tiene modelo "Q4 Sportback".
  for (let i = 1; i < t.length; i++) {
    const tok = t[i].replace(/[^\wáéíóúñÁÉÍÓÚÑ-]/g, "");
    if (TREN_MOTRIZ.test(tok)) return null; // el sufijo es parte del modelo
    if (i >= 1 && DESIGNADOR.test(tok)) {
      const modelo = t.slice(0, i).join(" ");
      const version = t.slice(i).join(" ");
      // Un modelo de una sola letra o número suelto no es un modelo.
      if (modelo.length < 2) return null;
      return [modelo, version];
    }
  }
  return null;
}

async function main(): Promise<void> {
  const cars = await sanity.fetch<Car[]>(
    `*[_type == "car" && hidden != true && !(_id in path("drafts.**"))]
     | order(brand->name asc, name asc) {
      _id, name, "brand": brand->name, "slug": slug.current,
      "versions": versions[]{ ... }
    }`
  );

  const cambios: { car: Car; modelo: string; version: string; renombra?: string }[] = [];
  const saltados: string[] = [];
  const colisiones: string[] = [];

  /** Nombres ya usados por marca — renombrar no puede crear dos autos iguales. */
  const porMarca = new Map<string, Set<string>>();
  for (const c of cars) {
    const set = porMarca.get(c.brand) ?? new Set<string>();
    set.add(norm(c.name));
    porMarca.set(c.brand, set);
  }

  for (const c of cars) {
    if (c.name.trim().split(/\s+/).length < 3) continue;
    const corte = separar(c.name);
    if (!corte) {
      saltados.push(`${c.brand} ${c.name}`);
      continue;
    }
    const [modelo, version] = corte;

    // El nombre nuevo no puede chocar con otro auto de la misma marca: quedarían
    // dos PDPs indistinguibles en los listados y el comparador.
    const usados = porMarca.get(c.brand)!;
    if (usados.has(norm(modelo)) && norm(modelo) !== norm(c.name)) {
      colisiones.push(`${c.brand} ${c.name} → "${modelo}" ya existe en la marca`);
      continue;
    }
    usados.add(norm(modelo));

    // Si hay una única versión que se llama igual que el modelo completo, se la
    // renombra con la parte de versión: era un placeholder, no una versión real.
    const espejo = (c.versions ?? []).find((v) => norm(String(v.name ?? "")) === norm(c.name));
    cambios.push({ car: c, modelo, version, renombra: espejo ? String(espejo.name) : undefined });
  }

  console.log(`\n${cambios.length} autos a separar · ${saltados.length} sin corte claro\n`);
  for (const x of cambios) {
    console.log(`  ${x.car.brand} ${x.car.name}`);
    console.log(`     modelo → "${x.modelo}"   ·   versión → "${x.version}"${x.renombra ? `   (renombra la versión espejo "${x.renombra}")` : ""}`);
  }
  if (colisiones.length) {
    console.log(`\n  \x1b[33mDescartados por colisión de nombre:\x1b[0m`);
    for (const s of colisiones) console.log(`     ${s}`);
  }
  if (saltados.length) {
    console.log(`\n  \x1b[90m${saltados.length} sin corte claro — quedan como están y van a la hoja REVISAR\x1b[0m`);
  }

  if (!aplicar || !cambios.length) {
    console.log(aplicar ? "\n  nada que separar\n" : `\n  (en seco — agregar --aplicar)\n`);
    return;
  }

  const previo = await sanity.fetch(`*[_id in $ids]`, { ids: cambios.map((c) => c.car._id) });
  const archivo = `.context/respaldo-nombres-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  writeFileSync(archivo, JSON.stringify(previo, null, 2));
  console.log(`\n  respaldo → ${archivo}`);

  let tx = sanity.transaction();
  for (const x of cambios) {
    const set: Record<string, unknown> = { name: x.modelo };
    if (x.renombra) {
      set.versions = (x.car.versions ?? []).map((v) =>
        String(v.name) === x.renombra ? { ...v, name: x.version } : v,
      );
    }
    tx = tx.patch(x.car._id, (p) => p.set(set));
  }
  await tx.commit();
  console.log(`\n\x1b[32m✓ ${cambios.length} nombres separados (el slug no se tocó)\x1b[0m\n`);
}

void main();
