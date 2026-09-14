// Genera n8n/waitlist.json y n8n/reviews.json embebiendo los HTML de emails/ventas/.
// Correr tras editar cualquiera de esos correos:  node scripts/gen-waitlist-reviews-workflows.mjs
import { readFileSync, writeFileSync } from "node:fs";

const html = (f) => readFileSync(`emails/ventas/${f}`, "utf8");

const resend = (id, name, to, subject, file, pos) => ({
  parameters: {
    method: "POST",
    url: "https://api.resend.com/emails",
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth",
    sendBody: true,
    contentType: "json",
    specifyBody: "keypair",
    bodyParameters: {
      parameters: [
        { name: "from", value: "Electrificarte <no-reply@electrificarte.com>" },
        { name: "to", value: to },
        { name: "subject", value: subject },
        { name: "html", value: `=${html(file)}` },
      ],
    },
    options: {},
  },
  id, name,
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: pos,
  credentials: { httpHeaderAuth: { id: "REEMPLAZAR", name: "Resend (Authorization Bearer)" } },
  notes: "Asigná la credencial Resend. El html va en modo expresión (empieza con '=').",
});

const supabase = (id, name, table, fields, pos, notes) => ({
  parameters: {
    operation: "create",
    tableId: table,
    dataToSend: "defineBelow",
    fieldsUi: { fieldValues: fields },
    options: {},
  },
  id, name,
  type: "n8n-nodes-base.supabase",
  typeVersion: 1,
  position: pos,
  credentials: { supabaseApi: { id: "REEMPLAZAR", name: "Supabase (service_role)" } },
  notes,
});

const webhook = (id, name, path, pos, notes) => ({
  parameters: { httpMethod: "POST", path, responseMode: "onReceived", options: {} },
  id, name,
  type: "n8n-nodes-base.webhook",
  typeVersion: 2,
  position: pos,
  webhookId: path,
  notes,
});

const F = "francisco@electrificarte.com";
const B = (k) => `={{ $json.body.${k} }}`;

// ─── WAITLIST ────────────────────────────────────────────────────────────────
const wlNodes = [
  webhook("wl-webhook", "Webhook waitlist", "waitlist", [0, 300],
    "La Production URL de este nodo va en Vercel como N8N_WAITLIST_URL."),
  supabase("wl-supabase", "Guardar en Supabase", "waitlist", [
    { fieldId: "first_name", fieldValue: B("firstName") },
    { fieldId: "last_name",  fieldValue: B("lastName") },
    { fieldId: "email",      fieldValue: B("email") },
    { fieldId: "phone",      fieldValue: B("phone") },
    { fieldId: "model",      fieldValue: B("model") },
    { fieldId: "source",     fieldValue: B("source") },
  ], [260, 300], "Si tu webhook no envuelve el body en 'body', quitá '.body' de las expresiones."),
  resend("wl-mail-cliente", "Correo confirmación (persona)",
    "={{ $('Webhook waitlist').item.json.body.email }}",
    "Ya estás en la waitlist — Electrificarte", "waitlist-confirmacion.html", [540, 180]),
  resend("wl-mail-francisco", "Correo nueva inscripción (Francisco)",
    F, "Nueva persona en la waitlist", "waitlist-francisco.html", [540, 420]),
];
writeFileSync("n8n/waitlist.json", JSON.stringify({
  name: "Waitlist (captación + correos)",
  nodes: wlNodes,
  connections: {
    "Webhook waitlist": { main: [[{ node: "Guardar en Supabase", type: "main", index: 0 }]] },
    // Los dos correos cuelgan EN PARALELO del Supabase: así ambos ven el mismo
    // item y ninguno depende de la respuesta del otro.
    "Guardar en Supabase": { main: [[
      { node: "Correo confirmación (persona)", type: "main", index: 0 },
      { node: "Correo nueva inscripción (Francisco)", type: "main", index: 0 },
    ]] },
  },
  settings: {}, pinData: {},
}, null, 2));

// ─── RESEÑAS ─────────────────────────────────────────────────────────────────
const rvNodes = [
  webhook("rv-webhook", "Webhook reseñas", "reviews", [0, 300],
    "La Production URL de este nodo va en Vercel como N8N_REVIEWS_URL."),
  supabase("rv-supabase", "Guardar reseña (pendiente)", "reviews", [
    { fieldId: "first_name",    fieldValue: B("firstName") },
    { fieldId: "last_name",     fieldValue: B("lastName") },
    { fieldId: "email",         fieldValue: B("email") },
    { fieldId: "phone",         fieldValue: B("phone") },
    { fieldId: "rating",        fieldValue: B("rating") },
    { fieldId: "body",          fieldValue: B("body") },
    { fieldId: "car_slug",      fieldValue: B("carSlug") },
    { fieldId: "car_sanity_id", fieldValue: B("carSanityId") },
    { fieldId: "car_brand",     fieldValue: B("carBrand") },
    { fieldId: "car_model",     fieldValue: B("carModel") },
    { fieldId: "car_year",      fieldValue: B("carYear") },
    { fieldId: "car_color",     fieldValue: B("carColor") },
    { fieldId: "car_version",   fieldValue: B("carVersion") },
    { fieldId: "source",        fieldValue: B("source") },
    { fieldId: "status",        fieldValue: "pendiente" },
  ], [260, 300],
    "status='pendiente' SIEMPRE: nada se publica sin que Francisco lo apruebe en el dashboard."),
  resend("rv-mail-francisco", "Correo por moderar (Francisco)",
    F, "Nueva reseña por moderar", "nueva-resena-francisco.html", [540, 180]),
  resend("rv-mail-autor", "Correo agradecimiento (autor)",
    "={{ $('Webhook reseñas').item.json.body.email }}",
    "Recibimos tu reseña — Electrificarte", "resena-recibida.html", [540, 420]),
];
writeFileSync("n8n/reviews.json", JSON.stringify({
  name: "Reseñas UGC (captura + correos)",
  nodes: rvNodes,
  connections: {
    "Webhook reseñas": { main: [[{ node: "Guardar reseña (pendiente)", type: "main", index: 0 }]] },
    "Guardar reseña (pendiente)": { main: [[
      { node: "Correo por moderar (Francisco)", type: "main", index: 0 },
      { node: "Correo agradecimiento (autor)", type: "main", index: 0 },
    ]] },
  },
  settings: {}, pinData: {},
}, null, 2));

console.log("✓ n8n/waitlist.json  —", wlNodes.length, "nodos");
console.log("✓ n8n/reviews.json   —", rvNodes.length, "nodos");
