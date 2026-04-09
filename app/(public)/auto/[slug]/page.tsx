import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { client } from "@/lib/sanity/client";
import { carBySlugQuery, similarCarsQuery } from "@/lib/queries/car";
import AutoPageClient, { type CarData, type SimilarCarData } from "./AutoPageClient";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ─── SEO dinámico ─────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const car = await client.fetch(carBySlugQuery, { slug }).catch(() => null);
  if (!car) return { title: "Auto no encontrado | Electrificarte" };
  const brandName = car.brand?.name ?? "";
  return {
    title: car.metaTitle ?? `${brandName} ${car.name} | Oferta exclusiva Electrificarte`,
    description: car.metaDescription ?? car.tagline ?? `Consigue el mejor precio en el ${brandName} ${car.name} en Chile.`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function CarDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch car from Sanity
  const sanity = await client.fetch(carBySlugQuery, { slug }).catch(() => null);

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

  // Fetch similar cars (same vehicleType, different slug)
  const sanitySimiar = sanity.vehicleType?._id
    ? await client.fetch(similarCarsQuery, { vehicleTypeId: sanity.vehicleType._id, excludeSlug: slug }).catch(() => [])
    : [];

  // ─── Map Sanity data → CarData shape ────────────────────────────────────────
  const car: CarData = {
    slug:            sanity.slug,
    name:            sanity.name,
    brand:           sanity.brand?.name ?? "",
    brandSlug:       sanity.brand?.slug ?? "",
    category:        sanity.vehicleType?.label ?? sanity.category?.name ?? "",
    tagline:         sanity.tagline ?? "",
    description:     sanity.description ?? "",
    basePrice:       sanity.basePrice,
    discountPrice:   sanity.discountPrice ?? sanity.basePrice,
    hotDealBonus:    sanity.hotDealBonusAmount,
    isHotDeal:       sanity.isHotDeal ?? false,
    isNew:           sanity.isNew ?? false,
    isTopSeller:     sanity.isTopSeller ?? false,
    battery:         sanity.batteryCapacity,
    range:           sanity.range,
    power:           sanity.power,
    torque:          sanity.torque ?? 0,
    traction:        sanity.traction,
    acceleration:    sanity.acceleration ?? 0,
    topSpeed:        sanity.topSpeed ?? 0,
    seats:           sanity.seats ?? 5,
    cargo:           sanity.cargo ?? 0,
    chargeTimeDC:    sanity.chargeTimeDC ?? "",
    chargeTimeAC:    sanity.chargeTimeAC ?? "",
    chargeType:      sanity.chargeType ?? "",
    warranty:        sanity.warranty,
    videoUrl:        sanity.videoUrl,
    videoTitle:      sanity.videoTitle ?? `${sanity.brand?.name ?? ""} ${sanity.name} – Review completo`,
    videoDuration:   sanity.videoDuration,
    gallery:         (sanity.gallery ?? []).map((g: { url: string }) => g.url).filter(Boolean),
    safetyFeatures:  sanity.safetyFeatures ?? [],
    techFeatures:    sanity.techFeatures ?? [],
    comfortFeatures: sanity.comfortFeatures ?? [],
    fichaUrl:        sanity.brand?.website ?? undefined,
    versions:        (sanity.versions ?? []).map((v: any) => ({
      name:          v.name,
      price:         v.price,
      discountPrice: v.discountPrice ?? v.price,
      battery:       v.batteryCapacity,
      range:         v.range,
      power:         v.power,
      torque:        v.torque ?? 0,
      traction:      v.traction,
      acceleration:  v.acceleration ?? 0,
      topSpeed:      v.topSpeed ?? 0,
      chargeTimeDC:  v.chargeTimeDC ?? "",
      chargeTimeAC:  v.chargeTimeAC ?? "",
    })),
  };

  // ─── Map similar cars ────────────────────────────────────────────────────────
  const similarCars: SimilarCarData[] = (sanitySimiar ?? []).map((s: any) => ({
    slug:          s.slug,
    name:          s.name,
    brand:         s.brand?.name ?? "",
    category:      s.vehicleType?.label ?? s.category?.name ?? "",
    discountPrice: s.discountPrice ?? s.basePrice,
    range:         s.range,
    imageUrl:      s.imageUrl,
  }));

  return <AutoPageClient car={car} similarCars={similarCars} />;
}
