/**
 * POST /api/admin/notify — manda un texto por WhatsApp a los admins.
 *
 * Existe para que n8n no tenga que hablar con Kapso directamente. Si lo hiciera,
 * habría que duplicar allá la lista de números (ADMIN_PHONE_NUMBERS), el manejo
 * de la ventana de 24 h de Meta y el fallback a plantilla — tres cosas que ya
 * están resueltas en lib/whatsapp/outbound.ts y que no conviene tener en dos
 * lugares. n8n manda el texto; a quién y cómo llega es de acá.
 *
 * ⚠️ **La ventana de 24 h de Meta.** Texto libre solo llega si ese número le
 * escribió al negocio en las últimas 24 h. Fuera de eso Kapso responde
 * `Cannot send non-template messages outside the 24-hour window` y el aviso se
 * pierde. Como estos avisos los dispara un cron, el caso normal es estar FUERA
 * de la ventana: configurá `ADMIN_NOTIFY_TEMPLATE` con una plantilla aprobada de
 * un solo parámetro de cuerpo y el texto viaja adentro.
 *
 * La respuesta trae `fallidos[]` con el motivo de cada número: sin eso un aviso
 * que no llega es indistinguible de un flujo que no avisó nada.
 *
 * Auth: header `x-admin-secret`. Body: { text }.
 */

import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { avisarAdmins } from "@/lib/whatsapp/avisar-admins";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Falta text" }, { status: 400 });

  // A quién y cómo llega (ventana de 24 h, plantilla) vive en lib/whatsapp/avisar-admins.ts,
  // compartido con la derivación a humano del asesor.
  return NextResponse.json(await avisarAdmins(text));
}
