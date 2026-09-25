// Aviso por WhatsApp a los números de ADMIN_PHONE_NUMBERS.
//
// Lo usan /api/admin/notify (avisos de n8n) y la derivación a humano del asesor
// (lib/whatsapp/derivacion.ts). Vive acá para que la lista de números, la
// ventana de 24 h de Meta y el fallback a plantilla estén en un solo lugar.
//
// ⚠️ Texto libre solo llega si ese admin le escribió al negocio en las últimas
// 24 h. Fuera de eso el único camino es la plantilla ADMIN_NOTIFY_TEMPLATE.

import { adminPhones } from "@/lib/whatsapp/admin";
import { sendProactiveText, sendTemplate } from "@/lib/whatsapp/outbound";
import { aplanarParaPlantilla } from "@/lib/whatsapp/plantilla";

export interface ResultadoAviso {
  sent: number;
  phones: number;
  viaPlantilla: number;
  fallidos: { phone: string; motivo: string }[];
  warning?: string;
}

export async function avisarAdmins(text: string): Promise<ResultadoAviso> {
  const template = process.env.ADMIN_NOTIFY_TEMPLATE;
  const templateLang = process.env.ADMIN_NOTIFY_TEMPLATE_LANG ?? "es";
  const phones = adminPhones();
  if (phones.length === 0) {
    console.warn("[avisar-admins] ADMIN_PHONE_NUMBERS vacío — el aviso no se mandó a nadie");
    return { sent: 0, phones: 0, viaPlantilla: 0, fallidos: [], warning: "ADMIN_PHONE_NUMBERS vacío" };
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
    if (template && (await sendTemplate(phone, template, templateLang, [aplanarParaPlantilla(text)]))) {
      sent++;
      viaPlantilla++;
      continue;
    }
    fallidos.push({
      phone: `…${phone.slice(-4)}`,
      motivo: template
        ? `ni texto libre ni la plantilla "${template}" pudieron entregarse`
        : "fuera de la ventana de 24 h y no hay ADMIN_NOTIFY_TEMPLATE configurada",
    });
  }

  if (fallidos.length) {
    console.warn(`[avisar-admins] ${fallidos.length}/${phones.length} avisos no se entregaron:`, fallidos);
  }
  return { sent, phones: phones.length, viaPlantilla, fallidos };
}
