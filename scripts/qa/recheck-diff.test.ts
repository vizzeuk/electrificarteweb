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

test("precio lista distinto (arriba o abajo): hallazgo + flag de precio distinto, sin precio sugerido", () => {
  for (const oficial of [31_000_000, 20_000_000]) {
    const d = decide(car(), ok({ precio_base: oficial }));
    assert.equal(d.outcome, "cambios");
    const f = d.findings.find((x) => x.kind === "precio_base");
    assert.equal(f?.proposedPrice, oficial);
    assert.equal(d.flag, "price_high");
    assert.equal(d.suggestedPrice, undefined, "la negociación está apagada: no hay 5% bajo el oficial");
  }
});

test("dos precios: el de financiamiento se compara contra nuestro discountPrice, no contra la lista", () => {
  const d = decide(
    car({ discountPrice: 23_000_000 }),
    ok({ precio_financiamiento: 22_000_000, evidencia_financiamiento: "Con financiamiento $22.000.000" }),
  );
  const f = d.findings.find((x) => x.kind === "precio_financiamiento");
  assert.equal(f?.proposedPrice, 22_000_000);
  assert.deepEqual(d.autoApply.map((a) => [a.field, a.from, a.to]), [["discountPrice", 23_000_000, 22_000_000]]);
});

test("dos precios: la marca empieza a publicar un precio con financiamiento → se agrega", () => {
  const d = decide(car(), ok({ precio_financiamiento: 23_990_000, evidencia_financiamiento: "Precio con bonos $23.990.000" }));
  assert.deepEqual(d.autoApply.map((a) => [a.field, a.from, a.to]), [["discountPrice", null, 23_990_000]]);
});

test("dos precios: un 'segundo precio' igual o mayor que la lista, o sin cita, se descarta", () => {
  assert.equal(decide(car(), ok({ precio_financiamiento: 25_000_000, evidencia_financiamiento: "x" })).autoApply.length, 0);
  assert.equal(decide(car(), ok({ precio_financiamiento: 22_000_000, evidencia_financiamiento: null })).autoApply.length, 0);
});

test("dos precios: si la fuente ya no publica el segundo precio, se avisa pero no se borra", () => {
  const d = decide(car({ discountPrice: 23_000_000 }), ok());
  const f = d.findings.find((x) => x.kind === "precio_financiamiento");
  assert.ok(f && /ya no publica/.test(f.detail));
  assert.equal(d.autoApply.length, 0);
});

test("dos precios: el de financiamiento de una versión se compara con el suyo", () => {
  const d = decide(
    car({ versions: [{ name: "GLX", price: 25_000_000, discountPrice: 24_000_000 }, { name: "GLS AWD", price: 28_000_000 }] }),
    ok({ versiones: [{ nombre: "GLX", precio: 25_000_000, precio_financiamiento: 22_500_000 }, { nombre: "GLS AWD", precio: 28_000_000 }] }),
  );
  const f = d.findings.find((x) => x.kind === "precio_financiamiento" && x.versionName === "GLX");
  assert.equal(f?.proposedPrice, 22_500_000);
  assert.equal(d.autoApply.length, 0, "los precios de versión nunca se aplican solos");
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

test("una fuente que no lista NINGUNA versión no vuelve faltantes a las nuestras", () => {
  // byd.com/cl/sealion-7 es una ficha de características sin precios: reportaba
  // "GL" y "GS" como desaparecidas cuando lo que pasa es que la URL está mal.
  const d = decide(car(), ok({ versiones: [] }));
  assert.equal(d.findings.filter((f) => f.kind === "version_faltante").length, 0);
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
  assert.equal(d.autoApply.length, 1, "delta 8% es creíble");
  assert.equal(d.autoApply[0].field, "basePrice");
  assert.equal(d.autoApply[0].from, 25_000_000);
  assert.equal(d.autoApply[0].to, 27_000_000);
});

test("auto-aplicar: salto sobre el techo del 25% NO se escribe, queda como hallazgo", () => {
  // 25M → 40M es +60%: error de lectura mucho más seguido que cambio de lista.
  const d = decide(car(), ok({ precio_base: 40_000_000 }));
  assert.equal(d.autoApply.length, 0);
  assert.ok(d.findings.some((f) => f.kind === "precio_base"), "el hallazgo se registra igual");
});

test("auto-aplicar: nunca deja el precio lista bajo el precio con bonos/financiamiento", () => {
  // Tenemos 24M con financiamiento. Una lista oficial de 23M mostraría un segundo precio más
  // caro que la lista: es una mala lectura.
  const d = decide(car({ discountPrice: 24_000_000 }), ok({ precio_base: 23_000_000 }));
  assert.equal(d.autoApply.length, 0);
});

test("auto-aplicar: sin cita textual no hay nada que aplicar", () => {
  const d = decide(car(), ok({ precio_base: 27_000_000, evidencia: null }));
  assert.equal(d.autoApply.length, 0);
});

test("auto-aplicar: un precio implausible no llega ni a proponerse", () => {
  const d = decide(car(), ok({ precio_base: 151_900 }));
  assert.equal(d.autoApply.length, 0);
});

test("auto-aplicar: un delta que es ruido no dispara escritura", () => {
  const d = decide(car(), ok({ precio_base: 25_100_000 }));
  assert.equal(d.autoApply.length, 0);
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
  assert.equal(d.autoApply.length, 0, "solo basePrice se puede escribir solo");
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

test("slotFor: el día 1 a las 09:00 es el lote 0, el 28 el 27", () => {
  // Chile en octubre está en horario de verano (UTC-3).
  assert.equal(slotFor(new Date("2026-10-01T12:00:00Z")), 0, "1 de octubre 09:00");
  assert.equal(slotFor(new Date("2026-10-28T12:00:00Z")), 27, "28 de octubre 09:00");
});

test("slotFor: los días 29 a 31 no tienen lote (solo relleno)", () => {
  assert.equal(slotFor(new Date("2026-10-30T12:00:00Z")), -1);
  assert.equal(describeSlot(-1), "sin lote asignado");
});

test("slotFor: una corrida que se atrasa a la madrugada sigue siendo la del día anterior", () => {
  assert.equal(slotFor(new Date("2026-10-13T05:20:00Z")), 11, "13 de octubre 02:20 → lote del día 12");
  assert.equal(slotFor(new Date("2026-11-01T05:00:00Z")), -1, "1 de noviembre 02:00 → 31 de octubre, sin lote");
});

test("describeSlot: se puede explicar en palabras", () => {
  assert.equal(describeSlot(0), "el día 1 de cada mes");
  assert.equal(describeSlot(11), "el día 12 de cada mes");
  assert.equal(describeSlot(27), "el día 28 de cada mes");
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
  assert.equal(needsBrowserFallback(ok({ fuente_ok: false, precio_base: null, nota: "404 Not Found" })), false,
    "ahí corresponde pedir otra URL, no gastar un credit");
});

test("fallback: nos BLOQUEARON → SÍ (el sitio está vivo, el que no pasa es el fetch)", () => {
  // Medido en producción: lexus.cl y mg.cl devuelven "permiso denegado al
  // dominio". Antes caía en fuente_caida y a las 2 corridas pedía otra URL,
  // con la URL perfecta.
  const bloqueada = ok({ fuente_ok: false, precio_base: null, nota: "No se pudo acceder a la página (permiso denegado al dominio)." });
  assert.equal(needsBrowserFallback(bloqueada), true);
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
  assert.deepEqual(r.versiones, [{ nombre: "GT", precio: null, precio_financiamiento: null }]);
});

test("sanitize: precios negativos o cero quedan en null", () => {
  assert.equal(sanitize({ precio_base: -5 }).precio_base, null);
  assert.equal(sanitize({ precio_base: 0 }).precio_base, null);
});

test("dos precios: un 'pie' o una cuota leída como precio con financiamiento no se aplica sola", () => {
  // "Pie desde $6.990.000" en un auto de $25M: tiene cita, es plausible y menor que la lista.
  const d = decide(car(), ok({ precio_financiamiento: 6_990_000, evidencia_financiamiento: "Pie desde $6.990.000" }));
  assert.equal(d.autoApply.length, 0, "bajo el 55% de la lista lo decide una persona");
  assert.ok(d.findings.some((f) => f.kind === "precio_financiamiento"), "el hallazgo queda registrado");
  // Un precio con bonos real (Ora 03: 68% de la lista) sí entra.
  const ora = decide(car({ basePrice: 26_490_000 }), ok({ precio_base: 26_490_000, precio_financiamiento: 17_990_000, evidencia_financiamiento: "Desde: $17.990.000*" }));
  assert.deepEqual(ora.autoApply.map((a) => a.field), ["discountPrice"]);
});

test("IVA: una página '+ IVA' (Poer P500) se compara con IVA incluido y se confirma la cifra escrita", () => {
  const p500 = car({ basePrice: 57_108_100, discountPrice: 46_398_100, versions: [] });
  const d = decide(p500, ok({ precio_base: 47_990_000, precio_financiamiento: 38_990_000, evidencia_financiamiento: "Desde: $38.990.000 + IVA", precios_mas_iva: true, versiones: [] }));
  assert.equal(d.outcome, "sin_cambios", "47.990.000 + IVA = 57.108.100: no es un cambio de precio");
  const sube = decide(p500, ok({ precio_base: 49_990_000, evidencia: "Precio lista $49.990.000 + IVA", precio_financiamiento: 38_990_000, evidencia_financiamiento: "x", precios_mas_iva: true, versiones: [] }));
  const a = sube.autoApply.find((x) => x.field === "basePrice");
  assert.equal(a?.to, 59_488_100, "se escribe con IVA");
  assert.equal(a?.enPagina, 49_990_000, "y se confirma la cifra que está escrita en la página");
});

test("un solo precio reportado como financiamiento (Kia Sorento) se trata como lista", () => {
  const d = decide(car({ basePrice: 43_990_000, versions: [] }), ok({ precio_base: null, evidencia: null, precio_financiamiento: 42_990_000, evidencia_financiamiento: "A partir de $42.990.000 IVA Inc.", versiones: [] }));
  assert.deepEqual(d.autoApply.map((a) => [a.field, a.to]), [["basePrice", 42_990_000]]);
});

console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
process.exit(failed === 0 ? 0 : 1);
