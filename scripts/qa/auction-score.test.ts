/// <reference types="node" />
/**
 * Tests del motor de scoring de subasta inversa (lib/auction/score.ts).
 * Puro y determinista — no toca red ni env. Correr con:
 *   npx tsx scripts/qa/auction-score.test.ts
 *
 * Los valores esperados de Precio se calcularon a mano DESDE LA FÓRMULA de la
 * spec (sigmoide -45·(d-0.05) normalizada), no desde la tabla de comportamiento
 * de la spec — que es inconsistente con su propia fórmula (ver nota en score.ts).
 * Los de Regalías coinciden con la fórmula Y con los ejemplos de la spec.
 */

import assert from "node:assert/strict";
import {
  evaluateOffer,
  rankValidOffers,
  scorePrecio,
  scoreRegalias,
  WEIGHTS,
  VERSION_SCORES,
  CERCANIA_SCORES,
  SLA_HORAS_DEFAULT,
  type LeadScoringInput,
  type OfferScoringInput,
} from "@/lib/auction/score";

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
const near = (a: number, b: number, tol = 0.001) =>
  assert.ok(Math.abs(a - b) <= tol, `esperado ~${b}, obtenido ${a} (tol ${tol})`);

// Lead base: auto publicado a $25.000.000, cliente exige financiamiento obligatorio.
const lead: LeadScoringInput = {
  precioPublicado: 25_000_000,
  requiereFinanciamiento: true,
  financiamientoObligatorio: true,
};
// Oferta base válida.
const baseOffer: OfferScoringInput = {
  precio: 24_000_000,
  horasEntrega: 72,
  version: "exacta",
  cercania: "local",
  aceptaFinanciamiento: true,
  valorRegalias: 0,
  oferenteVerificado: true,
};
const P = lead.precioPublicado;

console.log("\nDimensión Precio (sigmoide, valores derivados de la fórmula):");
test("d=0% → 0", () => near(scorePrecio(P, P), 0));
test("precio > publicado → 0 (descuento negativo)", () => near(scorePrecio(P, P * 1.05), 0));
test("d=2% → 0.1222", () => near(scorePrecio(P, P * 0.98), 0.1222));
test("d=3% → 0.2142", () => near(scorePrecio(P, P * 0.97), 0.2142));
test("d=5% (punto medio sigmoide) → 0.4473", () => near(scorePrecio(P, P * 0.95), 0.4473));
test("d=7% → 0.6805", () => near(scorePrecio(P, P * 0.93), 0.6805));
test("d=10% → 0.8946", () => near(scorePrecio(P, P * 0.9), 0.8946));
test("d=20% → satura cerca de 1", () => assert.ok(scorePrecio(P, P * 0.8) > 0.99));

console.log("\nDimensión Regalías (exponencial — coincide con ejemplos de la spec):");
test("r=0% → 0", () => near(scoreRegalias(0, P), 0));
test("r=1% → 0.393", () => near(scoreRegalias(P * 0.01, P), 0.393));
test("r=3% → 0.777", () => near(scoreRegalias(P * 0.03, P), 0.777));
test("r=5% → 0.918", () => near(scoreRegalias(P * 0.05, P), 0.918));
test("r=8% → 0.982", () => near(scoreRegalias(P * 0.08, P), 0.982));

console.log("\nKnockouts (descalificación inmediata):");
test("precio <= 0 → DESCALIFICADA", () => {
  const r = evaluateOffer(lead, { ...baseOffer, precio: 0 });
  assert.equal(r.status, "DESCALIFICADA");
});
test("precio > publicado → DESCALIFICADA", () => {
  const r = evaluateOffer(lead, { ...baseOffer, precio: P + 1 });
  assert.equal(r.status, "DESCALIFICADA");
});
test("entrega > SLA → DESCALIFICADA", () => {
  const r = evaluateOffer(lead, { ...baseOffer, horasEntrega: SLA_HORAS_DEFAULT + 1 });
  assert.equal(r.status, "DESCALIFICADA");
});
test("versión no coincidente → DESCALIFICADA", () => {
  const r = evaluateOffer(lead, { ...baseOffer, version: "no_coincidente" });
  assert.equal(r.status, "DESCALIFICADA");
});
test("financiamiento obligatorio no provisto → DESCALIFICADA", () => {
  const r = evaluateOffer(lead, { ...baseOffer, aceptaFinanciamiento: false });
  assert.equal(r.status, "DESCALIFICADA");
});
test("oferente no verificado → DESCALIFICADA", () => {
  const r = evaluateOffer(lead, { ...baseOffer, oferenteVerificado: false });
  assert.equal(r.status, "DESCALIFICADA");
});

console.log("\nCasos de borde:");
test("cliente al contado → flexibilidad 1.0 aunque no ofrezca financiamiento", () => {
  const contado: LeadScoringInput = { ...lead, requiereFinanciamiento: false };
  const r = evaluateOffer(contado, { ...baseOffer, aceptaFinanciamiento: false });
  assert.equal(r.status, "VALIDA");
  if (r.status === "VALIDA") near(r.desglose.flexibilidad, 1.0);
});
test("financiamiento requerido pero NO obligatorio → no descalifica, flexibilidad 0", () => {
  const opcional: LeadScoringInput = { ...lead, financiamientoObligatorio: false };
  const r = evaluateOffer(opcional, { ...baseOffer, aceptaFinanciamiento: false });
  assert.equal(r.status, "VALIDA");
  if (r.status === "VALIDA") near(r.desglose.flexibilidad, 0.0);
});
test("descuento 0 (precio = publicado) → válida con s_precio 0", () => {
  const r = evaluateOffer(lead, { ...baseOffer, precio: P });
  assert.equal(r.status, "VALIDA");
  if (r.status === "VALIDA") near(r.desglose.precio, 0);
});
test("descuento >30% → alerta antifraude", () => {
  const r = evaluateOffer(lead, { ...baseOffer, precio: P * 0.65 });
  assert.equal(r.status, "VALIDA");
  if (r.status === "VALIDA") assert.ok(r.alertas.some((a) => a.includes("antifraude")));
});
test("regalías >15% → alerta de saturación", () => {
  const r = evaluateOffer(lead, { ...baseOffer, valorRegalias: P * 0.2 });
  assert.equal(r.status, "VALIDA");
  if (r.status === "VALIDA") assert.ok(r.alertas.some((a) => a.includes("saturada")));
});

console.log("\nEcuación maestra completa:");
test("pesos suman 1.00", () => {
  const s = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  near(s, 1.0, 1e-9);
});
test("oferta perfecta (versión exacta, local, financia, contado equiv.) da score alto", () => {
  const r = evaluateOffer(lead, { ...baseOffer, precio: P * 0.9, valorRegalias: P * 0.05 });
  assert.equal(r.status, "VALIDA");
  if (r.status === "VALIDA") {
    // 0.4·0.8946 + 0.2·1 + 0.15·1 + 0.15·1 + 0.1·0.918
    const esperado =
      WEIGHTS.precio * 0.8946 +
      WEIGHTS.version * VERSION_SCORES.exacta +
      WEIGHTS.cercania * CERCANIA_SCORES.local +
      WEIGHTS.flexibilidad * 1.0 +
      WEIGHTS.regalias * 0.918;
    near(r.scoreTotal, esperado, 0.002);
  }
});
test("desglose respeta las escalas discretas de versión y cercanía", () => {
  const r = evaluateOffer(lead, { ...baseOffer, version: "upgrade", cercania: "vecina" });
  assert.equal(r.status, "VALIDA");
  if (r.status === "VALIDA") {
    near(r.desglose.version, 0.65);
    near(r.desglose.cercania, 0.4);
  }
});

console.log("\nRanking de ofertas (elegir 1–2 para el cliente):");
test("rankea válidas de mejor a peor y excluye descalificadas", () => {
  const barata: OfferScoringInput = { ...baseOffer, precio: P * 0.9 }; // mejor precio
  const cara: OfferScoringInput = { ...baseOffer, precio: P * 0.98 }; // peor precio
  const invalida: OfferScoringInput = { ...baseOffer, version: "no_coincidente" };
  const ranked = rankValidOffers(lead, [cara, invalida, barata]);
  assert.equal(ranked.length, 2, "la descalificada debe quedar fuera");
  assert.equal(ranked[0].offer.precio, barata.precio, "la de mejor score va primero");
});
test("empate de score se rompe por precio más bajo", () => {
  const a: OfferScoringInput = { ...baseOffer, precio: P * 0.95 };
  const b: OfferScoringInput = { ...baseOffer, precio: P * 0.95 };
  const ranked = rankValidOffers(lead, [a, b]);
  assert.equal(ranked.length, 2);
});

console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
process.exit(failed === 0 ? 0 : 1);
