import type { Metadata } from "next";
import { notFound }      from "next/navigation";
import { client }        from "@/lib/sanity/client";
import { collectionBySlugQuery, carsByFiltersQuery } from "@/lib/queries/collections";
import ColeccionPageContent from "./ColeccionPageContent";

export const revalidate = 60;

// Pre-renderiza todas las páginas de colección en el build.
export async function generateStaticParams() {
  const rows = await client
    .fetch<{ slug: string }[]>(
      `*[_type == "collection" && defined(slug.current)]{ "slug": slug.current }`
    )
    .catch(() => []);
  return (rows ?? []).map((r) => ({ slug: r.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const col = await client.fetch(collectionBySlugQuery, { slug }).catch(() => null);
  if (!col) return { title: "Colección no encontrada | Electrificarte" };
  return {
    title:       col.metaTitle       ?? `${col.title} | Electrificarte`,
    description: col.metaDescription ?? col.description ?? `Encuentra los mejores precios en ${col.title} en Chile. Negociamos por ti.`,
    alternates:  { canonical: `/coleccion/${slug}` },
  };
}

export default async function ColeccionPage({ params }: PageProps) {
  const { slug } = await params;

  const col = await client.fetch(collectionBySlugQuery, { slug }).catch(() => null);
  if (!col) notFound();

  let cars: any[] = [];
  if (col.filterMode === "manual") {
    cars = col.manualCars ?? [];
  } else {
    cars = await client.fetch(carsByFiltersQuery, {
      brandRefs:       col.filterBrandRefs       ?? [],
      vehicleTypeRef:  col.filterVehicleTypeRef  ?? null,
      electricTypeRef: col.filterElectricTypeRef ?? null,
      maxPrice:        col.filterMaxPrice  ? col.filterMaxPrice  * 1_000_000 : 0,
      minPrice:        col.filterMinPrice  ? col.filterMinPrice  * 1_000_000 : 0,
      minSeats:        col.filterMinSeats  ?? 0,
      isNew:           col.filterIsNew     ?? false,
      isHotDeal:       col.filterIsHotDeal ?? false,
    }).catch(() => []);
  }

  return <ColeccionPageContent col={col} cars={cars} />;
}
