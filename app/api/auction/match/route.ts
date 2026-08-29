/**
 * POST /api/auction/match — rutea un lead a los vendedores que calzan.
 *
 * Lo llama n8n cuando entra un lead pagado, para saber a QUIÉNES notificar
 * (marca + cercanía). Devuelve los vendedores elegibles con su contacto para
 * que n8n mande WhatsApp (Kapso) + correo (Resend). Lógica en lib/auction/routing.ts.
 *
 * Auth: header `x-admin-secret: <ADMIN_API_SECRET>`
 * Body: { "leadId": 123 }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { getBrandNames } from "@/lib/auction/pricing";
import { matchVendors, type VendorProfile } from "@/lib/auction/routing";
import { WINDOW_HOURS, DASHBOARD_URL } from "@/lib/auction/config";
import { renderEmail } from "@/lib/auction/emails";

export const runtime = "nodejs";

interface VendorRow {
  id: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  region: string | null;
  comuna: string | null;
  marcas: string | null;
  estado: string | null;
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
    .select("id, region, comuna, target_model, cierra_at")
    .eq("id", body.leadId)
    .single();
  if (leadErr || !lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  if (!lead.target_model) return NextResponse.json({ error: "El lead no tiene target_model" }, { status: 422 });

  // Sella la hora de cierre de la subasta al entrar el lead (si aún no la tiene).
  let cierraAt = lead.cierra_at as string | null;
  if (!cierraAt) {
    cierraAt = new Date(Date.now() + WINDOW_HOURS * 3600_000).toISOString();
    await sb.from("leads").update({ cierra_at: cierraAt }).eq("id", body.leadId);
  }

  const { data: vendors, error: vendorsErr } = await sb
    .from("leads_vendors")
    .select("id, nombre, telefono, email, region, comuna, marcas, estado")
    .returns<VendorRow[]>();
  if (vendorsErr) return NextResponse.json({ error: `No se pudieron leer los vendedores: ${vendorsErr.message}` }, { status: 500 });

  const brands = await getBrandNames();
  const profiles: VendorProfile[] = (vendors ?? []).map((v) => ({
    id: v.id, nombre: v.nombre, region: v.region, comuna: v.comuna, marcas: v.marcas, estado: v.estado,
  }));
  const matches = matchVendors(
    { region: lead.region, comuna: lead.comuna, targetModel: lead.target_model },
    profiles,
    { knownBrands: brands },
  );

  const byId = new Map((vendors ?? []).map((v) => [v.id, v]));
  const eligible = matches
    .filter((m) => m.elegible)
    .map((m) => {
      const v = byId.get(m.vendor.id)!;
      return { vendorId: v.id, nombre: v.nombre, telefono: v.telefono, email: v.email, cercania: m.cercania };
    });

  const htmlEmail = renderEmail("nuevo-lead-vendedor", {
    modelo: lead.target_model,
    comuna: lead.comuna ?? "tu zona",
    cta_url: DASHBOARD_URL,
  });

  return NextResponse.json({
    leadId: body.leadId,
    targetModel: lead.target_model,
    region: lead.region ?? null,
    comuna: lead.comuna ?? null,
    cierraAt,
    total: eligible.length,
    eligible,
    htmlEmail,
  });
}
