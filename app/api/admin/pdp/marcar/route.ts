/**
 * POST /api/admin/pdp/marcar — n8n anota un estado que la web no puede saber
 * sola: hoy, que se agotó la espera de la sesión.
 *
 * Body: { solicitudId, estado: "error", detalle }. Solo acepta "error": los
 * estados de éxito los escribe `cerrar`, que es quien crea el borrador.
 *
 * Auth: header `x-admin-secret`.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { actualizarSolicitud } from "@/lib/pdp-creacion/solicitudes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { solicitudId?: string; estado?: string; detalle?: string; mensaje?: string };
  if (!body.solicitudId) return NextResponse.json({ error: "Falta solicitudId" }, { status: 400 });
  if (body.estado !== "error") return NextResponse.json({ error: 'Solo se puede marcar "error"' }, { status: 400 });

  await actualizarSolicitud(sb, body.solicitudId, {
    estado: "error",
    detalle: String(body.detalle ?? "").slice(0, 480) || null,
    mensaje: body.mensaje ?? null,
    terminada_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
