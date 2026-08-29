/// <reference types="node" />
/**
 * QA automático del endpoint POST /api/auction/evaluate.
 * Invoca el handler directamente (sin server), con pujas en estado 'pendiente'
 * como las crearía el dashboard. Verifica auth, evaluación, knockout, ranking y
 * persistencia. Auto-limpia. NO llama a la IA.
 *
 *   npx tsx --env-file=.env.local scripts/qa/auction-endpoint.test.ts
 */

import assert from "node:assert/strict";
import type { NextRequest } from "next/server";
import { getSupabaseQA, seedAuctionQA, cleanupAuctionQA } from "./auction-fixtures";
import { POST } from "@/app/api/auction/evaluate/route";
import { POST as matchPOST } from "@/app/api/auction/match/route";

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

function req(secret: string | null, body: unknown): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret !== null) headers["x-admin-secret"] = secret;
  return new Request("http://localhost/api/auction/evaluate", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

async function main() {
  const secret = process.env.ADMIN_API_SECRET!;
  const sb = getSupabaseQA();
  const { leadId, seeds } = await seedAuctionQA(sb);

  // Insertar pujas en estado 'pendiente' (como el dashboard), sin score, sin
  // cercania_zona ni precio_publicado (para probar que el endpoint los resuelve).
  const byNombre = (n: string) => seeds.find((s) => s.nombre === n)!;
  const pending = [
    { v: byNombre("BYD Providencia"), precio: 17_090_500, version: "exacta", horas: 48 },
    { v: byNombre("BYD Temuco"), precio: 16_730_700, version: "exacta", horas: 90 },
    { v: byNombre("BYD Viña"), precio: 17_450_300, version: "variacion_menor", horas: 60 },
    { v: byNombre("Tesla Las Condes"), precio: 16_900_000, version: "no_coincidente", horas: 50 },
  ];
  for (const p of pending) {
    const { error } = await sb.from("ofertas").insert({
      lead_id: leadId, vendor_id: p.v.id, precio_oferta: p.precio, horas_entrega: p.horas,
      version_match: p.version, acepta_financiamiento: true, valor_regalias: 0,
      marca_ofertada: p.v.puja.marcaOfertada, modelo_ofertado: p.v.puja.modeloOfertado, estado: "pendiente",
    });
    if (error) throw new Error(`insert pending ${p.v.nombre}: ${error.message}`);
  }

  console.log("\nRuteo vía endpoint (/api/auction/match):");
  const matchRes = await matchPOST(req(secret, { leadId }));
  check("200 OK", () => assert.equal(matchRes.status, 200));
  const matchJson = await matchRes.json();
  check("rutea a los 3 vendedores BYD, excluye Tesla", () => {
    assert.equal(matchJson.total, 3);
    const nombres = matchJson.eligible.map((e: { nombre: string }) => e.nombre).sort();
    assert.deepEqual(nombres, ["BYD Providencia", "BYD Temuco", "BYD Viña"]);
  });
  check("cada elegible trae contacto (telefono/email) para notificar", () => {
    for (const e of matchJson.eligible) assert.ok(e.telefono || e.email, "sin contacto");
  });

  console.log("\nAuth:");
  const noAuth = await POST(req(null, { leadId }));
  check("sin secret → 401", () => assert.equal(noAuth.status, 401));
  const badAuth = await POST(req("incorrecto", { leadId }));
  check("secret incorrecto → 401", () => assert.equal(badAuth.status, 401));

  console.log("\nEvaluación vía endpoint:");
  const res = await POST(req(secret, { leadId }));
  check("200 OK", () => assert.equal(res.status, 200));
  const json = await res.json();
  check("resolvió P_publicado desde Sanity", () => assert.ok(json.precioPublicado > 0));
  check("evaluó las 4 pujas", () => assert.equal(json.evaluated.length, 4));
  check("la puja Tesla (no_coincidente) queda descalificada", () => {
    const tesla = json.evaluated.find(
      (e: { offerId: string; descalificada: boolean }) =>
        !json.ranking.includes(e.offerId) && e.descalificada,
    );
    assert.ok(tesla, "debía haber una descalificada");
  });
  check("ranking tiene 3 válidas, ordenadas por score", () => {
    assert.equal(json.ranking.length, 3);
  });

  console.log("\nPersistencia:");
  const { data: rows } = await sb
    .from("ofertas")
    .select("version_match, estado, score_total, cercania_zona, precio_publicado")
    .eq("lead_id", leadId);
  check("las válidas quedan 'evaluada' con score y cercanía resuelta", () => {
    const validas = (rows ?? []).filter((r) => r.version_match !== "no_coincidente");
    assert.equal(validas.length, 3);
    for (const r of validas) {
      assert.equal(r.estado, "evaluada");
      assert.ok(typeof r.score_total === "number");
      assert.ok(r.cercania_zona, "cercanía no resuelta");
      assert.ok(r.precio_publicado > 0, "precio_publicado no resuelto");
    }
  });
  check("la Tesla queda 'perdida'", () => {
    const tesla = (rows ?? []).find((r) => r.version_match === "no_coincidente")!;
    assert.equal(tesla.estado, "perdida");
  });

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
