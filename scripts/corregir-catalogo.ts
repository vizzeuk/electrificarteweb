/**
 * Aplica las correcciones INEQUÍVOCAS que encontró scripts/auditar-catalogo.ts.
 *
 *   npx tsx --env-file=.env.local scripts/corregir-catalogo.ts            (reporta)
 *   npx tsx --env-file=.env.local scripts/corregir-catalogo.ts --aplicar
 *
 * Solo entra acá lo que se puede arreglar sin consultar la fuente y sin inventar
 * un dato. Todo lo que necesite leer el sitio de la marca (precios que no
 * cuadran, specs copiadas entre versiones) lo resuelve el re-check semanal, que
 * para eso lee la fuente y pide confirmación antes de escribir.
 */

import { createClient } from "@sanity/client";

const aplicar = process.argv.includes("--aplicar");

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const clp = (n?: number | null) => (typeof n === "number" ? `$${n.toLocaleString("es-CL")}` : "—");

interface Car {
  id: string;
  name: string;
  brand: string;
  hidden: boolean | null;
  basePrice: number | null;
  discountPrice: number | null;
  versions: { _key?: string; name?: string; price?: number | null }[] | null;
}

/**
 * Autos a ocultar por decisión explícita de Matías. Van acá y no en una regla
 * automática porque "este auto ya no se vende" es un juicio de negocio, no algo
 * que se deduzca de los datos. `hiddenByCheck` queda en false a propósito: ese
 * flag marca lo que ocultó el re-check solo, y esto lo pidió una persona.
 */
const OCULTAR: Record<string, string> = {
  "BYD Seal":
    "byd.com/cl no lo lista. Además sus 3 versiones están las tres a $47.990.000, así que el precio tampoco es confiable.",
  "Renault E-Kwid":
    "Duplicado de 'Kwid E-TECH': mismas specs (298 km, 26,8 kWh, 65 CV) con otro slug y otro precio. Y renault.cl no lista ningún Kwid.",
  "Ford F-150 Platinum HEV":
    "Duplicado de 'F-150 Híbrida'. ford.cl/hibridos/f-150-hibrida/ lista UNA sola versión (F-150 Platinum FHEV, $81.622.100) y nosotros teníamos dos PDPs de la misma camioneta a $81.027.100 y $76.148.100.",
  "Chery Tiggo 7 Pro PHEV":
    "Duplicado de 'Tiggo 7 Pro Max PHEV'. chery.cl lista UNA sola versión PHEV (1.5 DHT PHEV, $25.990.000); el Tiggo 7 Pro a secas no existe como PHEV en el catálogo chileno.",
  "Suzuki Vitara Hybrid":
    "suzuki.cl/vehiculo/grand-vitara/ redirige a across-hybrid: Suzuki Chile tiene un solo SUV de esa clase, y sus precios son los del doc 'Across Hybrid'. Confirmado por Matías: el real es el Across.",
};

/**
 * Precios que la fuente oficial confirma y que hay que aplicar a mano, porque la
 * pasada automática los saltó: la fuente estaba compartida con la PDP duplicada
 * y la guarda —con razón— no sabe a cuál de las dos atribuir el precio. Al
 * ocultar la duplicada deja de estar compartida y el valor pasa a ser inequívoco.
 */
const PRECIOS: Record<string, { base: number; version?: { de: string; a: number }; fuente: string }> = {
  "Suzuki Across Hybrid": {
    base: 20_190_000,
    fuente: "suzuki.cl/vehiculo/across-hybrid/ — 'Precio Lista $20.190.000' (versión de entrada GL MT)",
  },
  "Ford F-150 Híbrida": {
    base: 81_622_100,
    version: { de: "Doble Cabina 3.5L 4x4 Platinum FHEV", a: 81_622_100 },
    fuente: "ford.cl/hibridos/f-150-hibrida/ — 'F-150 Platinum FHEV $81.622.100'",
  },
  "Chery Tiggo 7 Pro Max PHEV": {
    base: 25_990_000,
    version: { de: "1.5T DHT CSH PHEV", a: 25_990_000 },
    fuente: "chery.cl/tiggo-7-pro-max-phev/ — '1.5 DHT PHEV $25.990.000' (el precio de lista está tachado; $21.990.000 es campaña con bonos)",
  },
};

interface Correccion {
  id: string;
  label: string;
  accion: string;
  motivo: string;
  set?: Record<string, unknown>;
  unset?: string[];
}

async function main(): Promise<void> {
  const cars = await sanity.fetch<Car[]>(
    `*[_type == "car" && !(_id in path("drafts.**"))] | order(brand->name asc, name asc) {
      "id": _id, name, "brand": brand->name, hidden, basePrice, discountPrice,
      "versions": versions[]{ _key, name, price }
    }`
  );

  const correcciones: Correccion[] = [];

  for (const c of cars) {
    const label = `${c.brand} ${c.name}`;

    // ── Ocultar por decisión explícita ──────────────────────────────────────
    if (OCULTAR[label] && c.hidden !== true) {
      correcciones.push({
        id: c.id,
        label,
        accion: "ocultar del sitio (hidden = true)",
        motivo: OCULTAR[label],
        set: { hidden: true, hiddenByCheck: false },
      });
    }

    // ── Precio confirmado contra la fuente ──────────────────────────────────
    const fijo = PRECIOS[label];
    if (fijo && (c.basePrice !== fijo.base || fijo.version)) {
      const set: Record<string, unknown> = { basePrice: fijo.base };
      if (c.basePrice) set.priceCheckPreviousBasePrice = c.basePrice;
      if (fijo.version) {
        set.versions = (c.versions ?? []).map((v) =>
          v.name === fijo.version!.de ? { ...v, price: fijo.version!.a } : v,
        );
      }
      correcciones.push({
        id: c.id,
        label,
        accion: `basePrice ${clp(c.basePrice)} → ${clp(fijo.base)}${fijo.version ? ` y versión "${fijo.version.de}" → ${clp(fijo.version.a)}` : ""}`,
        motivo: fijo.fuente,
        set,
      });
    }

    // ── Descuento que no es descuento ───────────────────────────────────────
    // Igual al precio de lista no es un descuento: es ruido en la PDP. Mayor que
    // el precio de lista es peor — el sitio muestra una "oferta" más cara que la
    // lista. Quitarlo devuelve la PDP a mostrar el precio de lista, que siempre
    // es correcto, y es reversible. No se inventa un valor nuevo.
    if (typeof c.discountPrice === "number" && typeof c.basePrice === "number" && c.discountPrice >= c.basePrice) {
      correcciones.push({
        id: c.id,
        label,
        accion: `quitar discountPrice (${clp(c.discountPrice)})`,
        motivo:
          c.discountPrice > c.basePrice
            ? `es MAYOR que el precio de lista ${clp(c.basePrice)} — la PDP muestra una oferta más cara que la lista`
            : `es IGUAL al precio de lista ${clp(c.basePrice)} — no es un descuento`,
        unset: ["discountPrice"],
      });
    }
  }

  if (!correcciones.length) {
    console.log("\nNada que corregir automáticamente.\n");
    return;
  }

  console.log(`\n${correcciones.length} corrección(es) inequívoca(s):\n`);
  for (const c of correcciones) {
    console.log(`  ${c.label.padEnd(30)} ${c.accion}`);
    console.log(`  ${"".padEnd(30)} \x1b[90m${c.motivo}\x1b[0m`);
  }

  if (!aplicar) {
    console.log(`\n(no se escribió nada — correr con --aplicar)\n`);
    return;
  }

  const tx = correcciones.reduce((t, c) => {
    return t.patch(c.id, (p) => {
      const conSet = c.set ? p.set(c.set) : p;
      return c.unset ? conSet.unset(c.unset) : conSet;
    });
  }, sanity.transaction());
  await tx.commit();
  console.log(`\n\x1b[32m✓ ${correcciones.length} aplicadas\x1b[0m\n`);
}

void main();
