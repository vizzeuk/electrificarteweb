/**
 * POST /api/auction/leads-por-cerrar — leads cuya ventana de subasta ya venció.
 *
 * Lo llama el cron "Tiempo de puja agotado": devuelve los leadId a cerrar
 * (cierra_at pasado y aún sin cerrar). Por cada uno, el cron llama /cerrar.
 *
 * Auth: header `x-admin-secret`. Body: {} (sin parámetros).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/whatsapp/subscription";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  const nowIso = new Date().toISOString();
  const { data, error } = await sb
    .from("leads")
    .select("id")
    .lt("cierra_at", nowIso)
    .is("cerrada_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leads = (data ?? []).map((l) => ({ leadId: l.id }));
  return NextResponse.json({ total: leads.length, leads });
}
