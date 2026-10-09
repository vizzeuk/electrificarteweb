/**
 * POST /api/admin/pdp/reservar — n8n toma el lote de solicitudes por crear.
 *
 * Body: { limit? } (default 5). Pasa a "en cola" hasta `limit` solicitudes
 * "listo", de forma atómica (RPC con `for update skip locked`): el cron y el
 * aviso inmediato del panel pueden correr a la vez sin tomar la misma fila.
 * Reemplaza a los nodos "Filas marcadas listo" + "Reservar el lote" del Sheet.
 *
 * Devuelve cada solicitud ya convertida a la `fila` que esperan `iniciar` y
 * `cerrar`, más su `id`.
 *
 * Auth: header `x-admin-secret`.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { filaDeSolicitud, reservarSolicitudes } from "@/lib/pdp-creacion/solicitudes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  const { limit } = (await req.json().catch(() => ({}))) as { limit?: number };
  const n = Math.max(1, Math.min(Number(limit) || 5, 20));
  const reservadas = await reservarSolicitudes(sb, n);

  return NextResponse.json({
    solicitudes: reservadas.map((s) => ({
      solicitudId: s.id,
      creadoPor: s.creado_por,
      fila: filaDeSolicitud(s),
    })),
  });
}
