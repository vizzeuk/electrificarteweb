import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { carBySlugQuery, similarCarsQuery } from "@/lib/queries/car";
import { stripBrandSuffix } from "@/lib/utils";
import AutoPageClient, { type CarData, type SimilarCarData } from "./AutoPageClient";
import { getReviewsForCar, getReviewSummary } from "@/lib/reviews/queries";
import { ReviewList } from "@/components/reviews/ReviewList";
import { CarStructuredData } from "@/components/car/CarStructuredData";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";

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
  if (!car || car.hidden) return { title: "Auto no encontrado" };
  const brandName = car.brand?.name ?? "";
  return {
    title: stripBrandSuffix(car.metaTitle ?? `${brandName} ${car.name} | Oferta exclusiva`),
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
    // El slug llega en minúscula: sentenceCase lo dejaría igual, así que solo se sube la inicial.
    const slugName = slug.replace(/-/g, " ");
    const fallbackName = slugName.charAt(0).toUpperCase() + slugName.slice(1);
    return (
      <div className="page">
        <section className="section pt-8">
          <div className="wrap">
            <nav className="crumbs" aria-label="Migas de pan">
              <Link href="/">Inicio</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{fallbackName}</span>
            </nav>
            <div className="mt-10 max-w-[40rem]">
              <h1 className="t-h1">{fallbackName}</h1>
              <p className="t-lead mt-6">
                Este modelo aún no está disponible en nuestro catálogo digital. Puedes solicitar una oferta de todos modos.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <OfferCta carSlug={slug} model={slugName} source="pdp" className="btn btn--primary btn--lg">
                  Quiero una oferta
                  <Icon name="arrow_forward" size="none" className="arrow" />
                </OfferCta>
                <Link href="/marcas" className="btn btn--secondary btn--lg">
                  Ver todas las marcas
                </Link>
              </div>
            </div>
          </div>
        </section>
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
    // Datos de la ficha y de los chips del bloque de compra (ya vienen en carBySlugQuery).
    modelYear:          sanity.modelYear ?? null,
    euroNcap:           sanity.euroNcap ?? null,
    airbags:            sanity.airbags ?? null,
    batteryType:        sanity.batteryType ?? null,
    connectorType:      sanity.connectorType ?? null,
    maxDCChargingPower: sanity.maxDCChargingPower ?? null,
    maxACChargingPower: sanity.maxACChargingPower ?? null,
    transmission:       sanity.transmission ?? null,
    frunkCapacity:      sanity.frunkCapacity ?? null,
    groundClearance:    sanity.groundClearance ?? null,
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
      maxDCChargingPower:   v.maxDCChargingPower ?? sanity.maxDCChargingPower ?? null,
      maxACChargingPower:   v.maxACChargingPower ?? sanity.maxACChargingPower ?? null,
      transmission:         v.transmission ?? sanity.transmission ?? null,
      cargo:                v.trunkCapacity ?? sanity.cargo ?? null,
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

  // Reseñas aprobadas de este auto. Fail-soft: si Supabase no responde devuelve []
  // y la PDP se renderiza igual. Se refresca con el ISR de 60 s de la página.
  const [reviews, reviewSummary] = await Promise.all([
    getReviewsForCar(car.slug),
    getReviewSummary(car.slug),
  ]);

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
        ratingValue={reviewSummary?.promedio}
        ratingCount={reviewSummary?.total}
      />
      <AutoPageClient
        car={car}
        similarCars={similarCars}
        reviewsSlot={
          // key: el elemento viaja desde el servidor y React lo valida como hijo de una lista.
          <ReviewList key="reviews" reviews={reviews} summary={reviewSummary} carName={`${car.brand} ${car.name}`} />
        }
      />
    </>
  );
}
