import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { client } from "@/lib/sanity/client";
import { urlFor } from "@/lib/sanity/image";
import { brandBySlugQuery, carsByBrandQuery } from "@/lib/queries/car";
import BrandPageContent from "./BrandPageContent";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await client.fetch(brandBySlugQuery, { slug }).catch(() => null);
  if (!brand) return { title: "Marca no encontrada | Electrificarte" };
  return {
    title: `${brand.name} eléctricos en Chile | Precios y ofertas | Electrificarte`,
    description: brand.description ?? `Encuentra los mejores precios en autos eléctricos ${brand.name} en Chile.`,
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { slug } = await params;

  const [sanityBrand, sanityCars] = await Promise.all([
    client.fetch(brandBySlugQuery, { slug }).catch(() => null),
    client.fetch(carsByBrandQuery, { brandSlug: slug }).catch(() => []),
  ]);

  if (!sanityBrand) {
    // Brand not found in Sanity
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="material-symbols-outlined text-[64px] text-gray-200">electric_car</span>
        <h1 className="font-headline font-black text-3xl uppercase">{slug.replace(/-/g, " ")}</h1>
        <p className="text-text-muted max-w-sm">Estamos preparando el catálogo de esta marca. Mientras tanto, puedes solicitar una oferta personalizada.</p>
        <Link href="/solicitar" className="bg-primary hover:bg-primary-dark text-black font-bold px-8 py-3 rounded-xl transition-colors">
          Solicitar oferta
        </Link>
      </div>
    );
  }

  const accentColor = sanityBrand.accentColor ?? "#003499";

  // Map Sanity cars → BrandCarData shape
  const cars = (sanityCars ?? []).map((c: any) => ({
    name:         c.name,
    slug:         c.slug,
    basePrice:    c.basePrice,
    discountPrice: c.discountPrice ?? c.basePrice,
    range:        c.range,
    power:        `${c.power} CV`,
    traction:     c.traction,
    category:     c.vehicleType?.label ?? c.category?.name ?? "",
    tipoSlug:     c.vehicleType?.slug ?? "",
    electricType: c.electricType?.slug ?? "",
    isHotDeal:    c.isHotDeal ?? false,
    isTopSeller:  c.isTopSeller ?? false,
    imageUrl:     c.mainImage ? urlFor(c.mainImage).width(800).auto("format").url() : undefined,
    specs: {
      battery:     `${c.batteryCapacity} kWh`,
      charge0to80: c.chargeTimeDC ?? "–",
      topSpeed:    c.topSpeed ? `${c.topSpeed} km/h` : "–",
    },
  }));

  // Derive hotDeal from cars
  const hotDealCar = cars.find((c: any) => c.isHotDeal);
  const sanityHotDeal = hotDealCar ? sanityCars.find((c: any) => c.slug === hotDealCar.slug) : null;

  const hotDeal = sanityHotDeal ? {
    carName:       sanityHotDeal.name,
    carSlug:       sanityHotDeal.slug,
    basePrice:     sanityHotDeal.basePrice,
    discountPrice: sanityHotDeal.discountPrice ?? sanityHotDeal.basePrice,
    bonus:         sanityHotDeal.hotDealBonusAmount ?? 0,
    range:         sanityHotDeal.range,
    power:         `${sanityHotDeal.power} CV`,
    traction:      sanityHotDeal.traction,
    acceleration:  sanityHotDeal.acceleration ? `${sanityHotDeal.acceleration} seg` : "–",
  } : null;

  // Map videos
  const videos = (sanityBrand.videos ?? []).map((v: any, i: number) => ({
    id:        v._key ?? String(i),
    title:     v.title,
    duration:  v.duration ?? "",
    views:     v.views ?? "",
    channel:   v.channel ?? "",
    thumbnail: null as null,
    videoUrl:  v.videoUrl ?? null,
  }));

  const brand = {
    name:        sanityBrand.name,
    country:     sanityBrand.country ?? "",
    foundedYear: sanityBrand.foundedYear ?? "",
    description: sanityBrand.description ?? "",
    heroTagline: sanityBrand.heroTagline,
    logoLetter:  sanityBrand.name.charAt(0).toUpperCase(),
    logoColor:   accentColor,
    logoUrl:     sanityBrand.logoUrl ?? undefined,
    accentColor: accentColor,
    stats:       sanityBrand.stats ?? [],
    cars,
    hotDeal,
    videos,
  };

  return <BrandPageContent slug={slug} brand={brand} />;
}
