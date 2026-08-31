// Genera n8n/ventas-correos-test.json: un flujo AUTÓNOMO para probar los 4 correos
// de ventas directamente en n8n, sin tu flujo real detrás.
//
// El truco: dos nodos "Set" con los MISMOS nombres que las expresiones referencian
// ("HTTP Request2" y "Create a row1") emiten datos de ejemplo, así las
// {{ $('HTTP Request2')... }} / {{ $('Create a row1')... }} / {{ $json... }} resuelven.
//
//   Manual Trigger ─┬─> "HTTP Request2" (Set) ─┬─> Resend pago-confirmado (cliente)
//                   │                          └─> Resend nuevo-lead (Francisco)
//                   └─> "Create a row1"  (Set) ─┬─> Resend registro (vendedor)
//                                               └─> Resend nuevo-vendedor (Francisco)
//
// Todos los `to` van a {{ $json.email }} → editá el email en los 2 nodos Set y los 4
// correos te llegan a vos. Asigná la credencial Resend (Header Auth) en cada Resend.
import { readFileSync, writeFileSync } from "node:fs";

const dir = "emails/ventas";

// Datos de ejemplo. Cambiá "email" por TU correo en los 2 objetos (o en el nodo Set en n8n).
const clienteData = {
  customer: { name: "Camila Rojas", email: "TU_CORREO@gmail.com" },
  descripcion_interes: "BYD Dolphin 2025",
  email: "TU_CORREO@gmail.com",
  telefono: "56912345678",
  comuna: "Providencia",
  region: "Metropolitana",
};
const vendedorData = {
  nombre: "Vicente",
  apellido: "Cossio",
  nombre_concesionario: "Automotora del Sur",
  marcas: "BYD, MG",
  telefono: "56912345678",
  email: "TU_CORREO@gmail.com",
};

const setNode = (name, data, pos) => ({
  parameters: { mode: "raw", jsonOutput: JSON.stringify(data, null, 2), options: {} },
  id: name.replace(/\s/g, "_"),
  name,
  type: "n8n-nodes-base.set",
  typeVersion: 3.4,
  position: pos,
  notes: "DATOS DE PRUEBA — reemplazá 'email' por tu correo.",
});

const resendNode = (id, name, file, subject, pos) => ({
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
        { name: "to", value: "={{ $json.email }}" },
        { name: "subject", value: `[PRUEBA] ${subject}` },
        { name: "html", value: `=${readFileSync(`${dir}/${file}`, "utf8")}` },
      ],
    },
    options: {},
  },
  id,
  name,
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: pos,
  credentials: { httpHeaderAuth: { id: "REEMPLAZAR", name: "Resend (Authorization Bearer)" } },
});

const nodes = [
  { parameters: {}, id: "trigger", name: "Probar (Manual Trigger)", type: "n8n-nodes-base.manualTrigger", typeVersion: 1, position: [-200, 300] },
  setNode("HTTP Request2", clienteData, [40, 140]),
  setNode("Create a row1", vendedorData, [40, 460]),
  resendNode("pago", "Resend · pago confirmado (cliente)", "pago-confirmado-cliente.html", "Tu pago fue confirmado — Electrificarte", [320, 60]),
  resendNode("lead", "Resend · nuevo lead (Francisco)", "nuevo-lead-francisco.html", "Nuevo lead de Oferta Exclusiva", [320, 240]),
  resendNode("reg", "Resend · registro (vendedor)", "registro-vendedor.html", "Registro confirmado — Electrificarte", [320, 400]),
  resendNode("ven", "Resend · nuevo vendedor (Francisco)", "nuevo-vendedor-francisco.html", "Nuevo vendedor registrado", [320, 580]),
];

const connections = {
  "Probar (Manual Trigger)": { main: [[
    { node: "HTTP Request2", type: "main", index: 0 },
    { node: "Create a row1", type: "main", index: 0 },
  ]] },
  "HTTP Request2": { main: [[
    { node: "Resend · pago confirmado (cliente)", type: "main", index: 0 },
    { node: "Resend · nuevo lead (Francisco)", type: "main", index: 0 },
  ]] },
  "Create a row1": { main: [[
    { node: "Resend · registro (vendedor)", type: "main", index: 0 },
    { node: "Resend · nuevo vendedor (Francisco)", type: "main", index: 0 },
  ]] },
};

const wf = { name: "Correos de ventas · PRUEBA (autónomo)", nodes, connections, settings: {}, pinData: {} };
writeFileSync("n8n/ventas-correos-test.json", JSON.stringify(wf, null, 2));
console.log(`n8n/ventas-correos-test.json: ${nodes.length} nodos`);
