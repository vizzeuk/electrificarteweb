import React from "react";
import { client } from "@/lib/sanity/client";
import { homePageQuery } from "@/lib/queries/pages";
import { latestBlogPostsQuery } from "@/lib/queries/blog";
import { allBrandsStripQuery } from "@/lib/queries/car";
import { collectionsForHomeQuery } from "@/lib/queries/collections";
import { Hero }             from "@/components/layout/Hero";
import { BrandStrip }       from "@/components/layout/BrandStrip";
import { LatestLaunches }   from "@/components/layout/LatestLaunches";
import { CollectionsSlideshow } from "@/components/layout/CollectionsSlideshow";
import { HotDeal }          from "@/components/layout/HotDeal";
import { Opportunities }    from "@/components/layout/Opportunities";
import { ServiciosExtras }  from "@/components/layout/ServiciosExtras";
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
  // Fetch all home page content from Sanity (falls back gracefully if no data yet)
  const [page, blogPosts, brands, collections] = await Promise.all([
    client.fetch(homePageQuery, {}, { next: { tags: ["homePage"] } }).catch(() => null),
    client.fetch(latestBlogPostsQuery, { count: 3 }, { next: { tags: ["blogPost"] } }).catch(() => []),
    client.fetch(allBrandsStripQuery, {}, { next: { tags: ["brand"] } }).catch(() => []),
    client.fetch(collectionsForHomeQuery, {}, { next: { tags: ["collection"] } }).catch(() => []),
  ]);

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
        cars={page?.latestLaunchesCars?.map((c: any) => ({
          _id:             c._id,
          name:            c.name,
          slug:            c.slug,
          brand:           c.brand,
          category:        c.category,
          imageUrl:        c.imageUrl,
          batteryCapacity: c.batteryCapacity,
          range:           c.range,
          basePrice:       c.basePrice,
          discountPrice:   c.discountPrice,
          isNew:           c.isNew,
        }))}
      />

      <CollectionsSlideshow collections={collections} />

      <HotDeal car={page?.hotDealCar ?? null} />

      <Opportunities
        title="Destacados Electrificarte"
        cars={page?.opportunitiesCars?.map((c: any) => ({
          _id:             c._id,
          name:            c.name,
          slug:            c.slug,
          brand:           c.brand,
          category:        c.category,
          imageUrl:        c.imageUrl,
          basePrice:       c.basePrice,
          discountPrice:   c.discountPrice,
          range:           c.range,
          batteryCapacity: c.batteryCapacity,
          power:           c.power,
          isNew:           c.isNew,
          isHotDeal:       c.isHotDeal,
        }))}
      />

      <ServiciosExtras items={page?.serviciosExtras} />

      <HowItWorks
        title={page?.howItWorksTitle}
        subtitle={page?.howItWorksSubtitle}
        steps={page?.howItWorksSteps}
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
