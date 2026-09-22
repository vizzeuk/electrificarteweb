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
      "id": _id, name, "brand": brand->name, hidden, basePrice, discountPrice
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
