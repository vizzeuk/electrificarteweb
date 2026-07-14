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
      "electricType": electricType->{ tag }
    },

    "hotDealCar": hotDealCar->{
      _id,
      name,
      "slug": slug.current,
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
      "electricType": electricType->{ tag }
    },

    serviciosExtras[]{
      badge, title, description, ctaText, ctaHref,
      "imageUrl": image.asset->url
    },

    howItWorksTitle,
    howItWorksSubtitle,
    "howItWorksVideoDesktop": howItWorksVideoDesktop.asset->url,
    "howItWorksVideoMobile": howItWorksVideoMobile.asset->url,
    howItWorksSteps[]{number, icon, title, description},

    trustBadges[]{icon, title, description},

    testimonialsTitle,
    testimonials[]{name, car, savings, quote, rating, "imageUrl": cardImage.asset->url, "personImageUrl": personImage.asset->url},

    faqTitle,
    faqs[]{icon, question, answer}
  }
`;

// ─── Hot Deal urgency label ───────────────────────────────────────────────────
// Etiqueta editable desde Sanity que reemplaza el texto hardcodeado "Oferta
// limitada" en todas las secciones Hot Deal del sitio. Consulta liviana y
// separada de siteSettingsQuery para no arrastrar navbarBrands en páginas
// que solo necesitan este campo.
export const hotDealUrgencyLabelQuery = groq`
  *[_type == "siteSettings"][0] { hotDealUrgencyLabel }
`;

// ─── Precios de productos ─────────────────────────────────────────────────────
// Precios de display editables desde Sanity (Configuración del Sitio → Precios).
// Las páginas /asesoria y /negociacion los consumen; fallback a lib/products.ts.
export const productPricesQuery = groq`
  *[_type == "siteSettings"][0] { advisoryPrice, offerPrice }
`;

// ─── Site Settings ────────────────────────────────────────────────────────────
export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0] {
    siteName,
    siteTagline,
    hotDealUrgencyLabel,
    advisoryPrice,
    offerPrice,
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
