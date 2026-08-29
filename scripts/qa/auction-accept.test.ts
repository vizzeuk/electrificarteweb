/// <reference types="node" />
/**
 * QA del flujo "cliente acepta". Requiere la migración 2026-08-29_acepta.sql
 * (columna ofertas.aceptada_at). Llama a la IA (cerrar + clasificador). Auto-limpia.
 *   npx tsx --env-file=.env.local scripts/qa/auction-accept.test.ts
 */

import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import { getSupabaseQA, seedAuctionQA, cleanupAuctionQA } from "./auction-fixtures";
import { POST as evaluatePOST } from "@/app/api/auction/evaluate/route";
import { POST as cerrarPOST } from "@/app/api/auction/cerrar/route";
import { handleClientOfferDecision } from "@/lib/auction/acceptance";

let passed = 0, failed = 0;
function check(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.error(`  ✗ ${name}\n      ${(e as Error).message.split("\n")[0]}`); }
}
function req(body: unknown): NextRequest {
  return new Request("http://localhost/x", {
    method: "POST", headers: { "content-type": "application/json", "x-admin-secret": process.env.ADMIN_API_SECRET! },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

async function main() {
  const sb = getSupabaseQA();
  const { leadId, seeds } = await seedAuctionQA(sb);
  const byd = seeds.filter((s) => s.nombre.startsWith("BYD"));
  for (const [i, v] of byd.entries()) {
    await sb.from("ofertas").insert({
      lead_id: leadId, vendor_id: v.id, precio_oferta: [17_090_500, 16_730_700, 17_450_300][i],
      horas_entrega: 48, version_match: "exacta", acepta_financiamiento: true, valor_regalias: 0,
      marca_ofertada: "BYD", modelo_ofertado: "Dolphin", estado: "pendiente",
    });
  }
  await evaluatePOST(req({ leadId }));
  await cerrarPOST(req({ leadId })); // → 2 enviada_cliente + 1 perdida

  console.log("\nMensaje ambiguo:");
  const amb = await handleClientOfferDecision("56900000000", "mmm no sé cuál");
  check("responde pidiendo aclarar (no marca nada)", () => {
    assert.equal(amb.handled, true);
    assert.ok(/cuál|1\)|número/i.test(amb.reply ?? ""));
  });

  console.log("\nCliente elige la 1:");
  const acc = await handleClientOfferDecision("56900000000", "me quedo con la 1 por favor");
  check("maneja la elección y confirma", () => {
    assert.equal(acc.handled, true);
    assert.ok((acc.reply ?? "").length > 20);
  });

  const { data: rows } = await sb.from("ofertas").select("estado, aceptada_at").eq("lead_id", leadId);
  check("queda exactamente 1 'aceptada' con aceptada_at", () => {
    const acept = rows!.filter((r) => r.estado === "aceptada");
    assert.equal(acept.length, 1);
    assert.ok(acept[0].aceptada_at, "sin aceptada_at");
  });
  check("las demás quedan 'perdida' (ninguna sigue esperando)", () => {
    assert.equal(rows!.filter((r) => r.estado === "perdida").length, 2);
    assert.equal(rows!.filter((r) => r.estado === "enviada_cliente").length, 0);
  });

  console.log("\nIdempotencia:");
  const again = await handleClientOfferDecision("56900000000", "la 1");
  check("un segundo mensaje ya no re-acepta (no hay nada esperando)", () => {
    // ya no hay 'enviada_cliente', así que getPendingClientOffers devuelve null → no maneja
    assert.equal(again.handled, false);
  });

  return sb;
}

(async () => {
  let sb;
  try { sb = await main(); } catch (e) { failed++; console.error("ERR:", (e as Error).message); }
  finally { try { await cleanupAuctionQA(sb ?? getSupabaseQA()); console.log("\n🧹 Limpieza QA lista."); } catch {} }
  console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
