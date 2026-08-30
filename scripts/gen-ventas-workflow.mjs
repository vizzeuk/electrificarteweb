// Genera n8n/ventas-correos.json con 4 nodos Resend a partir de los HTML de emails/ventas/.
import { readFileSync, writeFileSync } from "node:fs";

const dir = "emails/ventas";
const cfg = [
  { file: "pago-confirmado-cliente.html", name: "Correo pago confirmado (cliente)", to: "={{ $('HTTP Request2').item.json.customer.email }}", subject: "Tu pago fue confirmado — Electrificarte", pos: [260, 120] },
  { file: "nuevo-lead-francisco.html", name: "Correo nuevo lead (Francisco)", to: "francisco@electrificarte.com", subject: "Nuevo lead de Oferta Exclusiva", pos: [260, 320] },
  { file: "registro-vendedor.html", name: "Correo registro (vendedor)", to: "={{ $('Create a row1').item.json.email }}", subject: "Registro confirmado — Electrificarte", pos: [260, 520] },
  { file: "nuevo-vendedor-francisco.html", name: "Correo nuevo vendedor (Francisco)", to: "francisco@electrificarte.com", subject: "Nuevo vendedor registrado", pos: [260, 720] },
];

const nodes = [
  { parameters: {}, id: "trigger", name: "Probar (Manual Trigger)", type: "n8n-nodes-base.manualTrigger", typeVersion: 1, position: [0, 400] },
];
const conns = { "Probar (Manual Trigger)": { main: [[]] } };

for (const c of cfg) {
  const html = readFileSync(`${dir}/${c.file}`, "utf8");
  nodes.push({
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
          { name: "to", value: c.to },
          { name: "subject", value: c.subject },
          { name: "html", value: `=${html}` },
        ],
      },
      options: {},
    },
    id: c.file,
    name: c.name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: c.pos,
    credentials: { httpHeaderAuth: { id: "REEMPLAZAR", name: "Resend (Authorization Bearer)" } },
    notes: "Ajustá el 'to' y las expresiones a los nombres de nodo de tu flujo.",
  });
  conns["Probar (Manual Trigger)"].main[0].push({ node: c.name, type: "main", index: 0 });
}

const wf = { name: "Correos de ventas (pegar nodos en tu flujo)", nodes, connections: conns, settings: {}, pinData: {} };
writeFileSync("n8n/ventas-correos.json", JSON.stringify(wf, null, 2));
console.log(`n8n/ventas-correos.json: ${nodes.length} nodos`);
