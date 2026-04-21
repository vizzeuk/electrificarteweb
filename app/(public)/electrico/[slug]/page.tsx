import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { client } from "@/lib/sanity/client";
import { urlFor } from "@/lib/sanity/image";
import {
  electricTypeBySlugQuery,
  carsByElectricTypeQuery,
  allElectricTypesQuery,
} from "@/lib/queries/car";
import ElectricoPageContent, {
  type ElectricoMeta,
  type ElectricoCarData,
  type OtherElectricType,
} from "./ElectricoPageContent";

export const revalidate = 60;

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
  };
}

export default async function ElectricoPage({ params }: PageProps) {
  const { slug } = await params;

  const [sanityMeta, sanityCars, allTypes] = await Promise.all([
    client.fetch(electricTypeBySlugQuery, { slug }).catch(() => null),
    client.fetch(carsByElectricTypeQuery, { electricSlug: slug }).catch(() => []),
    client.fetch(allElectricTypesQuery, {}).catch(() => []),
  ]);

  if (!sanityMeta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="material-symbols-outlined text-[64px] text-gray-200">electric_car</span>
        <h1 className="font-headline font-black text-3xl uppercase">{slug.replace(/-/g, " ")}</h1>
        <p className="text-text-muted max-w-sm">
          Esta tecnología aún no está disponible en nuestro catálogo.
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

  const meta: ElectricoMeta = {
    tag:         sanityMeta.tag ?? slug.toUpperCase(),
    label:       sanityMeta.label ?? slug,
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
    slug:         c.slug,
    name:         c.name,
    brand:        c.brand?.name ?? "",
    brandSlug:    c.brand?.slug ?? "",
    tipoSlug:     c.vehicleType?.slug ?? "",
    tipoLabel:    c.vehicleType?.label ?? "",
    basePrice:    c.basePrice,
    discountPrice: c.discountPrice ?? c.basePrice,
    range:        c.range ?? 0,
    power:        c.power ?? 0,
    battery:      c.batteryCapacity ?? 0,
    isHotDeal:    c.isHotDeal ?? false,
    tagline:      c.tagline ?? "",
    imageUrl:     c.mainImage ? urlFor(c.mainImage).width(800).auto("format").url() : undefined,
  }));

  const otherTypes: OtherElectricType[] = (allTypes ?? []).map((t: any) => ({
    slug:  t.slug,
    label: t.label ?? t.name,
    icon:  t.icon ?? "bolt",
    tag:   t.tag ?? t.slug.toUpperCase(),
  }));

  return (
    <ElectricoPageContent
      slug={slug}
      meta={meta}
      cars={cars}
      otherTypes={otherTypes}
    />
  );
}
