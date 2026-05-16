"use client";

import dynamic from "next/dynamic";

// All sections below render below-the-fold on mobile. We keep ssr:true so
// the HTML still contains the rendered markup (good for SEO + LCP without
// flicker) but next/dynamic gives each section its own JS chunk so the
// initial JS bundle the client has to parse is smaller.

const CollectionsSlideshow = dynamic(
  () => import("@/components/layout/CollectionsSlideshow").then(m => m.CollectionsSlideshow),
);
const ServiciosExtras = dynamic(
  () => import("@/components/layout/ServiciosExtras").then(m => m.ServiciosExtras),
);
const HowItWorks = dynamic(
  () => import("@/components/layout/HowItWorks").then(m => m.HowItWorks),
);
const TrustBadges = dynamic(
  () => import("@/components/layout/TrustBadges").then(m => m.TrustBadges),
);
const Testimonials = dynamic(
  () => import("@/components/layout/Testimonials").then(m => m.Testimonials),
);
const BlogPreview = dynamic(
  () => import("@/components/layout/BlogPreview").then(m => m.BlogPreview),
);
const FAQ = dynamic(
  () => import("@/components/layout/FAQ").then(m => m.FAQ),
);
const StickyCTA = dynamic(
  () => import("@/components/layout/StickyCTA").then(m => m.StickyCTA),
);
const PromoPopup = dynamic(
  () => import("@/components/layout/PromoPopup").then(m => m.PromoPopup),
);

interface HomeDeferredProps {
  collections:     unknown[];
  servicios:       unknown[] | undefined;
  howItWorks:      { title?: string; subtitle?: string; steps?: unknown[]; videoUrl?: string };
  trustBadges:     unknown[] | undefined;
  testimonials:    { title?: string; items?: unknown[] };
  blogPosts:       unknown[];
  faq:             { title?: string; faqs?: unknown[] };
  hotDealCar:      unknown;
}

// content-visibility:auto tells the browser to skip layout/paint for elements
// outside the viewport — huge mobile-Safari win for long pages. We pair it
// with contain-intrinsic-size so the scrollbar still measures correctly.
const offscreen: React.CSSProperties = {
  contentVisibility: "auto",
  containIntrinsicSize: "0 720px",
};

export function HomeDeferred(p: HomeDeferredProps) {
  return (
    <>
      {/* eslint-disable @typescript-eslint/no-explicit-any */}
      <div style={offscreen}><CollectionsSlideshow collections={p.collections as any} /></div>
      <div style={offscreen}><ServiciosExtras items={p.servicios as any} /></div>
      <div style={offscreen}>
        <HowItWorks
          title={p.howItWorks.title}
          subtitle={p.howItWorks.subtitle}
          steps={p.howItWorks.steps as any}
          videoUrl={p.howItWorks.videoUrl}
        />
      </div>
      <div style={offscreen}><TrustBadges badges={p.trustBadges as any} /></div>
      <div style={offscreen}>
        <Testimonials title={p.testimonials.title} testimonials={p.testimonials.items as any} />
      </div>
      <div style={offscreen}><BlogPreview posts={p.blogPosts as any} /></div>
      <div style={offscreen}><FAQ title={p.faq.title} faqs={p.faq.faqs as any} /></div>
      <StickyCTA />
      <PromoPopup car={p.hotDealCar as any} />
      {/* eslint-enable @typescript-eslint/no-explicit-any */}
    </>
  );
}
