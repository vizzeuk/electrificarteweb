/// <reference types="node" />
/**
 * QA de los endpoints de mensajes (client + pressure). Siembra, evalúa vía el
 * endpoint, y pide los mensajes por HTTP. ⚠️ LLAMA A LA IA (claude-sonnet-5),
 * así que consume tokens — corre bajo demanda, no en cada commit. Auto-limpia.
 *
 *   npx tsx --env-file=.env.local scripts/qa/auction-message-endpoint.test.ts
 */

import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import { getSupabaseQA, seedAuctionQA, cleanupAuctionQA } from "./auction-fixtures";
import { POST as evaluatePOST } from "@/app/api/auction/evaluate/route";
import { POST as clientPOST } from "@/app/api/auction/message/client/route";
import { POST as pressurePOST } from "@/app/api/auction/message/pressure/route";

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
function req(body: unknown): NextRequest {
  return new Request("http://localhost/x", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-secret": process.env.ADMIN_API_SECRET! },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

async function main() {
  const sb = getSupabaseQA();
  const { leadId, seeds } = await seedAuctionQA(sb);

  const byNombre = (n: string) => seeds.find((s) => s.nombre === n)!;
  const pending = [
    { v: byNombre("BYD Providencia"), precio: 17_090_500, version: "exacta", horas: 48 },
    { v: byNombre("BYD Temuco"), precio: 16_730_700, version: "exacta", horas: 90 },
    { v: byNombre("BYD Viña"), precio: 17_450_300, version: "variacion_menor", horas: 60 },
  ];
  for (const p of pending) {
    await sb.from("ofertas").insert({
      lead_id: leadId, vendor_id: p.v.id, precio_oferta: p.precio, horas_entrega: p.horas,
      version_match: p.version, acepta_financiamiento: true, valor_regalias: 0,
      marca_ofertada: "BYD", modelo_ofertado: "Dolphin", estado: "pendiente",
    });
  }

  // Evaluar (deja las ofertas en 'evaluada' con score)
  const evalRes = await evaluatePOST(req({ leadId }));
  const evalJson = await evalRes.json();
  assert.equal(evalRes.status, 200);

  console.log("\nEndpoint mensaje al cliente:");
  const cRes = await clientPOST(req({ leadId, top: 2 }));
  check("200 OK", () => assert.equal(cRes.status, 200));
  const cJson = await cRes.json();
  check("devuelve mensaje no vacío con las 2 mejores ofertas", () => {
    assert.equal(cJson.offerIds.length, 2);
    assert.ok(typeof cJson.message === "string" && cJson.message.length > 30);
    assert.ok(/dolphin/i.test(cJson.message), "el mensaje debería mencionar el modelo");
  });
  check("incluye el contacto del cliente para notificar", () => {
    assert.ok(cJson.cliente && (cJson.cliente.telefono || cJson.cliente.email), "sin contacto de cliente");
  });
  console.log("\n  ┌─ MENSAJE CLIENTE ─\n" + cJson.message.split("\n").map((l: string) => "  │ " + l).join("\n") + "\n  └───");

  console.log("\nEndpoint presión al vendedor:");
  const offerId = evalJson.ranking[evalJson.ranking.length - 1]; // el de peor score, para presionarlo
  const pRes = await pressurePOST(req({ offerId, horasRestantes: 36 }));
  check("200 OK", () => assert.equal(pRes.status, 200));
  const pJson = await pRes.json();
  check("devuelve mensaje de presión no vacío", () => {
    assert.ok(typeof pJson.message === "string" && pJson.message.length > 30);
  });
  check("incluye el contacto del vendedor para notificar", () => {
    assert.ok(pJson.vendor && (pJson.vendor.telefono || pJson.vendor.email), "sin contacto de vendedor");
  });
  console.log("\n  ┌─ MENSAJE PRESIÓN ─\n" + pJson.message.split("\n").map((l: string) => "  │ " + l).join("\n") + "\n  └───");

  console.log("\nAuth:");
  const noAuth = await clientPOST(
    new Request("http://localhost/x", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }) as unknown as NextRequest,
  );
  check("sin secret → 401", () => assert.equal(noAuth.status, 401));

  return sb;
}

(async () => {
  let sb;
  try {
    sb = await main();
  } catch (e) {
    failed++;
    console.error("\n✗ Error inesperado:", (e as Error).message);
  } finally {
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
