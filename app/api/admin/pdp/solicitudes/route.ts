/**
 * /api/admin/pdp/solicitudes — la entrada del flujo v2 desde el panel
 * (docs/DASHBOARD_PDP_CREACION.md). Reemplaza a marcar "listo" en el Sheet.
 *
 *   GET  ?estado=&limit=&id=  → la lista (o una) para la pantalla del panel
 *   POST {marca, modelo, anio, tipo, electrificacion, url_oficial,
 *         versiones: [{nombre, precio}], creado_por}
 *        → valida SIN IA (la misma validación que corre n8n) y, si pasa, deja
 *          la solicitud en "listo" y despierta al workflow.
 *
 * La validación corre acá y no solo en n8n para que el error aparezca en el
 * formulario al toque, campo por campo, y no 15 minutos después por WhatsApp.
 * No gasta nada: es una query a Sanity y un GET a la URL.
 *
 * Auth: header `x-admin-secret`. Lo llama el SERVIDOR del panel, nunca el browser.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { sanityCreacion } from "@/lib/pdp-creacion/sanity";
import { validarFila } from "@/lib/pdp-creacion/validar";
import {
  cargarSolicitud,
  crearSolicitud,
  despertarFlujo,
  filaDesdeEntrada,
  listarSolicitudes,
  type EntradaPanel,
} from "@/lib/pdp-creacion/solicitudes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  const p = req.nextUrl.searchParams;
  const id = p.get("id");
  if (id) {
    const solicitud = await cargarSolicitud(sb, id);
    if (!solicitud) return NextResponse.json({ error: "No existe" }, { status: 404 });
    return NextResponse.json({ solicitud });
  }
  const solicitudes = await listarSolicitudes(sb, {
    estado: p.get("estado") ?? undefined,
    limit: Number(p.get("limit")) || undefined,
  });
  return NextResponse.json({ solicitudes });
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabase();
  const sanity = sanityCreacion();
  if (!sb || !sanity) return NextResponse.json({ error: "Supabase o Sanity no configurado" }, { status: 500 });

  const entrada = (await req.json().catch(() => ({}))) as EntradaPanel;
  const fila = filaDesdeEntrada(entrada);
  const v = await validarFila(fila, sanity);

  // 422 = la solicitud se entendió pero su contenido no sirve. `errores` va
  // tal cual al formulario: cada uno dice qué corregir.
  if (!v.ok) return NextResponse.json({ ok: false, slug: v.slug, errores: v.errores }, { status: 422 });

  const creada = await crearSolicitud(sb, fila, v.slug, String(entrada.creado_por ?? "").trim() || null);
  if (!creada.ok) return NextResponse.json({ ok: false, slug: v.slug, errores: [creada.error] }, { status: 409 });

  const despertado = await despertarFlujo();
  return NextResponse.json(
    {
      ok: true,
      solicitud: creada.solicitud,
      avisos: v.redirigida ? [`La URL redirige a ${v.urlFinal}: se va a usar esa.`] : [],
      // false = n8n no se pudo despertar; el cron la toma igual en ≤15 min.
      arrancaYa: despertado,
    },
    { status: 201 },
  );
}
