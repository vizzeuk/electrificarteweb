import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { urlFor } from "@/lib/sanity/image";
import { normalizeElectricLabel } from "@/lib/utils";
import {
  electricTypeBySlugQuery,
  carsByElectricTypeQuery,
  allElectricTypesQuery,
} from "@/lib/queries/car";
import { hotDealUrgencyLabelQuery } from "@/lib/queries/pages";
import ElectricoPageContent, {
  type ElectricoMeta,
  type ElectricoCarData,
  type OtherElectricType,
} from "./ElectricoPageContent";

export const revalidate = 60;

// Pre-renderiza todas las PLP de tipo eléctrico en el build.
export async function generateStaticParams() {
  const rows = await client
    .fetch<{ slug: string }[]>(
      `*[_type == "electricType" && defined(slug.current)]{ "slug": slug.current }`
    )
    .catch(() => []);
  return (rows ?? []).map((r) => ({ slug: r.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = await client.fetch(electricTypeBySlugQuery, { slug }).catch(() => null);
  if (!meta) return { title: "Tipo eléctrico no encontrado | Electrificarte" };
  return {
    title: meta.metaTitle ?? `${meta.label} en Chile | Electrificarte`,
    description: meta.metaDescription ?? meta.tagline ?? `Encuentra los mejores precios en autos ${meta.label} en Chile.`,
    alternates: { canonical: `/electrico/${slug}` },
  };
}

export default async function ElectricoPage({ params }: PageProps) {
  const { slug } = await params;

  const [sanityMeta, sanityCars, allTypes, siteSettings] = await Promise.all([
    client.fetch(electricTypeBySlugQuery, { slug }).catch(() => null),
    client.fetch(carsByElectricTypeQuery, { electricSlug: slug }).catch(() => []),
    client.fetch(allElectricTypesQuery, {}).catch(() => []),
    client.fetch(hotDealUrgencyLabelQuery, {}, { next: { tags: ["siteSettings"] } }).catch(() => null),
  ]);

  if (!sanityMeta) notFound();

  const meta: ElectricoMeta = {
    tag:         sanityMeta.tag ?? slug.toUpperCase(),
    label:       normalizeElectricLabel(sanityMeta.tag, sanityMeta.label) ?? slug,
    icon:        sanityMeta.icon ?? "bolt",
    color:       sanityMeta.color ?? "#003499",
    tagline:     sanityMeta.tagline ?? "",
    description: sanityMeta.description ?? "",
    howItWorks:  sanityMeta.howItWorks ?? [],
    pros:        sanityMeta.pros ?? [],
    cons:        sanityMeta.cons ?? [],
    idealFor:    sanityMeta.idealFor ?? "",
  };

  const cars: ElectricoCarData[] = (sanityCars ?? []).map((c: any) => ({
    slug:                 c.slug,
    name:                 c.name,
    brand:                c.brand?.name ?? "",
    brandSlug:            c.brand?.slug ?? "",
    tipoSlug:             c.vehicleType?.slug ?? "",
    tipoLabel:            c.vehicleType?.label ?? "",
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

  const otherTypes: OtherElectricType[] = (allTypes ?? []).map((t: any) => ({
    slug:  t.slug,
    label: t.label ?? t.name,
    icon:  t.icon ?? "bolt",
    tag:   t.tag ?? t.slug.toUpperCase(),
  }));

  const plpBanners = sanityMeta.plpBanners ?? [];

  return (
    <ElectricoPageContent
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
