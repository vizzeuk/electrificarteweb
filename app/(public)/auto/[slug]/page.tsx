import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { client } from "@/lib/sanity/client";
import { carBySlugQuery, similarCarsQuery } from "@/lib/queries/car";
import AutoPageClient, { type CarData, type SimilarCarData } from "./AutoPageClient";
import { CarStructuredData } from "@/components/car/CarStructuredData";

export const revalidate = 60;

// Pre-renderiza TODAS las PDPs en el build → navegación a un auto es instantánea
// (HTML estático servido desde CDN). Slugs nuevos que aparezcan después siguen
// funcionando vía ISR (server-render on-demand + cache).
export async function generateStaticParams() {
  const rows = await client
    .fetch<{ slug: string }[]>(
      `*[_type == "car" && hidden != true && defined(slug.current)]{ "slug": slug.current }`
    )
    .catch(() => []);
  return (rows ?? []).map((r) => ({ slug: r.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ─── SEO dinámico ─────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const car = await client.fetch(carBySlugQuery, { slug }, { next: { tags: ["car"], revalidate: 60 } }).catch(() => null);
  if (!car || car.hidden) return { title: "Auto no encontrado | Electrificarte" };
  const brandName = car.brand?.name ?? "";
  return {
    title: car.metaTitle ?? `${brandName} ${car.name} | Oferta exclusiva Electrificarte`,
    description: car.metaDescription ?? car.tagline ?? `Consigue el mejor precio en el ${brandName} ${car.name} en Chile.`,
    alternates: { canonical: `/auto/${slug}` },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function CarDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch car from Sanity
  const sanity = await client.fetch(carBySlugQuery, { slug }, { next: { tags: ["car"], revalidate: 60 } }).catch(() => null);

  // Auto descontinuado / oculto → 404 real
  if (sanity?.hidden) notFound();

  if (!sanity) {
    // Graceful fallback for slugs not in Sanity yet
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="material-symbols-outlined text-[64px] text-gray-200">electric_car</span>
        <h1 className="font-headline font-black text-3xl">{slug.replace(/-/g, " ")}</h1>
        <p className="text-text-muted max-w-sm">Este modelo aún no está disponible en nuestro catálogo digital. Puedes solicitar una oferta de todos modos.</p>
        <Link href="/solicitar" className="bg-primary hover:bg-primary-dark text-black font-bold px-8 py-3 rounded-xl transition-colors">
          Solicitar oferta de todos modos
        </Link>
      </div>
    );
  }

  // Fetch all similar car candidates (same brand, vehicleType, or electricType)
  // No ordering/limit in GROQ — JS scoring handles ranking by price proximity + type
  const sanitySimiar = await client.fetch(similarCarsQuery, {
    excludeSlug:    slug,
    brandId:        sanity.brand?._id ?? null,
    vehicleTypeId:  sanity.vehicleType?._id ?? null,
    electricTypeId: sanity.electricType?._id ?? null,
  }, { next: { tags: ["car"], revalidate: 60 } }).catch(() => []);

  // ─── Map Sanity data → CarData shape ────────────────────────────────────────
  const car: CarData = {
    slug:            sanity.slug,
    name:            sanity.name,
    brand:           sanity.brand?.name ?? "",
    brandSlug:       sanity.brand?.slug ?? "",
    category:        sanity.vehicleType?.label ?? sanity.electricType?.tag ?? "",
    tagline:         sanity.tagline ?? "",
    description:     sanity.description ?? "",
    basePrice:       sanity.basePrice,
    discountPrice:   sanity.discountPrice ?? sanity.basePrice,
    hotDealBonus:    sanity.hotDealBonusAmount,
    isHotDeal:       sanity.isHotDeal ?? false,
    isNew:           sanity.isNew ?? false,
    isTopSeller:     sanity.isTopSeller ?? false,
    electricTypeTag: sanity.electricType?.tag ?? null,
    battery:         sanity.batteryCapacity,
    range:           sanity.range,
    electricRangeKm: sanity.electricRangeKm ?? null,
    power:           sanity.power,
    torque:          sanity.torque ?? 0,
    traction:        sanity.traction,
    acceleration:    sanity.acceleration ?? 0,
    topSpeed:        sanity.topSpeed ?? 0,
    seats:           sanity.seats ?? 5,
    cargo:           sanity.cargo ?? 0,
    chargeTimeDC:         sanity.chargeTimeDC ?? "",
    chargeTimeAC:         sanity.chargeTimeAC ?? "",
    chargeType:           sanity.chargeType ?? "",
    fuelConsumption:      sanity.fuelConsumption ?? null,
    rendimientoElectrico: sanity.rendimientoElectrico ?? null,
    warranty:        sanity.warranty,
    videoUrl:        sanity.videoUrl,
    videoTitle:      sanity.videoTitle ?? `${sanity.brand?.name ?? ""} ${sanity.name} – Review completo`,
    videoDuration:   sanity.videoDuration,
    gallery:         (sanity.gallery ?? []).map((g: { url: string }) => g.url).filter(Boolean),
    safetyFeatures:  sanity.safetyFeatures ?? [],
    techFeatures:    sanity.techFeatures ?? [],
    comfortFeatures: sanity.comfortFeatures ?? [],
    fichaUrl:        sanity.brand?.website ?? undefined,
    brandLogoUrl:    sanity.brand?.logoUrl ?? undefined,
    highlights:      (sanity.highlights ?? []).map((h: any) => ({
      title:         h.title,
      description:   h.description ?? "",
      badge:         h.badge,
      icon:          h.icon,
      imageUrl:      h.imageUrl,
      imagePosition: h.imagePosition ?? "right",
    })),
    versions:        (sanity.versions ?? []).map((v: any) => ({
      name:          v.name,
      price:         v.price,
      discountPrice: v.discountPrice ?? v.price,
      battery:       v.batteryCapacity ?? sanity.batteryCapacity,
      range:         v.range ?? sanity.range,
      power:         v.power ?? sanity.power,
      torque:        v.torque ?? sanity.torque ?? 0,
      traction:      v.traction ?? sanity.traction,
      acceleration:  v.acceleration ?? sanity.acceleration ?? 0,
      topSpeed:      v.topSpeed ?? sanity.topSpeed ?? 0,
      chargeTimeDC:         v.chargeTimeDC ?? sanity.chargeTimeDC ?? "",
      chargeTimeAC:         v.chargeTimeAC ?? sanity.chargeTimeAC ?? "",
      electricRangeKm:      v.electricRangeKm ?? sanity.electricRangeKm ?? null,
      fuelConsumption:      v.fuelConsumption ?? sanity.fuelConsumption ?? null,
      rendimientoElectrico: v.rendimientoElectrico ?? sanity.rendimientoElectrico ?? null,
    })),
  };

  // ─── Score and rank similar cars ────────────────────────────────────────────
  // Priority: price proximity > vehicle type > electric type > brand
  const refPrice = sanity.discountPrice ?? sanity.basePrice ?? 0;
  const rankedSimilar = (sanitySimiar ?? [])
    .map((s: any) => {
      let score = 0;
      const sPrice    = s.discountPrice ?? s.basePrice;
      const priceDiff = refPrice > 0 && sPrice > 0 ? Math.abs(sPrice - refPrice) / refPrice : 1;
      // Price proximity: tiered — ≤30% diff: 60pts, ≤60% diff: 25pts, ≤100%: 8pts, >100%: 0pts
      if (priceDiff <= 0.3)       score += 60;
      else if (priceDiff <= 0.6)  score += 25;
      else if (priceDiff <= 1.0)  score += 8;
      // Same vehicle type (SUV, sedan, etc.): 30pts
      if (s.vehicleTypeId && s.vehicleTypeId === sanity.vehicleType?._id) score += 30;
      // Same electric type (BEV/PHEV/HEV): 15pts
      if (s.electricTypeId && s.electricTypeId === sanity.electricType?._id) score += 15;
      // Same brand: 5pts — tiebreaker only
      if (s.brandId && s.brandId === sanity.brand?._id) score += 5;
      return { s, score };
    })
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3)
    .map(({ s }: any) => s);

  const similarCars: SimilarCarData[] = rankedSimilar.map((s: any) => ({
    slug:          s.slug,
    name:          s.name,
    brand:         s.brand?.name ?? "",
    category:      s.vehicleType?.label ?? "",
    basePrice:     s.basePrice,
    discountPrice: s.discountPrice ?? s.basePrice,
    range:         s.range,
    imageUrl:      s.imageUrl,
  }));

  return (
    <>
      <CarStructuredData
        name={car.name}
        brand={car.brand}
        brandSlug={car.brandSlug}
        slug={car.slug}
        description={car.description}
        image={car.gallery?.[0]}
        basePrice={car.basePrice}
        discountPrice={car.discountPrice}
        range={car.range}
        battery={car.battery}
        power={car.power}
        seats={car.seats}
        electricTypeTag={car.electricTypeTag}
      />
      <AutoPageClient car={car} similarCars={similarCars} />
    </>
  );
}
