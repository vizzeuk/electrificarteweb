/**
 * POST /api/admin/pdp/iniciar — paso 5 al 10 del diagrama v2 del board.
 *
 * Valida la fila SIN IA y, si pasa, abre la sesion del Managed Agent. Devuelve
 * al toque: la sesion nace en `running` y el trabajo sigue en la infra de
 * Anthropic, asi que el limite de 60 s de Vercel nunca entra en juego — que es
 * justo lo que hacia inviable hacer la investigacion completa acá.
 *
 * Auth: header `x-admin-secret`. Body: la fila del Sheet.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { sanityCreacion } from "@/lib/pdp-creacion/sanity";
import { validarFila } from "@/lib/pdp-creacion/validar";
import { abrirSesion } from "@/lib/pdp-creacion/sesion";
import type { FilaSheet } from "@/lib/pdp-creacion/encargo";

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

  const fila = (await req.json().catch(() => ({}))) as FilaSheet;
  const v = await validarFila(fila, sanity);

  if (!v.ok) {
    // No es un 4xx: la fila se proceso bien, lo que fallo es su contenido. n8n
    // escribe el detalle en la fila y manda el aviso corto (pasos 6 a 8).
    return NextResponse.json({ ok: false, slug: v.slug, errores: v.errores });
  }

  // Se abre la sesion con la URL EFECTIVA, no con la que escribio el humano: si
  // la fila apunta a un dominio que redirige a otro (kia.com/cl → kia.cl), el
  // cerco de `web_fetch` al host de la fila hace fallar la sesion entera.
  const efectiva = { ...fila, url_oficial: v.urlFinal ?? fila.url_oficial };
  const sesion = await abrirSesion(efectiva, v.host!, { agentId, environmentId });
  return NextResponse.json({
    ok: true,
    slug: v.slug,
    sessionId: sesion.id,
    estado: sesion.status,
    host: v.host,
    urlFinal: v.urlFinal,
    redirigida: v.redirigida,
    consola: `https://platform.claude.com/sessions/${sesion.id}`,
  });
}
