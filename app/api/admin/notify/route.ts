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
import { adminPhones } from "@/lib/whatsapp/admin";
import { sendProactiveText, sendTemplate } from "@/lib/whatsapp/outbound";
import { aplanarParaPlantilla } from "@/lib/whatsapp/plantilla";

export const runtime = "nodejs";
export const maxDuration = 60;

const TEMPLATE = process.env.ADMIN_NOTIFY_TEMPLATE;
const TEMPLATE_LANG = process.env.ADMIN_NOTIFY_TEMPLATE_LANG ?? "es";

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
  let viaPlantilla = 0;
  const fallidos: { phone: string; motivo: string }[] = [];

  for (const phone of phones) {
    if (await sendProactiveText(phone, text.slice(0, 3_000))) {
      sent++;
      continue;
    }
    // Casi siempre es la ventana de 24 h. La plantilla es el único camino.
    if (TEMPLATE && (await sendTemplate(phone, TEMPLATE, TEMPLATE_LANG, [aplanarParaPlantilla(text)]))) {
      sent++;
      viaPlantilla++;
      continue;
    }
    fallidos.push({
      phone: `…${phone.slice(-4)}`,
      motivo: TEMPLATE
        ? `ni texto libre ni la plantilla "${TEMPLATE}" pudieron entregarse`
        : "fuera de la ventana de 24 h y no hay ADMIN_NOTIFY_TEMPLATE configurada",
    });
  }

  if (fallidos.length) {
    console.warn(`[admin/notify] ${fallidos.length}/${phones.length} avisos no se entregaron:`, fallidos);
  }

  return NextResponse.json({ sent, phones: phones.length, viaPlantilla, fallidos });
}
