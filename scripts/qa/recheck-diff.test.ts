/// <reference types="node" />
/**
 * Tests del diff del re-check semanal de PDPs (lib/catalog-recheck/diff.ts).
 * Puro y determinista — no toca red ni env. Correr con:
 *   npx tsx scripts/qa/recheck-diff.test.ts
 *
 * Cubre las reglas C7 a C14 del board (docs/FLUJO-PDP-N8N.md §2.4). El valor de
 * estos tests es que las reglas de ruido y plausibilidad son lo único que separa
 * "el flujo avisa de cambios reales" de "el flujo avisa 176 veces por semana".
 */

import assert from "node:assert/strict";
import {
  decide,
  filterVersionsForCar,
  isNoise,
  MAX_AUTO_APPLY_DRIFT,
  MIN_PLAUSIBLE_PRICE,
  normalizeVersionName,
  proposeAutoApply,
} from "@/lib/catalog-recheck/diff";
import { assignSlots, describeSlot, leastLoadedSlot, slotFor, TOTAL_SLOTS } from "@/lib/catalog-recheck/slots";
import { needsBrowserFallback, sanitize } from "@/lib/catalog-recheck/read-source";
import type { CarSnapshot, SourceReport } from "@/lib/catalog-recheck/types";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`      ${(e as Error).message.split("\n")[0]}`);
  }
}

const car = (over: Partial<CarSnapshot> = {}): CarSnapshot => ({
  id: "car-1",
  name: "Ora 03",
  brand: "GWM",
  slug: "gwm-ora-03",
  sourceUrl: "https://www.gwm.cl/vehiculo/ora/ora-03/",
  basePrice: 25_000_000,
  modelYear: 2025,
  versions: [
    { name: "GLX", price: 25_000_000 },
    { name: "GLS AWD", price: 28_000_000 },
  ],
  ...over,
});

const ok = (over: Partial<SourceReport> = {}): SourceReport => ({
  fuente_ok: true,
  modelo_vigente: true,
  precio_base: 25_000_000,
  anio_modelo: 2025,
  versiones: [
    { nombre: "GLX", precio: 25_000_000 },
    { nombre: "GLS AWD", precio: 28_000_000 },
  ],
  evidencia: "Desde $25.000.000",
  nota: null,
  ...over,
});

// ─── Camino feliz ─────────────────────────────────────────────────────────────

test("todo igual → sin_cambios, sin flags, no urge", () => {
  const d = decide(car(), ok());
  assert.equal(d.outcome, "sin_cambios");
  assert.equal(d.findings.length, 0);
  assert.equal(d.flag, "none");
  assert.equal(d.urgent, false);
  assert.equal(d.hide, false);
  assert.equal(d.sourceFailStreak, 0);
});

// ─── C8 · Ruido ───────────────────────────────────────────────────────────────

test("isNoise: el umbral es el mayor entre 1% y $200.000", () => {
  // 1% de 25M = 250.000 → gana sobre el piso de 200.000
  assert.equal(isNoise(25_000_000, 25_240_000), true, "delta 240k < 250k = ruido");
  assert.equal(isNoise(25_000_000, 25_260_000), false, "delta 260k > 250k = hallazgo");
  // 1% de 10M = 100.000 → gana el piso de 200.000
  assert.equal(isNoise(10_000_000, 10_190_000), true, "delta 190k < piso 200k = ruido");
  assert.equal(isNoise(10_000_000, 10_210_000), false, "delta 210k > piso 200k = hallazgo");
});

test("delta de precio base bajo el umbral no genera hallazgo", () => {
  const d = decide(car(), ok({ precio_base: 25_200_000 }));
  assert.equal(d.outcome, "sin_cambios");
  assert.equal(d.findings.length, 0);
});

test("delta de precio de versión bajo el umbral no genera hallazgo", () => {
  const d = decide(
    car(),
    ok({ versiones: [{ nombre: "GLX", precio: 25_100_000 }, { nombre: "GLS AWD", precio: 28_100_000 }] })
  );
  assert.equal(d.outcome, "sin_cambios", `hallazgos: ${JSON.stringify(d.findings)}`);
});

// ─── C9 · Piso de plausibilidad ───────────────────────────────────────────────

test("precio bajo el piso de plausibilidad se descarta, no se reporta como rebaja", () => {
  const d = decide(car(), ok({ precio_base: 151_900 }));
  assert.ok(MIN_PLAUSIBLE_PRICE > 151_900);
  assert.equal(d.outcome, "sin_cambios", "una lectura de $151.900 es un error de lectura, no un precio");
  assert.equal(d.suggestedPrice, undefined);
});

test("precio de versión implausible se descarta", () => {
  const d = decide(car(), ok({ versiones: [{ nombre: "GLX", precio: 250_000 }, { nombre: "GLS AWD", precio: 28_000_000 }] }));
  assert.equal(d.findings.filter((f) => f.kind === "precio_version").length, 0);
});

// ─── R3/C4 · Sin evidencia no hay precio ──────────────────────────────────────

test("precio base sin cita textual se ignora entero", () => {
  const d = decide(car(), ok({ precio_base: 31_000_000, evidencia: null }));
  assert.equal(d.outcome, "sin_cambios", "sin evidencia el modelo no es dueño del precio");
});

// ─── Precio base cambiado ─────────────────────────────────────────────────────

test("oficial más alto que el nuestro: hallazgo registrado pero nada que aplicar", () => {
  // Oficial 31M → sugerido 29,45M. El nuestro (25M) ya está bajo eso.
  const d = decide(car(), ok({ precio_base: 31_000_000 }));
  assert.equal(d.outcome, "cambios");
  const f = d.findings.find((x) => x.kind === "precio_base");
  assert.ok(f, "debe registrar el cambio de precio oficial");
  assert.equal(f!.proposedPrice, 31_000_000);
  assert.equal(d.flag, "none", "no hay acción: ya somos más baratos que el sugerido");
  assert.equal(d.suggestedPrice, undefined);
});

test("oficial más bajo que el nuestro: price_high + precio sugerido 5% bajo el oficial", () => {
  const d = decide(car({ basePrice: 25_000_000 }), ok({ precio_base: 20_000_000 }));
  assert.equal(d.flag, "price_high");
  assert.equal(d.suggestedPrice, 19_000_000, "5% bajo $20.000.000");
});

test("el precio que se compara es el con descuento, no el de lista", () => {
  // Lista 25M pero vendemos a 18M: ya estamos bajo el sugerido (19M) → no hay acción.
  const d = decide(car({ discountPrice: 18_000_000 }), ok({ precio_base: 20_000_000 }));
  assert.equal(d.flag, "none");
  assert.equal(d.suggestedPrice, undefined);
});

// ─── Versiones ────────────────────────────────────────────────────────────────

test("normalizeVersionName ignora mayúsculas, acentos, guiones y espacios", () => {
  assert.equal(normalizeVersionName("GLS AWD"), normalizeVersionName("gls-awd"));
  assert.equal(normalizeVersionName("Premiúm  Plus"), normalizeVersionName("premium plus"));
});

test("cambio tipográfico del nombre de versión NO genera versión nueva ni faltante", () => {
  const d = decide(car(), ok({ versiones: [{ nombre: "glx", precio: 25_000_000 }, { nombre: "GLS-AWD", precio: 28_000_000 }] }));
  assert.equal(d.outcome, "sin_cambios", `hallazgos: ${JSON.stringify(d.findings)}`);
});

test("versión nueva en la fuente", () => {
  const d = decide(
    car(),
    ok({ versiones: [...ok().versiones, { nombre: "GT", precio: 32_000_000 }] })
  );
  const f = d.findings.find((x) => x.kind === "version_nueva");
  assert.ok(f);
  assert.equal(f!.versionName, "GT");
  assert.equal(f!.proposedPrice, 32_000_000);
  assert.equal(d.flag, "version_nueva");
});

test("versión que desapareció se reporta pero NO se borra ni oculta", () => {
  const d = decide(car(), ok({ versiones: [{ nombre: "GLX", precio: 25_000_000 }] }));
  const f = d.findings.find((x) => x.kind === "version_faltante");
  assert.ok(f);
  assert.equal(f!.versionName, "GLS AWD");
  assert.equal(d.hide, false, "una versión menos en la fuente no oculta el auto");
});

// ─── Año de modelo ────────────────────────────────────────────────────────────

test("año más nuevo en la fuente marca needsReextract", () => {
  const d = decide(car(), ok({ anio_modelo: 2026 }));
  assert.equal(d.needsReextract, true);
  assert.equal(d.flag, "anio_nuevo");
  assert.ok(d.findings.some((f) => f.kind === "anio_nuevo"));
});

test("año más viejo en la fuente no hace nada", () => {
  const d = decide(car({ modelYear: 2026 }), ok({ anio_modelo: 2025 }));
  assert.equal(d.needsReextract, false);
  assert.equal(d.outcome, "sin_cambios");
});

// ─── C7 · Descontinuado ───────────────────────────────────────────────────────

test("modelo fuera del catálogo oficial → oculta, avisa al instante", () => {
  const d = decide(car(), ok({ modelo_vigente: false }));
  assert.equal(d.outcome, "descontinuado");
  assert.equal(d.flag, "discontinued");
  assert.equal(d.hide, true);
  assert.equal(d.urgent, true, "ya ocultó algo del sitio: no espera al lunes");
});

// ─── C11 · Fuente caída ───────────────────────────────────────────────────────

test("primera corrida con la fuente caída: cuenta la racha, no avisa, no toca contenido", () => {
  const d = decide(car(), ok({ fuente_ok: false, precio_base: null }));
  assert.equal(d.outcome, "fuente_caida");
  assert.equal(d.sourceFailStreak, 1);
  assert.equal(d.flag, "none");
  assert.equal(d.urgent, false, "un fallo aislado se reintenta en 6 h");
  assert.equal(d.hide, false);
});

test("segunda corrida seguida: fuente_muerta + aviso inmediato", () => {
  const d = decide(car({ sourceFailStreak: 1 }), ok({ fuente_ok: false }));
  assert.equal(d.sourceFailStreak, 2);
  assert.equal(d.flag, "fuente_muerta");
  assert.equal(d.urgent, true, "la revisión de este auto queda detenida hasta que peguen otra URL");
  assert.equal(d.hide, false, "no saber el precio no es saber que el auto no existe");
});

test("la fuente vuelve a responder → la racha se reinicia", () => {
  const d = decide(car({ sourceFailStreak: 3 }), ok());
  assert.equal(d.sourceFailStreak, 0);
});

// ─── C12 · Dedup ──────────────────────────────────────────────────────────────

test("el mismo hallazgo ya registrado no cuenta como nuevo", () => {
  const previo = decide(car(), ok({ precio_base: 20_000_000 }));
  const repetido = decide(car({ catalogFindings: previo.findings }), ok({ precio_base: 20_000_000 }));
  assert.equal(repetido.findings.length, previo.findings.length);
  assert.equal(repetido.hasNewFindings, false, "no se re-avisa lo mismo");
});

test("si el valor cambia otra vez, sí vuelve a avisar", () => {
  const previo = decide(car(), ok({ precio_base: 20_000_000 }));
  const nuevo = decide(car({ catalogFindings: previo.findings }), ok({ precio_base: 21_500_000 }));
  assert.equal(nuevo.hasNewFindings, true);
});

// ─── Severidad del flag ───────────────────────────────────────────────────────

test("con varios hallazgos, el flag es el más grave", () => {
  const d = decide(
    car(),
    ok({
      precio_base: 20_000_000, // price_high
      anio_modelo: 2026,       // anio_nuevo
      versiones: [...ok().versiones, { nombre: "GT", precio: 32_000_000 }], // version_nueva
    })
  );
  assert.equal(d.flag, "price_high", "price_high > version_nueva > anio_nuevo");
  assert.equal(d.findings.length, 3);
});

test("autos sin versions[] ni modelYear no rompen el diff", () => {
  const d = decide(
    car({ versions: undefined, modelYear: undefined }),
    ok({ versiones: [], anio_modelo: null })
  );
  assert.equal(d.outcome, "sin_cambios");
});


// ─── Auto-aplicar precio ──────────────────────────────────────────────────────
// La IA no es dueña del precio: escribe solo cuando TODAS las guardas pasan.

test("auto-aplicar: delta creíble con cita → propone escribir basePrice", () => {
  const d = decide(car(), ok({ precio_base: 27_000_000 }));
  assert.ok(d.autoApply, "delta 8% es creíble");
  assert.equal(d.autoApply!.field, "basePrice");
  assert.equal(d.autoApply!.from, 25_000_000);
  assert.equal(d.autoApply!.to, 27_000_000);
});

test("auto-aplicar: salto sobre el techo del 25% NO se escribe, queda como hallazgo", () => {
  // 25M → 40M es +60%: error de lectura mucho más seguido que cambio de lista.
  const d = decide(car(), ok({ precio_base: 40_000_000 }));
  assert.equal(d.autoApply, undefined);
  assert.ok(d.findings.some((f) => f.kind === "precio_base"), "el hallazgo se registra igual");
});

test("auto-aplicar: nunca deja el precio lista bajo el precio con descuento", () => {
  // Vendemos a 24M. Si la lista oficial baja a 23M, escribirlo mostraría un
  // "descuento" más caro que la lista. Es decisión comercial, no lectura.
  const d = decide(car({ discountPrice: 24_000_000 }), ok({ precio_base: 23_000_000 }));
  assert.equal(d.autoApply, undefined);
});

test("auto-aplicar: sin cita textual no hay nada que aplicar", () => {
  const d = decide(car(), ok({ precio_base: 27_000_000, evidencia: null }));
  assert.equal(d.autoApply, undefined);
});

test("auto-aplicar: un precio implausible no llega ni a proponerse", () => {
  const d = decide(car(), ok({ precio_base: 151_900 }));
  assert.equal(d.autoApply, undefined);
});

test("auto-aplicar: un delta que es ruido no dispara escritura", () => {
  const d = decide(car(), ok({ precio_base: 25_100_000 }));
  assert.equal(d.autoApply, undefined);
});

test("proposeAutoApply: el techo es exactamente 25%", () => {
  assert.ok(proposeAutoApply(car(), 20_000_000, 25_000_000), "+25% justo entra");
  assert.equal(proposeAutoApply(car(), 20_000_000, 25_100_000), undefined, "+25,5% no");
  assert.equal(MAX_AUTO_APPLY_DRIFT, 0.25);
});

test("auto-aplicar: versiones y año NUNCA se aplican solos", () => {
  const d = decide(
    car(),
    ok({ anio_modelo: 2026, versiones: [...ok().versiones, { nombre: "GT", precio: 32_000_000 }] })
  );
  assert.equal(d.autoApply, undefined, "solo basePrice se puede escribir solo");
});

// ─── Fuente compartida por varias PDPs ────────────────────────────────────────
// 9 familias del catálogo real: Porsche Taycan + Taycan 4 Cross Turismo, Volvo
// EX30 + Cross Country, Geely EX5 + E-DMi + EM-i, GWM Ora 03 + Ora 03 GT, etc.

const taycan = (over: Partial<CarSnapshot> = {}): CarSnapshot => ({
  id: "taycan",
  name: "Taycan",
  brand: "Porsche",
  slug: "porsche-taycan",
  sourceUrl: "https://www.porsche.com/chile/models/taycan/",
  basePrice: 90_000_000,
  versions: [{ name: "Taycan", price: 90_000_000 }, { name: "Taycan 4S", price: 110_000_000 }],
  sharedSource: true,
  ...over,
});

const taycanPage = (): SourceReport => ({
  fuente_ok: true,
  modelo_vigente: true,
  precio_base: 90_000_000,
  anio_modelo: null,
  versiones: [
    { nombre: "Taycan", precio: 90_000_000 },
    { nombre: "Taycan 4S", precio: 110_000_000 },
    { nombre: "Taycan 4 Cross Turismo", precio: 120_000_000 },
    { nombre: "Taycan Turbo Cross Turismo", precio: 160_000_000 },
  ],
  evidencia: "Desde $90.000.000",
  nota: null,
});

test("fuente compartida sin reparto: NO reporta versiones nuevas, avisa una vez", () => {
  const d = decide(taycan(), taycanPage());
  assert.equal(d.findings.filter((f) => f.kind === "version_nueva").length, 0,
    "las Cross Turismo son de la PDP hermana, no versiones nuevas");
  assert.equal(d.findings.filter((f) => f.kind === "version_faltante").length, 0);
  assert.equal(d.findings.filter((f) => f.kind === "fuente_compartida").length, 1,
    "un solo aviso, no ~11 hallazgos fantasma por semana");
});

test("fuente compartida: los precios de las versiones que SÍ tenemos se comparan igual", () => {
  const page = taycanPage();
  page.versiones[1].precio = 118_000_000; // la 4S subió
  const d = decide(taycan(), page);
  const f = d.findings.find((x) => x.kind === "precio_version");
  assert.ok(f, "el nombre calza con el nuestro: no hay ambigüedad");
  assert.equal(f!.versionName, "Taycan 4S");
});

test("con reparto declarado (exclude), la detección de versiones vuelve a funcionar", () => {
  const d = decide(taycan({ versionExclude: ["Cross Turismo"] }), taycanPage());
  assert.equal(d.findings.filter((f) => f.kind === "fuente_compartida").length, 0);
  assert.equal(d.findings.filter((f) => f.kind === "version_nueva").length, 0,
    "las Cross Turismo quedaron fuera del alcance de esta PDP");
});

test("con reparto declarado (scope), la PDP hermana solo ve lo suyo", () => {
  const cross = taycan({
    id: "cross", name: "Taycan 4 Cross Turismo",
    versions: [{ name: "Taycan 4 Cross Turismo", price: 120_000_000 }],
    versionScope: ["Cross Turismo"],
  });
  const d = decide(cross, taycanPage());
  const nuevas = d.findings.filter((f) => f.kind === "version_nueva");
  assert.equal(nuevas.length, 1, "solo la Turbo Cross Turismo le falta");
  assert.equal(nuevas[0].versionName, "Taycan Turbo Cross Turismo");
  assert.equal(d.findings.filter((f) => f.kind === "version_faltante").length, 0,
    "las 8 del Taycan base no son 'faltantes' suyas");
});

test("fuente NO compartida sigue detectando versiones como antes", () => {
  const d = decide(car(), ok({ versiones: [...ok().versiones, { nombre: "GT", precio: 32_000_000 }] }));
  assert.equal(d.findings.filter((f) => f.kind === "version_nueva").length, 1);
  assert.equal(d.findings.filter((f) => f.kind === "fuente_compartida").length, 0);
});

test("filterVersionsForCar: exclude gana sobre scope", () => {
  const vs = [{ nombre: "Taycan 4 Cross Turismo", precio: 1 }, { nombre: "Taycan 4S", precio: 2 }];
  const only = filterVersionsForCar({ ...taycan(), versionScope: ["Taycan 4"], versionExclude: ["Cross Turismo"] }, vs);
  assert.deepEqual(only.map((v) => v.nombre), ["Taycan 4S"]);
});

// ─── Los 28 lotes ─────────────────────────────────────────────────────────────

test("slotFor: lunes 09:00 es el lote 0, domingo 23:00 el 27", () => {
  // 2026-09-21 es lunes. Chile en septiembre está en UTC-3 (horario de verano).
  assert.equal(slotFor(new Date("2026-09-21T12:00:00Z")), 0, "lunes 09:00 CLST");
  // Chile en septiembre está en UTC-3, así que domingo 23:00 local es lunes 02:00 UTC.
  assert.equal(slotFor(new Date("2026-09-28T02:00:00Z")), 27, "domingo 23:00 CLST");
  assert.equal(TOTAL_SLOTS, 28);
});

test("slotFor: las 4 corridas del día caen en lotes consecutivos", () => {
  const base = "2026-09-22"; // martes
  const slots = ["12:00", "18:00", "22:00"].map((h) => slotFor(new Date(`${base}T${h}:00Z`)));
  assert.deepEqual(slots, [4, 5, 6], "martes 09:00 / 15:00 / 19:00");
  assert.equal(slotFor(new Date("2026-09-23T02:00:00Z")), 7, "martes 23:00");
});

test("slotFor: una corrida de las 23:00 que se atrasa a las 00:20 NO cambia de lote", () => {
  // Sin el ajuste caería en el lote 0 del día nuevo y revisaría el lote equivocado.
  const atrasada = slotFor(new Date("2026-09-22T03:20:00Z")); // martes 00:20 CLST
  assert.equal(atrasada, 3, "sigue siendo el lote del lunes 23:00, no el del martes 09:00");
});

test("describeSlot: se puede explicar en palabras", () => {
  assert.equal(describeSlot(0), "lunes a las 09:00");
  assert.equal(describeSlot(5), "martes a las 15:00");
  assert.equal(describeSlot(27), "domingo a las 23:00");
  assert.equal(describeSlot(99), "sin lote asignado");
});

test("leastLoadedSlot: elige el menos cargado, no round-robin ciego", () => {
  const counts: Record<number, number> = {};
  for (let i = 0; i < TOTAL_SLOTS; i++) counts[i] = 7;
  counts[13] = 2;
  assert.equal(leastLoadedSlot(counts), 13, "así se rebalancea solo al borrar autos");
});

test("assignSlots: reparte una tanda sin apilar todo en el mismo lote", () => {
  const counts: Record<number, number> = {};
  const pairs = assignSlots(["a", "b", "c", "d"], counts);
  assert.equal(new Set(pairs.map((p) => p.checkSlot)).size, 4, "4 autos → 4 lotes distintos");
});

test("assignSlots: respeta la carga previa", () => {
  const counts: Record<number, number> = {};
  for (let i = 0; i < TOTAL_SLOTS; i++) counts[i] = 6;
  counts[20] = 0;
  counts[21] = 0;
  const pairs = assignSlots(["x", "y"], counts);
  assert.deepEqual(pairs.map((p) => p.checkSlot), [20, 21]);
});


// ─── Cuándo se gasta un credit de Firecrawl ───────────────────────────────────
// El free tier son 1.000 credits/mes y una lectura cacheada igual cuesta 1. El
// gatillo tiene que ser angosto o el tier no alcanza.

test("fallback: la página cargó bien y no hay precio → sí (precio pintado por JS)", () => {
  assert.equal(needsBrowserFallback(ok({ precio_base: null })), true);
});

test("fallback: la fuente no respondió → NO (el problema es la URL, no el navegador)", () => {
  assert.equal(needsBrowserFallback(ok({ fuente_ok: false, precio_base: null })), false,
    "ahí corresponde pedir otra URL, no gastar un credit");
});

test("fallback: el modelo salió del catálogo → NO (no hay precio que buscar)", () => {
  assert.equal(needsBrowserFallback(ok({ modelo_vigente: false, precio_base: null })), false);
});

test("fallback: ya hay precio → NO", () => {
  assert.equal(needsBrowserFallback(ok()), false);
});

// ─── Normalización de la salida del modelo ────────────────────────────────────

test("sanitize: precios con puntos de mil se convierten a número", () => {
  const r = sanitize({ precio_base: "$25.990.000", versiones: [{ nombre: "GLX", precio: "27.490.000" }] });
  assert.equal(r.precio_base, 25_990_000);
  assert.equal(r.versiones[0].precio, 27_490_000);
});

test("sanitize: ante la duda, el modelo queda vigente", () => {
  // Ocultar un auto del sitio por una lectura ambigua es peor que dejar un
  // descontinuado una semana más.
  assert.equal(sanitize({}).modelo_vigente, true);
  assert.equal(sanitize({ modelo_vigente: null }).modelo_vigente, true);
  assert.equal(sanitize({ modelo_vigente: false }).modelo_vigente, false);
});

test("sanitize: un año imposible se descarta", () => {
  assert.equal(sanitize({ anio_modelo: 25 }).anio_modelo, null);
  assert.equal(sanitize({ anio_modelo: 2026 }).anio_modelo, 2026);
});

test("sanitize: versiones sin nombre se descartan, no rompen", () => {
  const r = sanitize({ versiones: [{ precio: 1 }, { nombre: "  " }, { nombre: "GT", precio: null }] });
  assert.deepEqual(r.versiones, [{ nombre: "GT", precio: null }]);
});

test("sanitize: precios negativos o cero quedan en null", () => {
  assert.equal(sanitize({ precio_base: -5 }).precio_base, null);
  assert.equal(sanitize({ precio_base: 0 }).precio_base, null);
});

console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
process.exit(failed === 0 ? 0 : 1);
