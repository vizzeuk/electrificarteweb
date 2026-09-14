import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { storage } from "@/lib/storage";

/**
 * Publica las fotos de una reseña APROBADA: las mueve del bucket privado al público.
 *
 * Lo llama el DASHBOARD justo después de marcar la reseña como 'aprobada'.
 * Ver docs/DASHBOARD_REVIEWS_MODERACION.md.
 *
 *   POST /api/reviews/publish
 *   Header: x-admin-secret: <ADMIN_API_SECRET>
 *   Body:   { "reviewId": "<uuid>" }
 *
 * Es idempotente: volver a llamarlo no rompe nada (el upload usa upsert y las fotos
 * ya movidas simplemente no están en el bucket pendiente).
 */

export const runtime = "nodejs";

const schema = z.object({ reviewId: z.string().uuid() });

export async function POST(request: Request) {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "reviewId inválido" }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  const { data: review, error } = await sb
    .from("reviews")
    .select("id, status, car_slug, photos")
    .eq("id", parsed.data.reviewId)
    .single<{ id: string; status: string; car_slug: string | null; photos: string[] | null }>();
  if (error || !review) return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });

  // Solo se publican fotos de reseñas aprobadas. Si el dashboard llama acá sin haber
  // aprobado, no movemos nada: el bucket público no debe tener contenido sin moderar.
  if (review.status !== "aprobada") {
    return NextResponse.json({ error: "La reseña no está aprobada" }, { status: 409 });
  }

  const keys = review.photos ?? [];
  const fallidas: string[] = [];
  for (const key of keys) {
    try {
      await storage.promote(key);
    } catch {
      fallidas.push(key); // ya movida antes, o no existe — no aborta el resto
    }
  }

  if (review.car_slug) revalidatePath(`/auto/${review.car_slug}`);
  revalidatePath("/");

  return NextResponse.json({ ok: true, movidas: keys.length - fallidas.length, fallidas });
}
