/**
 * Smoke test del webhook real de Kapso: /api/whatsapp/kapso.
 *
 * A diferencia de scripts/test-chat-flows.ts (que pega contra el endpoint legacy
 * /api/whatsapp/advisor y recibe la respuesta en el JSON), este script simula una
 * entrega real del webhook de Kapso — firmada con HMAC-SHA256, igual que en
 * producción. La respuesta del agente NO viaja en el HTTP response: el SDK la
 * manda por la API de Kapso (thread.post), o sea que cada corrida intenta un
 * envío real de WhatsApp al número configurado.
 *
 * Por eso:
 *   - Usa números de prueba reales que tú controles (TEST_PHONE_*), idealmente
 *     tu propio WhatsApp, y verifica visualmente que el mensaje llega.
 *   - Corre pocos flujos (uno por tier) con pausa entre cada uno.
 *   - Para confirmar contenido sin mirar el teléfono, revisa los logs del server
 *     (`[bot] mensaje recibido` / `[bot] respuesta enviada` en lib/whatsapp/bot.ts)
 *     mientras corre `npm run dev` o en Vercel → Logs.
 *
 * Uso (un solo tier, con un único número que vas cambiando de estado en Supabase):
 *   KAPSO_WEBHOOK_SECRET=xxx TEST_PHONE=569XXXXXXXX \
 *   npx tsx --env-file=.env.local scripts/test-kapso-webhook.ts asesoria
 *
 * Uso (los 4 tiers, uno por número):
 *   KAPSO_WEBHOOK_SECRET=xxx TEST_PHONE_ASESORIA=569XXXXXXXX ... \
 *   npx tsx --env-file=.env.local scripts/test-kapso-webhook.ts
 */

import { createHmac, randomUUID } from "crypto";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const WEBHOOK_SECRET = process.env.KAPSO_WEBHOOK_SECRET ?? "";
const PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID ?? "test-phone-number-id";

if (!WEBHOOK_SECRET) {
  console.error("❌ Falta KAPSO_WEBHOOK_SECRET (el mismo valor configurado en el panel de Kapso).");
  process.exit(1);
}

type Tier = "asesoria" | "oferta" | "vendedor" | "none";

// TEST_PHONE: un solo número que vas alternando de estado en Supabase entre corridas.
// TEST_PHONE_<TIER>: números distintos por tier, si tienes varios. TEST_PHONE manda
// sobre el específico de tier si ambos están seteados.
const SINGLE_PHONE = process.env.TEST_PHONE;
const PHONES: Record<Tier, string> = {
  asesoria: SINGLE_PHONE ?? process.env.TEST_PHONE_ASESORIA ?? "56900000001",
  oferta: SINGLE_PHONE ?? process.env.TEST_PHONE_OFERTA ?? "56900000002",
  vendedor: SINGLE_PHONE ?? process.env.TEST_PHONE_VENDEDOR ?? "56900000003",
  none: SINGLE_PHONE ?? process.env.TEST_PHONE_NONE ?? "56900000004",
};

// Tier opcional como argumento de línea de comandos: corre solo ese flujo.
const requestedTier = process.argv[2] as Tier | undefined;
if (requestedTier && !["asesoria", "oferta", "vendedor", "none"].includes(requestedTier)) {
  console.error(`❌ Tier inválido "${requestedTier}". Usa: asesoria | oferta | vendedor | none`);
  process.exit(1);
}

interface SmokeFlow {
  tier: Tier;
  name: string;
  text: string;
}

const FLOWS: SmokeFlow[] = [
  { tier: "none", name: "Sin suscripción — mensaje inicial", text: "Hola, quiero saber sobre autos eléctricos" },
  { tier: "vendedor", name: "Vendedor — canal incorrecto", text: "Quiero publicar mis autos eléctricos" },
  { tier: "asesoria", name: "Asesoría $4.990 — primera pregunta", text: "Hola, quiero comprar mi primer eléctrico, presupuesto $20M" },
  { tier: "oferta", name: "Oferta $19.990 — duda técnica", text: "¿El BYD Han tiene garantía de batería en Chile?" },
];

function buildKapsoPayload(phone: string, text: string, conversationId: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return {
    event: "whatsapp.message.received",
    phone_number_id: PHONE_NUMBER_ID,
    conversation: {
      id: conversationId,
      phone_number: phone,
    },
    message: {
      id: `wamid.test.${conversationId}`,
      type: "text",
      timestamp,
      from: phone,
      text: { body: text },
    },
  };
}

function signBody(rawBody: string): string {
  const hex = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  return `sha256=${hex}`;
}

async function sendFlow(flow: SmokeFlow): Promise<{ ok: boolean; status: number; body: string }> {
  const phone = PHONES[flow.tier];
  const conversationId = `smoke-${flow.tier}-${randomUUID().slice(0, 8)}`;
  const rawBody = JSON.stringify(buildKapsoPayload(phone, flow.text, conversationId));
  const signature = signBody(rawBody);

  const res = await fetch(`${BASE_URL}/api/whatsapp/kapso`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-signature": signature,
      "x-webhook-event": "whatsapp.message.received",
    },
    body: rawBody,
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  const flows = requestedTier ? FLOWS.filter((f) => f.tier === requestedTier) : FLOWS;

  console.log(`\n📡 Smoke test webhook Kapso → ${BASE_URL}/api/whatsapp/kapso`);
  console.log(`⚠️  Cada flujo intenta un envío real de WhatsApp vía la API de Kapso.\n`);
  if (requestedTier) {
    console.log(`Corriendo solo el tier "${requestedTier}" — asegúrate de que el número`);
    console.log(`de TEST_PHONE ya esté en ese estado en Supabase.\n`);
  }

  let failed = 0;

  for (const flow of flows) {
    process.stdout.write(`▶ [${flow.tier.padEnd(9)}] ${flow.name} ... `);
    try {
      const { ok, status, body } = await sendFlow(flow);
      if (ok) {
        console.log(`✅ ${status}`);
      } else {
        console.log(`❌ ${status} — ${body.slice(0, 200)}`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ error de red — ${err instanceof Error ? err.message : err}`);
      failed++;
    }
    // Pausa entre envíos para no saturar la API de Kapso / WhatsApp.
    await new Promise((r) => setTimeout(r, 2_000));
  }

  console.log("\n─────────────────────────────────────────────");
  if (failed > 0) {
    console.log(`❌ ${failed}/${flows.length} flujos rechazados por el webhook (firma/payload).`);
    process.exit(1);
  }
  console.log(`✅ Los ${flows.length} flujos fueron aceptados por el webhook (200 OK).`);
  console.log("Esto NO confirma que el agente respondió bien — el envío real ocurre");
  console.log("en segundo plano. Verifica en tu WhatsApp y/o en los logs del server:");
  console.log('  grep -E "\\[bot\\]" en la salida de `npm run dev` o en Vercel → Logs.');
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
