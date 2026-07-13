// Direct Kapso webhook handler using Chat SDK.
// Configure Kapso platform to POST to: https://www.electrificarte.com/api/whatsapp/kapso
// Set KAPSO_WEBHOOK_SECRET in Vercel and in the Kapso webhook settings (Secret key field).
// Events to enable: whatsapp.message.received

import "@/lib/whatsapp/bot"; // register onDirectMessage handlers

import { after } from "next/server";
import { bot } from "@/lib/whatsapp/bot";

export const runtime = "nodejs";
// El loop de tools puede tomar varios segundos (hasta 5 iteraciones × ~20s de
// timeout por llamada). Sin esto, Vercel puede cortar la función en background
// (tras el 200 OK vía waitUntil) antes de que se envíe la respuesta al usuario.
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  // El SDK procesa el mensaje (Supabase + Claude + respuesta por Kapso) en segundo
  // plano y responde 200 de inmediato. Sin waitUntil, Vercel puede congelar la
  // función serverless antes de que termine ese trabajo y el usuario nunca recibe
  // la respuesta — aunque el webhook haya devuelto 200 OK.
  return bot.webhooks.kapso(request, { waitUntil: (p) => after(() => p) });
}
