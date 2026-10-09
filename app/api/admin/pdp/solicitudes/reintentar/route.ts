/**
 * POST /api/admin/pdp/solicitudes/reintentar — vuelve a poner una solicitud en
 * "listo" (docs/DASHBOARD_PDP_CREACION.md).
 *
 * Body: { id, cambios?: { marca, modelo, anio, tipo, electrificacion,
 *         url_oficial, versiones } }
 *
 * Con `cambios` sirve para "corregir y reintentar" (lo normal: la URL estaba
 * mal). Se re-valida igual que al crear. Solo se aceptan las que fallaron
 * (`error`, `sin_datos`, `rechazada`) o las trabadas más de 30 min en
 * `en cola`/`procesando`: una que terminó bien ya tiene su borrador en Sanity.
 *
 * Auth: header `x-admin-secret`.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { sanityCreacion } from "@/lib/pdp-creacion/sanity";
import { parseVersiones } from "@/lib/pdp-creacion/encargo";
import { validarFila } from "@/lib/pdp-creacion/validar";
import {
  actualizarSolicitud,
  cargarSolicitud,
  despertarFlujo,
  filaDeSolicitud,
  filaDesdeEntrada,
  sePuedeReintentar,
  type EntradaPanel,
} from "@/lib/pdp-creacion/solicitudes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabase();
  const sanity = sanityCreacion();
  if (!sb || !sanity) return NextResponse.json({ error: "Supabase o Sanity no configurado" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { id?: string; cambios?: EntradaPanel };
  if (!body.id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const actual = await cargarSolicitud(sb, body.id);
  if (!actual) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (!sePuedeReintentar(actual)) {
    return NextResponse.json(
      { ok: false, errores: [`No se puede reintentar una solicitud en estado "${actual.estado}"`] },
      { status: 409 },
    );
  }

  const fila = body.cambios
    ? filaDesdeEntrada({ ...filaDeSolicitud(actual), ...body.cambios })
    : filaDeSolicitud(actual);
  const v = await validarFila(fila, sanity);
  if (!v.ok) return NextResponse.json({ ok: false, slug: v.slug, errores: v.errores }, { status: 422 });

  try {
    await actualizarSolicitud(sb, actual.id, {
      ...fila,
      versiones: parseVersiones(fila.versiones),
      slug: v.slug,
      estado: "listo",
      detalle: "Reintento pedido desde el panel",
      mensaje: null,
      session_id: null,
      terminada_at: null,
    });
  } catch (e) {
    // El índice único de solicitudes activas: hay otra del mismo auto en curso.
    const msg = e instanceof Error ? e.message : String(e);
    if (/duplicate key|unique/i.test(msg)) {
      return NextResponse.json({ ok: false, errores: [`Ya hay otra solicitud en curso para "${v.slug}"`] }, { status: 409 });
    }
    throw e;
  }

  const arrancaYa = await despertarFlujo();
  return NextResponse.json({ ok: true, solicitud: await cargarSolicitud(sb, actual.id), arrancaYa });
}
