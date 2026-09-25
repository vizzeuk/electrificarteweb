// Corrige la rama de PAGOS (webhook electrificarte-pago de Reveniu → Switch por monto) del
// workflow central de n8n. Idempotente: se puede correr varias veces.
//
//   node --env-file=.env.local scripts/n8n-patch-ventas.mjs [--dry-run] [--vendedores] [--francisco-to=x@y]
//
// ASESORÍA ($4.990): Update a row3 marca 'pagado' y ahora también paid_at (el bot cuenta los 10
// días desde ahí). Antes seguía "Get many rows2", que buscaba la orden en la tabla `leads` (la
// de la Oferta): no encontraba nada y el WhatsApp de confirmación nunca salía. Ahora el WhatsApp
// (plantilla + workflow de Kapso) y los correos de asesoría cuelgan directo del update.
// VENDEDORES ($12.990) — solo con --vendedores, requiere la columna leads_vendors.order_id
// (scripts/sql/2026-09-25_leads_vendors_order_id.sql): el alta guarda el orderId y el pago busca
// por él. Antes buscaba el orderId en rut_vendors (que guarda el RUT) con una ruta de datos
// equivocada: ningún vendedor quedaba marcado como pagado.
// Kapso: la API key estaba escrita en texto plano en dos nodos; pasa a una credencial.
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";

const CENTRAL = "80ByudGuUOy5EkJzQga6g";
const FRANCISCO = "francisco@electrificarte.com";
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}`))?.split("=")[1] ?? (process.argv.includes(`--${k}`) ? true : undefined);
const DRY = !!arg("dry-run"), VENDORS = !!arg("vendedores"), FRANCISCO_TO = arg("francisco-to");
const { N8N_API_URL, N8N_API_KEY } = process.env;
const api = async (m, p, b) => {
  const r = await fetch(`${N8N_API_URL}${p}`, { method: m, headers: { "X-N8N-API-KEY": N8N_API_KEY, "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${m} ${p} → ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
};
const uuid = (s) => { const h = createHash("sha1").update(`electrificarte:ventas:${s}`).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const to = (node) => ({ node, type: "main", index: 0 });

const wf = await api("GET", `/workflows/${CENTRAL}`);
mkdirSync("n8n/.backups", { recursive: true });
const backup = `n8n/.backups/central-${new Date().toISOString().replace(/[:.]/g, "-")}-ventas.json`;
writeFileSync(backup, JSON.stringify(wf, null, 2));
console.log(`respaldo: ${backup}`);
let nodes = wf.nodes; const connections = wf.connections;
const node = (name) => nodes.find((n) => n.name === name);
const must = (name) => { const n = node(name); if (!n) throw new Error(`No existe el nodo "${name}"`); return n; };
const resendCred = nodes.find((n) => n.parameters?.url === "https://api.resend.com/emails")?.credentials?.httpHeaderAuth;

// ── Kapso: API key en texto plano → credencial ────────────────────────────────
let kapsoCred = process.env.N8N_KAPSO_CRED;
const kapsoNodes = nodes.filter((n) => String(n.parameters?.url ?? "").startsWith("https://api.kapso.ai/"));
if (!process.env.N8N_HEADER_AUTH_CRED) throw new Error("Falta N8N_HEADER_AUTH_CRED en .env.local");
const plainKey = kapsoNodes.flatMap((n) => n.parameters.headerParameters?.parameters ?? []).find((h) => h.name === "X-API-Key")?.value;
if (plainKey && !kapsoCred && !DRY) {
  const c = await api("POST", "/credentials", { name: "Kapso (X-API-Key)", type: "httpHeaderAuth", data: { name: "X-API-Key", value: plainKey } });
  kapsoCred = c.id;
  appendFileSync(".env.local", `N8N_KAPSO_CRED=${kapsoCred}\n`);
  console.log(`credencial Kapso creada: ${kapsoCred} (guardada en .env.local)`);
}
for (const n of kapsoNodes) {
  if (!kapsoCred) break;
  const hp = n.parameters.headerParameters?.parameters ?? [];
  n.parameters.headerParameters = { parameters: hp.filter((h) => h.name !== "X-API-Key") };
  n.parameters.authentication = "genericCredentialType";
  n.parameters.genericAuthType = "httpHeaderAuth";
  n.credentials = { httpHeaderAuth: { id: kapsoCred, name: "Kapso (X-API-Key)" } };
}

// ── ASESORÍA ──────────────────────────────────────────────────────────────────
const upd3 = must("Update a row3");
const fv = upd3.parameters.fieldsUi.fieldValues;
if (!fv.some((f) => f.fieldId === "paid_at")) fv.push({ fieldId: "paid_at", fieldValue: "={{ $now.toISO() }}" });
// WhatsApp de confirmación: ya no llama a Kapso directo (su API key no puede enviar por el número:
// Meta responde "does not exist or missing permissions"). Lo manda la web, que tiene la key que sí
// funciona: POST /api/whatsapp/asesoria-confirmada con el header secreto de siempre.
const wa = must("HTTP Request1");
wa.parameters = {
  method: "POST",
  url: "https://www.electrificarte.com/api/whatsapp/asesoria-confirmada",
  authentication: "genericCredentialType",
  genericAuthType: "httpHeaderAuth",
  sendBody: true,
  specifyBody: "json",
  jsonBody: '={{ JSON.stringify({ phone: $json.phone, nombre: $json.fullname }) }}',
  options: {},
};
wa.credentials = { httpHeaderAuth: { id: process.env.N8N_HEADER_AUTH_CRED, name: "Web Electrificarte (x-electrificarte-secret)" } };
Object.assign(wa, { retryOnFail: true, maxTries: 3, waitBetweenTries: 3000, notes: "WhatsApp de confirmación vía la web (/api/whatsapp/asesoria-confirmada): plantilla confirmacion_asesoria, y si falla, texto libre." });
const gen = JSON.parse(readFileSync("n8n/asesoria-correos.json", "utf8"));
const asNames = ["Datos correo asesoría", "Correo asesoría confirmada (persona)", "Correo asesoría pagada (Francisco)"];
nodes = nodes.filter((n) => !asNames.includes(n.name) && n.name !== "Get many rows2");
delete connections["Get many rows2"];
const [ux, uy] = upd3.position;
for (const g of gen.nodes.filter((n) => asNames.includes(n.name))) {
  const n = structuredClone(g);
  n.id = uuid(n.name);
  if (n.name === "Datos correo asesoría") {
    // La fila de advisory_payments que devuelve el update: fullname, email, phone, order_id.
    for (const a of n.parameters.assignments.assignments) a.value = { nombre: "={{ $json.fullname }}", email: "={{ $json.email }}", telefono: "={{ $json.phone }}", orderId: "={{ $json.order_id }}" }[a.name];
    n.position = [ux + 260, uy + 120];
  } else {
    n.credentials = { httpHeaderAuth: resendCred };
    n.position = [ux + 520, uy + (n.name.includes("persona") ? 40 : 200)];
    if (FRANCISCO_TO) for (const p of n.parameters.bodyParameters.parameters) if (p.name === "to" && p.value === FRANCISCO) p.value = FRANCISCO_TO;
  }
  nodes.push(n);
}
// "HTTP A WEBHOOK" dispara un flujo de Kapso que ya no tiene trigger por API ("Flow does not have an
// active API trigger"): la conversación de la asesoría hoy la lleva el bot de la web. Se desactiva
// (reversible) para que no falle en cada pago ni mande una alerta a Discord.
Object.assign(must("HTTP A WEBHOOK"), { disabled: true, notes: "Desactivado sep-2026: el flujo de Kapso no tiene trigger por API activo. La conversación la lleva el bot de la web (/api/whatsapp/kapso)." });
// Orden de ejecución (executionOrder v1 = de arriba hacia abajo en el canvas): primero los correos,
// después Kapso. Si el WhatsApp falla, n8n corta la ejecución (y avisa a Discord), pero los correos
// ya salieron. Antes, un error de Kapso dejaba a la persona sin correo.
must("HTTP A WEBHOOK").position = [ux + 260, uy + 380];
must("HTTP Request1").position = [ux + 260, uy + 540];
connections["Update a row3"] = { main: [[to("Datos correo asesoría"), to("HTTP A WEBHOOK"), to("HTTP Request1")]] };
connections["Datos correo asesoría"] = gen.connections["Datos correo asesoría"];

// ── VENDEDORES (requiere leads_vendors.order_id) ─────────────────────────────
if (VENDORS) {
  const alta = must("Create a row1");
  const af = alta.parameters.fieldsUi.fieldValues;
  if (!af.some((f) => f.fieldId === "order_id")) af.push({ fieldId: "order_id", fieldValue: "={{ $json.body.orderId }}" });
  const upd = must("Update a row");
  upd.parameters.filters.conditions = [{ keyName: "order_id", condition: "eq", keyValue: "={{ $json.body.data.data.subscription_external_id }}" }];
  upd.parameters.fieldsUi.fieldValues = [{ fieldId: "estado", fieldValue: "pagado" }];
  // Correos: cuelgan del update (devuelve la fila). Fuera "Get many rows1" (buscaba en `leads`) y
  // los correos viejos, que leían de "Create a row1" (el nodo del ALTA, otra ejecución).
  const vgen = JSON.parse(readFileSync("n8n/vendedores-correos.json", "utf8"));
  const drop = ["Get many rows1", "Correo registro (vendedor)", "Correo nuevo vendedor (Francisco)", ...vgen.nodes.map((n) => n.name)];
  nodes = nodes.filter((n) => !drop.includes(n.name));
  for (const d of drop) delete connections[d];
  const [vx, vy] = upd.position;
  for (const g of vgen.nodes) {
    const n = structuredClone(g);
    n.id = uuid(n.name);
    n.position = [vx + 260 + g.position[0], vy - 300 + g.position[1]];
    if (n.type.endsWith("httpRequest")) {
      n.credentials = { httpHeaderAuth: resendCred };
      if (FRANCISCO_TO) for (const p of n.parameters.bodyParameters.parameters) if (p.name === "to" && p.value === FRANCISCO) p.value = FRANCISCO_TO;
    }
    nodes.push(n);
  }
  connections["Update a row"] = { main: [[to("Datos correo vendedor")]] };
  Object.assign(connections, vgen.connections);
}

// Validación + subida
const names = nodes.map((n) => n.name);
for (const [src, c] of Object.entries(connections)) {
  if (!names.includes(src)) throw new Error(`Conexión desde nodo inexistente: ${src}`);
  for (const outs of c.main ?? []) for (const o of outs ?? []) if (!names.includes(o.node)) throw new Error(`Conexión a nodo inexistente: ${src} → ${o.node}`);
}
if (JSON.stringify(nodes).includes(plainKey ?? "@@nada@@") && kapsoCred) throw new Error("La API key de Kapso sigue en texto plano");
const ALLOWED = ["executionOrder", "errorWorkflow", "callerPolicy", "saveDataErrorExecution", "saveDataSuccessExecution", "saveManualExecutions", "saveExecutionProgress", "executionTimeout", "timezone"];
const settings = Object.fromEntries(Object.entries(wf.settings ?? {}).filter(([k]) => ALLOWED.includes(k)));
console.log(`${wf.nodes.length} → ${nodes.length} nodos | vendedores: ${VENDORS ? "sí" : "no"} | Kapso→credencial: ${kapsoCred ? "sí" : "pendiente"} | avisos a Francisco → ${FRANCISCO_TO ?? FRANCISCO}`);
if (DRY) { console.log("--dry-run: no se subió nada"); process.exit(0); }
const res = await api("PUT", `/workflows/${CENTRAL}`, { name: wf.name, nodes, connections, settings });
console.log(`✓ workflow actualizado (${res.nodes.length} nodos, activo: ${res.active})`);
