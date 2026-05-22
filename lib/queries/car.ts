import { groq } from "next-sanity";

// ─── Campos comunes para listados (tarjetas) ─────────────────────────────────
const CAR_CARD_FIELDS = groq`
  _id,
  name,
  "slug": slug.current,
  tagline,
  modelYear,
  mainImage,
  basePrice,
  discountPrice,
  priceNote,
  batteryCapacity,
  batteryType,
  range,
  electricRangeKm,
  fuelConsumption,
  rendimientoElectrico,
  "maxVersionRange": math::max(versions[defined(range) && range > 0].range),
  power,
  torque,
  traction,
  acceleration,
  topSpeed,
  seats,
  seatRows,
  cargo,
  frunkCapacity,
  groundClearance,
  connectorType,
  maxDCChargingPower,
  maxACChargingPower,
  chargeTimeDC,
  chargeTimeAC,
  chargeType,
  warranty,
  highlight,
  isNew,
  isFeatured,
  isTopSeller,
  isHotDeal,
  hotDealBonusAmount,
  hotDealExpiry,
  "brand": brand->{ _id, name, "slug": slug.current, logo, accentColor },
  "vehicleType": vehicleType->{ _id, "slug": slug.current, label, icon },
  "electricType": electricType->{ _id, "slug": slug.current, label, tag, color },
  "category": category->{ _id, name, "slug": slug.current }
`;

// ─── Todos los autos (para comparador y PLP genérico) ─────────────────────────
export const allCarsQuery = groq`
  *[_type == "car" && hidden != true] | order(coalesce(discountPrice, basePrice) asc) {
    ${CAR_CARD_FIELDS}
  }
`;

// ─── Autos destacados (isFeatured) ───────────────────────────────────────────
export const featuredCarsQuery = groq`
  *[_type == "car" && isFeatured == true && hidden != true] | order(coalesce(discountPrice, basePrice) asc) {
    ${CAR_CARD_FIELDS}
  }
`;

// ─── Autos recientes — fallback para Últimos Lanzamientos ────────────────────
// isNew=true primero, luego por fecha — evita concatenación GROQ que rompe asset->url
export const newCarsForHomeQuery = groq`
  *[_type == "car" && hidden != true] | order(isNew desc, _createdAt desc) [0...6] {
    _id,
    name,
    "slug": slug.current,
    "imageUrl": mainImage.asset->url,
    batteryCapacity,
    range,
    electricRangeKm,
    fuelConsumption,
    rendimientoElectrico,
    power,
    "maxVersionRange": math::max(versions[defined(range) && range > 0].range),
    "electricType": electricType->{ tag },
    basePrice,
    discountPrice,
    isNew,
    "brand": brand->{ name, "slug": slug.current, "logoUrl": logo.asset->url },
    "category": category->{ name }
  }
`;

// ─── Autos destacados — fallback para Oportunidades ──────────────────────────
// isFeatured=true primero, luego por precio — evita concatenación GROQ que rompe asset->url
export const featuredCarsForHomeQuery = groq`
  *[_type == "car" && hidden != true] | order(isFeatured desc, coalesce(discountPrice, basePrice) asc) [0...8] {
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
    "maxVersionRange": math::max(versions[defined(range) && range > 0].range),
    "electricType": electricType->{ tag },
    isNew,
    isHotDeal,
    "brand": brand->{ name },
    "category": category->{ name }
  }
`;

// ─── Todos los Hot Deals (isHotDeal) — para carrusel ─────────────────────────
export const allHotDealsQuery = groq`
  *[_type == "car" && isHotDeal == true && hidden != true] | order(coalesce(discountPrice, basePrice) asc) {
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
  }
`;

// ─── Hot Deal único (isHotDeal) ───────────────────────────────────────────────
export const hotDealQuery = groq`
  *[_type == "car" && isHotDeal == true && hidden != true][0] {
    _id,
    name,
    "slug": slug.current,
    tagline,
    mainImage,
    basePrice,
    discountPrice,
    priceNote,
    hotDealBonusAmount,
    hotDealExpiry,
    description,
    range,
    electricRangeKm,
    power,
    traction,
    acceleration,
    "brand": brand->{ name, "slug": slug.current, logo }
  }
`;

// ─── Auto individual – PDP completa ──────────────────────────────────────────
export const carBySlugQuery = groq`
  *[_type == "car" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    tagline,
    description,
    modelYear,
    hidden,
    mainImage,
    "gallery": gallery[]{ "url": asset->url, alt, caption },
    "highlights": highlights[]{
      title,
      description,
      badge,
      icon,
      "imageUrl": image.asset->url,
      imagePosition
    },
    basePrice,
    discountPrice,
    priceNote,
    motorDescription,
    transmission,
    batteryCapacity,
    batteryType,
    range,
    electricRangeKm,
    fuelConsumption,
    power,
    torque,
    traction,
    acceleration,
    topSpeed,
    seats,
    seatRows,
    cargo,
    frunkCapacity,
    groundClearance,
    connectorType,
    maxDCChargingPower,
    maxACChargingPower,
    chargeTimeDC,
    chargeTimeAC,
    fuelConsumption,
    rendimientoElectrico,
    chargeType,
    warranty,
    highlight,
    euroNcap,
    airbags,
    isNew,
    isFeatured,
    isTopSeller,
    isHotDeal,
    hotDealBonusAmount,
    hotDealExpiry,
    safetyFeatures,
    techFeatures,
    comfortFeatures,
    videoUrl,
    videoTitle,
    videoDuration,
    "versions": versions[]{
      _key,
      name,
      price,
      discountPrice,
      batteryCapacity,
      batteryType,
      range,
      electricRangeKm,
      fuelConsumption,
      power,
      motorDescription,
      torque,
      traction,
      transmission,
      acceleration,
      topSpeed,
      seats,
      seatRows,
      trunkCapacity,
      frunkCapacity,
      connectorType,
      maxDCChargingPower,
      maxACChargingPower,
      chargeTimeDC,
      chargeTimeAC,
      fuelConsumption,
      rendimientoElectrico
    },
    "brand": brand->{ _id, name, "slug": slug.current, "logoUrl": logo.asset->url, logo, description, accentColor },
    "vehicleType": vehicleType->{ _id, name, "slug": slug.current, label, icon },
    "electricType": electricType->{ _id, name, "slug": slug.current, label, tag, color, icon },
    "category": category->{ _id, name, "slug": slug.current },
    metaTitle,
    metaDescription,
    keywords
  }
`;

// ─── Slugs de todos los autos (para generateStaticParams) ────────────────────
export const allCarSlugsQuery = groq`
  *[_type == "car" && hidden != true]{ "slug": slug.current }
`;

// ─── Autos similares — candidatos para scoring (misma marca / tipo / eléctrico) ─
export const similarCarsQuery = groq`
  *[
    _type == "car" &&
    hidden != true &&
    slug.current != $excludeSlug &&
    (brand._ref == $brandId || vehicleType._ref == $vehicleTypeId || electricType._ref == $electricTypeId)
  ] {
    _id,
    name,
    "slug": slug.current,
    "imageUrl": mainImage.asset->url,
    basePrice,
    discountPrice,
    range,
    "brandId": brand._ref,
    "vehicleTypeId": vehicleType._ref,
    "electricTypeId": electricType._ref,
    "brand": brand->{ name },
    "vehicleType": vehicleType->{ label }
  }
`;

// ─── Autos por marca – PLP Marca ─────────────────────────────────────────────
export const carsByBrandQuery = groq`
  *[_type == "car" && brand->slug.current == $brandSlug && hidden != true] | order(coalesce(discountPrice, basePrice) asc) {
    ${CAR_CARD_FIELDS}
  }
`;

// ─── Autos por tipo de vehículo – PLP Tipo ───────────────────────────────────
export const carsByVehicleTypeQuery = groq`
  *[_type == "car" && vehicleType->slug.current == $typeSlug && hidden != true] | order(coalesce(discountPrice, basePrice) asc) {
    ${CAR_CARD_FIELDS}
  }
`;

// ─── Autos por tipo eléctrico – PLP Eléctrico ────────────────────────────────
export const carsByElectricTypeQuery = groq`
  *[_type == "car" && electricType->slug.current == $electricSlug && hidden != true] | order(coalesce(discountPrice, basePrice) asc) {
    ${CAR_CARD_FIELDS}
  }
`;

// ─── Comparador – múltiples slugs ────────────────────────────────────────────
export const compareCarsQuery = groq`
  *[_type == "car" && slug.current in $slugs && hidden != true] {
    _id,
    name,
    "slug": slug.current,
    mainImage,
    basePrice,
    discountPrice,
    priceNote,
    motorDescription,
    transmission,
    batteryCapacity,
    batteryType,
    range,
    electricRangeKm,
    fuelConsumption,
    power,
    torque,
    traction,
    acceleration,
    topSpeed,
    seats,
    seatRows,
    cargo,
    frunkCapacity,
    groundClearance,
    connectorType,
    maxDCChargingPower,
    maxACChargingPower,
    chargeTimeDC,
    chargeTimeAC,
    chargeType,
    warranty,
    highlight,
    euroNcap,
    airbags,
    isHotDeal,
    safetyFeatures,
    techFeatures,
    comfortFeatures,
    "brand": brand->{ name, "slug": slug.current, logo },
    "vehicleType": vehicleType->{ label },
    "electricType": electricType->{ label, tag, color },
    "category": category->{ name }
  }
`;

// ─── Todas las marcas (listado /marcas) ──────────────────────────────────────
export const allBrandsQuery = groq`
  *[_type == "brand"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    "logoUrl": logo.asset->url,
    description,
    country,
    foundedYear,
    accentColor,
    isFeatured,
    "carCount": count(*[_type == "car" && brand._ref == ^._id && hidden != true])
  }
`;

// ─── Marca individual – PLP completa ─────────────────────────────────────────
export const brandBySlugQuery = groq`
  *[_type == "brand" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    "logoUrl": logo.asset->url,
    description,
    heroTagline,
    country,
    foundedYear,
    website,
    accentColor,
    isFeatured,
    stats[]{label, value},
    videos[]{title, videoUrl, thumbnail, duration, views, channel},
    "heroFeaturedCar": heroFeaturedCar-> {
      name,
      "slug": slug.current,
      mainImage,
      basePrice,
      discountPrice,
    },
    "plpBanners": plpBanners[active != false]{
      "mobileImageUrl": mobileImage.asset->url,
      "imageUrl": image.asset->url,
      ctaHref,
      altText
    }
  }
`;

// ─── Todos los tipos de vehículo ─────────────────────────────────────────────
export const allVehicleTypesQuery = groq`
  *[_type == "vehicleType"] | order(navbarOrder asc) {
    _id,
    name,
    "slug": slug.current,
    label,
    icon,
    "heroTagline": coalesce(navbarLabel, heroTagline)
  }
`;

// ─── Tipos eléctricos con conteo y tagline (para sección home) ───────────────
export const electricTypesForHomeQuery = groq`
  *[_type == "electricType"] | order(navbarOrder asc) {
    _id,
    "slug": slug.current,
    label,
    tag,
    color,
    icon,
    tagline,
    idealFor,
    "cardImageUrl": cardImage.asset->url,
    "carCount": count(*[_type == "car" && electricType._ref == ^._id && hidden != true])
  }
`;

// ─── Tipo de vehículo individual – PLP Tipo ──────────────────────────────────
export const vehicleTypeBySlugQuery = groq`
  *[_type == "vehicleType" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    label,
    icon,
    heroTagline,
    heroDescription,
    heroAdText,
    "heroFeaturedCar": heroFeaturedCar->{
      name,
      "slug": slug.current,
      "imageUrl": mainImage.asset->url,
      basePrice,
      discountPrice,
      range,
      "brand": brand->{ name }
    },
    "plpBanners": plpBanners[active != false]{
      "mobileImageUrl": mobileImage.asset->url,
      "imageUrl": image.asset->url,
      ctaHref,
      altText
    },
    metaTitle,
    metaDescription
  }
`;

// ─── Todos los tipos eléctricos ──────────────────────────────────────────────
export const allElectricTypesQuery = groq`
  *[_type == "electricType"] | order(navbarOrder asc) {
    _id,
    name,
    "slug": slug.current,
    label,
    tag,
    color,
    icon,
    "tagline": coalesce(navbarLabel, tagline)
  }
`;

// ─── Tipo eléctrico individual – PLP Eléctrico ───────────────────────────────
export const electricTypeBySlugQuery = groq`
  *[_type == "electricType" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    label,
    tag,
    color,
    icon,
    tagline,
    description,
    howItWorks[]{icon, title, desc},
    pros,
    cons,
    idealFor,
    heroAdText,
    "heroFeaturedCar": heroFeaturedCar->{
      name,
      "slug": slug.current,
      "imageUrl": mainImage.asset->url,
      basePrice,
      discountPrice,
      range,
      "brand": brand->{ name }
    },
    "plpBanners": plpBanners[active != false]{
      "mobileImageUrl": mobileImage.asset->url,
      "imageUrl": image.asset->url,
      ctaHref,
      altText
    },
    metaTitle,
    metaDescription
  }
`;

// ─── Autos para el dropdown del formulario ───────────────────────────────────
export const carNamesForFormQuery = groq`
  *[_type == "car" && hidden != true] | order(name asc) {
    "label": name,
    "brand": brand->name,
    "versions": versions[].name
  }
`;

// ─── Marcas para el strip del home (todas, solo campos de display) ───────────
export const allBrandsStripQuery = groq`
  *[_type == "brand"] | order(name asc) {
    "slug": slug.current,
    name,
    accentColor,
    "logoUrl": logo.asset->url
  }
`;

// ─── Autos para comparador (listado completo, campos mínimos) ────────────────
export const allCarsForComparadorQuery = groq`
  *[_type == "car" && hidden != true] | order(coalesce(discountPrice, basePrice) asc) {
    _id,
    name,
    "slug": slug.current,
    "imageUrl": mainImage.asset->url,
    basePrice,
    discountPrice,
    batteryCapacity,
    range,
    power,
    traction,
    acceleration,
    topSpeed,
    seats,
    cargo,
    groundClearance,
    chargeTimeDC,
    chargeTimeAC,
    chargeType,
    warranty,
    isHotDeal,
    highlight,
    "brand": brand->{ name, "slug": slug.current },
    "vehicleType": vehicleType->{ label },
    "electricType": electricType->{ tag },
    "versions": versions[]{
      name,
      price,
      discountPrice,
      batteryCapacity,
      range,
      power,
      traction,
      acceleration,
      topSpeed,
      chargeTimeDC,
      chargeTimeAC,
      seats,
      "cargo": trunkCapacity,
      "chargeType": connectorType
    }
  }
`;

// ─── Marcas para navbar (isFeatured) ─────────────────────────────────────────
export const featuredBrandsQuery = groq`
  *[_type == "brand" && isFeatured == true] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    "models": coalesce(navbarLabel, array::join(*[_type == "car" && brand._ref == ^._id && hidden != true] | order(coalesce(discountPrice, basePrice) desc)[0...3].name, " · "))
  }
`;
