/**
 * POST /api/auction/oferta-info — datos de una oferta + contacto de su vendedor.
 *
 * Lo usa el flujo "Entra una puja" para confirmarle al vendedor que registramos
 * su puja (necesita su teléfono/correo, que no vienen en el webhook de Supabase).
 *
 * Auth: header `x-admin-secret`. Body: { "offerId": "uuid" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { renderEmail } from "@/lib/auction/emails";

export const runtime = "nodejs";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  let body: { offerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof body.offerId !== "string") {
    return NextResponse.json({ error: "Falta offerId (string)" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("ofertas")
    .select("id, precio_oferta, marca_ofertada, modelo_ofertado, leads_vendors(nombre, telefono, email), leads(target_model)")
    .eq("id", body.offerId)
    .single<{
      id: string;
      precio_oferta: number;
      marca_ofertada: string | null;
      modelo_ofertado: string | null;
      leads_vendors: { nombre: string | null; telefono: string | null; email: string | null } | null;
      leads: { target_model: string | null } | null;
    }>();
  if (error || !data) return NextResponse.json({ error: "Oferta no encontrada" }, { status: 404 });

  const modelo =
    [data.marca_ofertada, data.modelo_ofertado].filter(Boolean).join(" ") ||
    data.leads?.target_model ||
    "el vehículo";

  const htmlEmail = renderEmail("confirmacion-puja", { modelo, precio: CLP(data.precio_oferta) });

  return NextResponse.json({
    offerId: data.id,
    modelo,
    precio: data.precio_oferta,
    precioFmt: CLP(data.precio_oferta),
    htmlEmail,
    vendor: {
      nombre: data.leads_vendors?.nombre ?? null,
      telefono: data.leads_vendors?.telefono ?? null,
      email: data.leads_vendors?.email ?? null,
    },
  });
}
