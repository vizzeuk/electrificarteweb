// Dispara un webhook del FLUJO DE VENTAS (pagos) contra n8n con datos de PRUEBA,
// sin cobrar ni depender de Reveniu/Transbank. Simula lo que llega al webhook.
//
//   node scripts/qa/fire-sales-webhook.mjs <URL_WEBHOOK_N8N> <fixture> [--email tu@correo] [--dry]
//
// fixtures:
//   creation-lead      → alta pendiente de un lead de Oferta ($19.990)  (webhook "forms clientes")
//   creation-advisory  → alta pendiente de Asesoría ($4.990)            (webhook "asesoria")
//   pay-customer       → CONFIRMACIÓN de pago de un cliente Oferta      (webhook "forms clientes1" → CUSTOMERS)
//   pay-advisory       → CONFIRMACIÓN de pago de Asesoría               (→ ASESORIA)
//   register-vendor    → alta de un vendedor / pago suscripción         (webhook "forms vendors" → VENDORS)
//
// --dry: no envía, solo imprime el payload (para pegar como Pin Data en n8n).
//
// ⚠️ La forma EXACTA del webhook de pago la define Reveniu. Estos payloads son una
// plantilla razonable (external_id + customer). Si tu flujo lee otros campos,
// ajustá el objeto de abajo o —mejor— pineá en n8n una ejecución real pasada.

const [, , url, fixture, ...rest] = process.argv;
const email = (rest.find((a) => a.startsWith("--email"))?.split("=")[1]) ||
  (rest[rest.indexOf("--email") + 1]?.includes("@") ? rest[rest.indexOf("--email") + 1] : "tu-correo@gmail.com");
const dry = rest.includes("--dry");

const orderId = `test-${Date.now()}`;
const FIXTURES = {
  "creation-lead": {
    orderId, status: "pendiente", type: "lead",
    email, name: "Camila Rojas", telefono: "56912345678",
    target_model: "BYD Dolphin 2025", region: "Metropolitana", comuna: "Providencia",
    financing: "contado",
  },
  "creation-advisory": {
    orderId, status: "pendiente", type: "advisory",
    email, name: "Camila Rojas", telefono: "56912345678",
  },
  "pay-customer": {
    external_id: orderId, status: "paid", type: "lead", amount: 19990,
    customer: { name: "Camila Rojas", email, phone: "56912345678" },
  },
  "pay-advisory": {
    external_id: orderId, status: "paid", type: "advisory", amount: 4990,
    customer: { name: "Camila Rojas", email, phone: "56912345678" },
  },
  "register-vendor": {
    external_id: orderId, status: "paid", type: "vendor", amount: 12990,
    nombre: "Vicente", apellido: "Cossio", email,
    nombre_concesionario: "Automotora del Sur", marcas: "BYD, MG", telefono: "56912345678",
    customer: { name: "Vicente Cossio", email, phone: "56912345678" },
  },
};

const body = FIXTURES[fixture];
if (!url || !body) {
  console.error("Uso: node scripts/qa/fire-sales-webhook.mjs <URL_WEBHOOK> <fixture> [--email tu@correo] [--dry]");
  console.error("fixtures:", Object.keys(FIXTURES).join(", "));
  process.exit(1);
}

console.log(`\nFixture: ${fixture}\norderId: ${orderId}\nDestino: ${dry ? "(dry-run, no envía)" : url}\n`);
console.log(JSON.stringify(body, null, 2));
if (dry) process.exit(0);

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const text = await res.text().catch(() => "");
console.log(`\n${res.ok ? "✓" : "✗"} n8n respondió ${res.status}\n${text.slice(0, 500)}`);
