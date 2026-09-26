import { NextResponse } from "next/server";
import { client } from "@/lib/sanity/client";

/**
 * Catálogo publicado para los selectores de marca y modelo del formulario de reseñas.
 * Lo pide el popup (ReviewForm) recién al abrirse, para no cargar el catálogo en cada página.
 * Solo datos públicos (slug, marca, modelo). Cacheado 5 minutos.
 */
export const revalidate = 300;

const QUERY = `*[_type == "car" && hidden != true && defined(slug.current) && defined(brand->name)]{ "slug": slug.current, name, "brand": brand->name } | order(brand asc, name asc)`;

export async function GET() {
  const cars = await client.fetch(QUERY, {}, { next: { tags: ["car"], revalidate: 300 } }).catch(() => []);
  return NextResponse.json(cars, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
