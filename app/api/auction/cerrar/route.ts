/**
 * POST /api/auction/cerrar — cierra la subasta de un lead (atómico).
 *
 * Lo llama el cron "Tiempo de puja agotado" por cada leadId vencido. Hace TODO
 * el trabajo de estado de una vez (evita carreras y doble envío):
 *   1. Si ya está cerrado, responde { yaCerrada: true } (idempotente).
 *   2. Toma las ofertas evaluadas, deja UNA por vendedor (la de mejor score),
 *      elige la ganadora y arma el mensaje comparativo para el cliente.
 *   3. Marca ganadora / perdedoras y cierra el lead (cerrada_at).
 *   4. Devuelve lo que n8n necesita para notificar (cliente + ganadora + perdedores).
 *
 * Auth: header `x-admin-secret`. Body: { "leadId": 123 }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { normalize } from "@/lib/auction/geo";
import { generateClientComparison, type OfferForMessage } from "@/lib/auction/offer-message";
import { renderEmail, buildOfertasCards, CERCANIA_UBICACION, horasATexto, type OfertaCard } from "@/lib/auction/emails";
import { WHATSAPP_LINK } from "@/lib/auction/config";
import { offerRecovery } from "@/lib/auction/recovery";
import { adminPhones } from "@/lib/whatsapp/admin";
import { sendProactiveText } from "@/lib/whatsapp/outbound";
import type { CercaniaZona, VersionMatch } from "@/lib/auction/score";

export const runtime = "nodejs";

interface OfferRow {
  id: string;
  vendor_id: string | null;
  precio_oferta: number;
  precio_publicado: number | null;
  score_total: number | null;
  cercania_zona: CercaniaZona | null;
  horas_entrega: number;
  acepta_financiamiento: boolean;
  valor_regalias: number;
  version_match: VersionMatch;
  marca_ofertada: string | null;
  modelo_ofertado: string | null;
  anio_ofertado: number | null;
  leads_vendors: { nombre: string | null; telefono: string | null; email: string | null } | null;
}

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

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

  let body: { leadId?: number };
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
    .select("id, first_name, telefono, email, comuna, target_model, financing, cerrada_at")
    .eq("id", body.leadId)
    .single();
  if (leadErr || !lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  if (lead.cerrada_at) return NextResponse.json({ leadId: body.leadId, yaCerrada: true });

  // Cierre ATÓMICO: reclamamos el lead con un update condicional (cerrada_at IS NULL).
  // Si dos crons disparan /cerrar casi a la vez, solo UNO afecta la fila; el otro sale
  // sin enviar nada. Sin esto (leer-y-después-escribir) ambos mandarían las ofertas al
  // cliente → correo/WhatsApp duplicado. Se reclama ANTES de armar/enviar nada.
  const cerradaAt = new Date().toISOString();
  const { data: claimed, error: claimErr } = await sb
    .from("leads")
    .update({ cerrada_at: cerradaAt })
    .eq("id", body.leadId)
    .is("cerrada_at", null)
    .select("id");
  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 });
  if (!claimed || claimed.length === 0) return NextResponse.json({ leadId: body.leadId, yaCerrada: true });

  const { data: offers, error: offersErr } = await sb
    .from("ofertas")
    .select(
      "id, vendor_id, precio_oferta, precio_publicado, score_total, cercania_zona, horas_entrega, acepta_financiamiento, valor_regalias, version_match, marca_ofertada, modelo_ofertado, anio_ofertado, leads_vendors(nombre, telefono, email)",
    )
    .eq("lead_id", body.leadId)
    .eq("estado", "evaluada")
    .returns<OfferRow[]>();
  if (offersErr) return NextResponse.json({ error: offersErr.message }, { status: 500 });

  // Sin ofertas: nadie pujó. Se cierra, se le ofrece recuperación al cliente
  // (o devolución si está en el tope) y se le avisa a Francisco.
  if (!offers || offers.length === 0) {
    // cerrada_at ya quedó seteado por el claim atómico de arriba.
    const recoveryMsg = await offerRecovery(sb, body.leadId, lead.target_model);
    const htmlEmailSinOfertas = renderEmail("sin-ofertas", {
      nombre: lead.first_name ?? "",
      modelo: lead.target_model,
      whatsapp_url: WHATSAPP_LINK,
    });
    // Aviso a Francisco (best-effort).
    for (const p of adminPhones()) {
      await sendProactiveText(p, `⚠️ El lead #${body.leadId} (${lead.target_model}) cerró SIN ofertas de vendedores.`).catch(() => {});
    }
    return NextResponse.json({
      leadId: body.leadId,
      yaCerrada: false,
      sinOfertas: true,
      cliente: { nombre: lead.first_name ?? null, telefono: lead.telefono ?? null, email: lead.email ?? null },
      message: recoveryMsg,
      htmlEmailSinOfertas,
      datos: { modelo: lead.target_model },
    });
  }

  // Una oferta por vendedor: la de mejor score (resuelve las re-pujas).
  const mejorPorVendedor = new Map<string, OfferRow>();
  for (const o of offers) {
    const key = o.vendor_id ?? o.id;
    const prev = mejorPorVendedor.get(key);
    if (!prev || (o.score_total ?? 0) > (prev.score_total ?? 0)) mejorPorVendedor.set(key, o);
  }
  const ranked = [...mejorPorVendedor.values()].sort(
    (a, b) => (b.score_total ?? 0) - (a.score_total ?? 0) || a.precio_oferta - b.precio_oferta,
  );

  const top = ranked.slice(0, 2); // 1–2 mejores que se le muestran al cliente
  const mejor = ranked[0]; // referencia de precio para avisar a los perdedores

  const offersMsg: OfferForMessage[] = top.map((o) => ({
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
    comunaVendedor: undefined,
  }));

  const message = await generateClientComparison(
    {
      nombre: lead.first_name ?? undefined,
      targetModel: lead.target_model,
      comuna: lead.comuna ?? undefined,
      requiereFinanciamiento: requiereFinanciamiento(lead.financing),
    },
    offersMsg,
  );

  // Las 1–2 mejores → 'enviada_cliente' (esperando que el cliente elija).
  // El resto de las evaluadas → 'perdida'. Y se cierra la puja del lead.
  const sentIds = top.map((o) => o.id);
  await sb.from("ofertas").update({ estado: "enviada_cliente" }).in("id", sentIds);
  await sb.from("ofertas").update({ estado: "perdida" }).eq("lead_id", body.leadId).eq("estado", "evaluada");
  // cerrada_at ya quedó seteado por el claim atómico de arriba.

  // Perdedores del cierre = los que NO se le muestran al cliente (más allá del top).
  // (Los del top que el cliente no elija se marcan perdida al aceptar.)
  const perdedores = ranked
    .slice(top.length)
    .map((o) => o.leads_vendors)
    .filter((v): v is NonNullable<typeof v> => Boolean(v && (v.telefono || v.email)))
    .map((v) => ({ nombre: v.nombre, telefono: v.telefono, email: v.email }));

  // Correos ya armados (diseño de emails/) para que n8n solo los envíe.
  const cards: OfertaCard[] = top.map((o) => ({
    modelo: [o.marca_ofertada, o.modelo_ofertado].filter(Boolean).join(" ") || lead.target_model,
    precio: CLP(o.precio_oferta),
    ahorro: CLP((o.precio_publicado ?? o.precio_oferta) - o.precio_oferta),
    ubicacion: CERCANIA_UBICACION[o.cercania_zona ?? "distante"],
    entrega: horasATexto(o.horas_entrega),
  }));
  const htmlEmailCliente = renderEmail(
    "ofertas-cliente",
    { nombre: lead.first_name ?? "", modelo: lead.target_model, whatsapp_url: WHATSAPP_LINK },
    { ofertas_cards: buildOfertasCards(cards) },
  );
  const htmlEmailPerdedor = renderEmail("lead-no-adjudicado", {
    modelo: lead.target_model,
    valor_ganador: CLP(mejor.precio_oferta),
  });

  return NextResponse.json({
    leadId: body.leadId,
    yaCerrada: false,
    cliente: { nombre: lead.first_name ?? null, telefono: lead.telefono ?? null, email: lead.email ?? null },
    message,
    htmlEmailCliente,
    htmlEmailPerdedor,
    datos: { nombre: lead.first_name ?? "", modelo: lead.target_model, nOfertas: top.length },
    offerIds: sentIds,
    valorReferenciaFmt: CLP(mejor.precio_oferta), // mejor oferta, anonimizada, para perdedores
    perdedores,
  });
}
