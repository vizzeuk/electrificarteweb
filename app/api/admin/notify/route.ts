/**
 * POST /api/admin/notify — manda un texto por WhatsApp a los admins.
 *
 * Existe para que n8n no tenga que hablar con Kapso directamente. Si lo hiciera,
 * habría que duplicar allá la lista de números (ADMIN_PHONE_NUMBERS), el manejo
 * de la ventana de 24 h de Meta y el fallback a plantilla — tres cosas que ya
 * están resueltas en lib/whatsapp/outbound.ts y que no conviene tener en dos
 * lugares. n8n manda el texto; a quién y cómo llega es de acá.
 *
 * Auth: header `x-admin-secret`. Body: { text }.
 */

import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { adminPhones } from "@/lib/whatsapp/admin";
import { sendProactiveText } from "@/lib/whatsapp/outbound";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Falta text" }, { status: 400 });

  const phones = adminPhones();
  if (phones.length === 0) {
    // No es un error del llamador: es que falta ADMIN_PHONE_NUMBERS en el server.
    // Se reporta para que quede en el log de n8n en vez de perderse en silencio.
    console.warn("[admin/notify] ADMIN_PHONE_NUMBERS vacío — el aviso no se mandó a nadie");
    return NextResponse.json({ sent: 0, phones: 0, warning: "ADMIN_PHONE_NUMBERS vacío" });
  }

  let sent = 0;
  for (const phone of phones) {
    if (await sendProactiveText(phone, text.slice(0, 3_000))) sent++;
  }

  return NextResponse.json({ sent, phones: phones.length });
}
