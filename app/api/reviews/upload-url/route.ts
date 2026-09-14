import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { storage } from "@/lib/storage";
import { REVIEW_MAX_PHOTOS } from "@/lib/reviews/config";

/**
 * Devuelve URLs firmadas para que el browser suba las fotos DIRECTO al bucket.
 *
 * Por qué directo y no por acá: Vercel limita el body de cualquier función a 4,5 MB
 * (FUNCTION_PAYLOAD_TOO_LARGE, no configurable). Con 3 fotos ya se pasa. Esta ruta solo
 * mueve texto: firma y devuelve las URLs.
 *
 * Las fotos caen en el bucket PRIVADO. Solo al aprobar pasan al público (/publish).
 */

export const runtime = "nodejs";

const schema = z.object({
  /** Cuántas fotos va a subir. Se firma un par (card+full) por cada una. */
  count: z.number().int().min(1).max(REVIEW_MAX_PHOTOS),
});

export async function POST(request: Request) {
  // Más estricto que el POST de la reseña: firmar es barato pero no queremos que
  // alguien genere URLs en masa.
  const limited = checkRateLimit(request, { max: 10, windowMs: 60_000, bucket: "review-upload" });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  // El prefijo lo genera el SERVIDOR, no el cliente: si el cliente eligiera la ruta
  // podría escribir sobre las fotos de otra reseña.
  const prefix = randomUUID();

  try {
    const slots = await Promise.all(
      Array.from({ length: parsed.data.count }, async () => {
        const id = randomUUID();
        const cardKey = `${prefix}/${id}-card.jpg`;
        const fullKey = `${prefix}/${id}-full.jpg`;
        const [card, full] = await Promise.all([
          storage.signedUploadUrl(cardKey),
          storage.signedUploadUrl(fullKey),
        ]);
        return { cardKey, fullKey, card, full };
      }),
    );
    return NextResponse.json({ prefix, slots });
  } catch {
    return NextResponse.json({ error: "No se pudieron firmar las subidas" }, { status: 502 });
  }
}
