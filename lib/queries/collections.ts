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
    "heroImageUrl": heroImage.asset->url,
    filterMode,
    filterCategory,
    filterMaxPrice,
    "filterBrandRef": filterBrand._ref,
    filterMinSeats,

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
      isNew,
      isHotDeal,
      "brand":    brand->{ name, "slug": slug.current },
      "category": category->{ name }
    },
  }
`;

// ─── Autos por filtros automáticos ───────────────────────────────────────────
// Se llama desde la page pasando los filtros de la colección
export const carsByFiltersQuery = groq`
  *[
    _type == "car"
    && ($brandRef == null  || brand._ref == $brandRef)
    && ($category == ""    || category->name == $category)
    && ($maxPrice == 0     || basePrice <= $maxPrice)
    && ($minSeats == 0     || versions[0].seats >= $minSeats || seats >= $minSeats)
  ] | order(discountPrice asc, basePrice asc) {
    _id,
    name,
    "slug": slug.current,
    "imageUrl": mainImage.asset->url,
    basePrice,
    discountPrice,
    range,
    batteryCapacity,
    isNew,
    isHotDeal,
    "brand":    brand->{ name, "slug": slug.current },
    "category": category->{ name }
  }
`;
