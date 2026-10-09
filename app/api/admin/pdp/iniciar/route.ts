/**
 * POST /api/admin/pdp/iniciar — paso 5 al 10 del diagrama v2 del board.
 *
 * Valida la fila SIN IA y, si pasa, abre la sesion del Managed Agent. Devuelve
 * al toque: la sesion nace en `running` y el trabajo sigue en la infra de
 * Anthropic, asi que el limite de 60 s de Vercel nunca entra en juego — que es
 * justo lo que hacia inviable hacer la investigacion completa acá.
 *
 * Auth: header `x-admin-secret`. Body: `{ solicitudId }` (panel → Supabase,
 * docs/DASHBOARD_PDP_CREACION.md) o la fila completa (Sheet / CLI de prueba).
 * Con `solicitudId` la web lee la fila de `pdp_solicitudes` y escribe ahí el
 * estado: n8n no toca la tabla.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { sanityCreacion } from "@/lib/pdp-creacion/sanity";
import { validarFila } from "@/lib/pdp-creacion/validar";
import { abrirSesion } from "@/lib/pdp-creacion/sesion";
import type { FilaSheet } from "@/lib/pdp-creacion/encargo";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { anotarSolicitud, cargarSolicitud, filaDeSolicitud } from "@/lib/pdp-creacion/solicitudes";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = process.env.PDP_AGENT_ID;
  const environmentId = process.env.PDP_ENVIRONMENT_ID;
  if (!agentId || !environmentId) {
    return NextResponse.json(
      { error: "Faltan PDP_AGENT_ID / PDP_ENVIRONMENT_ID (correr scripts/claude-agents-apply.ts)" },
      { status: 500 },
    );
  }

  const sanity = sanityCreacion();
  if (!sanity) return NextResponse.json({ error: "Sanity no configurado" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as Partial<FilaSheet> & { solicitudId?: string };
  const solicitudId = body.solicitudId;
  const sb = solicitudId ? getSupabase() : null;
  let fila = body as FilaSheet;
  if (solicitudId) {
    if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    const s = await cargarSolicitud(sb, solicitudId);
    if (!s) return NextResponse.json({ error: `No existe la solicitud ${solicitudId}` }, { status: 404 });
    fila = filaDeSolicitud(s);
    await anotarSolicitud(sb, solicitudId, { estado: "procesando", detalle: "Validando y abriendo la investigación" });
  }

  const v = await validarFila(fila, sanity);

  if (!v.ok) {
    // No es un 4xx: la fila se proceso bien, lo que fallo es su contenido. n8n
    // manda el aviso corto (pasos 6 a 8); el detalle queda en la solicitud.
    await anotarSolicitud(sb, solicitudId, {
      estado: "error",
      detalle: v.errores.join(" | ").slice(0, 480),
      terminada_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: false, slug: v.slug, errores: v.errores, nombre: `${fila.marca} ${fila.modelo}` });
  }

  // Se abre la sesion con la URL EFECTIVA, no con la que escribio el humano: si
  // la fila apunta a un dominio que redirige a otro (kia.com/cl → kia.cl), el
  // cerco de `web_fetch` al host de la fila hace fallar la sesion entera.
  // Sin URL en la fila, la fuente es el sitio de la marca y el agente busca la ficha adentro.
  const efectiva = { ...fila, url_oficial: v.urlFinal ?? fila.url_oficial, sitio_marca: v.sitioMarca };
  let sesion: Awaited<ReturnType<typeof abrirSesion>>;
  try {
    sesion = await abrirSesion(efectiva, v.host!, { agentId, environmentId });
  } catch (e) {
    // Sin esto la solicitud quedaria en "procesando" para siempre y n8n se
    // cortaria a mitad del lote. Se devuelve como error de la fila: se ve en el
    // panel y se reintenta desde ahi.
    const error = `No se pudo abrir la investigacion: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400);
    await anotarSolicitud(sb, solicitudId, { estado: "error", detalle: error, terminada_at: new Date().toISOString() });
    return NextResponse.json({ ok: false, slug: v.slug, errores: [error], nombre: `${fila.marca} ${fila.modelo}` });
  }
  await anotarSolicitud(sb, solicitudId, {
    session_id: sesion.id,
    detalle: "Investigando la fuente oficial (unos 3 minutos)",
  });
  return NextResponse.json({
    ok: true,
    nombre: `${fila.marca} ${fila.modelo}`,
    slug: v.slug,
    sessionId: sesion.id,
    estado: sesion.status,
    host: v.host,
    urlFinal: v.urlFinal,
    redirigida: v.redirigida,
    consola: `https://platform.claude.com/sessions/${sesion.id}`,
  });
}
