import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Alta en la WAITLIST (gratis) — flujo principal de captación tras el giro de sep-2026.
 * Ver `docs/PIVOT-WAITLIST-PLAN.md`.
 *
 * No cobra ni toca Reveniu: valida, limita y reenvía a n8n, que escribe la fila en la
 * tabla `waitlist` de Supabase. Mismo patrón fino que `app/api/newsletter/route.ts`.
 */

const schema = z.object({
  fullName: z.string().min(2, "Nombre inválido").max(120),
  email: z.string().email("Email inválido"),
  // 9 dígitos chilenos, sin el +56 (el cliente lo antepone al enviar).
  phone: z.string().regex(/^\+56 9\d{8}$/, "Teléfono inválido"),
  // Modelo de interés: opcional (puede venir prellenado desde una PDP/card).
  model: z.string().max(120).optional(),
  // De dónde salió el lead (hero, pdp, comparador…), para medir qué convierte.
  source: z.string().max(60).optional(),
});

export async function POST(request: Request) {
  const limited = checkRateLimit(request, { max: 5, windowMs: 60_000, bucket: "waitlist" });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const webhookUrl = process.env.N8N_WAITLIST_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parsed.data,
        model: parsed.data.model || null,
        source: parsed.data.source || "web",
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) throw new Error(`Webhook respondió ${res.status}`);
  } catch {
    return NextResponse.json({ error: "Error al procesar tu registro" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
