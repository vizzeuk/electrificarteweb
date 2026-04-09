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
      basePrice,
      discountPrice,
      isNew,
      isHotDeal,
      isTopSeller,
      "brand": brand->{ name, "slug": slug.current },
      "category": category->{ name }
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
      isHotDeal,
      "brand": brand->{ name },
      "category": category->{ name }
    },

    howItWorksTitle,
    howItWorksSubtitle,
    howItWorksSteps[]{number, icon, title, description},

    trustBadges[]{icon, title, description},

    testimonialsTitle,
    testimonials[]{name, car, savings, quote, rating},

    faqTitle,
    faqs[]{question, answer}
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
