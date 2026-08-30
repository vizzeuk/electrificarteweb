/// <reference types="node" />
/**
 * QA del cierre SIN ofertas (nadie pujó). Requiere migraciones de ventana +
 * recuperación. Auto-limpia.
 *   npx tsx --env-file=.env.local scripts/qa/auction-sin-ofertas.test.ts
 */

import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import { getSupabaseQA, seedAuctionQA, cleanupAuctionQA } from "./auction-fixtures";
import { POST as cerrarPOST } from "@/app/api/auction/cerrar/route";

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
  const { leadId } = await seedAuctionQA(sb); // lead + vendedores, PERO sin insertar ofertas

  const res = await cerrarPOST(req({ leadId }));
  const json = await res.json();
  check("responde sinOfertas:true con contacto + mensaje + email", () => {
    assert.equal(json.sinOfertas, true);
    assert.ok(json.cliente?.telefono || json.cliente?.email, "sin contacto");
    assert.ok((json.message ?? "").length > 20, "sin mensaje de recuperación");
    assert.ok((json.htmlEmailSinOfertas ?? "").includes("ELECTRIFICARTE"), "sin html de correo");
  });

  const { data: lead } = await sb.from("leads").select("cerrada_at, recuperacion_ofrecida_at").eq("id", leadId).single();
  check("el lead queda cerrado", () => assert.ok(lead!.cerrada_at));
  check("se le ofreció recuperación al cliente", () => assert.ok(lead!.recuperacion_ofrecida_at));
}

(async () => {
  const sb = getSupabaseQA();
  try { await main(); } catch (e) { failed++; console.error("ERR:", (e as Error).message); }
  finally { try { await cleanupAuctionQA(sb); await sb.from("leads").delete().eq("telefono", QA_PHONE); console.log("\n🧹 Limpieza QA lista."); } catch {} }
  console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
