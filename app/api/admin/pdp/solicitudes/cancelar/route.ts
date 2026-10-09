/**
 * POST /api/admin/pdp/solicitudes/cancelar — borra una solicitud que todavía
 * no tomó el flujo (docs/DASHBOARD_PDP_CREACION.md).
 *
 * Body: { id }. Solo borra si sigue en "listo": una vez tomada ya hay (o va a
 * haber) una sesión del agente gastando, y cortarla a mitad deja el borrador a
 * medias. El `and estado = 'listo'` hace la operación idempotente.
 *
 * Auth: header `x-admin-secret`.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { TABLA } from "@/lib/pdp-creacion/solicitudes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const { data, error } = await sb.from(TABLA).delete().eq("id", id).eq("estado", "listo").select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) {
    return NextResponse.json({ ok: false, errores: ["Ya la tomó el flujo (o no existe): no se puede cancelar"] }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
