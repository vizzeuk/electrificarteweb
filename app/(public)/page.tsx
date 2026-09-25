import React from "react";
import { client } from "@/lib/sanity/client";
import { homePageQuery, hotDealUrgencyLabelQuery } from "@/lib/queries/pages";
import { latestBlogPostsQuery } from "@/lib/queries/blog";
import {
  allBrandsStripQuery,
  allHotDealsQuery,
  electricTypesForHomeQuery,
  newCarsForHomeQuery,
  featuredCarsForHomeQuery,
} from "@/lib/queries/car";
import { collectionsForHomeQuery } from "@/lib/queries/collections";

// Above-the-fold + SEO-critical: render server-side.
import { Hero }             from "@/components/layout/Hero";
import { BrandStrip }       from "@/components/layout/BrandStrip";
import { LatestLaunches }   from "@/components/layout/LatestLaunches";
import { VehicleTypeGrid }  from "@/components/layout/VehicleTypeGrid";
import { HotDeal }          from "@/components/layout/HotDeal";
import { HOT_DEALS_ENABLED } from "@/lib/products";
import { getTopReviews } from "@/lib/reviews/queries";
import { Opportunities }    from "@/components/layout/Opportunities";
import { HomeStructuredData } from "@/components/layout/StructuredData";

// Below-the-fold sections are bundled into a client wrapper that lazy-loads
// each one with next/dynamic ssr:false. Keeps the initial HTML small so the
// hero paints fast on mobile.
import { HomeDeferred }     from "@/components/layout/HomeDeferred";
import { ParaVendedores }   from "@/components/layout/ParaVendedores";

// ISR: revalidar cada 60 segundos cuando haya cambios en Sanity
export const revalidate = 60;

export default async function HomePage() {
  const [page, blogPosts, brands, collections, hotDeals, topReviews, vehicleTypes, newCars, featuredCars, siteSettings] =
    await Promise.all([
      client.fetch(homePageQuery, {}, { next: { tags: ["homePage"] } }).catch(() => null),
      client.fetch(latestBlogPostsQuery, { count: 3 }, { next: { tags: ["blogPost"] } }).catch(() => []),
      client.fetch(allBrandsStripQuery, {}, { next: { tags: ["brand"] } }).catch(() => []),
      client.fetch(collectionsForHomeQuery, {}, { next: { tags: ["collection"] } }).catch(() => []),
      client.fetch(allHotDealsQuery, {}, { next: { tags: ["car"] } }).catch(() => []),
      // Reseñas aprobadas para la sección de testimonios. Fail-soft: si no hay
      // ninguna todavía, se usan los testimonios de Sanity como antes.
      getTopReviews(3),
      client.fetch(electricTypesForHomeQuery, {}, { next: { tags: ["electricType"] } }).catch(() => []),
      client.fetch(newCarsForHomeQuery, {}, { next: { tags: ["car"] } }).catch(() => []),
      client.fetch(featuredCarsForHomeQuery, {}, { next: { tags: ["car"] } }).catch(() => []),
      client.fetch(hotDealUrgencyLabelQuery, {}, { next: { tags: ["siteSettings"] } }).catch(() => null),
    ]);

  const hotDealUrgencyLabel: string | null = siteSettings?.hotDealUrgencyLabel ?? null;

  // Cifras del hero: se calculan del catálogo, nunca se escriben a mano.
  const TECH_ORDER = ["EV", "PHEV", "HEV", "MHEV", "REEV"];
  const electricTypes: { tag?: string | null; carCount?: number | null }[] = vehicleTypes ?? [];
  const technologies = Array.from(
    new Set(
      electricTypes
        .map((t) => {
          const tag = String(t?.tag ?? "").toUpperCase();
          return tag === "EREV" ? "REEV" : tag;
        })
        .filter(Boolean),
    ),
  ).sort((a, b) => {
    const ia = TECH_ORDER.indexOf(a), ib = TECH_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const heroFacts = {
    models: electricTypes.reduce((n, t) => n + (Number(t?.carCount) || 0), 0),
    brands: (brands ?? []).length,
    technologies,
  };

  // Manual Sanity curation takes priority; dynamic fallback fills remaining slots
  const mergeAndDedup = (manual: any[], dynamic: any[], limit: number) => {
    const manualIds = new Set((manual ?? []).map((c: any) => c._id));
    const extras = (dynamic ?? []).filter((c: any) => !manualIds.has(c._id));
    return [...(manual ?? []), ...extras].slice(0, limit);
  };

  // Sanity slug can come as string ("abc") or object ({current:"abc"}) — normalise
  const toSlug = (s: any): string =>
    typeof s === "string" ? s : (s?.current ?? "");

  const toBrand = (b: any) =>
    typeof b === "string" || b == null ? b : { name: b.name, slug: toSlug(b.slug), logoUrl: b.logoUrl };

  const latestCars = mergeAndDedup(page?.latestLaunchesCars, newCars, 10)
    .map((c: any) => ({
      _id:                  c._id,
      name:                 c.name,
      slug:                 toSlug(c.slug),
      brand:                toBrand(c.brand),
      // El tipo eléctrico ya se muestra con el chip de la foto (ElectricTypeBadge);
      // no lo duplicamos en un chip de "categoría".
      imageUrl:             c.imageUrl,
      batteryCapacity:      c.batteryCapacity,
      range:                c.range,
      maxVersionRange:      c.maxVersionRange,
      electricRangeKm:      c.electricRangeKm,
      fuelConsumption:      c.fuelConsumption,
      rendimientoElectrico: c.rendimientoElectrico,
      electricType:         c.electricType,
      power:                c.power,
      basePrice:            c.basePrice,
      discountPrice:        c.discountPrice,
      isNew:                c.isNew,
    }));

  const opportunityCars = mergeAndDedup(page?.opportunitiesCars, featuredCars, 8)
    .map((c: any) => ({
      _id:                  c._id,
      name:                 c.name,
      slug:                 toSlug(c.slug),
      brand:                toBrand(c.brand),
      category:             c.electricType?.tag ?? "",
      imageUrl:             c.imageUrl,
      basePrice:            c.basePrice,
      discountPrice:        c.discountPrice,
      range:                c.range,
      maxVersionRange:      c.maxVersionRange,
      batteryCapacity:      c.batteryCapacity,
      electricRangeKm:      c.electricRangeKm,
      fuelConsumption:      c.fuelConsumption,
      rendimientoElectrico: c.rendimientoElectrico,
      electricType:         c.electricType,
      power:                c.power,
      isNew:                c.isNew,
      isHotDeal:            c.isHotDeal,
    }));

  return (
    <>
      <HomeStructuredData />

      <Hero
        facts={heroFacts}
        data={page ? {
          badge:           page.heroBadge,
          title:           page.heroTitle,
          titleHighlight:  page.heroTitleHighlight,
          subtitle:        page.heroSubtitle,
          cta1Text:        page.heroCta1Text,
          cta1Href:        page.heroCta1Href,
          cta2Text:        page.heroCta2Text,
          statSavings:     page.heroStatSavings,
          statCars:        page.heroStatCars,
          statDiscount:    page.heroStatDiscount,
          statResponse:    page.heroStatResponse,
          offerOldPrice:   page.heroOfferOldPrice,
          offerNewPrice:   page.heroOfferNewPrice,
          offerBadge:      page.heroOfferBadge,
          videoUrl:        page.heroVideoUrl,
        } : undefined}
      />

      <BrandStrip brands={brands} />

      {/* Below-the-fold on mobile — content-visibility:auto skips paint/layout
          for these sections while they're off-screen. Combined with an
          intrinsic-size hint so the scrollbar is honest. */}
      <LatestLaunches title={page?.latestLaunchesTitle} cars={latestCars} />
      <VehicleTypeGrid types={vehicleTypes ?? []} />
      {HOT_DEALS_ENABLED && (
        <HotDeal
          cars={hotDeals?.length ? hotDeals : (page?.hotDealCar ? [page.hotDealCar] : null)}
          urgencyLabel={hotDealUrgencyLabel}
        />
      )}
      <Opportunities
        title={page?.opportunitiesTitle ?? "Destacados Electrificarte"}
        cars={opportunityCars}
      />

      <HomeDeferred
        collections={collections ?? []}
        servicios={page?.serviciosExtras}
        howItWorks={{
          title:           page?.howItWorksTitle,
          subtitle:        page?.howItWorksSubtitle,
          steps:           page?.howItWorksSteps,
          videoDesktopUrl: page?.howItWorksVideoDesktop ?? undefined,
          videoMobileUrl:  page?.howItWorksVideoMobile ?? undefined,
        }}
        trustBadges={page?.trustBadges}
        testimonials={{
          title: page?.testimonialsTitle,
          // Las reseñas REALES aprobadas mandan. Si todavía no hay ninguna, caen los
          // testimonios de Sanity — así la sección nunca queda vacía.
          items:
            topReviews.length > 0
              ? topReviews.map((r) => ({
                  name: r.autor,
                  car: [r.carBrand, r.carModel, r.carYear].filter(Boolean).join(" "),
                  carSlug: r.carSlug ?? undefined,
                  quote: r.body,
                  rating: r.rating,
                  verified: r.compraVerificada,
                }))
              : page?.testimonials,
        }}
        blogPosts={blogPosts ?? []}
        faq={{ title: page?.faqTitle, faqs: page?.faqs }}
        hotDealCar={page?.hotDealCar ?? null}
        hotDealUrgencyLabel={hotDealUrgencyLabel}
      />

      {/* Sección para vendedores — justo antes del footer (solo home) */}
      <ParaVendedores />
    </>
  );
}
