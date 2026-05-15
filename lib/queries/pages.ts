import { groq } from "next-sanity";

// ─── Home Page ────────────────────────────────────────────────────────────────
export const homePageQuery = groq`
  *[_type == "homePage"][0] {
    heroBadge,
    heroTitle,
    heroTitleHighlight,
    heroSubtitle,
    heroCta1Text,
    heroCta1Href,
    heroCta2Text,
    heroStatSavings,
    heroStatCars,
    heroStatDiscount,
    heroStatResponse,
    heroOfferOldPrice,
    heroOfferNewPrice,
    heroOfferBadge,
    heroVideoUrl,

    latestLaunchesTitle,
    "latestLaunchesCars": latestLaunchesCars[]->{
      _id,
      name,
      "slug": slug.current,
      tagline,
      mainImage,
      "imageUrl": mainImage.asset->url,
      batteryCapacity,
      range,
      "maxVersionRange": math::max(versions[defined(range) && range > 0].range),
      electricRangeKm,
      fuelConsumption,
      rendimientoElectrico,
      power,
      basePrice,
      discountPrice,
      isNew,
      isHotDeal,
      "brand": brand->{ name, "slug": slug.current, "logoUrl": logo.asset->url },
      "category": category->{ name },
      "electricType": electricType->{ tag }
    },

    "hotDealCar": hotDealCar->{
      _id,
      name,
      "slug": slug.current,
      mainImage,
      "imageUrl": mainImage.asset->url,
      basePrice,
      discountPrice,
      hotDealBonusAmount,
      range,
      power,
      traction,
      acceleration,
      "brand": brand->{ name, "slug": slug.current }
    },

    opportunitiesTitle,
    "opportunitiesCars": opportunitiesCars[]->{
      _id,
      name,
      "slug": slug.current,
      mainImage,
      "imageUrl": mainImage.asset->url,
      basePrice,
      discountPrice,
      range,
      "maxVersionRange": math::max(versions[defined(range) && range > 0].range),
      batteryCapacity,
      electricRangeKm,
      fuelConsumption,
      rendimientoElectrico,
      power,
      isNew,
      isHotDeal,
      "brand": brand->{ name },
      "category": category->{ name },
      "electricType": electricType->{ tag }
    },

    serviciosExtras[]{
      badge, title, description, ctaText, ctaHref,
      "imageUrl": image.asset->url
    },

    howItWorksTitle,
    howItWorksSubtitle,
    howItWorksVideoUrl,
    howItWorksSteps[]{number, icon, title, description},

    trustBadges[]{icon, title, description},

    testimonialsTitle,
    testimonials[]{name, car, savings, quote, rating, "imageUrl": cardImage.asset->url, "personImageUrl": personImage.asset->url},

    faqTitle,
    faqs[]{icon, question, answer}
  }
`;

// ─── Site Settings ────────────────────────────────────────────────────────────
export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0] {
    siteName,
    siteTagline,
    contactPhone,
    contactEmail,
    whatsappNumber,
    instagram,
    facebook,
    youtube,
    tiktok,
    "navbarBrands": navbarBrands[]->{
      _id,
      name,
      "slug": slug.current,
      logo,
      accentColor
    },
    footerTagline,
    footerLegal
  }
`;
