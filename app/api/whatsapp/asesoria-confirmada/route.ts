import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { N8N_SECRET_HEADER } from "@/lib/n8n";
import { normalizePhone } from "@/lib/whatsapp/subscription";
import { sendAsesoriaConfirmada } from "@/lib/whatsapp/outbound";

/**
 * WhatsApp de confirmación cuando Reveniu confirma el pago de la Asesoría ($4.990).
 *
 * Lo llama n8n (rama ASESORIA del webhook de pagos), con el mismo header secreto que la web usa
 * hacia n8n (`x-electrificarte-secret` = N8N_WEBHOOK_SECRET). Antes n8n llamaba directo a Kapso
 * con una API key propia que Meta rechaza para enviar por el número; así la única credencial de
 * Kapso que envía mensajes es la de la web.
 *
 *   POST /api/whatsapp/asesoria-confirmada   { phone: "+56 9 1234 5678", nombre: "Camila Rojas" }
 */
export const runtime = "nodejs";

const schema = z.object({ phone: z.string().min(8).max(20), nombre: z.string().max(120).optional() });

function autorizado(req: Request): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  const got = req.headers.get(N8N_SECRET_HEADER) ?? "";
  if (!secret || got.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const phone = normalizePhone(parsed.data.phone);
  if (!phone || phone.length < 8) return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });

  const via = await sendAsesoriaConfirmada(phone, parsed.data.nombre?.trim() ?? "");
  // 502 si no salió por ningún lado: n8n lo marca como error y avisa a Discord.
  if (!via) return NextResponse.json({ sent: false }, { status: 502 });
  return NextResponse.json({ sent: true, via });
}
