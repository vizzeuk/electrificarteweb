/// <reference types="node" />
/**
 * QA NARRATIVO de la subasta inversa (para inspección humana).
 * Siembra datos falsos en Supabase, corre el pipeline e imprime todo, incluidos
 * los mensajes generados por IA.
 *
 *   npx tsx --env-file=.env.local scripts/qa/auction-seed.ts           # siembra + corre
 *   npx tsx --env-file=.env.local scripts/qa/auction-seed.ts --cleanup # borra lo sembrado
 *
 * Para el QA AUTOMÁTICO con asserts, ver auction-e2e.test.ts.
 */

import {
  getSupabaseQA, cleanupAuctionQA, seedAuctionQA, runAuctionPipeline, LEAD_FIXTURE, type VendorSeed,
} from "./auction-fixtures";
import { generateClientComparison, type OfferForMessage } from "@/lib/auction/offer-message";
import { generatePressureMessage } from "@/lib/auction/pressure-message";

const CLP = (n: number) => `$${n.toLocaleString("es-CL")}`;

async function run() {
  const sb = getSupabaseQA();
  const seeded = await seedAuctionQA(sb);
  console.log(`\n✅ Lead falso (id ${seeded.leadId}) + ${seeded.seeds.length} vendedores falsos creados.\n`);

  const { matches, priced, ranked, evaluations } = await runAuctionPipeline(sb, seeded);

  console.log("── RUTEO (a quién le llega el lead) ──");
  for (const m of matches) console.log(`  ${m.elegible ? "✅" : "⛔"} ${m.vendor.nombre} — ${m.motivos.join("; ")}`);

  console.log(`\n── P_publicado ──\n  ${LEAD_FIXTURE.targetModel} → ${priced.matched.brand} ${priced.matched.name}: ${CLP(priced.precioPublicado)} (conf ${priced.confianza})`);

  console.log("\n── EVALUACIÓN DE PUJAS ──");
  for (const e of evaluations) {
    console.log(
      e.result.status === "VALIDA"
        ? `  ✅ ${e.seed.nombre}: ${CLP(e.offer.precio)} · score ${e.result.scoreTotal} · ${e.offer.cercania}${e.result.alertas.length ? ` · ⚠️ ${e.result.alertas.length}` : ""}`
        : `  ⛔ ${e.seed.nombre}: DESCALIFICADA (${e.result.motivo})`,
    );
  }

  // Mensajes (IA) para los top 2
  const bySeed = new Map(evaluations.map((e) => [e.offer, e.seed]));
  const top2 = ranked.slice(0, 2);
  const offersMsg: OfferForMessage[] = top2.map((r) => {
    const s = bySeed.get(r.offer) as VendorSeed;
    return {
      marca: s.puja.marcaOfertada, modelo: s.puja.modeloOfertado, anio: s.puja.anioOfertado,
      precioOferta: r.offer.precio, precioPublicado: priced.precioPublicado, cercania: r.offer.cercania,
      horasEntrega: r.offer.horasEntrega, aceptaFinanciamiento: r.offer.aceptaFinanciamiento,
      valorRegalias: r.offer.valorRegalias, versionMatch: r.offer.version, comunaVendedor: s.comuna,
    };
  });
  console.log("\n── MENSAJE AL CLIENTE (top 2, IA) ──\n");
  console.log(await generateClientComparison({ nombre: "QA Lead", targetModel: LEAD_FIXTURE.targetModel, comuna: LEAD_FIXTURE.comuna, requiereFinanciamiento: true }, offersMsg));

  const precios = evaluations.map((e) => e.offer.precio);
  const vina = evaluations.find((e) => e.seed.nombre === "BYD Viña")!;
  console.log("\n── PRESIÓN AL VENDEDOR (IA, señales reales) ──\n");
  console.log(await generatePressureMessage({
    nombreVendedor: vina.seed.nombre, targetModel: LEAD_FIXTURE.targetModel, vendedoresCompitiendo: evaluations.length,
    mejorPrecioActual: Math.min(...precios), suPrecioActual: vina.offer.precio, horasRestantes: 36,
  }));

  console.log(`\n\n✅ QA narrativo completo. Para borrar: scripts/qa/auction-seed.ts --cleanup\n`);
}

(async () => {
  if (process.argv[2] === "--cleanup") {
    const n = await cleanupAuctionQA(getSupabaseQA());
    console.log(`🧹 Limpieza QA lista (${n} lead(s) + ofertas + vendedores).`);
    return;
  }
  await run();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
