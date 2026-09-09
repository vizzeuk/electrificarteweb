import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from "@/lib/reviews/config";

/**
 * Alta de una RESEÑA de vehículo (UGC). Ver `docs/REVIEWS-UGC-PLAN.md`.
 *
 * Valida, limita y reenvía a n8n, que escribe la fila en `reviews` con
 * `status='pendiente'`. Mismo patrón que `waitlist` / `newsletter` / `contact`:
 * el sitio nunca escribe directo en Supabase.
 *
 * ⚠️ NADA se publica automáticamente: la fila nace `pendiente` y solo aparece en
 * el sitio cuando Francisco la aprueba. Ese es el filtro real mientras el gating
 * por invitación siga en standby (`REVIEWS_REQUIRE_INVITE`).
 */

const schema = z.object({
  firstName: z.string().min(2, "Nombre inválido").max(80),
  lastName: z.string().min(2, "Apellido inválido").max(80),
  email: z.string().email("Email inválido"),
  phone: z.string().regex(/^\+56 9\d{8}$/, "Teléfono inválido").optional(),

  rating: z.number().int().min(1).max(5),
  body: z.string().min(REVIEW_MIN_CHARS).max(REVIEW_MAX_CHARS),

  // Datos del auto. `carSlug` viene cuando la reseña se abre desde una PDP.
  carSlug: z.string().max(120).optional(),
  carSanityId: z.string().max(60).optional(),
  carBrand: z.string().max(80).optional(),
  carModel: z.string().max(120).optional(),
  carYear: z.number().int().min(1990).max(2100).optional(),
  carColor: z.string().max(60).optional(),
  carVersion: z.string().max(120).optional(),

  source: z.string().max(60).optional(),
});

export async function POST(request: Request) {
  const limited = checkRateLimit(request, { max: 3, windowMs: 60_000, bucket: "reviews" });
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

  const webhookUrl = process.env.N8N_REVIEWS_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parsed.data,
        status: "pendiente",
        source: parsed.data.source || "web",
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`Webhook respondió ${res.status}`);
  } catch {
    return NextResponse.json({ error: "Error al enviar tu reseña" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
