/**
 * POST /api/auction/evaluate — evalúa y rankea las pujas de un lead.
 *
 * Lo llama n8n cuando hay pujas nuevas para un lead (o al cerrar la ventana).
 * Carga el lead + sus ofertas pendientes, resuelve P_publicado desde Sanity,
 * corre el motor de scoring (lib/auction/score.ts), escribe el resultado en
 * `ofertas` y devuelve el ranking. La lógica vive acá (testeable); n8n solo
 * orquesta — mismo patrón que price-check.
 *
 * Auth: header `x-admin-secret: <ADMIN_API_SECRET>` (patrón de pdp-research).
 * Body: { "leadId": number }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { getPublishedPrice } from "@/lib/auction/pricing";
import { cercaniaZona, normalize } from "@/lib/auction/geo";
import {
  evaluateOffer,
  type LeadScoringInput,
  type OfferScoringInput,
  type CercaniaZona,
  type VersionMatch,
} from "@/lib/auction/score";

export const runtime = "nodejs";

// Estados de oferta que todavía se re-evalúan (no finalizados).
const EVALUABLES = new Set(["pendiente", "evaluada"]);

interface OfferRow {
  id: string;
  vendor_id: string | null;
  precio_oferta: number;
  horas_entrega: number;
  version_match: VersionMatch;
  cercania_zona: CercaniaZona | null;
  acepta_financiamiento: boolean;
  valor_regalias: number;
  precio_publicado: number | null;
  estado: string;
  leads_vendors: { region: string | null; comuna: string | null; estado: string | null } | null;
}

/** El lead requiere financiamiento salvo que pague al contado o no esté seguro. */
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
  if (!sb) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
  }

  let body: { leadId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const leadId = body.leadId;
  if (typeof leadId !== "number") {
    return NextResponse.json({ error: "Falta leadId (number)" }, { status: 400 });
  }

  // 1) Lead
  const { data: lead, error: leadErr } = await sb
    .from("leads")
    .select("id, region, comuna, target_model, financing, status, cerrada_at")
    .eq("id", leadId)
    .single();
  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }
  if (!lead.target_model) {
    return NextResponse.json({ error: "El lead no tiene target_model" }, { status: 422 });
  }

  // Guarda: si la subasta ya cerró, las pujas que llegan tarde no compiten.
  // Se marcan 'expirada' y no se confirman ni evalúan.
  if (lead.cerrada_at) {
    await sb.from("ofertas").update({ estado: "expirada" }).eq("lead_id", leadId).eq("estado", "pendiente");
    return NextResponse.json({ leadId, leadCerrada: true, evaluated: [], ranking: [] });
  }

  // 2) P_publicado desde Sanity
  const priced = await getPublishedPrice(lead.target_model);

  // 3) Ofertas del lead (con la ubicación del vendedor para recomputar cercanía)
  const { data: offers, error: offersErr } = await sb
    .from("ofertas")
    .select(
      "id, vendor_id, precio_oferta, horas_entrega, version_match, cercania_zona, acepta_financiamiento, valor_regalias, precio_publicado, estado, leads_vendors(region, comuna, estado)",
    )
    .eq("lead_id", leadId)
    .returns<OfferRow[]>();
  if (offersErr) {
    return NextResponse.json({ error: `No se pudieron leer las ofertas: ${offersErr.message}` }, { status: 500 });
  }

  const evaluables = (offers ?? []).filter((o) => EVALUABLES.has(o.estado));
  if (evaluables.length === 0) {
    return NextResponse.json({ leadId, precioPublicado: priced?.precioPublicado ?? null, evaluated: [], ranking: [] });
  }

  const leadScoring: LeadScoringInput = {
    // P_publicado autoritativo: Sanity; fallback al snapshot de la oferta.
    precioPublicado: priced?.precioPublicado ?? 0,
    requiereFinanciamiento: requiereFinanciamiento(lead.financing),
    financiamientoObligatorio: true,
  };

  // 4) Evaluar cada oferta y persistir
  const evaluated: Array<{ offerId: string; scoreTotal: number | null; descalificada: boolean; motivo?: string; estado: string }> = [];
  const validos: Array<{ offerId: string; scoreTotal: number; precio: number }> = [];

  for (const o of evaluables) {
    // P_publicado de esta oferta: el global de Sanity, o el snapshot que guardó la puja.
    const precioPublicado = priced?.precioPublicado ?? o.precio_publicado ?? 0;
    const leadForOffer: LeadScoringInput = { ...leadScoring, precioPublicado };

    // Cercanía autoritativa: recomputada desde la ubicación real del vendedor;
    // si no hay ubicación, se usa la almacenada en la puja.
    const cercania: CercaniaZona =
      o.leads_vendors?.region != null
        ? cercaniaZona(lead.region, lead.comuna, o.leads_vendors.region, o.leads_vendors.comuna)
        : o.cercania_zona ?? "distante";

    const input: OfferScoringInput = {
      precio: o.precio_oferta,
      horasEntrega: o.horas_entrega,
      version: o.version_match,
      cercania,
      aceptaFinanciamiento: o.acepta_financiamiento,
      valorRegalias: o.valor_regalias,
      oferenteVerificado: !["suspendido", "inactivo", "baja", "rechazado", "eliminado"].includes(
        normalize(o.leads_vendors?.estado),
      ),
    };
    const result = precioPublicado > 0
      ? evaluateOffer(leadForOffer, input)
      : ({ status: "DESCALIFICADA", motivo: "Sin precio publicado de referencia" } as const);

    const nuevoEstado = result.status === "VALIDA" ? "evaluada" : "perdida";
    await sb
      .from("ofertas")
      .update({
        cercania_zona: cercania,
        precio_publicado: precioPublicado || null,
        score_total: result.status === "VALIDA" ? result.scoreTotal : null,
        score_desglose: result.status === "VALIDA" ? result.desglose : null,
        descalificada: result.status === "DESCALIFICADA",
        motivo_descalificacion: result.status === "DESCALIFICADA" ? result.motivo : null,
        alertas: result.status === "VALIDA" ? result.alertas : null,
        estado: nuevoEstado,
      })
      .eq("id", o.id);

    evaluated.push({
      offerId: o.id,
      scoreTotal: result.status === "VALIDA" ? result.scoreTotal : null,
      descalificada: result.status === "DESCALIFICADA",
      motivo: result.status === "DESCALIFICADA" ? result.motivo : undefined,
      estado: nuevoEstado,
    });
    if (result.status === "VALIDA") {
      validos.push({ offerId: o.id, scoreTotal: result.scoreTotal, precio: o.precio_oferta });
    }
  }

  // 5) Ranking de las válidas (mejor score primero; empate → precio más bajo).
  //    Usa los scores ya calculados (cada oferta con su propio P_publicado).
  const ranking = validos
    .sort((a, b) => b.scoreTotal - a.scoreTotal || a.precio - b.precio)
    .map((v) => v.offerId);

  return NextResponse.json({
    leadId,
    precioPublicado: priced?.precioPublicado ?? null,
    matched: priced?.matched ?? null,
    evaluated,
    ranking,
  });
}
