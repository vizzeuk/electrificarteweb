import { Chat } from "chat";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createKapsoAdapter, type KapsoAdapter } from "@kapso/chat-adapter";
import { checkChatRateLimit } from "@/lib/chat/rate-limit-redis";
import { detectInjection, INJECTION_RESPONSE } from "@/lib/chat/guards";
import { getSubscriptionTier, normalizePhone } from "@/lib/whatsapp/subscription";
import { runAdvisor, type ChatMessage } from "@/lib/whatsapp/advisor";
import { loadContext, saveContext } from "@/lib/whatsapp/context";
import { exceedsDailyQuota, DAILY_QUOTA_MESSAGE } from "@/lib/whatsapp/quota";

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
    "¡Hola! 👋 Soy el asesor experto en autos eléctricos de Electrificarte. La asesoría 1:1 por WhatsApp es un servicio para suscriptores.";
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

  // 1. Rate limit
  if (await checkChatRateLimit(`wa:${phone}`)) {
    await thread.post("Demasiadas consultas seguidas. Intenta en un momento 🙏");
    return;
  }

  // 2. Subscription tier gating
  const tier = await getSubscriptionTier(phone);

  if (tier === "vendedor") {
    await thread.post(VENDOR_MESSAGE);
    return;
  }

  if (!tier) {
    await thread.post(subscribeMessage());
    return;
  }

  // 3. Injection guard
  if (detectInjection(text)) {
    await thread.post(INJECTION_RESPONSE);
    return;
  }

  // 4. Daily quota (cost control — only subscribers consume tokens)
  if (await exceedsDailyQuota(phone)) {
    await thread.post(DAILY_QUOTA_MESSAGE);
    return;
  }

  // 5. Load persistent context from Redis + append current message
  const history = await loadContext(phone);
  const messages: ChatMessage[] = [
    ...history,
    { role: "user", content: text.slice(0, 1_500) },
  ];

  // 6. Run LLM advisor with tier-appropriate prompt
  let response: string;
  try {
    response = await runAdvisor(messages, tier);
  } catch (err) {
    console.error("[bot] runAdvisor error:", err instanceof Error ? err.message : err);
    await thread.post("Disculpa, tuve un problema. ¿Me lo puedes repetir?");
    return;
  }

  // 7. Persist updated context to Redis
  await saveContext(phone, [...messages, { role: "assistant", content: response }]);

  // 8. Reply via Kapso → WhatsApp
  await thread.post(response);
});
