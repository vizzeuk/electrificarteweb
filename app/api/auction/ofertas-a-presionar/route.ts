/**
 * POST /api/auction/ofertas-a-presionar — ofertas a las que empujar a mejorar.
 *
 * Lo llama el cron de presión ("X horas antes del cierre"). Devuelve las ofertas
 * que: (1) son de leads cuya ventana cierra dentro de PRESSURE_HOURS_BEFORE,
 * (2) NO van primeras en su lead (no lidera → tiene sentido presionarla), y
 * (3) no fueron presionadas hace menos de PRESSURE_THROTTLE_HOURS (anti-spam).
 * El cron hace split y por cada una llama /message/pressure.
 *
 * Auth: header `x-admin-secret`. Body: {} (o { horasAntes }).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { PRESSURE_HOURS_BEFORE, PRESSURE_THROTTLE_HOURS } from "@/lib/auction/config";

export const runtime = "nodejs";

interface OfferRow {
  id: string;
  lead_id: number;
  score_total: number | null;
  ultima_presion_at: string | null;
}

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  let horasAntes = PRESSURE_HOURS_BEFORE;
  try {
    const body = await req.json();
    if (typeof body?.horasAntes === "number") horasAntes = body.horasAntes;
  } catch { /* body opcional */ }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const limiteIso = new Date(now + horasAntes * 3600_000).toISOString();

  // Leads que cierran dentro de la ventana de presión y siguen abiertos.
  const { data: leads, error: leadsErr } = await sb
    .from("leads")
    .select("id, cierra_at")
    .is("cerrada_at", null)
    .gt("cierra_at", nowIso)
    .lt("cierra_at", limiteIso);
  if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 });

  const leadIds = (leads ?? []).map((l) => l.id);
  if (leadIds.length === 0) return NextResponse.json({ total: 0, ofertas: [] });

  // Horas restantes por lead (para el mensaje de presión).
  const horasRestantesPorLead = new Map<number, number>();
  for (const l of leads ?? []) {
    const ms = l.cierra_at ? new Date(l.cierra_at).getTime() - now : 0;
    horasRestantesPorLead.set(l.id, Math.max(1, Math.round(ms / 3600_000)));
  }

  const { data: offers, error: offersErr } = await sb
    .from("ofertas")
    .select("id, lead_id, score_total, ultima_presion_at")
    .in("lead_id", leadIds)
    .eq("estado", "evaluada")
    .returns<OfferRow[]>();
  if (offersErr) return NextResponse.json({ error: offersErr.message }, { status: 500 });

  const throttleMs = PRESSURE_THROTTLE_HOURS * 3600_000;
  const porLead = new Map<number, OfferRow[]>();
  for (const o of offers ?? []) {
    (porLead.get(o.lead_id) ?? porLead.set(o.lead_id, []).get(o.lead_id)!).push(o);
  }

  const ofertas: Array<{ offerId: string; leadId: number; horasRestantes: number }> = [];
  for (const [leadId, grupo] of porLead) {
    // Ordena por score desc; la primera lidera, el resto son candidatas a presión.
    grupo.sort((a, b) => (b.score_total ?? 0) - (a.score_total ?? 0));
    const horasRestantes = horasRestantesPorLead.get(leadId) ?? 24;
    for (let i = 1; i < grupo.length; i++) {
      const o = grupo[i];
      const last = o.ultima_presion_at ? new Date(o.ultima_presion_at).getTime() : 0;
      if (now - last >= throttleMs) ofertas.push({ offerId: o.id, leadId, horasRestantes });
    }
  }

  return NextResponse.json({ total: ofertas.length, ofertas });
}
