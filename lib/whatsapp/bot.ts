import { Chat } from "chat";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createKapsoAdapter, type KapsoAdapter } from "@kapso/chat-adapter";
import { checkChatRateLimit } from "@/lib/chat/rate-limit-redis";
import {
  detectInjection,
  INJECTION_RESPONSE,
  isOffTopic,
  OFFTOPIC_RESPONSE,
} from "@/lib/chat/guards";
import { getSubscriptionTier, normalizePhone } from "@/lib/whatsapp/subscription";
import { runAdvisor, type ChatMessage } from "@/lib/whatsapp/advisor";
import { loadContext, saveContext } from "@/lib/whatsapp/context";
import { exceedsDailyQuota, refundDailyQuota, DAILY_QUOTA_MESSAGE } from "@/lib/whatsapp/quota";
import { alreadyProcessed, withPhoneLock } from "@/lib/whatsapp/concurrency";
import { isAdminPhone } from "@/lib/whatsapp/admin";
import { runAdminAdvisor } from "@/lib/whatsapp/admin-advisor";
import { loadAdminContext, saveAdminContext } from "@/lib/whatsapp/admin-context";

// ─── Bot singleton ────────────────────────────────────────────────────────────
// Memory state is fine for the SDK's internal dedup/lock needs; we handle
// LLM conversation context ourselves via Redis (persistent across cold starts).

export const bot = new Chat({
  userName: "electrificarte",
  state: createMemoryState(),
  adapters: {
    kapso: createKapsoAdapter({
      kapsoApiKey:    process.env.KAPSO_API_KEY,
      phoneNumberId:  process.env.KAPSO_PHONE_NUMBER_ID,
      webhookSecret:  process.env.KAPSO_WEBHOOK_SECRET,
    }),
  },
});

// ─── Response messages ────────────────────────────────────────────────────────

function subscribeMessage(): string {
  const url = process.env.ADVISOR_SUBSCRIBE_URL;
  const base =
    "¡Hola! 👋 Soy *Francisco IA*, el asesor IA de electrificarte.com. La asesoría 1:1 por WhatsApp es un servicio para suscriptores.";
  return url
    ? `${base}\n\nActiva tu asesoría acá y te ayudo a encontrar tu auto ideal:\n${url}`
    : `${base}\n\nEscríbenos a contacto@electrificarte.com para activar tu asesoría.`;
}

const VENDOR_MESSAGE =
  "Hola 👋 Este canal está reservado para compradores de autos eléctricos. " +
  "Si necesitas soporte como vendedor, escríbenos a vendedores@electrificarte.com.";

// ─── Main message handler ─────────────────────────────────────────────────────

bot.onDirectMessage(async (thread, message) => {
  const text = message.text ?? "";
  if (!text.trim()) return; // ignore media-only messages

  // 0. Idempotencia: descartar reintentos de webhook / entregas duplicadas
  //    (Kapso reintenta; puede haber instancias serverless concurrentes).
  if (await alreadyProcessed(message.id)) {
    console.log("[bot] mensaje duplicado ignorado", { id: message.id });
    return;
  }

  // Extract customer phone from the Kapso thread ID
  const adapter = bot.getAdapter("kapso") as KapsoAdapter;
  let waId: string;
  try {
    waId = adapter.decodeThreadId(thread.id).waId;
  } catch {
    console.warn("[bot] could not decode thread id:", thread.id);
    return;
  }
  const phone = normalizePhone(waId);
  if (!phone || phone.length < 6) return;

  // Modo administrador (Francisco) — antes que cualquier gate/cuota de clientes.
  // Nunca se activa por contenido del mensaje, solo por número emisor (ver lib/whatsapp/admin.ts).
  if (isAdminPhone(phone)) {
    await withPhoneLock(phone, async () => {
      const history = await loadAdminContext(phone);
      const messages: ChatMessage[] = [...history, { role: "user", content: text.slice(0, 1_500) }];
      let response: string;
      try {
        response = await runAdminAdvisor(messages, phone);
      } catch (err) {
        console.error("[bot] runAdminAdvisor error:", err instanceof Error ? err.message : err);
        await thread.post("Tuve un problema procesando eso. ¿Me lo repites?");
        return;
      }
      await saveAdminContext(phone, [...messages, { role: "assistant", content: response }]);
      await thread.post(response);
    });
    return;
  }

  // 1. Rate limit
  if (await checkChatRateLimit(`wa:${phone}`)) {
    await thread.post("Demasiadas consultas seguidas. Intenta en un momento 🙏");
    return;
  }

  // 2. Subscription tier gating
  const tier = await getSubscriptionTier(phone);
  console.log("[bot] mensaje recibido", { phone: maskPhone(phone), tier });

  if (tier === "vendedor") {
    await thread.post(VENDOR_MESSAGE);
    return;
  }

  if (!tier) {
    await thread.post(subscribeMessage());
    return;
  }

  // 3. Injection guard (input-side)
  if (detectInjection(text)) {
    console.warn("[bot] inyección detectada", { phone: maskPhone(phone), tier });
    await thread.post(INJECTION_RESPONSE);
    return;
  }

  // 3b. Off-topic guard (conservador: solo bloquea mensajes claramente fuera de tema)
  if (isOffTopic(text)) {
    console.log("[bot] off-topic", { phone: maskPhone(phone), tier });
    await thread.post(OFFTOPIC_RESPONSE);
    return;
  }

  // 4. Daily quota (cost control — only subscribers consume tokens)
  if (await exceedsDailyQuota(phone)) {
    console.log("[bot] cuota diaria excedida", { phone: maskPhone(phone), tier });
    await thread.post(DAILY_QUOTA_MESSAGE);
    return;
  }

  // 5-8. Serializado por teléfono: evita el race read-modify-write del contexto
  //       cuando el usuario manda una ráfaga de mensajes.
  await withPhoneLock(phone, async () => {
    // Load persistent context from Redis + append current message
    const history = await loadContext(phone);
    const messages: ChatMessage[] = [
      ...history,
      { role: "user", content: text.slice(0, 1_500) },
    ];

    // Run LLM advisor with tier-appropriate prompt
    let response: string;
    try {
      response = await runAdvisor(messages, tier);
    } catch (err) {
      console.error("[bot] runAdvisor error:", err instanceof Error ? err.message : err);
      await refundDailyQuota(phone); // no penalizar la cuota por un error nuestro
      await thread.post("Disculpa, tuve un problema. ¿Me lo puedes repetir?");
      return;
    }

    // Persist updated context to Redis
    await saveContext(phone, [...messages, { role: "assistant", content: response }]);

    // Reply via Kapso → WhatsApp
    console.log("[bot] respuesta enviada", { phone: maskPhone(phone), tier, length: response.length });
    await thread.post(response);
  });
});

function maskPhone(phone: string): string {
  return phone.length > 4 ? `***${phone.slice(-4)}` : phone;
}
