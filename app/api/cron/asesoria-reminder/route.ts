// Cron: recordatorio "queda 1 día" para asesorías $4.990 en su día 9 (de 10).
// Se agenda en vercel.json (1×/día). Envía un mensaje proactivo por WhatsApp:
// "aún nos queda 1 día, ¿te puedo ayudar en algo?".
//
// Seguridad: Vercel Cron manda `Authorization: Bearer <CRON_SECRET>` cuando la
// env var CRON_SECRET está presente. Rechazamos cualquier request sin ese token.
//
// Idempotencia: un flag en Redis por teléfono evita reenviar si el cron corre
// más de una vez dentro del día-9 (o si se dispara manualmente).

import { Redis } from "@upstash/redis";
import { findAsesoriaReminderDue } from "@/lib/whatsapp/lifecycle";
import { sendAsesoriaReminder, ASESORIA_REMINDER_TEXT } from "@/lib/whatsapp/outbound";
import { loadContext, saveContext } from "@/lib/whatsapp/context";

export const runtime = "nodejs";
export const maxDuration = 60;

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

const SENT_TTL_SECONDS = 60 * 60 * 24 * 3; // 3 días: cubre el día-9 sin reenviar

async function alreadyReminded(phone: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    return (await redis.get(`wa_day9_sent:${phone}`)) != null;
  } catch {
    return false;
  }
}

async function markReminded(phone: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(`wa_day9_sent:${phone}`, "1", { ex: SENT_TTL_SECONDS });
  } catch {
    // no fatal
  }
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sin secreto configurado, no ejecutamos (fail-closed)
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const due = await findAsesoriaReminderDue();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of due) {
    if (await alreadyReminded(item.phone)) {
      skipped++;
      continue;
    }

    const ok = await sendAsesoriaReminder(item.phone);
    if (!ok) {
      failed++;
      continue;
    }

    await markReminded(item.phone);
    sent++;

    // Continuidad: dejamos el recordatorio en el historial para que, cuando el
    // cliente responda, el asesor retome sin arrancar de cero.
    try {
      const history = await loadContext(item.phone);
      await saveContext(item.phone, [
        ...history,
        { role: "assistant", content: ASESORIA_REMINDER_TEXT },
      ]);
    } catch {
      // no fatal: la continuidad es best-effort
    }
  }

  console.log("[cron asesoria-reminder]", { candidates: due.length, sent, skipped, failed });
  return Response.json({ candidates: due.length, sent, skipped, failed });
}
