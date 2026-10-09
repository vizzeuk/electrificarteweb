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
  carImageBySlugQuery,
} from "@/lib/queries/car";
import { collectionsForHomeQuery } from "@/lib/queries/collections";

// Above-the-fold + SEO-critical: render server-side.
import { Hero }             from "@/components/layout/Hero";
import { BrandStrip }       from "@/components/layout/BrandStrip";
import { LatestLaunches }   from "@/components/layout/LatestLaunches";
import { VehicleTypeGrid }  from "@/components/layout/VehicleTypeGrid";
import { HotDeal }          from "@/components/layout/HotDeal";
import { HOT_DEALS_ENABLED } from "@/lib/products";
import { getAllReviews, summarize, topReviews } from "@/lib/reviews/queries";
import { Opportunities }    from "@/components/layout/Opportunities";
import { HomeReviewPrompt } from "@/components/reviews/HomeReviewPrompt";
import { TESTIMONIALS_TITLE } from "@/components/layout/Testimonials";
import { HomeStructuredData } from "@/components/layout/StructuredData";

// Below-the-fold sections are bundled into a client wrapper that lazy-loads
// each one with next/dynamic ssr:false. Keeps the initial HTML small so the
// hero paints fast on mobile.
import { HomeDeferred }     from "@/components/layout/HomeDeferred";
import { ParaVendedores }   from "@/components/layout/ParaVendedores";

// ISR: revalidar cada 60 segundos cuando haya cambios en Sanity
export const revalidate = 60;

export default async function HomePage() {
  const [page, blogPosts, brands, collections, hotDeals, allReviews, vehicleTypes, newCars, featuredCars, siteSettings] =
    await Promise.all([
      client.fetch(homePageQuery, {}, { next: { tags: ["homePage"] } }).catch(() => null),
      client.fetch(latestBlogPostsQuery, { count: 3 }, { next: { tags: ["blogPost"] } }).catch(() => []),
      client.fetch(allBrandsStripQuery, {}, { next: { tags: ["brand"] } }).catch(() => []),
      client.fetch(collectionsForHomeQuery, {}, { next: { tags: ["collection"] } }).catch(() => []),
      client.fetch(allHotDealsQuery, {}, { next: { tags: ["car"] } }).catch(() => []),
      // Reseñas aprobadas: alimentan la franja de reseñas y los testimonios. Fail-soft: [] si
      // Supabase no responde, y ambas secciones quedan en la invitación a escribir.
      getAllReviews(),
      client.fetch(electricTypesForHomeQuery, {}, { next: { tags: ["electricType"] } }).catch(() => []),
      client.fetch(newCarsForHomeQuery, {}, { next: { tags: ["car"] } }).catch(() => []),
      client.fetch(featuredCarsForHomeQuery, {}, { next: { tags: ["car"] } }).catch(() => []),
      client.fetch(hotDealUrgencyLabelQuery, {}, { next: { tags: ["siteSettings"] } }).catch(() => null),
    ]);

  const hotDealUrgencyLabel: string | null = siteSettings?.hotDealUrgencyLabel ?? null;

  // Reseñas: resumen de TODAS (nota y total reales), las 3 mejores para los testimonios y, para
  // la franja, la más reciente que no esté ya entre esas 3 (así no se repite en la misma página).
  const reviewSummary = summarize(allReviews);
  const featuredReviews = topReviews(allReviews, 3);
  const latestReview = allReviews.find((r) => !featuredReviews.some((f) => f.id === r.id)) ?? null;
  // Foto del modelo que cita esa reseña (la de catálogo, no las del dueño). Sin auto ligado o si
  // Sanity no responde, la tarjeta queda sin foto.
  const latestReviewCar: { name?: string; imageUrl?: string } | null = latestReview?.carSlug
    ? await client
        .fetch(carImageBySlugQuery, { slug: latestReview.carSlug }, { next: { tags: ["car"] } })
        .catch(() => null)
    : null;
  // El título de Sanity todavía dice "Lo que dicen nuestros clientes", pero quienes opinan son
  // dueños de autos electrificados (cualquiera puede), no clientes: ese texto viejo se ignora.
  // Cualquier otro título que se escriba en Sanity sí manda.
  const LEGACY_TESTIMONIALS_TITLE = "Lo que dicen nuestros clientes";
  const testimonialsTitle =
    page?.testimonialsTitle && page.testimonialsTitle.trim() !== LEGACY_TESTIMONIALS_TITLE
      ? page.testimonialsTitle
      : TESTIMONIALS_TITLE;

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
      {/* Invitación a reseñar (cualquier auto) con la nota real → /resenas → /resenas/escribir.
          Blanca entre "Últimos lanzamientos" y los tipos, las dos en Niebla: el home alterna fondos. */}
      <HomeReviewPrompt summary={reviewSummary} latest={latestReview} carImageUrl={latestReviewCar?.imageUrl} />
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
          title: testimonialsTitle,
          // Solo reseñas REALES aprobadas. Sin ninguna, la sección queda en la invitación.
          items: featuredReviews.map((r) => ({
            name: r.autor,
            car: [r.carBrand, r.carModel, r.carYear].filter(Boolean).join(" "),
            carSlug: r.carSlug ?? undefined,
            quote: r.body,
            rating: r.rating,
            imageUrl: r.photoUrls[0],
          })),
          summary: reviewSummary ? { promedio: reviewSummary.promedio, total: reviewSummary.total } : null,
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
