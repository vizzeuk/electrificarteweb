/**
 * POST /api/auction/message/client — genera el mensaje comparativo para el cliente.
 *
 * Lo llama n8n al cerrar la ventana, para mandarle al cliente (WhatsApp/correo)
 * las 1–2 mejores ofertas ya redactadas. Los datos salen de `ofertas`; la IA
 * solo redacta (ver lib/auction/offer-message.ts).
 *
 * Auth: header `x-admin-secret: <ADMIN_API_SECRET>`
 * Body: { "leadId": 123, "offerIds"?: ["uuid"...], "top"?: 2 }
 *   - offerIds: ofertas específicas a comparar. Si no se pasa, usa las mejores
 *     `top` (default 2) ya evaluadas del lead.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { normalize } from "@/lib/auction/geo";
import { generateClientComparison, type OfferForMessage, type LeadForMessage } from "@/lib/auction/offer-message";
import type { CercaniaZona, VersionMatch } from "@/lib/auction/score";

export const runtime = "nodejs";

interface OfferRow {
  id: string;
  precio_oferta: number;
  precio_publicado: number | null;
  cercania_zona: CercaniaZona | null;
  horas_entrega: number;
  acepta_financiamiento: boolean;
  valor_regalias: number;
  version_match: VersionMatch;
  marca_ofertada: string | null;
  modelo_ofertado: string | null;
  anio_ofertado: number | null;
  score_total: number | null;
  leads_vendors: { comuna: string | null } | null;
}

function requiereFinanciamiento(financing: string | null): boolean {
  const f = normalize(financing);
  return f !== "" && f !== "contado" && f !== "no-seguro";
}

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  let body: { leadId?: number; offerIds?: string[]; top?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof body.leadId !== "number") {
    return NextResponse.json({ error: "Falta leadId (number)" }, { status: 400 });
  }

  const { data: lead, error: leadErr } = await sb
    .from("leads")
    .select("id, first_name, telefono, email, region, comuna, target_model, financing")
    .eq("id", body.leadId)
    .single();
  if (leadErr || !lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  if (!lead.target_model) return NextResponse.json({ error: "El lead no tiene target_model" }, { status: 422 });

  // Ofertas a comparar: las indicadas, o las mejores evaluadas del lead.
  let query = sb
    .from("ofertas")
    .select(
      "id, precio_oferta, precio_publicado, cercania_zona, horas_entrega, acepta_financiamiento, valor_regalias, version_match, marca_ofertada, modelo_ofertado, anio_ofertado, score_total, leads_vendors(comuna)",
    )
    .eq("lead_id", body.leadId)
    .eq("estado", "evaluada");
  if (body.offerIds && body.offerIds.length > 0) query = query.in("id", body.offerIds);

  const { data: offers, error: offersErr } = await query
    .order("score_total", { ascending: false })
    .limit(body.offerIds?.length || body.top || 2)
    .returns<OfferRow[]>();
  if (offersErr) return NextResponse.json({ error: `No se pudieron leer las ofertas: ${offersErr.message}` }, { status: 500 });
  if (!offers || offers.length === 0) {
    return NextResponse.json({ error: "No hay ofertas evaluadas para este lead" }, { status: 422 });
  }

  const offersMsg: OfferForMessage[] = offers.map((o) => ({
    marca: o.marca_ofertada ?? "",
    modelo: o.modelo_ofertado ?? "",
    anio: o.anio_ofertado ?? undefined,
    precioOferta: o.precio_oferta,
    precioPublicado: o.precio_publicado ?? o.precio_oferta,
    cercania: o.cercania_zona ?? "distante",
    horasEntrega: o.horas_entrega,
    aceptaFinanciamiento: o.acepta_financiamiento,
    valorRegalias: o.valor_regalias,
    versionMatch: o.version_match,
    comunaVendedor: o.leads_vendors?.comuna ?? undefined,
  }));

  const leadForMsg: LeadForMessage = {
    nombre: lead.first_name ?? undefined,
    targetModel: lead.target_model,
    comuna: lead.comuna ?? undefined,
    requiereFinanciamiento: requiereFinanciamiento(lead.financing),
  };

  const message = await generateClientComparison(leadForMsg, offersMsg);
  return NextResponse.json({
    leadId: body.leadId,
    offerIds: offers.map((o) => o.id),
    message,
    cliente: { nombre: lead.first_name ?? null, telefono: lead.telefono ?? null, email: lead.email ?? null },
    // Datos estructurados para la plantilla `ofertas_listas_cliente` (envío en frío).
    datos: { nombre: lead.first_name ?? "", modelo: lead.target_model, nOfertas: offers.length },
  });
}
