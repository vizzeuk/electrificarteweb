import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { client } from "@/lib/sanity/client";
import { urlFor } from "@/lib/sanity/image";
import { brandBySlugQuery, carsByBrandQuery } from "@/lib/queries/car";
import BrandPageContent from "./BrandPageContent";

export const revalidate = 60;

// Pre-renderiza todas las PLP de marca en el build → click "marca" instantáneo.
export async function generateStaticParams() {
  const rows = await client
    .fetch<{ slug: string }[]>(
      `*[_type == "brand" && defined(slug.current)]{ "slug": slug.current }`
    )
    .catch(() => []);
  return (rows ?? []).map((r) => ({ slug: r.slug }));
}

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
    alternates: { canonical: `/marcas/${slug}` },
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { slug } = await params;

  const [sanityBrand, sanityCars] = await Promise.all([
    client.fetch(brandBySlugQuery, { slug }).catch(() => null),
    client.fetch(carsByBrandQuery, { brandSlug: slug }).catch(() => []),
  ]);

  if (!sanityBrand) notFound();

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
    category:     c.vehicleType?.label ?? c.electricType?.tag ?? "",
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

  // Derive hotDeals from cars (supports multiple)
  const hotDeals = cars
    .filter((c: any) => c.isHotDeal)
    .map((hotCar: any) => {
      const s = sanityCars.find((c: any) => c.slug === hotCar.slug);
      if (!s) return null;
      return {
        carName:       s.name,
        carSlug:       s.slug,
        basePrice:     s.basePrice,
        discountPrice: s.discountPrice ?? s.basePrice,
        bonus:         s.hotDealBonusAmount ?? 0,
        range:         s.range,
        power:         `${s.power} CV`,
        traction:      s.traction ?? "–",
        acceleration:  s.acceleration ? `${s.acceleration} seg` : "–",
        imageUrl:      s.mainImage ? urlFor(s.mainImage).width(800).auto("format").url() : undefined,
      };
    })
    .filter(Boolean);

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

  const fc = sanityBrand.heroFeaturedCar;
  const heroFeaturedCar = fc ? {
    name:          fc.name,
    slug:          fc.slug,
    basePrice:     fc.basePrice,
    discountPrice: fc.discountPrice ?? fc.basePrice,
    imageUrl:      fc.mainImage ? urlFor(fc.mainImage).width(900).auto("format").url() : undefined,
  } : null;

  const brand = {
    name:             sanityBrand.name,
    country:          sanityBrand.country ?? "",
    foundedYear:      sanityBrand.foundedYear ?? "",
    description:      sanityBrand.description ?? "",
    heroTagline:      sanityBrand.heroTagline,
    logoLetter:       sanityBrand.name.charAt(0).toUpperCase(),
    logoColor:        accentColor,
    logoUrl:          sanityBrand.logoUrl ?? undefined,
    accentColor:      accentColor,
    stats:            sanityBrand.stats ?? [],
    heroFeaturedCar,
    cars,
    hotDeals,
    videos,
    plpBanners:       sanityBrand.plpBanners ?? [],
  };

  return <BrandPageContent slug={slug} brand={brand} />;
}
