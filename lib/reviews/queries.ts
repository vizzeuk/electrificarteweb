import { getSupabase } from "@/lib/whatsapp/subscription";
import { storage } from "@/lib/storage";
import type { CategoryScores } from "./categories";

// Resumen y selección son funciones puras (sirven también en el cliente, ej. los filtros de
// /resenas/todas): viven en ./summary y se re-exportan acá por comodidad.
export { summarize, topReviews } from "./summary";

/**
 * Lectura de reseñas APROBADAS para el sitio público.
 *
 * Siempre contra la vista `reviews_publicas`, nunca contra la tabla `reviews`:
 * la vista filtra `status='aprobada'` y no expone PII (el autor viene ya como
 * "Juan P."). Ver scripts/sql/2026-09-09_reviews.sql y 2026-09-27_resenas_categorias….sql.
 *
 * Corre server-side con service_role. Las páginas son estáticas con ISR de 60 s, así
 * que esto se ejecuta al revalidar, no en cada visita.
 *
 * Fail-soft con el esquema: se pide `select("*")` (nunca columnas por nombre), así que si la
 * migración de las 4 categorías aún no está aplicada, las columnas nuevas llegan `undefined`
 * y se tratan como null. Las reseñas antiguas traen las categorías en null a propósito.
 */

export interface PublicReview {
  id: string;
  createdAt: string;
  /** Nota final: promedio de las 4 categorías con un decimal (o la nota única de las antiguas). */
  rating: number;
  /** Notas por categoría (1-5). null en reseñas anteriores al 27-sep-2026. */
  categorias: CategoryScores;
  body: string;
  /** "Lo bueno" y "Lo que mejoraría". Opcionales. */
  pros: string | null;
  contras: string | null;
  autor: string;
  carSlug: string | null;
  carBrand: string | null;
  carModel: string | null;
  carYear: number | null;
  carColor: string | null;
  carVersion: string | null;
  photos: string[];
  /** URLs públicas ya resueltas. Se calculan acá (servidor) porque `storage` usa el
   *  service_role y no puede vivir en un componente cliente como el carrusel. */
  photoUrls: string[];
  /** Versión grande de cada foto, mismo orden que `photoUrls` (para el visor). Si una foto no
   *  tiene versión grande, se repite la miniatura. */
  photoFullUrls: string[];
  videoPlaybackId: string | null;
  compraVerificada: boolean;
}

export interface ReviewSummary {
  promedio: number;
  total: number;
  /** Cuántas reseñas hay por estrella (nota redondeada al entero). Índice 0 = 1 estrella. */
  distribucion: [number, number, number, number, number];
  /** Promedio de cada categoría entre las reseñas que la traen. null si ninguna la trae. */
  categorias: CategoryScores;
}

interface Row {
  id: string;
  created_at: string;
  rating: number | string;
  rating_autonomia?: number | null;
  rating_confort?: number | null;
  rating_agilidad?: number | null;
  rating_calidad?: number | null;
  body: string;
  pros?: string | null;
  contras?: string | null;
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

/** Nota de categoría válida (1-5) o null. */
const cat = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
};

const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

function toReview(r: Row): PublicReview {
  const photos = r.photos ?? [];
  // Solo las miniaturas en la grilla: servir las 'full' ahí multiplicaría el egress ~5×.
  // Las 'full' se cargan recién al abrir el visor.
  const cards = photos.filter((k) => k.endsWith("-card.jpg"));
  return {
    id: r.id,
    createdAt: r.created_at,
    // numeric(2,1) puede llegar como string según el cliente: se normaliza a número.
    rating: Number(r.rating) || 0,
    categorias: {
      autonomia: cat(r.rating_autonomia),
      confort: cat(r.rating_confort),
      agilidad: cat(r.rating_agilidad),
      calidad: cat(r.rating_calidad),
    },
    body: r.body,
    pros: texto(r.pros),
    contras: texto(r.contras),
    autor: r.autor,
    carSlug: r.car_slug,
    carBrand: r.car_brand,
    carModel: r.car_model,
    carYear: r.car_year,
    carColor: r.car_color,
    carVersion: r.car_version,
    photos,
    photoUrls: cards.map((k) => storage.publicUrl(k)),
    photoFullUrls: cards.map((k) => {
      const full = k.replace(/-card\.jpg$/, "-full.jpg");
      return storage.publicUrl(photos.includes(full) ? full : k);
    }),
    videoPlaybackId: r.video_playback_id,
    compraVerificada: !!r.compra_verificada,
  };
}

/** Tope de filas por lectura. Holgado para el volumen actual; se revisa si crece mucho. */
const MAX_ROWS = 500;

/** Reseñas aprobadas de un auto, más recientes primero. [] si Supabase no está o falla. */
export async function getReviewsForCar(carSlug: string, limit = MAX_ROWS): Promise<PublicReview[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("reviews_publicas")
    .select("*")
    .eq("car_slug", carSlug)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  // Fail-soft: si la vista aún no existe o falla, la PDP se renderiza sin reseñas.
  if (error || !data) return [];
  return data.map(toReview);
}

/** Todas las reseñas aprobadas (para /resenas/todas y el resumen general), recientes primero. */
export async function getAllReviews(limit = MAX_ROWS): Promise<PublicReview[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("reviews_publicas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  if (error || !data) return [];
  return data.map(toReview);
}
