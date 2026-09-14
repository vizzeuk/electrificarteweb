import { getSupabase } from "@/lib/whatsapp/subscription";

/**
 * Lectura de reseñas APROBADAS para el sitio público.
 *
 * Siempre contra la vista `reviews_publicas`, nunca contra la tabla `reviews`:
 * la vista filtra `status='aprobada'` y no expone PII (el autor viene ya como
 * "Juan P."). Ver scripts/sql/2026-09-09_reviews.sql.
 *
 * Corre server-side con service_role. Las PDP son estáticas con ISR de 60 s, así
 * que esto se ejecuta al revalidar, no en cada visita.
 */

export interface PublicReview {
  id: string;
  createdAt: string;
  rating: number;
  body: string;
  autor: string;
  carSlug: string | null;
  carBrand: string | null;
  carModel: string | null;
  carYear: number | null;
  carColor: string | null;
  carVersion: string | null;
  photos: string[];
  videoPlaybackId: string | null;
  compraVerificada: boolean;
}

export interface ReviewSummary {
  promedio: number;
  total: number;
}

interface Row {
  id: string;
  created_at: string;
  rating: number;
  body: string;
  autor: string;
  car_slug: string | null;
  car_brand: string | null;
  car_model: string | null;
  car_year: number | null;
  car_color: string | null;
  car_version: string | null;
  photos: string[] | null;
  video_playback_id: string | null;
  compra_verificada: boolean;
}

const toReview = (r: Row): PublicReview => ({
  id: r.id,
  createdAt: r.created_at,
  rating: r.rating,
  body: r.body,
  autor: r.autor,
  carSlug: r.car_slug,
  carBrand: r.car_brand,
  carModel: r.car_model,
  carYear: r.car_year,
  carColor: r.car_color,
  carVersion: r.car_version,
  photos: r.photos ?? [],
  videoPlaybackId: r.video_playback_id,
  compraVerificada: r.compra_verificada,
});

/** Reseñas aprobadas de un auto. Devuelve [] si Supabase no está configurado. */
export async function getReviewsForCar(carSlug: string, limit = 12): Promise<PublicReview[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("reviews_publicas")
    .select("*")
    .eq("car_slug", carSlug)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  // Fail-soft: si la tabla aún no existe o falla, la PDP se renderiza sin reseñas
  // en vez de romperse.
  if (error || !data) return [];
  return data.map(toReview);
}

/** Promedio y total de un auto — alimenta las estrellas y el AggregateRating. */
export async function getReviewSummary(carSlug: string): Promise<ReviewSummary | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("reviews_publicas")
    .select("rating")
    .eq("car_slug", carSlug)
    .returns<{ rating: number }[]>();
  if (error || !data || data.length === 0) return null;
  const suma = data.reduce((acc, r) => acc + r.rating, 0);
  return { promedio: Math.round((suma / data.length) * 10) / 10, total: data.length };
}

/** Mejores reseñas para la home (las de mayor puntaje, más recientes primero). */
export async function getTopReviews(limit = 3): Promise<PublicReview[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("reviews_publicas")
    .select("*")
    .gte("rating", 4)
    .order("rating", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  if (error || !data) return [];
  return data.map(toReview);
}
