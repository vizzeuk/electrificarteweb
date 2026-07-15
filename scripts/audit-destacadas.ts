/// <reference types="node" />
/**
 * Auditoría de las STATS DESTACADAS de la PDP.
 *
 * Reporta, por auto, si falta el dato de la stat destacada RELEVANTE para su
 * tipo eléctrico (la que el negocio quiere mostrar: Autonomía / Eficiencia e- /
 * Autón. e- / Rendimiento). El guardrail de presentación ya evita el "—"
 * sustituyendo por otra spec, pero este reporte muestra dónde se está mostrando
 * un sustituto en vez del dato ideal — es decir, la lista de trabajo de datos.
 *
 * Usa la MISMA clasificación que la UI (`classifyElectric` de lib/utils) para
 * que el reporte coincida con lo que realmente se renderiza.
 *
 * Solo REPORTA — no escribe nada. El dato faltante debe completarse con fuente
 * confiable (ficha oficial WLTP del fabricante), nunca con estimaciones calculadas.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/audit-destacadas.ts         # reporte
 *   npx tsx --env-file=.env.local scripts/audit-destacadas.ts --json  # salida JSON procesable
 */

import { createClient } from "@sanity/client";
import { classifyElectric } from "@/lib/utils";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const AS_JSON = process.argv.includes("--json");

type Ver = {
  name?: string;
  range?: number | null;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  batteryCapacity?: number | null;
};
type Car = Ver & {
  _id: string;
  name: string;
  brand: string;
  slug: string;
  tag: string | null;
  versions?: Ver[];
};

// ¿Existe el dato en el auto o en alguna versión? (mismo criterio que el fallback
// version ?? car que hace la PDP).
function present(car: Car, field: keyof Ver): boolean {
  if (car[field] != null && (car[field] as number) !== 0) return true;
  return (car.versions ?? []).some((v) => v[field] != null && (v[field] as number) !== 0);
}
// Campos de la stat destacada RELEVANTE por tipo, en orden de prioridad.
const CRITICAL: Record<"EV" | "PHEV" | "HEV", { field: keyof Ver; label: string }[]> = {
  EV:   [{ field: "range", label: "Autonomía" }, { field: "batteryCapacity", label: "Batería" }, { field: "rendimientoElectrico", label: "Eficiencia e-" }],
  PHEV: [{ field: "electricRangeKm", label: "Autón. e-" }, { field: "rendimientoElectrico", label: "Eficiencia e-" }, { field: "batteryCapacity", label: "Batería" }],
  HEV:  [{ field: "fuelConsumption", label: "Rendimiento" }],
};

async function main() {
  const cars: Car[] = await client.fetch(`
    *[_type == "car"] | order(brand->name asc, name asc) {
      _id, name, "brand": brand->name, "slug": slug.current,
      "tag": electricType->tag,
      batteryCapacity, range, electricRangeKm, fuelConsumption, rendimientoElectrico,
      "versions": versions[]{ name, batteryCapacity, range, electricRangeKm, fuelConsumption, rendimientoElectrico }
    }
  `);

  type Gap = { car: Car; cls: "EV" | "PHEV" | "HEV"; missing: { field: keyof Ver; label: string }[] };
  const gaps: Gap[] = [];

  for (const car of cars) {
    const cls = classifyElectric({
      electricTypeTag: car.tag,
      electricRangeKm: car.electricRangeKm,
      fuelConsumption: car.fuelConsumption,
    });
    const missing = CRITICAL[cls].filter((c) => !present(car, c.field));
    if (missing.length) gaps.push({ car, cls, missing });
  }

  if (AS_JSON) {
    console.log(JSON.stringify(
      gaps.map((g) => ({ slug: g.car.slug, name: `${g.car.brand} ${g.car.name}`, type: g.cls, missing: g.missing.map((m) => m.field) })),
      null, 2,
    ));
    return;
  }

  // Agrupar por campo faltante para dimensionar el hueco.
  const byField = new Map<string, Gap[]>();
  for (const g of gaps) for (const m of g.missing) {
    const k = `${m.label} (${m.field})`;
    (byField.get(k) ?? byField.set(k, []).get(k)!).push(g);
  }

  console.log(`\n📊 Auditoría de stats destacadas — ${cars.length} autos\n` + "─".repeat(78));
  for (const [field, list] of [...byField.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n🔸 ${field} — falta en ${list.length} auto(s):`);
    for (const g of list) console.log(`   [${g.cls}] ${g.car.brand} ${g.car.name}  (${g.car.slug})`);
  }

  console.log("\n" + "─".repeat(78));
  console.log(`\n📋 Resumen: ${gaps.length}/${cars.length} autos con al menos una stat destacada relevante sin dato.`);
  console.log(`   El guardrail de la PDP ya evita el "—" sustituyendo por otra spec real. Esta es la lista`);
  console.log(`   para completar el dato IDEAL con fuente confiable (ficha oficial WLTP del fabricante o`);
  console.log(`   una fila EXACTA del Ministerio para ese mismo modelo). No usar estimaciones calculadas.`);
  console.log(`\n💡 Tip: --json para salida procesable.`);
  console.log();
}

main().catch((err) => { console.error(err); process.exit(1); });
