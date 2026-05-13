import React from "react";
import { client } from "@/lib/sanity/client";
import { homePageQuery } from "@/lib/queries/pages";
import { latestBlogPostsQuery } from "@/lib/queries/blog";
import {
  allBrandsStripQuery,
  allHotDealsQuery,
  electricTypesForHomeQuery,
  newCarsForHomeQuery,
  featuredCarsForHomeQuery,
} from "@/lib/queries/car";
import { collectionsForHomeQuery } from "@/lib/queries/collections";
import { Hero }             from "@/components/layout/Hero";
import { BrandStrip }       from "@/components/layout/BrandStrip";
import { LatestLaunches }   from "@/components/layout/LatestLaunches";
import { CollectionsSlideshow } from "@/components/layout/CollectionsSlideshow";
import { HotDeal }          from "@/components/layout/HotDeal";
import { Opportunities }    from "@/components/layout/Opportunities";
import { ServiciosExtras }  from "@/components/layout/ServiciosExtras";
import { VehicleTypeGrid }  from "@/components/layout/VehicleTypeGrid";
import { HowItWorks }       from "@/components/layout/HowItWorks";
import { TrustBadges }      from "@/components/layout/TrustBadges";
import { Testimonials }     from "@/components/layout/Testimonials";
import { BlogPreview }      from "@/components/layout/BlogPreview";
import { FAQ }              from "@/components/layout/FAQ";
import { StickyCTA }        from "@/components/layout/StickyCTA";
import { PromoPopup }       from "@/components/layout/PromoPopup";
import { HomeStructuredData } from "@/components/layout/StructuredData";

// ISR: revalidar cada 60 segundos cuando haya cambios en Sanity
export const revalidate = 60;

export default async function HomePage() {
  const [page, blogPosts, brands, collections, hotDeals, vehicleTypes, newCars, featuredCars] =
    await Promise.all([
      client.fetch(homePageQuery, {}, { next: { tags: ["homePage"] } }).catch(() => null),
      client.fetch(latestBlogPostsQuery, { count: 3 }, { next: { tags: ["blogPost"] } }).catch(() => []),
      client.fetch(allBrandsStripQuery, {}, { next: { tags: ["brand"] } }).catch(() => []),
      client.fetch(collectionsForHomeQuery, {}, { next: { tags: ["collection"] } }).catch(() => []),
      client.fetch(allHotDealsQuery, {}, { next: { tags: ["car"] } }).catch(() => []),
      client.fetch(electricTypesForHomeQuery, {}, { next: { tags: ["electricType"] } }).catch(() => []),
      client.fetch(newCarsForHomeQuery, {}, { next: { tags: ["car"] } }).catch(() => []),
      client.fetch(featuredCarsForHomeQuery, {}, { next: { tags: ["car"] } }).catch(() => []),
    ]);

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

  const latestCars = mergeAndDedup(page?.latestLaunchesCars, newCars, 6)
    .map((c: any) => ({
      _id:                  c._id,
      name:                 c.name,
      slug:                 toSlug(c.slug),
      brand:                toBrand(c.brand),
      category:             c.category,
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
      category:             c.category,
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

      <LatestLaunches
        title={page?.latestLaunchesTitle}
        cars={latestCars}
      />

      <VehicleTypeGrid types={vehicleTypes ?? []} />

      <HotDeal cars={hotDeals?.length ? hotDeals : (page?.hotDealCar ? [page.hotDealCar] : null)} />

      <Opportunities
        title={page?.opportunitiesTitle ?? "Destacados Electrificarte"}
        cars={opportunityCars}
      />

      <CollectionsSlideshow collections={collections} />

      <ServiciosExtras items={page?.serviciosExtras} />

      <HowItWorks
        title={page?.howItWorksTitle}
        subtitle={page?.howItWorksSubtitle}
        steps={page?.howItWorksSteps}
        videoUrl={page?.howItWorksVideoUrl}
      />

      <TrustBadges badges={page?.trustBadges} />

      <Testimonials
        title={page?.testimonialsTitle}
        testimonials={page?.testimonials}
      />

      <BlogPreview posts={blogPosts ?? []} />

      <FAQ
        title={page?.faqTitle}
        faqs={page?.faqs}
      />

      <StickyCTA />
      <PromoPopup car={page?.hotDealCar ?? null} />
    </>
  );
}
