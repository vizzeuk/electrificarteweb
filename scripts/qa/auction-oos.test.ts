/// <reference types="node" />
/**
 * QA de la captura de respuesta OOS. Requiere migraciones de aceptación + OOS
 * (2026-08-31_oos_resultado.sql). Llama a la IA. Auto-limpia.
 *   npx tsx --env-file=.env.local scripts/qa/auction-oos.test.ts
 */

import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import { getSupabaseQA, seedAuctionQA, cleanupAuctionQA } from "./auction-fixtures";
import { POST as evaluatePOST } from "@/app/api/auction/evaluate/route";
import { POST as cerrarPOST } from "@/app/api/auction/cerrar/route";
import { handleClientOfferDecision } from "@/lib/auction/acceptance";
import { handleOosReply } from "@/lib/auction/oos";

const QA_PHONE = "56900000000";
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
  await cerrarPOST(req({ leadId }));
  await handleClientOfferDecision(QA_PHONE, "me quedo con la 1"); // → 1 aceptada
  // Simula que ya se envió el OOS (normalmente lo hace el cron a las 48h).
  await sb.from("ofertas").update({ oos_at: new Date().toISOString() }).eq("lead_id", leadId).eq("estado", "aceptada");

  console.log("\nOOS respondido SÍ:");
  const si = await handleOosReply(QA_PHONE, "sí, ya la compré, gracias");
  check("registra la venta y agradece", () => {
    assert.equal(si.handled, true);
    assert.ok(/alegra|disfrutes|excelente/i.test(si.reply ?? ""));
  });
  const { data: r1 } = await sb.from("ofertas").select("oos_resultado").eq("lead_id", leadId).eq("estado", "aceptada").single();
  check("oos_resultado = 'si'", () => assert.equal(r1!.oos_resultado, "si"));

  console.log("\nOOS respondido NO → ofrece recuperación:");
  // Reset para el caso 'no'.
  await sb.from("ofertas").update({ oos_resultado: null }).eq("lead_id", leadId).eq("estado", "aceptada");
  const no = await handleOosReply(QA_PHONE, "no, al final no se concretó");
  check("registra 'no' y ofrece buscar otro sin costo", () => {
    assert.equal(no.handled, true);
    assert.ok(/sin costo|otro auto|reembolsable|devoluci/i.test(no.reply ?? ""));
  });
  const { data: r2 } = await sb.from("ofertas").select("oos_resultado").eq("lead_id", leadId).eq("estado", "aceptada").single();
  check("oos_resultado = 'no'", () => assert.equal(r2!.oos_resultado, "no"));
  const { data: leadRow } = await sb.from("leads").select("recuperacion_ofrecida_at").eq("id", leadId).single();
  check("se ofreció recuperación en el lead", () => assert.ok(leadRow!.recuperacion_ofrecida_at));
}

(async () => {
  const sb = getSupabaseQA();
  try { await main(); } catch (e) { failed++; console.error("ERR:", (e as Error).message); }
  finally {
    try { await cleanupAuctionQA(sb); await sb.from("leads").delete().eq("telefono", QA_PHONE); console.log("\n🧹 Limpieza QA lista."); }
    catch (e) { console.error("cleanup:", (e as Error).message); }
  }
  console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
