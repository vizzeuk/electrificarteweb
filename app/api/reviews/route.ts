import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { REVIEW_EXTRA_MAX_CHARS, REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from "@/lib/reviews/config";
import { promedioNotas } from "@/lib/reviews/categories";
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
 *
 * Calificación (27-sep-2026): 4 categorías obligatorias de 1 a 5 (autonomía, confort, agilidad,
 * calidad). La nota final `rating` es su promedio con un decimal y la calcula ESTE servidor: si
 * el cliente manda su propio `rating`, zod lo descarta (no está en el esquema).
 *
 * Contrato con n8n (lo que se reenvía):
 *   firstName, lastName, email, phone?, body, carSlug?, carSanityId?, carBrand?, carModel?,
 *   carYear?, carColor?, carVersion?, photos?, source, status, timestamp,
 *   rating (número, 1 decimal), ratingAutonomia, ratingConfort, ratingAgilidad, ratingCalidad
 *   (enteros 1-5), pros, contras (texto o null).
 */

const nota = z.number().int().min(1).max(5);

/** Texto opcional: vacío o solo espacios cuenta como "no lo escribió". */
const extra = z
  .string()
  .trim()
  .max(REVIEW_EXTRA_MAX_CHARS)
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  firstName: z.string().min(2, "Nombre inválido").max(80),
  lastName: z.string().min(2, "Apellido inválido").max(80),
  email: z.string().email("Email inválido"),
  phone: z.string().regex(/^\+56 9\d{8}$/, "Teléfono inválido").optional(),

  ratingAutonomia: nota,
  ratingConfort: nota,
  ratingAgilidad: nota,
  ratingCalidad: nota,
  body: z.string().min(REVIEW_MIN_CHARS).max(REVIEW_MAX_CHARS),
  pros: extra,
  contras: extra,

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

  const d = parsed.data;
  const hasPhotos = (d.photos?.length ?? 0) > 0;
  // Nunca es null acá: las cuatro notas son obligatorias en el esquema.
  const rating = promedioNotas([d.ratingAutonomia, d.ratingConfort, d.ratingAgilidad, d.ratingCalidad]) as number;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: n8nHeaders(),
      body: JSON.stringify({
        ...d,
        rating,
        // null explícito (y no ausente): así el nodo de n8n siempre encuentra la llave.
        pros: d.pros ?? null,
        contras: d.contras ?? null,
        status: hasPhotos ? "pendiente" : "aprobada",
        source: d.source || "web",
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
    if (d.carSlug) revalidatePath(`/auto/${d.carSlug}`);
    revalidatePath("/");
    revalidatePath("/resenas/todas");
  }

  return NextResponse.json({ success: true, published: !hasPhotos });
}
