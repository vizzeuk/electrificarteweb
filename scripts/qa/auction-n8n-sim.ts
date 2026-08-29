/// <reference types="node" />
/**
 * Simulación del flujo de n8n contra datos reales, para VER qué recibe cada nodo
 * de notificación (de dónde salen los placeholders). No asierta: imprime.
 *   npx tsx --env-file=.env.local scripts/qa/auction-n8n-sim.ts
 */

import type { NextRequest } from "next/server";
import { getSupabaseQA, seedAuctionQA, cleanupAuctionQA } from "./auction-fixtures";
import { POST as matchPOST } from "@/app/api/auction/match/route";
import { POST as evaluatePOST } from "@/app/api/auction/evaluate/route";
import { POST as pressurePOST } from "@/app/api/auction/message/pressure/route";
import { POST as clientPOST } from "@/app/api/auction/message/client/route";

const CLP = (n: number) => "$" + Number(n).toLocaleString("es-CL");
function req(body: unknown): NextRequest {
  return new Request("http://localhost/x", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-secret": process.env.ADMIN_API_SECRET! },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}
const line = (s = "") => console.log(s);

async function main() {
  const sb = getSupabaseQA();
  const { leadId, seeds } = await seedAuctionQA(sb);
  line(`\n════ WORKFLOW 1: entra el lead ${leadId} (pagó) ════`);

  // Nodo "Match vendedores"
  const match = await (await matchPOST(req({ leadId }))).json();
  line(`\n▸ Nodo "Match vendedores" DEVUELVE (esto es lo que fluye hacia abajo):`);
  line(JSON.stringify({ targetModel: match.targetModel, comuna: match.comuna, eligible: match.eligible }, null, 2));
  line(`\n▸ Tras "Un item por vendedor", el nodo "WhatsApp vendedor" ENVÍA (uno por vendedor):`);
  for (const v of match.eligible) {
    line(`   • to: ${v.telefono}  |  plantilla nuevo_lead_vendedor  {{1}}="${match.targetModel}"  {{2}}="${match.comuna}"`);
  }

  // Simular pujas (como las crearía el dashboard) para el Workflow 2
  const byd = seeds.filter((s) => s.nombre.startsWith("BYD"));
  for (const [i, v] of byd.entries()) {
    await sb.from("ofertas").insert({
      lead_id: leadId, vendor_id: v.id, precio_oferta: [17_090_500, 16_730_700, 17_450_300][i],
      horas_entrega: [48, 90, 60][i], version_match: i === 2 ? "variacion_menor" : "exacta",
      acepta_financiamiento: true, valor_regalias: 0, marca_ofertada: "BYD", modelo_ofertado: "Dolphin", estado: "pendiente",
    });
  }
  const { data: primera } = await sb.from("ofertas").select("id").eq("lead_id", leadId).limit(1).single();

  line(`\n\n════ WORKFLOW 2: llega una puja (offerId ${primera!.id.slice(0, 8)}…) ════`);
  const evalJson = await (await evaluatePOST(req({ leadId }))).json();
  line(`\n▸ Nodo "Evaluar pujas" DEVUELVE: precioPublicado=${CLP(evalJson.precioPublicado)}, ranking de ${evalJson.ranking.length} ofertas.`);

  const pressure = await (await pressurePOST(req({ offerId: primera!.id, horasRestantes: 1 }))).json();
  line(`\n▸ Nodo "Generar presión" DEVUELVE:`);
  line(JSON.stringify({ vendor: pressure.vendor, datos: pressure.datos }, null, 2));
  line(`\n▸ El nodo "WhatsApp presión" ENVÍA:`);
  line(`   • to: ${pressure.vendor.telefono}  |  plantilla mejora_tu_oferta  {{1}}="${pressure.datos.modelo}"  {{2}}="${pressure.datos.vendedoresCompitiendo}"  {{3}}="${CLP(pressure.datos.mejorPrecioActual)}"`);
  line(`▸ El nodo "Correo presión" ENVÍA: to=${pressure.vendor.email}, con el texto de IA completo.`);

  line(`\n\n──── (pasa 1 hora, se re-evalúa) ────`);
  const client = await (await clientPOST(req({ leadId, top: 2 }))).json();
  line(`\n▸ Nodo "Armar ofertas cliente" DEVUELVE:`);
  line(JSON.stringify({ cliente: client.cliente, datos: client.datos, offerIds: client.offerIds }, null, 2));
  line(`\n▸ El nodo "WhatsApp ofertas" ENVÍA:`);
  line(`   • to: ${client.cliente.telefono}  |  plantilla ofertas_listas_cliente  {{1}}="${client.datos.nombre}"  {{2}}="${client.datos.nOfertas}"  {{3}}="${client.datos.modelo}"`);
  line(`▸ El nodo "Correo ofertas" ENVÍA: to=${client.cliente.email}, con este texto de IA:`);
  line(client.message.split("\n").map((l: string) => "     " + l).join("\n"));

  return sb;
}

(async () => {
  let sb;
  try { sb = await main(); }
  catch (e) { console.error("ERR:", (e as Error).message); }
  finally { try { await cleanupAuctionQA(sb ?? getSupabaseQA()); console.log("\n🧹 Limpieza QA lista.\n"); } catch {} }
})();
