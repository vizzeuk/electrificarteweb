import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { client } from "@/lib/sanity/client";
import { urlFor } from "@/lib/sanity/image";
import {
  vehicleTypeBySlugQuery,
  carsByVehicleTypeQuery,
  allVehicleTypesQuery,
} from "@/lib/queries/car";
import TipoPageContent, { type TipoCarData, type TipoMeta, type OtherType } from "./TipoPageContent";

export const revalidate = 60;

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
  };
}

export default async function TipoPage({ params }: PageProps) {
  const { slug } = await params;

  const [sanityMeta, sanityCars, allTypes] = await Promise.all([
    client.fetch(vehicleTypeBySlugQuery, { slug }).catch(() => null),
    client.fetch(carsByVehicleTypeQuery, { typeSlug: slug }).catch(() => []),
    client.fetch(allVehicleTypesQuery, {}).catch(() => []),
  ]);

  if (!sanityMeta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="material-symbols-outlined text-[64px] text-gray-200">electric_car</span>
        <h1 className="font-headline font-black text-3xl uppercase">{slug.replace(/-/g, " ")}</h1>
        <p className="text-text-muted max-w-sm">
          Esta categoría no está disponible aún. Explora el resto del catálogo.
        </p>
        <Link
          href="/solicitar"
          className="bg-primary hover:bg-primary-dark text-black font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Solicitar oferta
        </Link>
      </div>
    );
  }

  const meta: TipoMeta = {
    label:    sanityMeta.label ?? slug,
    icon:     sanityMeta.icon ?? "directions_car",
    heroDesc: sanityMeta.heroDescription ?? sanityMeta.heroTagline ?? "",
  };

  const cars: TipoCarData[] = (sanityCars ?? []).map((c: any) => ({
    slug:               c.slug,
    name:               c.name,
    brand:              c.brand?.name ?? "",
    brandSlug:          c.brand?.slug ?? "",
    electricTypeSlug:   c.electricType?.slug ?? "",
    electricTypeLabel:  c.electricType?.label ?? c.electricType?.tag ?? "",
    basePrice:          c.basePrice,
    discountPrice:      c.discountPrice ?? c.basePrice,
    range:              c.range ?? 0,
    power:              c.power ?? 0,
    battery:            c.batteryCapacity ?? 0,
    traction:           c.traction ?? "",
    acceleration:       c.acceleration ?? 0,
    isHotDeal:          c.isHotDeal ?? false,
    tagline:            c.tagline ?? "",
    imageUrl:           c.mainImage ? urlFor(c.mainImage).width(800).auto("format").url() : undefined,
  }));

  const otherTypes: OtherType[] = (allTypes ?? []).map((t: any) => ({
    slug:  t.slug,
    label: t.label ?? t.name,
    icon:  t.icon ?? "directions_car",
  }));

  return (
    <TipoPageContent
      slug={slug}
      meta={meta}
      cars={cars}
      otherTypes={otherTypes}
    />
  );
}
