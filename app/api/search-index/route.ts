import { NextResponse } from "next/server";
import { client } from "@/lib/sanity/client";

/**
 * Índice liviano para el buscador del navbar: solo los campos mínimos
 * para mostrar y enlazar cada auto. Se revalida cada 5 min y el cliente
 * lo pide una sola vez (al abrir el buscador por primera vez).
 */
export const revalidate = 300;

export async function GET() {
  const cars = await client.fetch(
    `*[_type == "car" && hidden != true && defined(slug.current)]{
      name,
      "slug": slug.current,
      "brand": brand->name,
      "brandLogo": brand->logo.asset->url,
      basePrice,
      discountPrice,
      // Con las electrificaciones de sus versiones: "HEV y EV" para un DS 3 Hybrid + E-Tense.
      "type": array::join(array::unique([electricType->tag] + coalesce(versions[defined(electricType)].electricType->tag, [])), " y "),
      "versions": versions[].name
    } | order(brand asc, name asc)`
  );

  return NextResponse.json(cars, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
