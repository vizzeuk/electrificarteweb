/**
 * POST /api/auction/recuperar — crea un lead de recuperación (sin re-cobro).
 *
 * Cuando a un cliente no le resultó, en vez de mandarlo a pagar de nuevo, se crea
 * un lead nuevo con su mismo perfil y otro `target_model`, `status=pagado`,
 * marcado como recuperación y enlazado al pago original. Con **tope** por cadena
 * (anti-abuso). La lógica vive en lib/auction/recovery.ts (la comparte el bot).
 *
 * Auth: header `x-admin-secret`. Body: { "leadId": 123, "targetModel": "MG4" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { createRecoveryLead } from "@/lib/auction/recovery";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  let body: { leadId?: number; targetModel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof body.leadId !== "number" || typeof body.targetModel !== "string" || !body.targetModel.trim()) {
    return NextResponse.json({ error: "Faltan leadId (number) y targetModel (string)" }, { status: 400 });
  }

  const r = await createRecoveryLead(sb, body.leadId, body.targetModel);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 404 });
  return NextResponse.json(r);
}
