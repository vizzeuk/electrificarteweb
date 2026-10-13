import { groq } from "next-sanity";
import { MAX_VERSION_RANGE } from "./car";

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
    "filterBrandRefs":      filterBrands[]._ref,
    "filterVehicleTypeRef": filterVehicleType._ref,
    "filterElectricTypeRef": filterElectricType._ref,

    // Autos manuales (cuando filterMode == "manual")
    // Los ocultos no se muestran aunque estén elegidos (su página da 404).
    "manualCars": manualCars[@->hidden != true]->{
      _id,
      name,
      "slug": slug.current,
      "imageUrl": mainImage.asset->url,
      basePrice,
      discountPrice,
      range,
      batteryCapacity,
      electricRangeKm,
      fuelConsumption,
      rendimientoElectrico,
      power,
      ${MAX_VERSION_RANGE},
      isNew,
      isHotDeal,
      "brand":        brand->{ name, "slug": slug.current, "logoUrl": logo.asset->url },
      "vehicleType":  vehicleType->{ label, "slug": slug.current },
      "electricType": electricType->{ tag, label, "slug": slug.current },
    },
  }
`;

// ─── Autos por filtros automáticos ───────────────────────────────────────────
export const carsByFiltersQuery = groq`
  *[
    _type == "car"
    && hidden != true
    && (count($brandRefs) == 0    || brand._ref        in $brandRefs)
    // Filtros no excluyentes: también cuenta el tipo de cualquiera de sus versiones.
    && ($vehicleTypeRef  == null  || vehicleType._ref  == $vehicleTypeRef  || $vehicleTypeRef  in versions[].vehicleType._ref)
    && ($electricTypeRef == null  || electricType._ref == $electricTypeRef || $electricTypeRef in versions[].electricType._ref)
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
    electricRangeKm,
    fuelConsumption,
    rendimientoElectrico,
    power,
    ${MAX_VERSION_RANGE},
    isNew,
    isHotDeal,
    "brand":        brand->{ name, "slug": slug.current, "logoUrl": logo.asset->url },
    "vehicleType":  vehicleType->{ label, "slug": slug.current },
    "electricType": electricType->{ tag, label, "slug": slug.current },
  }
`;
