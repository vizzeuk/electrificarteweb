import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from "@/lib/reviews/config";
import { n8nHeaders } from "@/lib/n8n";

/**
 * Alta de una RESEÑA de vehículo (UGC). Ver `docs/REVIEWS-UGC-PLAN.md`.
 *
 * Valida, limita y reenvía a n8n, que escribe la fila en `reviews`. Mismo patrón que
 * `waitlist` / `newsletter` / `contact`: el sitio nunca escribe directo en Supabase.
 *
 * Moderación (sep-2026, Vicente + Matías): solo se moderan las reseñas CON fotos, porque lo
 * que puede ser inapropiado es la imagen.
 *   - Con fotos → `pendiente`: aparece cuando Francisco la aprueba en el dashboard.
 *   - Sin fotos → `aprobada`: se publica sola.
 * El estado lo decide n8n a partir de `photos` (no confía en el `status` del payload, que va
 * solo como referencia). n8n responde recién después de guardar la fila, así que un 2xx
 * significa "guardada": ahí se revalida la ficha para que la reseña sin fotos aparezca ya.
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

  /** Rutas dentro del bucket (NO urls). Las devuelve /api/reviews/upload-url. */
  photos: z.array(z.string().max(200)).max(10).optional(),

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

  const hasPhotos = (parsed.data.photos?.length ?? 0) > 0;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: n8nHeaders(),
      body: JSON.stringify({
        ...parsed.data,
        status: hasPhotos ? "pendiente" : "aprobada",
        source: parsed.data.source || "web",
        timestamp: new Date().toISOString(),
      }),
      // n8n responde después de guardar la fila; bajo ráfagas tarda ~2-3 s. Con 5 s de margen
      // la persona veía error aunque el registro sí quedó guardado (y al reintentar, duplicado).
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Webhook respondió ${res.status}`);
  } catch {
    return NextResponse.json({ error: "Error al enviar tu reseña" }, { status: 502 });
  }

  // Sin fotos = publicada: se refresca la ficha (ISR) para que aparezca de inmediato.
  if (!hasPhotos) {
    if (parsed.data.carSlug) revalidatePath(`/auto/${parsed.data.carSlug}`);
    revalidatePath("/");
  }

  return NextResponse.json({ success: true, published: !hasPhotos });
}
