// Sincroniza los tramos de WAITLIST y RESEÑAS del repo (n8n/waitlist.json, n8n/reviews.json)
// dentro del workflow central de n8n, vía la API pública. El repo es la fuente de verdad.
//
//   node --env-file=.env.local scripts/n8n-sync-central.mjs [--dry-run]
//        [--francisco-to=correo@x.com]   redirige los avisos internos (para evals)
//        [--header-auth=<credentialId>]  activa Header Auth en los dos webhooks
//
// Qué hace: respalda el workflow en n8n/.backups/ (gitignored: trae secretos de otros nodos),
// saca los nodos viejos de esos dos tramos, mete los generados en la misma posición del
// canvas, reusa las credenciales vivas (Supabase, Resend) y el webhookId (la URL no cambia),
// valida que todas las conexiones apunten a nodos existentes y recién ahí hace el PUT.
// Correr antes: node scripts/gen-emails.mjs && node scripts/gen-waitlist-reviews-workflows.mjs
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CENTRAL = "80ByudGuUOy5EkJzQga6g"; // hoy se llama "Reseñas UGC (captura + correos)" pero tiene todos los webhooks
const FRANCISCO = "francisco@electrificarte.com";
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}`))?.split("=")[1] ?? (process.argv.includes(`--${k}`) ? true : undefined);
const DRY = !!arg("dry-run");
const FRANCISCO_TO = arg("francisco-to");
const HEADER_AUTH = arg("header-auth");

const { N8N_API_URL, N8N_API_KEY } = process.env;
if (!N8N_API_URL || !N8N_API_KEY) throw new Error("Faltan N8N_API_URL / N8N_API_KEY en .env.local");
const api = async (method, path, body) => {
  const r = await fetch(`${N8N_API_URL}${path}`, {
    method, headers: { "X-N8N-API-KEY": N8N_API_KEY, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
};

const wf = await api("GET", `/workflows/${CENTRAL}`);
mkdirSync("n8n/.backups", { recursive: true });
const backup = `n8n/.backups/central-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(backup, JSON.stringify(wf, null, 2));
console.log(`respaldo: ${backup}`);

const tramos = [
  { file: "n8n/waitlist.json", path: "waitlist", legacy: ["Webhook waitlist1", "Guardar en Supabase1", "¿Datos válidos? (waitlist)", "Correo confirmación (persona)", "Correo nueva inscripción (Francisco)"] },
  { file: "n8n/reviews.json", path: "reviews", legacy: ["Webhook reseñas1", "Guardar reseña (pendiente)1", "¿Datos válidos? (reseña)", "Correo por moderar (Francisco)1", "Correo agradecimiento (autor)1"] },
];

const uuid = (seed) => { const h = createHash("sha1").update(`electrificarte:${seed}`).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const liveCred = (type) => wf.nodes.find((n) => n.credentials?.[type] && (type !== "httpHeaderAuth" || n.parameters?.url === "https://api.resend.com/emails"))?.credentials[type];
const supabaseCred = liveCred("supabaseApi"), resendCred = liveCred("httpHeaderAuth");
if (!supabaseCred || !resendCred) throw new Error("No encontré las credenciales vivas de Supabase / Resend en el workflow");

let nodes = wf.nodes, connections = wf.connections;
for (const t of tramos) {
  const gen = JSON.parse(readFileSync(t.file, "utf8"));
  const liveHook = nodes.find((n) => n.type.endsWith(".webhook") && n.parameters.path === t.path);
  if (!liveHook) throw new Error(`No hay webhook con path "${t.path}" en el workflow central`);
  const genHook = gen.nodes.find((n) => n.type.endsWith(".webhook"));
  const dx = liveHook.position[0] - genHook.position[0], dy = liveHook.position[1] - genHook.position[1];

  const remove = new Set([...t.legacy, liveHook.name, ...gen.nodes.map((n) => n.name)]);
  nodes = nodes.filter((n) => !remove.has(n.name));
  connections = Object.fromEntries(Object.entries(connections)
    .filter(([src]) => !remove.has(src))
    .map(([src, c]) => [src, { ...c, main: (c.main ?? []).map((outs) => (outs ?? []).filter((o) => !remove.has(o.node))) }]));

  for (const g of gen.nodes) {
    const n = { ...g, id: uuid(`${t.path}:${g.name}`), position: [g.position[0] + dx, g.position[1] + dy] };
    if (n.type.endsWith(".webhook")) {
      n.webhookId = liveHook.webhookId;
      if (HEADER_AUTH) n.credentials = { httpHeaderAuth: { id: HEADER_AUTH, name: "Web Electrificarte (x-electrificarte-secret)" } };
      else { n.parameters = { ...n.parameters, authentication: "none" }; delete n.credentials; }
    }
    if (n.type.endsWith(".supabase")) n.credentials = { supabaseApi: supabaseCred };
    if (n.type.endsWith(".httpRequest")) {
      n.credentials = { httpHeaderAuth: resendCred };
      if (FRANCISCO_TO) for (const p of n.parameters.bodyParameters.parameters) if (p.name === "to" && p.value === FRANCISCO) p.value = FRANCISCO_TO;
    }
    delete n.notesInFlow;
    nodes.push(n);
  }
  Object.assign(connections, gen.connections);
}

// Validaciones antes de subir.
const names = nodes.map((n) => n.name);
const dup = names.filter((n, i) => names.indexOf(n) !== i);
if (dup.length) throw new Error(`Nombres de nodo repetidos: ${dup.join(", ")}`);
for (const [src, c] of Object.entries(connections)) {
  if (!names.includes(src)) throw new Error(`Conexión desde un nodo que no existe: ${src}`);
  for (const outs of c.main ?? []) for (const o of outs ?? []) if (!names.includes(o.node)) throw new Error(`Conexión a un nodo que no existe: ${src} → ${o.node}`);
}
const stale = JSON.stringify(nodes).match(/\$\('(Webhook (?:waitlist|reseñas)1)'\)/);
if (stale) throw new Error(`Queda una referencia a un nodo viejo: ${stale[1]}`);

const ALLOWED = ["executionOrder", "errorWorkflow", "callerPolicy", "saveDataErrorExecution", "saveDataSuccessExecution", "saveManualExecutions", "saveExecutionProgress", "executionTimeout", "timezone"];
const settings = Object.fromEntries(Object.entries(wf.settings ?? {}).filter(([k]) => ALLOWED.includes(k)));
console.log(`${wf.nodes.length} → ${nodes.length} nodos | avisos a Francisco → ${FRANCISCO_TO ?? FRANCISCO} | header auth: ${HEADER_AUTH ? "SÍ" : "no"}`);
if (DRY) { console.log("--dry-run: no se subió nada"); process.exit(0); }
const res = await api("PUT", `/workflows/${CENTRAL}`, { name: wf.name, nodes, connections, settings });
console.log(`✓ workflow actualizado (${res.nodes.length} nodos, activo: ${res.active})`);
