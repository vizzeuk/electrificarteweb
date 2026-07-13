import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { urlFor } from "@/lib/sanity/image";
import {
  vehicleTypeBySlugQuery,
  carsByVehicleTypeQuery,
  allVehicleTypesQuery,
} from "@/lib/queries/car";
import { hotDealUrgencyLabelQuery } from "@/lib/queries/pages";
import TipoPageContent, { type TipoCarData, type TipoMeta, type OtherType } from "./TipoPageContent";

export const revalidate = 60;

// Pre-renderiza todas las PLP de tipo de vehículo en el build.
export async function generateStaticParams() {
  const rows = await client
    .fetch<{ slug: string }[]>(
      `*[_type == "vehicleType" && defined(slug.current)]{ "slug": slug.current }`
    )
    .catch(() => []);
  return (rows ?? []).map((r) => ({ slug: r.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = await client.fetch(vehicleTypeBySlugQuery, { slug }).catch(() => null);
  if (!meta) return { title: "Tipo no encontrado | Electrificarte" };
  return {
    title: meta.metaTitle ?? `${meta.label} eléctricos en Chile | Electrificarte`,
    description: meta.metaDescription ?? `Encuentra los mejores precios en autos ${meta.label} eléctricos en Chile.`,
    alternates: { canonical: `/tipo/${slug}` },
  };
}

export default async function TipoPage({ params }: PageProps) {
  const { slug } = await params;

  const [sanityMeta, sanityCars, allTypes, siteSettings] = await Promise.all([
    client.fetch(vehicleTypeBySlugQuery, { slug }).catch(() => null),
    client.fetch(carsByVehicleTypeQuery, { typeSlug: slug }).catch(() => []),
    client.fetch(allVehicleTypesQuery, {}).catch(() => []),
    client.fetch(hotDealUrgencyLabelQuery, {}, { next: { tags: ["siteSettings"] } }).catch(() => null),
  ]);

  if (!sanityMeta) notFound();

  const meta: TipoMeta = {
    label:    sanityMeta.label ?? slug,
    icon:     sanityMeta.icon ?? "directions_car",
    heroDesc: sanityMeta.heroDescription ?? sanityMeta.heroTagline ?? "",
  };

  const cars: TipoCarData[] = (sanityCars ?? []).map((c: any) => ({
    slug:                 c.slug,
    name:                 c.name,
    brand:                c.brand?.name ?? "",
    brandSlug:            c.brand?.slug ?? "",
    electricTypeSlug:     c.electricType?.slug ?? "",
    electricTypeLabel:    c.electricType?.label ?? c.electricType?.tag ?? "",
    electricTypeTag:      c.electricType?.tag ?? "",
    basePrice:            c.basePrice,
    discountPrice:        c.discountPrice ?? c.basePrice,
    range:                c.range ?? 0,
    maxVersionRange:      c.maxVersionRange ?? null,
    power:                c.power ?? 0,
    battery:              c.batteryCapacity ?? 0,
    electricRangeKm:      c.electricRangeKm ?? null,
    fuelConsumption:      c.fuelConsumption ?? null,
    rendimientoElectrico: c.rendimientoElectrico ?? null,
    traction:             c.traction ?? "",
    seats:                c.seats ?? null,
    euroNcap:             c.euroNcap ?? null,
    acceleration:         c.acceleration ?? 0,
    isHotDeal:            c.isHotDeal ?? false,
    tagline:              c.tagline ?? "",
    imageUrl:             c.mainImage ? urlFor(c.mainImage).width(800).auto("format").url() : undefined,
  }));

  // Ad car: Sanity selection takes priority, fallback = most expensive in catalog
  const rawAdCar = sanityMeta.heroFeaturedCar ?? (sanityCars ?? []).slice().sort(
    (a: any, b: any) => (b.discountPrice ?? b.basePrice) - (a.discountPrice ?? a.basePrice)
  )[0];
  const adCar = rawAdCar ? {
    name:          rawAdCar.name,
    slug:          rawAdCar.slug ?? rawAdCar.slug?.current ?? "",
    imageUrl:      rawAdCar.imageUrl ?? (rawAdCar.mainImage ? urlFor(rawAdCar.mainImage).width(600).auto("format").url() : undefined),
    brand:         rawAdCar.brand?.name ?? "",
    basePrice:     rawAdCar.basePrice,
    discountPrice: rawAdCar.discountPrice,
    range:         rawAdCar.range,
  } : null;
  const adText = sanityMeta.heroAdText ?? "El mejor precio del mercado garantizado";

  const otherTypes: OtherType[] = (allTypes ?? []).map((t: any) => ({
    slug:  t.slug,
    label: t.label ?? t.name,
    icon:  t.icon ?? "directions_car",
  }));

  const plpBanners = sanityMeta.plpBanners ?? [];

  return (
    <TipoPageContent
      slug={slug}
      meta={meta}
      cars={cars}
      otherTypes={otherTypes}
      adCar={adCar}
      adText={adText}
      plpBanners={plpBanners}
      hotDealUrgencyLabel={siteSettings?.hotDealUrgencyLabel ?? null}
    />
  );
}
