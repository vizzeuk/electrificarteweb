/// <reference types="node" />
/**
 * QA AUTOMÁTICO de punta a punta de la subasta inversa (con asserts + auto-limpieza).
 * Hits reales a Supabase (escribe/borra) y Sanity (precio). NO llama a la IA:
 * verifica los HECHOS deterministas (buildOfferFacts), no la redacción.
 *
 *   npx tsx --env-file=.env.local scripts/qa/auction-e2e.test.ts
 *
 * Siembra → asserts → limpia siempre (aunque falle). Exit 0 si todo pasa.
 */

import assert from "node:assert/strict";
import {
  getSupabaseQA, seedAuctionQA, cleanupAuctionQA, runAuctionPipeline,
} from "./auction-fixtures";
import { evaluateOffer } from "@/lib/auction/score";
import { buildOfferFacts } from "@/lib/auction/offer-message";

let passed = 0;
let failed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}\n      ${(e as Error).message.split("\n")[0]}`);
  }
}

async function main() {
  const sb = getSupabaseQA();
  const seeded = await seedAuctionQA(sb);
  const pipe = await runAuctionPipeline(sb, seeded);

  console.log("\nRuteo:");
  const elegibles = pipe.matches.filter((m) => m.elegible).map((m) => m.vendor.nombre);
  check("los 3 vendedores BYD activos son elegibles", () =>
    assert.deepEqual(elegibles.sort(), ["BYD Providencia", "BYD Temuco", "BYD Viña"]));
  check("el vendedor Tesla NO es elegible (marca distinta)", () =>
    assert.ok(!pipe.matches.find((m) => m.vendor.nombre === "Tesla Las Condes")!.elegible));
  check("el elegible más cercano va primero (local)", () => {
    assert.equal(pipe.matches[0].vendor.nombre, "BYD Providencia");
    assert.equal(pipe.matches[0].cercania, "local");
  });

  console.log("\nPrecio publicado:");
  check("P_publicado se resuelve desde Sanity (> 0)", () =>
    assert.ok(pipe.priced.precioPublicado > 0));

  console.log("\nEvaluación:");
  check("las 3 pujas elegibles quedan VÁLIDAS", () =>
    assert.equal(pipe.evaluations.filter((e) => e.result.status === "VALIDA").length, 3));
  check("cada score persistido coincide con recomputar el motor", () => {
    for (const e of pipe.evaluations) {
      const recomputed = evaluateOffer(pipe.leadScoring, e.offer);
      assert.deepEqual(recomputed, e.result, `score inconsistente para ${e.seed.nombre}`);
    }
  });

  console.log("\nPersistencia en Supabase:");
  const { data: rows } = await sb
    .from("ofertas")
    .select("vendor_id,score_total,score_desglose,estado,precio_publicado")
    .eq("lead_id", seeded.leadId);
  check("se escribieron 3 filas en `ofertas`", () => assert.equal(rows?.length, 3));
  check("cada fila persistida tiene score y desglose, estado 'evaluada'", () => {
    for (const r of rows ?? []) {
      assert.ok(typeof r.score_total === "number", "score_total ausente");
      assert.ok(r.score_desglose && typeof r.score_desglose === "object", "desglose ausente");
      assert.equal(r.estado, "evaluada");
    }
  });
  check("el score persistido coincide con el del motor (round-trip DB)", () => {
    for (const e of pipe.evaluations) {
      if (e.result.status !== "VALIDA") continue;
      const row = (rows ?? []).find((r) => r.vendor_id === e.seed.id)!;
      assert.equal(Number(row.score_total), e.result.scoreTotal, `round-trip ${e.seed.nombre}`);
    }
  });

  console.log("\nRanking:");
  check("el ranking está ordenado por score descendente", () => {
    const scores = pipe.ranked.map((r) => r.scoreTotal);
    for (let i = 1; i < scores.length; i++) assert.ok(scores[i - 1] >= scores[i], "ranking desordenado");
  });
  check("la puja más barata NO necesariamente gana (cercanía pesa)", () => {
    // Temuco es la más barata (7%) pero local Providencia (5%) debe ir primero.
    const top = pipe.ranked[0];
    const topSeed = pipe.evaluations.find((e) => e.offer === top.offer)!.seed;
    assert.equal(topSeed.nombre, "BYD Providencia");
  });

  console.log("\nHechos del mensaje (deterministas):");
  check("buildOfferFacts refleja el precio y ahorro correctos", () => {
    const e = pipe.evaluations.find((x) => x.seed.nombre === "BYD Providencia")!;
    const facts = buildOfferFacts({
      marca: "BYD", modelo: "Dolphin", anio: 2025, precioOferta: e.offer.precio,
      precioPublicado: pipe.priced.precioPublicado, cercania: e.offer.cercania, horasEntrega: e.offer.horasEntrega,
      aceptaFinanciamiento: true, valorRegalias: 0, versionMatch: "exacta", comunaVendedor: "Providencia",
    }).join(" | ");
    assert.ok(facts.includes(e.offer.precio.toLocaleString("es-CL")), "no aparece el precio ofertado");
    assert.ok(facts.includes("exactamente el modelo"), "no refleja la coincidencia de versión");
  });

  return sb;
}

(async () => {
  let sb;
  try {
    sb = await main();
  } catch (e) {
    failed++;
    console.error("\n✗ Error inesperado en el pipeline:", (e as Error).message);
  } finally {
    // Auto-limpieza SIEMPRE, aunque algún assert haya fallado.
    try {
      const removed = await cleanupAuctionQA(sb ?? getSupabaseQA());
      console.log(`\n🧹 Limpieza QA lista (${removed} lead(s) + ofertas + vendedores).`);
    } catch (e) {
      console.error("⚠️  No se pudo limpiar:", (e as Error).message);
    }
  }
  console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
