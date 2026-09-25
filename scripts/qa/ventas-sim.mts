/// <reference types="node" />
/**
 * Simula el flujo de VENTAS de punta a punta en el n8n real, SIN cobrar: crea la fila pendiente
 * por el mismo webhook que usa el checkout y después dispara el aviso de pago con el formato de
 * Reveniu (evento subscription_payment_succeeded + monto + external_id + header reveniu-secret-key).
 *
 *   npx tsx --env-file=.env.local scripts/qa/ventas-sim.mts --flujo asesoria --email tu@correo --phone "+56 9XXXXXXXX" [--nombre "Tu Nombre"] [--keep]
 *   npx tsx --env-file=.env.local scripts/qa/ventas-sim.mts --flujo vendedor  --email tu@correo --phone "+56 9XXXXXXXX" [--keep]
 *
 * ⚠️ Manda WhatsApp y correos REALES a --phone / --email. Antes, redirigir los avisos a Francisco
 * (n8n-patch-ventas.mjs --francisco-to=…). El secreto de Reveniu se lee del nodo de n8n en el
 * momento; no se imprime ni se guarda. Sin --keep, borra las filas de prueba al final.
 */
import { createClient } from "@supabase/supabase-js";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const FLUJO = arg("flujo"), EMAIL = arg("email"), PHONE = arg("phone"), NOMBRE = arg("nombre") ?? "QA Ventas";
const KEEP = process.argv.includes("--keep");
if (!FLUJO || !EMAIL || !PHONE) { console.error("Faltan --flujo asesoria|vendedor --email --phone"); process.exit(1); }
const { N8N_API_URL: API, N8N_API_KEY: KEY, N8N_WEBHOOK_SECRET: WEB_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const BASE = API!.replace("/api/v1", "") + "/webhook/";
const CENTRAL = "80ByudGuUOy5EkJzQga6g";
const sb = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = (c: boolean, m: string) => { console.log(`  ${c ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${m}`); if (!c) process.exitCode = 1; };

const wf = await (await fetch(`${API}/workflows/${CENTRAL}`, { headers: { "X-N8N-API-KEY": KEY! } })).json();
const ifNode = wf.nodes.find((n: any) => n.name === "External id not null");
const reveniuSecret = ifNode.parameters.conditions.conditions.find((c: any) => String(c.leftValue).includes("reveniu-secret-key"))?.rightValue;
if (!reveniuSecret) throw new Error("No encontré el secreto de Reveniu en el nodo 'External id not null'");

const orderId = `qa-${FLUJO}-${Date.now()}`;
const AMOUNT = FLUJO === "asesoria" ? 4990 : 12990;
const since = new Date().toISOString();
console.log(`\nSimulación ${FLUJO} — orden ${orderId} — $${AMOUNT}\n`);

// 1. Alta pendiente (lo que hace el checkout de la web / el formulario de vendedores)
if (FLUJO === "asesoria") {
  const r = await fetch(BASE + "electrificarte-asesoria", { method: "POST", headers: { "content-type": "application/json", "x-electrificarte-secret": WEB_SECRET! },
    body: JSON.stringify({ orderId, status: "pendiente", type: "advisory", fullName: NOMBRE, email: EMAIL, phone: PHONE, source: "qa-ventas" }) });
  ok(r.ok, `alta pendiente → webhook asesoría HTTP ${r.status}`);
} else {
  const r = await fetch(BASE + "electrificarte-vendors", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ nombre: NOMBRE.split(" ")[0], apellido: NOMBRE.split(" ").slice(1).join(" ") || "QA", rut: "11111111-1", email: EMAIL, telefono: PHONE.replace(/\s/g, ""),
      concesionario: "Punto de venta QA", region: "Región Metropolitana", comuna: "Providencia", marcas: ["BYD", "MG"], descuento: true, orderId, status: "pendiente", source: "qa-ventas" }) });
  ok(r.ok, `alta pendiente → webhook vendedores HTTP ${r.status}`);
}
await sleep(3000);
const table = FLUJO === "asesoria" ? "advisory_payments" : "leads_vendors";
const pre = await sb.from(table).select("*").eq("order_id", orderId).maybeSingle();
ok(!!pre.data, `fila en ${table}: ${pre.data ? (pre.data.status ?? pre.data.estado) : "no está"}${pre.error ? " — " + pre.error.message : ""}`);

// 2. Aviso de pago con el formato de Reveniu
const pay = await fetch(BASE + "electrificarte-pago", { method: "POST", headers: { "content-type": "application/json", "reveniu-secret-key": reveniuSecret },
  body: JSON.stringify({ data: { event: "subscription_payment_succeeded", data: { subscription_external_id: orderId, amount: AMOUNT, currency: "CLP", status: "paid" } } }) });
ok(pay.ok, `aviso de pago (Reveniu simulado) HTTP ${pay.status}`);
await sleep(8000);

const post = await sb.from(table).select("*").eq("order_id", orderId).maybeSingle();
if (FLUJO === "asesoria") {
  ok(post.data?.status === "pagado", `estado tras el pago: ${post.data?.status}`);
  ok(!!post.data?.paid_at, `paid_at: ${post.data?.paid_at ?? "vacío"}`);
} else {
  ok(post.data?.estado === "pagado", `estado tras el pago: ${post.data?.estado}`);
}

// 3. La ejecución del pago en n8n: qué nodos corrieron y si alguno falló
const ex = await (await fetch(`${API}/executions?workflowId=${CENTRAL}&limit=15&includeData=true`, { headers: { "X-N8N-API-KEY": KEY! } })).json();
const mine = (ex.data ?? []).filter((e: any) => e.startedAt >= since).find((e: any) => JSON.stringify(e.data?.resultData?.runData?.["Webhook forms clientes1"]?.[0] ?? "").includes(orderId));
if (!mine) ok(false, "no encontré la ejecución del pago en n8n");
else {
  const run = mine.data.resultData.runData;
  const errs = Object.entries(run).flatMap(([n, rs]: [string, any]) => rs.filter((x: any) => x.error).map((x: any) => `${n}: ${x.error.message}`));
  ok(mine.status === "success", `ejecución ${mine.id}: ${mine.status}${errs.length ? " — " + errs.join(" | ") : ""}`);
  console.log(`  nodos: ${Object.keys(run).join(" → ")}`);
}

if (!KEEP) { await sb.from(table).delete().eq("order_id", orderId); console.log(`\n🧹 fila de prueba borrada (${table})`); }
else console.log(`\n(--keep) la fila de prueba queda en ${table} con order_id ${orderId}`);
