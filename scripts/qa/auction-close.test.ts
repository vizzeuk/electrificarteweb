/// <reference types="node" />
/**
 * QA del ciclo de vida al cerrar: elige ganadora, marca estados, y NO reprocesa
 * (no reenvía). Además bloquea pujas tardías. Llama a la IA (cerrar). Auto-limpia.
 *   npx tsx --env-file=.env.local scripts/qa/auction-close.test.ts
 */

import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import { getSupabaseQA, seedAuctionQA, cleanupAuctionQA } from "./auction-fixtures";
import { POST as evaluatePOST } from "@/app/api/auction/evaluate/route";
import { POST as cerrarPOST } from "@/app/api/auction/cerrar/route";

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
  await evaluatePOST(req({ leadId })); // → evaluada + score

  console.log("\nCierre:");
  const cerrar1 = await (await cerrarPOST(req({ leadId }))).json();
  check("cierra: envía las 2 mejores al cliente (a esperar decisión)", () => {
    assert.equal(cerrar1.yaCerrada, false);
    assert.equal(cerrar1.offerIds.length, 2, "debería enviar las 2 mejores");
    assert.ok(cerrar1.valorReferenciaFmt, "sin valor de referencia para perdedores");
  });

  const { data: rows } = await sb.from("ofertas").select("estado, vendor_id").eq("lead_id", leadId);
  check("2 'enviada_cliente' + 1 'perdida' en la BD (sin ganadora automática)", () => {
    const e = rows!.filter((r) => r.estado === "enviada_cliente").length;
    const p = rows!.filter((r) => r.estado === "perdida").length;
    const g = rows!.filter((r) => r.estado === "ganadora").length;
    assert.equal(e, 2); assert.equal(p, 1); assert.equal(g, 0);
  });
  const { data: leadRow } = await sb.from("leads").select("cerrada_at").eq("id", leadId).single();
  check("el lead queda cerrado (cerrada_at)", () => assert.ok(leadRow!.cerrada_at));

  console.log("\nNo reenvía (dedup que evita mails repetidos):");
  const cerrar2 = await (await cerrarPOST(req({ leadId }))).json();
  check("cerrar de nuevo → yaCerrada:true (no vuelve a notificar)", () => assert.equal(cerrar2.yaCerrada, true));

  console.log("\nPuja tardía (después del cierre):");
  await sb.from("ofertas").insert({
    lead_id: leadId, vendor_id: byd[0].id, precio_oferta: 15_000_000, horas_entrega: 48,
    version_match: "exacta", acepta_financiamiento: true, valor_regalias: 0,
    marca_ofertada: "BYD", modelo_ofertado: "Dolphin", estado: "pendiente",
  });
  const evalTarde = await (await evaluatePOST(req({ leadId }))).json();
  check("evaluate detecta lead cerrado (leadCerrada:true)", () => assert.equal(evalTarde.leadCerrada, true));
  const { data: tardias } = await sb.from("ofertas").select("estado").eq("lead_id", leadId).eq("precio_oferta", 15_000_000);
  check("la puja tardía queda 'expirada', no compite", () => assert.equal(tardias![0].estado, "expirada"));

  return sb;
}

(async () => {
  let sb;
  try { sb = await main(); } catch (e) { failed++; console.error("ERR:", (e as Error).message); }
  finally { try { await cleanupAuctionQA(sb ?? getSupabaseQA()); console.log("\n🧹 Limpieza QA lista."); } catch {} }
  console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
