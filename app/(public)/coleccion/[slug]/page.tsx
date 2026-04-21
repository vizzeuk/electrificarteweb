import type { Metadata } from "next";
import { notFound }      from "next/navigation";
import { client }        from "@/lib/sanity/client";
import { collectionBySlugQuery, carsByFiltersQuery } from "@/lib/queries/collections";
import ColeccionPageContent from "./ColeccionPageContent";

export const revalidate = 60;

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
      brandRef:        col.filterBrandRef        ?? null,
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
