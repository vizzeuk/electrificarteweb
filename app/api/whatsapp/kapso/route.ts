// Direct Kapso webhook handler using Chat SDK.
// Configure Kapso platform to POST to: https://tu-dominio.vercel.app/api/whatsapp/kapso
// Set KAPSO_WEBHOOK_SECRET in Vercel and in the Kapso webhook settings (Secret key field).
// Events to enable: whatsapp.message.received

import "@/lib/whatsapp/bot"; // register onDirectMessage handlers

import { after } from "next/server";
import { bot } from "@/lib/whatsapp/bot";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  // El SDK procesa el mensaje (Supabase + Claude + respuesta por Kapso) en segundo
  // plano y responde 200 de inmediato. Sin waitUntil, Vercel puede congelar la
  // función serverless antes de que termine ese trabajo y el usuario nunca recibe
  // la respuesta — aunque el webhook haya devuelto 200 OK.
  return bot.webhooks.kapso(request, { waitUntil: (p) => after(() => p) });
}
