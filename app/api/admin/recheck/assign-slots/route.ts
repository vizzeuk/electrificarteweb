/**
 * POST /api/admin/recheck/assign-slots — le asigna lote de revisión a los autos
 * publicados que no tienen.
 *
 * Lo llama el flujo de creación de PDPs (v2) justo después de crear el borrador,
 * pasando su `carId`, para que el auto nuevo quede con lote al instante en vez de
 * esperar a la corrida siguiente. Sin `carIds` barre todos los publicados sin
 * lote, que es lo que hace el backfill inicial.
 *
 * Es idempotente: un auto que ya tiene `checkSlot` no se toca.
 *
 * Auth: header `x-admin-secret`. Body: { carIds?: string[] }.
 */

import { NextRequest, NextResponse } from "next/server";
import { authorized, sanityWrite } from "@/lib/catalog-recheck/admin";
import { assignMissingSlots } from "@/lib/catalog-recheck/assign";
import { describeSlot } from "@/lib/catalog-recheck/slots";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sanity = sanityWrite();
  if (!sanity) return NextResponse.json({ error: "Sanity no configurado" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { carIds?: string[] };
  const carIds = Array.isArray(body.carIds) && body.carIds.length ? body.carIds : undefined;

  const { asignados, yaTenian } = await assignMissingSlots(sanity, carIds);

  return NextResponse.json({
    asignados: asignados.map((a) => ({ ...a, cuando: describeSlot(a.checkSlot) })),
    total: asignados.length,
    yaTenian,
  });
}
