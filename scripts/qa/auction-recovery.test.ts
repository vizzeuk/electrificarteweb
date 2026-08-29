/// <reference types="node" />
/**
 * QA del flujo de recuperación. Requiere las migraciones de aceptación y de
 * recuperación (2026-08-30_recuperacion.sql). Llama a la IA. Auto-limpia.
 *   npx tsx --env-file=.env.local scripts/qa/auction-recovery.test.ts
 */

import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import { getSupabaseQA, seedAuctionQA, cleanupAuctionQA } from "./auction-fixtures";
import { POST as evaluatePOST } from "@/app/api/auction/evaluate/route";
import { POST as cerrarPOST } from "@/app/api/auction/cerrar/route";
import { handleClientOfferDecision } from "@/lib/auction/acceptance";
import { handleRecoveryReply, offerRecovery } from "@/lib/auction/recovery";

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
  await cerrarPOST(req({ leadId })); // → 2 enviada_cliente

  console.log("\nCliente rechaza → se ofrece recuperación:");
  const rej = await handleClientOfferDecision(QA_PHONE, "la verdad ninguna me convence");
  check("maneja el rechazo y ofrece buscar otro sin costo", () => {
    assert.equal(rej.handled, true);
    assert.ok(/sin costo|otro auto|reembolsable/i.test(rej.reply ?? ""));
  });
  const { data: leadRow } = await sb.from("leads").select("recuperacion_ofrecida_at").eq("id", leadId).single();
  check("marca recuperacion_ofrecida_at en el lead", () => assert.ok(leadRow!.recuperacion_ofrecida_at));

  console.log("\nCliente nombra otro modelo → se crea lead de recuperación:");
  const rec = await handleRecoveryReply(QA_PHONE, "mejor busquemos un MG4 entonces");
  check("maneja la respuesta y confirma", () => {
    assert.equal(rec.handled, true);
    assert.ok((rec.reply ?? "").length > 20);
  });
  const { data: recLeads } = await sb.from("leads")
    .select("id, origen, recuperacion_count, recuperacion_de, target_model, status")
    .eq("telefono", QA_PHONE).eq("origen", "recuperacion");
  check("existe 1 lead de recuperación, count=1, ligado al original", () => {
    assert.equal(recLeads!.length, 1);
    assert.equal(recLeads![0].recuperacion_count, 1);
    assert.equal(recLeads![0].recuperacion_de, leadId);
    assert.equal(recLeads![0].status, "pagado");
    assert.ok(/mg4/i.test(recLeads![0].target_model ?? ""));
  });

  console.log("\nTope de recuperaciones (anti-abuso):");
  // Con el lead ya en el tope, ofrecer recuperación devuelve devolución (no otra búsqueda).
  await sb.from("leads").update({ recuperacion_count: 2 }).eq("id", leadId);
  const capMsg = await offerRecovery(sb, leadId, "BYD Dolphin");
  check("al tope, offerRecovery responde devolución", () => assert.ok(/devoluci/i.test(capMsg)));
  const { data: chk } = await sb.from("leads").select("recuperacion_ofrecida_at").eq("id", leadId).single();
  check("al tope NO marca recuperacion_ofrecida_at", () => assert.equal(chk!.recuperacion_ofrecida_at, null));

  return sb;
}

(async () => {
  const sb = getSupabaseQA();
  try { await main(); } catch (e) { failed++; console.error("ERR:", (e as Error).message); }
  finally {
    try {
      await cleanupAuctionQA(sb);
      await sb.from("leads").delete().eq("telefono", QA_PHONE); // limpia leads de recuperación
      console.log("\n🧹 Limpieza QA lista.");
    } catch (e) { console.error("cleanup:", (e as Error).message); }
  }
  console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
