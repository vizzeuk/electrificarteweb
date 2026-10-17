/**
 * POST /api/admin/pdp/ficha — sube la ficha tecnica (PDF) opcional de una solicitud.
 *
 * Body: el PDF crudo (`content-type: application/pdf`), maximo 4 MB. El nombre
 * original va en `?nombre=`. Responde `{ ok: true, ficha: { file_id, nombre } }`
 * y el panel manda ese `file_id` al crear o corregir la solicitud. 422 con
 * `errores[]` si no es un PDF o pesa de mas.
 *
 * Va aparte de /solicitudes para no inflar ese JSON con base64 (Vercel corta a
 * 4,5 MB). Si despues la solicitud no pasa la validacion, /solicitudes borra el
 * archivo.
 *
 * Auth: header `x-admin-secret`. Lo llama el SERVIDOR del panel.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { nombreFicha, subirFicha, validarPdf } from "@/lib/pdp-creacion/ficha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bytes = new Uint8Array(await req.arrayBuffer());
  const error = validarPdf(bytes);
  if (error) return NextResponse.json({ ok: false, errores: [error] }, { status: 422 });

  const nombre = nombreFicha(req.nextUrl.searchParams.get("nombre"));
  try {
    const fileId = await subirFicha(bytes, nombre);
    return NextResponse.json({ ok: true, ficha: { file_id: fileId, nombre } }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[pdp/ficha] no se pudo subir:", msg);
    return NextResponse.json({ ok: false, errores: [`No se pudo guardar la ficha tecnica: ${msg.slice(0, 200)}`] }, { status: 502 });
  }
}
