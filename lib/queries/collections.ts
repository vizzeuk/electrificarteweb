import { groq } from "next-sanity";

// ─── Cards para el carrusel del home ─────────────────────────────────────────
export const collectionsForHomeQuery = groq`
  *[_type == "collection" && showInHome == true] | order(homeOrder asc) {
    _id,
    title,
    "slug": slug.current,
    badge,
    subtitle,
    ctaText,
    "heroImageUrl": heroImage.asset->url,
    "heroImageHotspot": heroImage.hotspot,
  }
`;

// ─── Página de colección individual ──────────────────────────────────────────
export const collectionBySlugQuery = groq`
  *[_type == "collection" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    badge,
    subtitle,
    description,
    ctaText,
    metaTitle,
    metaDescription,
    "heroImageUrl": heroImage.asset->url,
    highlights[]{ icon, title, description },
    filterMode,
    filterMaxPrice,
    filterMinPrice,
    filterMinSeats,
    filterIsNew,
    filterIsHotDeal,
    "filterBrandRef":       filterBrand._ref,
    "filterVehicleTypeRef": filterVehicleType._ref,
    "filterElectricTypeRef": filterElectricType._ref,

    // Autos manuales (cuando filterMode == "manual")
    "manualCars": manualCars[]->{
      _id,
      name,
      "slug": slug.current,
      "imageUrl": mainImage.asset->url,
      basePrice,
      discountPrice,
      range,
      batteryCapacity,
      power,
      isNew,
      isHotDeal,
      "brand":        brand->{ name, "slug": slug.current },
      "vehicleType":  vehicleType->{ label, "slug": slug.current },
      "electricType": electricType->{ tag, label, "slug": slug.current },
    },
  }
`;

// ─── Autos por filtros automáticos ───────────────────────────────────────────
export const carsByFiltersQuery = groq`
  *[
    _type == "car"
    && ($brandRef        == null  || brand._ref        == $brandRef)
    && ($vehicleTypeRef  == null  || vehicleType._ref  == $vehicleTypeRef)
    && ($electricTypeRef == null  || electricType._ref == $electricTypeRef)
    && ($maxPrice        == 0     || basePrice         <= $maxPrice)
    && ($minPrice        == 0     || basePrice         >= $minPrice)
    && ($minSeats        == 0     || seats             >= $minSeats)
    && ($isNew           == false || isNew             == true)
    && ($isHotDeal       == false || isHotDeal         == true)
  ] | order(discountPrice asc, basePrice asc) {
    _id,
    name,
    "slug": slug.current,
    "imageUrl": mainImage.asset->url,
    basePrice,
    discountPrice,
    range,
    batteryCapacity,
    power,
    isNew,
    isHotDeal,
    "brand":        brand->{ name, "slug": slug.current },
    "vehicleType":  vehicleType->{ label, "slug": slug.current },
    "electricType": electricType->{ tag, label, "slug": slug.current },
  }
`;
