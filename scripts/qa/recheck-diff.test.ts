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
import { decide, isNoise, MIN_PLAUSIBLE_PRICE, normalizeVersionName } from "@/lib/catalog-recheck/diff";
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

console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
process.exit(failed === 0 ? 0 : 1);
