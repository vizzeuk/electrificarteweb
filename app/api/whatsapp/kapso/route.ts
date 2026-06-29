// Direct Kapso webhook handler using Chat SDK.
// Configure Kapso platform to POST to: https://tu-dominio.vercel.app/api/whatsapp/kapso
// Set KAPSO_WEBHOOK_SECRET in Vercel and in the Kapso webhook settings (Secret key field).
// Events to enable: whatsapp.message.received

import "@/lib/whatsapp/bot"; // register onDirectMessage handlers

import { bot } from "@/lib/whatsapp/bot";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return bot.webhooks.kapso(request);
}
