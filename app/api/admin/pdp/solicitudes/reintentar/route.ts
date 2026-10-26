/**
 * POST /api/admin/pdp/solicitudes/reintentar — vuelve a poner una solicitud en
 * "listo" (docs/DASHBOARD_PDP_CREACION.md).
 *
 * Body: { id, cambios?: { marca, modelo, anio, tipo, electrificacion,
 *         url_oficial, versiones, ficha_file_id?, ficha_nombre? } }
 *
 * La ficha tecnica: sin la clave `ficha_file_id` en `cambios` se conserva la que
 * tenia; con un id nuevo se reemplaza; con null se quita.
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
import { parseVersiones, sinTiposDelModelo } from "@/lib/pdp-creacion/encargo";
import { validarFila } from "@/lib/pdp-creacion/validar";
import { borrarFicha, esFileId, nombreFicha } from "@/lib/pdp-creacion/ficha";
import {
  actualizarSolicitud,
  AVISO_SIN_COLUMNA_FICHA,
  cargarSolicitud,
  despertarFlujo,
  fichasDe,
  fichaVersionInvalida,
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

  const tocaFicha = Boolean(body.cambios && "ficha_file_id" in body.cambios);
  const fichaNueva = tocaFicha ? body.cambios!.ficha_file_id : undefined;
  if (tocaFicha && fichaNueva !== null && !esFileId(fichaNueva)) {
    return NextResponse.json({ ok: false, errores: ["ficha_file_id invalido: sube la ficha de nuevo."] }, { status: 422 });
  }
  const invalida = fichaVersionInvalida(body.cambios?.versiones, esFileId);
  if (invalida) return NextResponse.json({ ok: false, errores: [invalida] }, { status: 422 });
  const cambiosFicha = tocaFicha
    ? { ficha_file_id: (fichaNueva as string | null) ?? null, ficha_nombre: fichaNueva ? nombreFicha(body.cambios!.ficha_nombre) : null }
    : {};

  const fila = body.cambios
    ? filaDesdeEntrada({ ...filaDeSolicitud(actual), ...body.cambios })
    : filaDeSolicitud(actual);
  // Fichas antes y despues (modelo + versiones): las nuevas que no se usen y las viejas que se
  // reemplacen quedan huerfanas. Una version sin cambios conserva su ficha (viene en `versiones`).
  const fichasAntes = fichasDe(actual);
  const fichasDespues = fichasDe({
    ficha_file_id: tocaFicha ? ((fichaNueva as string | null) ?? null) : actual.ficha_file_id,
    versiones: parseVersiones(fila.versiones),
  });
  const v = await validarFila(fila, sanity);
  if (!v.ok) {
    await Promise.all(fichasDespues.filter((id) => !fichasAntes.includes(id)).map(borrarFicha));
    return NextResponse.json({ ok: false, slug: v.slug, errores: v.errores }, { status: 422 });
  }

  const avisos: string[] = [];
  const cambios = {
    marca: fila.marca, modelo: fila.modelo, anio: fila.anio ?? null, tipo: fila.tipo,
    electrificacion: fila.electrificacion, url_oficial: fila.url_oficial ?? null,
    versiones: sinTiposDelModelo(parseVersiones(fila.versiones), fila),
    slug: v.slug,
    estado: "listo" as const,
    detalle: "Reintento pedido desde el panel",
    mensaje: null,
    session_id: null,
    terminada_at: null,
  };
  try {
    try {
      await actualizarSolicitud(sb, actual.id, { ...cambios, ...cambiosFicha });
    } catch (e) {
      // Sin la migracion de la ficha: se reintenta igual, avisando que la ficha no quedo.
      if (!tocaFicha || !/ficha_/.test(e instanceof Error ? e.message : String(e))) throw e;
      await actualizarSolicitud(sb, actual.id, cambios);
      if (fichaNueva) avisos.push(AVISO_SIN_COLUMNA_FICHA);
    }
  } catch (e) {
    // El índice único de solicitudes activas: hay otra del mismo auto en curso.
    const msg = e instanceof Error ? e.message : String(e);
    if (/duplicate key|unique/i.test(msg)) {
      return NextResponse.json({ ok: false, errores: [`Ya hay otra solicitud en curso para "${v.slug}"`] }, { status: 409 });
    }
    throw e;
  }

  // Las fichas reemplazadas o quitadas ya no las usa nadie. Con el aviso de la migracion la del
  // modelo no se guardo: no se toca nada.
  if (!avisos.length) {
    await Promise.all(fichasAntes.filter((id) => !fichasDespues.includes(id)).map(borrarFicha));
  }

  const arrancaYa = await despertarFlujo();
  return NextResponse.json({ ok: true, solicitud: await cargarSolicitud(sb, actual.id), arrancaYa, avisos });
}
