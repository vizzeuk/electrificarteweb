/**
 * POST /api/auction/message/pressure — genera el mensaje de presión para un vendedor.
 *
 * Lo llama n8n mientras la ventana está abierta, para incentivar a un vendedor a
 * mejorar su puja. La urgencia se ancla a señales REALES calculadas desde
 * `ofertas` (nº compitiendo, mejor puja vigente, su puja) — nunca se inventa
 * competencia (ver lib/auction/pressure-message.ts).
 *
 * Auth: header `x-admin-secret: <ADMIN_API_SECRET>`
 * Body: { "offerId": "uuid", "horasRestantes"?: 24 }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { generatePressureMessage } from "@/lib/auction/pressure-message";
import { renderEmail, CLP } from "@/lib/auction/emails";
import { DASHBOARD_URL } from "@/lib/auction/config";

export const runtime = "nodejs";

const DEFAULT_HORAS_RESTANTES = 24;

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  let body: { offerId?: string; horasRestantes?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof body.offerId !== "string") {
    return NextResponse.json({ error: "Falta offerId (string)" }, { status: 400 });
  }

  // La oferta + su vendedor + el lead (para el modelo buscado).
  const { data: offer, error: offerErr } = await sb
    .from("ofertas")
    .select("id, lead_id, precio_oferta, leads_vendors(nombre, telefono, email), leads(target_model)")
    .eq("id", body.offerId)
    .single<{
      id: string;
      lead_id: number;
      precio_oferta: number;
      leads_vendors: { nombre: string | null; telefono: string | null; email: string | null } | null;
      leads: { target_model: string | null } | null;
    }>();
  if (offerErr || !offer) return NextResponse.json({ error: "Oferta no encontrada" }, { status: 404 });

  // Señales reales de competencia: otras pujas válidas del mismo lead.
  const { data: competing } = await sb
    .from("ofertas")
    .select("precio_oferta")
    .eq("lead_id", offer.lead_id)
    .eq("estado", "evaluada");
  const precios = (competing ?? []).map((c) => c.precio_oferta);
  const mejorPrecioActual = precios.length ? Math.min(...precios) : offer.precio_oferta;

  const message = await generatePressureMessage({
    nombreVendedor: offer.leads_vendors?.nombre ?? undefined,
    targetModel: offer.leads?.target_model ?? "el modelo solicitado",
    vendedoresCompitiendo: precios.length,
    mejorPrecioActual,
    suPrecioActual: offer.precio_oferta,
    horasRestantes: body.horasRestantes ?? DEFAULT_HORAS_RESTANTES,
  });

  // Marca que esta oferta fue presionada ahora (throttle del cron de presión).
  await sb.from("ofertas").update({ ultima_presion_at: new Date().toISOString() }).eq("id", offer.id);

  const modelo = offer.leads?.target_model ?? "el modelo solicitado";
  const horas = body.horasRestantes ?? DEFAULT_HORAS_RESTANTES;
  const htmlEmail = renderEmail("presion-vendedor", {
    modelo,
    competidores: precios.length,
    mejor_precio: CLP(mejorPrecioActual),
    horas,
    cta_url: DASHBOARD_URL,
  });

  return NextResponse.json({
    offerId: offer.id,
    message,
    htmlEmail,
    vendor: {
      nombre: offer.leads_vendors?.nombre ?? null,
      telefono: offer.leads_vendors?.telefono ?? null,
      email: offer.leads_vendors?.email ?? null,
    },
    // Datos estructurados para la plantilla `mejora_tu_oferta` (envío en frío).
    datos: {
      modelo,
      vendedoresCompitiendo: precios.length,
      mejorPrecioActual,
    },
  });
}
