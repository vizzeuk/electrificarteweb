"use client";

import { CollectionsSlideshow } from "@/components/layout/CollectionsSlideshow";
import { ServiciosExtras }      from "@/components/layout/ServiciosExtras";
import { HowItWorks }           from "@/components/layout/HowItWorks";
import { TrustBadges }          from "@/components/layout/TrustBadges";
import { Testimonials }         from "@/components/layout/Testimonials";
import { BlogPreview }          from "@/components/layout/BlogPreview";
import { FAQ }                  from "@/components/layout/FAQ";
import { StickyCTA }            from "@/components/layout/StickyCTA";
import { PromoPopup }           from "@/components/layout/PromoPopup";

interface HomeDeferredProps {
  collections:     unknown[];
  servicios:       unknown[] | undefined;
  howItWorks:      { title?: string; subtitle?: string; steps?: unknown[]; videoDesktopUrl?: string; videoMobileUrl?: string };
  trustBadges:     unknown[] | undefined;
  testimonials:    { title?: string; items?: unknown[] };
  blogPosts:       unknown[];
  faq:             { title?: string; faqs?: unknown[] };
  hotDealCar:      unknown;
}

export function HomeDeferred(p: HomeDeferredProps) {
  return (
    <>
      {/* eslint-disable @typescript-eslint/no-explicit-any */}
      <CollectionsSlideshow collections={p.collections as any} />
      <ServiciosExtras items={p.servicios as any} />
      <HowItWorks
        title={p.howItWorks.title}
        subtitle={p.howItWorks.subtitle}
        steps={p.howItWorks.steps as any}
        videoDesktopUrl={p.howItWorks.videoDesktopUrl}
        videoMobileUrl={p.howItWorks.videoMobileUrl}
      />
      <TrustBadges badges={p.trustBadges as any} />
      <Testimonials title={p.testimonials.title} testimonials={p.testimonials.items as any} />
      <BlogPreview posts={p.blogPosts as any} />
      <FAQ title={p.faq.title} faqs={p.faq.faqs as any} />
      <StickyCTA />
      <PromoPopup car={p.hotDealCar as any} />
      {/* eslint-enable @typescript-eslint/no-explicit-any */}
    </>
  );
}
