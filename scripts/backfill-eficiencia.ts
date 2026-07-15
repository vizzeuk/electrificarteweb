/// <reference types="node" />
/**
 * Backfill CURADO de Eficiencia e- (rendimientoElectrico) — valores explícitos
 * por modelo, con fuente WLTP verificada en EV Database (ev-database.org).
 *
 * NO usa matching difuso. Cada valor es km/kWh = 100 / (consumo WLTP combinado
 * en kWh/100km) — la eficiencia energética homologada, misma métrica que los
 * valores oficiales del Ministerio ya cargados en el sitio (rango/batería
 * SOBREESTIMA, sobre todo en PHEV, por eso no se usa).
 *
 * Solo escribe `rendimientoElectrico` (+ correcciones puntuales de datos mal
 * cargados, marcadas explícitamente). Default DRY.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/backfill-eficiencia.ts          # DRY
 *   npx tsx --env-file=.env.local scripts/backfill-eficiencia.ts --write  # escribe
 */

import { createClient } from "@sanity/client";

const WRITE = process.argv.includes("--write");
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

// km/kWh = 100 / consumo WLTP combinado (kWh/100km), fuente EV Database.
// `fix` = correcciones de specs mal cargadas (solo donde el error es claro).
type Entry = { slug: string; eff: number; source: string; note?: string; fix?: Record<string, number> };
const DATA: Entry[] = [
  // ── EV (100% eléctrico) ─────────────────────────────────────────────
  { slug: "porsche-macan-electric",          eff: 5.6, source: "EVdb 17.9 kWh/100km" },
  { slug: "porsche-taycan-sedan",            eff: 5.7, source: "EVdb ~17.6 kWh/100km" },
  { slug: "porsche-cayenne-electric-suv",    eff: 4.8, source: "EVdb 20.7 kWh/100km" },
  { slug: "porsche-cayenne-electric-coupe",  eff: 4.9, source: "EVdb ~20.4 kWh/100km" },
  { slug: "audi-q4-sportback-e-tron",        eff: 5.7, source: "EVdb 17.5 kWh/100km" },
  { slug: "audi-a6-sportback-e-tron",        eff: 6.4, source: "EVdb 15.7 kWh/100km" },
  { slug: "volvo-ex90",                      eff: 4.7, source: "EVdb 21.3 kWh/100km" },
  { slug: "smart-5",                         eff: 5.4, source: "EVdb 18.4 kWh/100km" },
  { slug: "mg-s5-ev",                        eff: 6.0, source: "EVdb 49kWh 3.7 mi/kWh (variante base)" },
  { slug: "suzuki-e-vitara",                 eff: 6.4, source: "EVdb 15.7 kWh/100km", note: "corrige batería top-level 49→61 (ambas versiones son 61 kWh)", fix: { batteryCapacity: 61 } },
  { slug: "leapmotor-b10",                   eff: 5.8, source: "EVdb 17.3 kWh/100km" },
  { slug: "toyota-bz4x",                     eff: 6.1, source: "EVdb ~16.5 kWh/100km", note: "confianza media (variante Chile)" },
  // ── PHEV (eficiencia en modo eléctrico) ─────────────────────────────
  { slug: "porsche-cayenne-e-hybrid",        eff: 5.2, source: "EVdb 19.4 kWh/100km" },
  { slug: "porsche-cayenne-e-hybrid-coupe",  eff: 5.2, source: "EVdb ~19.4 kWh/100km" },
  { slug: "porsche-panamera-4-e-hybrid",     eff: 5.3, source: "EVdb ~19 kWh/100km" },
  { slug: "cupra-formentor-e-hybrid",        eff: 5.7, source: "Cupra oficial ~17.5 kWh/100km", note: "confianza media; revisar batería (Cupra oficial 19.7 kWh vs 25.8 cargado)" },

  // ── Modelos chinos (CLTC/NEDC → confianza media/baja) ───────────────
  // Media: consumo oficial kWh/100km publicado.
  { slug: "changan-cs55-plus-idd", eff: 6.5, source: "Changan/CarNewsChina 15.3 kWh/100km", note: "PHEV, confianza media" },
  { slug: "chery-tiggo-9-phev",    eff: 5.2, source: "CarNewsChina 19.2 kWh/100km",        note: "PHEV, confianza media" },
  { slug: "jetour-t1-phev",        eff: 5.3, source: "CarNewsChina 18.8 kWh/100km",        note: "PHEV, confianza media" },
  { slug: "jaecoo-7-shs",          eff: 5.3, source: "Autocar/Electrifying 18.7 kWh/100km", note: "PHEV, confianza media" },
  { slug: "chery-tiggo-7",         eff: 5.3, source: "plataforma Chery SHS ~18.7 kWh/100km", note: "PHEV, confianza media" },
  // Baja: solo rango CLTC/NEDC ÷ batería, o inferido.
  { slug: "changan-eado-plus-idd", eff: 6.5, source: "inferido del sistema iDD (=CS55)",    note: "PHEV, confianza baja" },
  { slug: "geely-ex5-e-dmi",       eff: 5.5, source: "Geely 105 km / 18.4 kWh",             note: "PHEV, confianza baja" },
  { slug: "geely-ex5-em-i",        eff: 5.5, source: "Geely 105 km / 18.4 kWh",             note: "PHEV, confianza baja" },
  { slug: "souest-s06",            eff: 5.9, source: "Soueast 114 km NEDC / 19.4 kWh",       note: "PHEV, confianza baja" },
  { slug: "chevrolet-captiva-phev", eff: 4.4, source: "Chevrolet 90 km / 20.5 kWh",         note: "PHEV, confianza baja" },
  { slug: "avtr-11",               eff: 7.4, source: "CarNewsChina 13.5 kWh/100km CLTC",     note: "EV, confianza baja (CLTC sobreestima)" },
  { slug: "geely-ex2",             eff: 7.5, source: "Geely CLTC 39.4 kWh",                  note: "EV, confianza baja (CLTC sobreestima)" },
  { slug: "jac-t9",                eff: 3.9, source: "JAC 340 km WLTP / 88 kWh",             note: "EV, confianza baja" },
  { slug: "chevrolet-captiva-ev",  eff: 5.1, source: "Chevrolet 304 km INMETRO / 60 kWh",    note: "EV, confianza baja" },
  { slug: "porsche-taycan-cross-turismo", eff: 5.3, source: "EVdb Taycan Cross Turismo ~19 kWh/100km", note: "EV, confianza media" },
  { slug: "poer-p500",             eff: 3.3, source: "Ministerio (GWM Poer 500 PHEV, mismo vehículo)", note: "PHEV pickup pesado, confianza media" },
];

async function main() {
  console.log(WRITE ? "🚀 MODO ESCRITURA\n" : "🔍 DRY RUN — nada se escribe (usa --write)\n");

  const slugs = DATA.map((d) => d.slug);
  const cars = await client.fetch(
    `*[_type=="car" && slug.current in $slugs]{ _id, "slug": slug.current, name, batteryCapacity, rendimientoElectrico }`,
    { slugs },
  );
  const bySlug = new Map(cars.map((c: any) => [c.slug, c]));

  console.log("Plan (solo rendimientoElectrico salvo 'fix'):\n" + "─".repeat(80));
  const ops: { id: string; patch: Record<string, number>; label: string }[] = [];
  for (const d of DATA) {
    const car: any = bySlug.get(d.slug);
    if (!car) { console.log(`  ⚠️  no encontrado: ${d.slug}`); continue; }
    const patch: Record<string, number> = { rendimientoElectrico: d.eff };
    if (d.fix) Object.assign(patch, d.fix);
    const fixTxt = d.fix ? `  +fix ${JSON.stringify(d.fix)}` : "";
    console.log(`  ${car.name.padEnd(26)} rendimientoElectrico ${car.rendimientoElectrico ?? "∅"} → ${d.eff} km/kWh${fixTxt}`);
    console.log(`      ↳ ${d.source}${d.note ? `  ·  ${d.note}` : ""}`);
    ops.push({ id: car._id, patch, label: car.name });
  }

  console.log("\n" + "─".repeat(80));
  console.log(`${ops.length} autos a actualizar.`);
  if (!WRITE) { console.log("\n(DRY RUN — corre con --write para aplicar.)\n"); return; }

  for (const op of ops) { await client.patch(op.id).set(op.patch).commit(); }
  console.log(`\n✔ Escritos ${ops.length} autos. (ISR revalida en ~60s)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
