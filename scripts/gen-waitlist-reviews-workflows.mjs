// Genera n8n/waitlist.json, n8n/reviews.json y n8n/asesoria-correos.json embebiendo los HTML
// de emails/ventas/ (que a su vez salen de scripts/gen-emails.mjs).
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
  // Resend acepta 10 requests por segundo por cuenta. Con 10 registros simultáneos (20 correos)
  // la mitad volvía con 429 y la ejecución quedaba en error. Reintentar reparte la ráfaga.
  retryOnFail: true,
  maxTries: 5,
  waitBetweenTries: 2000,
  notes: "Asigná la credencial Resend. El html va en modo expresión (empieza con '='). Reintenta 5 veces cada 2 s: Resend limita a 10 envíos por segundo.",
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

// Header Auth: solo acepta llamadas de la web (header x-electrificarte-secret = N8N_WEBHOOK_SECRET).
// Sin el header, n8n responde 403 y no corre el flujo. Ver docs/N8N-SEGURIDAD.md.
// responseMode "responseNode": n8n responde recién cuando la fila quedó guardada (nodo
// "Responder OK"), así la web sabe si el registro se guardó de verdad. Si falta un dato
// responde 422; si Supabase falla, n8n responde 500. En ambos casos la web le muestra un
// error a la persona en vez de un falso "listo" (antes respondía 200 al recibir, pasara lo
// que pasara después).
const webhook = (id, name, path, pos, notes) => ({
  parameters: { httpMethod: "POST", path, authentication: "headerAuth", responseMode: "responseNode", options: {} },
  id, name,
  type: "n8n-nodes-base.webhook",
  typeVersion: 2,
  position: pos,
  webhookId: path,
  credentials: { httpHeaderAuth: { id: "REEMPLAZAR", name: "Web Electrificarte (x-electrificarte-secret)" } },
  notes,
});

let condId = 0;
const cond = (left, operation, type = "string", right = "") => ({
  id: `c${++condId}`, leftValue: left, rightValue: right,
  operator: { type, operation, ...(operation === "notEmpty" ? { singleValue: true } : {}) },
});
const ifNode = (id, name, conditions, pos, notes) => ({
  parameters: {
    conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 3 }, conditions, combinator: "and" },
    looseTypeValidation: true, options: {},
  },
  id, name, type: "n8n-nodes-base.if", typeVersion: 2.3, position: pos, notes,
});
const respond = (id, name, code, body, pos) => ({
  parameters: { respondWith: "json", responseBody: JSON.stringify(body), options: { responseCode: code } },
  id, name, type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: pos,
});
const to = (node, i = 0) => ({ node, type: "main", index: i });

const F = "francisco@electrificarte.com";
const B = (k) => `={{ $json.body.${k} }}`;

// ─── WAITLIST ────────────────────────────────────────────────────────────────
const wlNodes = [
  webhook("wl-webhook", "Webhook waitlist", "waitlist", [0, 300],
    "La Production URL de este nodo va en Vercel como N8N_WAITLIST_URL."),
  ifNode("wl-valid", "¿Datos válidos? (waitlist)",
    [cond(B("firstName"), "notEmpty"), cond(B("email"), "notEmpty"), cond(B("phone"), "notEmpty")], [220, 300],
    "Si falta un dato obligatorio responde 422 y no guarda nada (la web ya valida lo mismo con zod)."),
  supabase("wl-supabase", "Guardar waitlist", "waitlist", [
    { fieldId: "first_name", fieldValue: B("firstName") },
    { fieldId: "last_name",  fieldValue: B("lastName") },
    { fieldId: "email",      fieldValue: B("email") },
    { fieldId: "phone",      fieldValue: B("phone") },
    { fieldId: "model",      fieldValue: B("model") },
    { fieldId: "source",     fieldValue: B("source") },
  ], [440, 240], "Si el insert falla, el flujo corta aquí y n8n le responde 500 a la web."),
  respond("wl-ok", "Responder OK (waitlist)", 200, { ok: true }, [680, 60]),
  respond("wl-bad", "Responder 422 (waitlist)", 422, { ok: false, error: "datos incompletos" }, [440, 460]),
  resend("wl-mail-cliente", "Correo confirmación (persona)",
    "={{ $('Webhook waitlist').item.json.body.email }}",
    "Ya estás en la waitlist de Electrificarte", "waitlist-confirmacion.html", [680, 240]),
  resend("wl-mail-francisco", "Correo nueva inscripción (Francisco)",
    F, "Nueva persona en la waitlist", "waitlist-francisco.html", [680, 420]),
];
const wlConnections = {
  "Webhook waitlist": { main: [[to("¿Datos válidos? (waitlist)")]] },
  "¿Datos válidos? (waitlist)": { main: [[to("Guardar waitlist")], [to("Responder 422 (waitlist)")]] },
  // Primero la respuesta (arriba = corre primero), después los dos correos en paralelo.
  "Guardar waitlist": { main: [[to("Responder OK (waitlist)"), to("Correo confirmación (persona)"), to("Correo nueva inscripción (Francisco)")]] },
};
writeFileSync("n8n/waitlist.json", JSON.stringify({
  name: "Waitlist (captación + correos)", nodes: wlNodes, connections: wlConnections, settings: {}, pinData: {},
}, null, 2));
console.log(`✓ n8n/waitlist.json — ${wlNodes.length} nodos`);

// ─── RESEÑAS ─────────────────────────────────────────────────────────────────
// Solo se moderan las reseñas CON fotos (sep-2026). El estado lo decide n8n desde `photos`,
// no desde el payload.
const HAS_PHOTOS = "(($json.body.photos) || []).length > 0";
const rvNodes = [
  webhook("rv-webhook", "Webhook reseñas", "reviews", [0, 300],
    "La Production URL de este nodo va en Vercel como N8N_REVIEWS_URL."),
  ifNode("rv-valid", "¿Datos válidos? (reseña)", [
    cond(B("firstName"), "notEmpty"), cond(B("email"), "notEmpty"), cond(B("body"), "notEmpty"),
    cond("={{ Number($json.body.rating) }}", "gte", "number", 1), cond("={{ Number($json.body.rating) }}", "lte", "number", 5),
  ], [220, 300], "Si falta un dato obligatorio responde 422 y no guarda nada."),
  supabase("rv-supabase", "Guardar reseña", "reviews", [
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
    { fieldId: "photos",        fieldValue: B("photos") },
    { fieldId: "source",        fieldValue: B("source") },
    { fieldId: "status",        fieldValue: `={{ ${HAS_PHOTOS} ? 'pendiente' : 'aprobada' }}` },
  ], [440, 240],
    "status: con fotos 'pendiente' (Francisco la modera), sin fotos 'aprobada' (se publica sola)."),
  respond("rv-ok", "Responder OK (reseña)", 200, { ok: true }, [680, 40]),
  respond("rv-bad", "Responder 422 (reseña)", 422, { ok: false, error: "datos incompletos" }, [440, 560]),
  ifNode("rv-photos", "¿Trae fotos?", [cond("={{ (($('Webhook reseñas').item.json.body.photos) || []).length }}", "gt", "number", 0)], [680, 300],
    "true: correos de 'en revisión'. false: correos de 'publicada'."),
  resend("rv-mail-francisco", "Correo por moderar (Francisco)",
    F, "Nueva reseña con fotos por revisar", "nueva-resena-francisco.html", [920, 140]),
  resend("rv-mail-autor", "Correo reseña en revisión (autor)",
    "={{ $('Webhook reseñas').item.json.body.email }}",
    "Recibimos tu reseña", "resena-en-revision.html", [920, 300]),
  resend("rv-mail-francisco-pub", "Correo reseña publicada (Francisco)",
    F, "Se publicó una reseña nueva", "resena-publicada-francisco.html", [920, 460]),
  resend("rv-mail-autor-pub", "Correo reseña publicada (autor)",
    "={{ $('Webhook reseñas').item.json.body.email }}",
    "Tu reseña ya está publicada", "resena-publicada.html", [920, 620]),
];
const rvConnections = {
  "Webhook reseñas": { main: [[to("¿Datos válidos? (reseña)")]] },
  "¿Datos válidos? (reseña)": { main: [[to("Guardar reseña")], [to("Responder 422 (reseña)")]] },
  "Guardar reseña": { main: [[to("Responder OK (reseña)"), to("¿Trae fotos?")]] },
  "¿Trae fotos?": { main: [
    [to("Correo por moderar (Francisco)"), to("Correo reseña en revisión (autor)")],
    [to("Correo reseña publicada (Francisco)"), to("Correo reseña publicada (autor)")],
  ] },
};
writeFileSync("n8n/reviews.json", JSON.stringify({
  name: "Reseñas UGC (captura + correos)", nodes: rvNodes, connections: rvConnections, settings: {}, pinData: {},
}, null, 2));
console.log(`✓ n8n/reviews.json   — ${rvNodes.length} nodos`);

// ─── ASESORÍA (correos tras el pago) ─────────────────────────────────────────
// No es un workflow completo: son los nodos para PEGAR en el workflow de pagos, después del
// nodo que confirma el pago de Reveniu. El Set "Datos correo asesoría" desacopla las
// plantillas de los nombres de nodo del flujo de pagos: se ajustan las 4 expresiones del Set
// y los correos no se tocan.
const asNodes = [
  {
    parameters: {},
    id: "as-trigger", name: "Probar (Manual)",
    type: "n8n-nodes-base.manualTrigger", typeVersion: 1, position: [-260, 300],
    notes: "Solo para probar suelto. En el flujo real, conectá el Set después de la verificación del pago.",
  },
  {
    parameters: {
      mode: "manual",
      assignments: { assignments: [
        { id: "a1", name: "nombre",   type: "string", value: "={{ $json.fullName ?? $json.nombre ?? $json.name }}" },
        { id: "a2", name: "email",    type: "string", value: "={{ $json.email }}" },
        { id: "a3", name: "telefono", type: "string", value: "={{ $json.phone ?? $json.telefono }}" },
        { id: "a4", name: "orderId",  type: "string", value: "={{ $json.orderId ?? $json.order_id ?? $json.external_id }}" },
      ] },
      options: {},
    },
    id: "as-set", name: "Datos correo asesoría",
    type: "n8n-nodes-base.set", typeVersion: 3.4, position: [0, 300],
    notes: "Ajustá estas 4 expresiones a los campos de la fila de advisory_payments que llega a este punto. Las plantillas solo leen de este nodo.",
  },
  resend("as-mail-cliente", "Correo asesoría confirmada (persona)",
    "={{ $('Datos correo asesoría').item.json.email }}",
    "Tu asesoría está confirmada", "asesoria-confirmada.html", [300, 180]),
  resend("as-mail-francisco", "Correo asesoría pagada (Francisco)",
    F, "Se pagó una asesoría", "asesoria-francisco.html", [300, 420]),
];
writeFileSync("n8n/asesoria-correos.json", JSON.stringify({
  name: "Asesoría: correos tras el pago (nodos para pegar)",
  nodes: asNodes,
  connections: {
    "Probar (Manual)": { main: [[{ node: "Datos correo asesoría", type: "main", index: 0 }]] },
    "Datos correo asesoría": { main: [[
      { node: "Correo asesoría confirmada (persona)", type: "main", index: 0 },
      { node: "Correo asesoría pagada (Francisco)", type: "main", index: 0 },
    ]] },
  },
  settings: {}, pinData: {},
}, null, 2));
console.log("✓ n8n/asesoria-correos.json — 4 nodos");
