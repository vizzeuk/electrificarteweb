/**
 * POST /api/auction/oos-pendientes — seguimiento OOS ("¿se concretó la venta?").
 *
 * Lo llama un cron. Devuelve las ventas aceptadas hace más de OOS_HOURS a las que
 * todavía no se les preguntó si se concretaron, con el contacto del cliente. Marca
 * `oos_at` para no volver a preguntar. n8n manda el mensaje (Kapso/Resend).
 *
 * Auth: header `x-admin-secret`. Body: {}.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { OOS_HOURS, WHATSAPP_LINK } from "@/lib/auction/config";
import { renderEmail } from "@/lib/auction/emails";

export const runtime = "nodejs";

interface Row {
  id: string;
  lead_id: number;
  marca_ofertada: string | null;
  modelo_ofertado: string | null;
  leads: { first_name: string | null; telefono: string | null; email: string | null; target_model: string | null } | null;
}

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  const limiteIso = new Date(Date.now() - OOS_HOURS * 3600_000).toISOString();
  const { data, error } = await sb
    .from("ofertas")
    .select("id, lead_id, marca_ofertada, modelo_ofertado, leads(first_name, telefono, email, target_model)")
    .eq("estado", "aceptada")
    .is("oos_at", null)
    .lt("aceptada_at", limiteIso)
    .returns<Row[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ahora = new Date().toISOString();
  const pendientes = [];
  for (const o of data ?? []) {
    await sb.from("ofertas").update({ oos_at: ahora }).eq("id", o.id);
    const modelo = [o.marca_ofertada, o.modelo_ofertado].filter(Boolean).join(" ") || o.leads?.target_model || "tu auto";
    const nombre = o.leads?.first_name ?? "";
    pendientes.push({
      offerId: o.id,
      leadId: o.lead_id,
      modelo,
      cliente: { nombre: o.leads?.first_name ?? null, telefono: o.leads?.telefono ?? null, email: o.leads?.email ?? null },
      htmlEmail: renderEmail("seguimiento-oos", { nombre, modelo, whatsapp_url: WHATSAPP_LINK }),
    });
  }

  return NextResponse.json({ total: pendientes.length, pendientes });
}
