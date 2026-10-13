import { groq } from "next-sanity";

// ─── Versiones de otra electrificación o carrocería ──────────────────────────
// Una versión puede declarar su propia electrificación (`versions[].electricType`) o carrocería
// (`versions[].vehicleType`), ej. DS 3 Hybrid + DS 3 E-Tense en una sola ficha. Los filtros son
// no excluyentes: el auto aparece en el tipo principal y en los de sus versiones.

/** Autonomía máxima entre las versiones de la MISMA electrificación que el auto (la de una
 *  versión eléctrica no se le atribuye a la ficha híbrida). */
export const MAX_VERSION_RANGE = groq`"maxVersionRange": math::max(versions[defined(range) && range > 0 && (!defined(electricType) || electricType._ref == ^.electricType._ref)].range)`;

/** Tipos que suman las versiones, aparte del principal del auto. */
export const VERSION_TYPES = groq`
  "versionVehicleTypes": versions[defined(vehicleType) && vehicleType._ref != ^.vehicleType._ref].vehicleType->{ "slug": slug.current, label },
  "versionElectricTypes": versions[defined(electricType) && electricType._ref != ^.electricType._ref].electricType->{ "slug": slug.current, label, tag }
`;

/** La versión que hace que el auto aparezca en una PLP de tipo cuando su tipo principal no
 *  calza (ej. la E-Tense del DS 3 en /electrico/ev): la tarjeta muestra su precio y specs. */
const MATCH_VERSION_FIELDS = groq`{
  _key, name, price, discountPrice, batteryCapacity, range, electricRangeKm, fuelConsumption,
  rendimientoElectrico, power, traction, seats,
  "electricType": coalesce(electricType->{ "slug": slug.current, label, tag }, ^.electricType->{ "slug": slug.current, label, tag }),
  "vehicleType": coalesce(vehicleType->{ "slug": slug.current, label }, ^.vehicleType->{ "slug": slug.current, label })
}`;

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
  ${MAX_VERSION_RANGE},
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
  isNew,
  isFeatured,
  isTopSeller,
  isHotDeal,
  hotDealBonusAmount,
  hotDealExpiry,
  "brand": brand->{ _id, name, "slug": slug.current, logo, accentColor },
  "vehicleType": vehicleType->{ _id, "slug": slug.current, label, icon },
  "electricType": electricType->{ _id, "slug": slug.current, label, tag, color },
  ${VERSION_TYPES}
`;

// ─── Todos los autos (para comparador y PLP genérico) ─────────────────────────
export const allCarsQuery = groq`
  *[_type == "car" && hidden != true] | order(coalesce(discountPrice, basePrice) asc) {
    ${CAR_CARD_FIELDS}
  }
`;

// ─── Autos recientes — Últimos Lanzamientos ──────────────────────────────────
// Campos de las tarjetas del carrusel del home y de su página "ver todos"
// (/coleccion/ultimos-lanzamientos, ver lib/latest-launches.ts).
export const LAUNCH_CAR_FIELDS = groq`
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
  ${MAX_VERSION_RANGE},
  "electricType": electricType->{ tag },
  "vehicleType": vehicleType->{ label, "slug": slug.current },
  basePrice,
  discountPrice,
  isNew,
  isHotDeal,
  "brand": brand->{ name, "slug": slug.current, "logoUrl": logo.asset->url }
`;

// Primero TODOS los marcados 🆕 Nuevo lanzamiento (lo que promete el campo en Studio) y después
// los agregados más recientemente al catálogo. `$limit`: 20 en el carrusel, sin tope práctico en
// la página "ver todos".
// Historia: hubo un `order(isNew desc, ...)` que fallaba porque en GROQ los autos con isNew sin
// setear (null) ordenan por ENCIMA de los true; por eso se pasó a 100% por _createdAt. Eso
// ignoraba la marca 🆕 y, al publicar fichas nuevas, los marcados quedaban fuera del carrusel
// (Francisco, oct-2026). `coalesce(isNew, false)` resuelve el problema de los null.
export const newCarsForHomeQuery = groq`
  *[_type == "car" && hidden != true] | order(coalesce(isNew, false) desc, _createdAt desc) [0...$limit] {
    ${LAUNCH_CAR_FIELDS}
  }
`;

// Los elegidos a mano en la Página de inicio ("Autos en 'Últimos Lanzamientos'"), para la página
// "ver todos". Los ocultos no se muestran aunque estén elegidos (su página da 404).
export const latestLaunchesManualQuery = groq`
  *[_type == "homePage"][0] {
    latestLaunchesTitle,
    "cars": latestLaunchesCars[@->hidden != true]->{ ${LAUNCH_CAR_FIELDS} }
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
      // Solo si la versión es de otra electrificación/carrocería que el auto (vacío = la del auto).
      "electricType": electricType->{ tag, label, "slug": slug.current },
      "vehicleType": vehicleType->{ label, "slug": slug.current },
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
  *[_type == "car" && hidden != true && (vehicleType->slug.current == $typeSlug || $typeSlug in versions[].vehicleType->slug.current)] | order(coalesce(discountPrice, basePrice) asc) {
    ${CAR_CARD_FIELDS},
    "matchVersion": select(vehicleType->slug.current != $typeSlug => versions[vehicleType->slug.current == $typeSlug][0]${MATCH_VERSION_FIELDS})
  }
`;

// ─── Autos por tipo eléctrico – PLP Eléctrico ────────────────────────────────
export const carsByElectricTypeQuery = groq`
  *[_type == "car" && hidden != true && (electricType->slug.current == $electricSlug || $electricSlug in versions[].electricType->slug.current)] | order(coalesce(discountPrice, basePrice) asc) {
    ${CAR_CARD_FIELDS},
    "matchVersion": select(electricType->slug.current != $electricSlug => versions[electricType->slug.current == $electricSlug][0]${MATCH_VERSION_FIELDS})
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
    "electricType": electricType->{ label, tag, color }
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
    // Si el auto elegido está oculto, no se muestra (su página da 404) y la página usa el respaldo.
    "heroFeaturedCar": select(heroFeaturedCar->hidden != true => heroFeaturedCar->{
      name,
      "slug": slug.current,
      mainImage,
      basePrice,
      discountPrice,
    }),
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
    // Incluye los autos con una versión de este tipo (filtros no excluyentes): la suma de estos
    // conteos NO es la cantidad de modelos (ver catalogModelCountQuery).
    "carCount": count(*[_type == "car" && hidden != true && (electricType._ref == ^._id || ^._id in versions[].electricType._ref)])
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
    // Si el auto elegido está oculto, no se muestra (su página da 404) y la página usa el respaldo.
    "heroFeaturedCar": select(heroFeaturedCar->hidden != true => heroFeaturedCar->{
      name,
      "slug": slug.current,
      "imageUrl": mainImage.asset->url,
      basePrice,
      discountPrice,
      range,
      "brand": brand->{ name }
    }),
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

// ─── Cantidad de modelos del catálogo ────────────────────────────────────────
// Una ficha publicada = un modelo, tenga las versiones que tenga.
export const catalogModelCountQuery = groq`count(*[_type == "car" && hidden != true])`;

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
    // Si el auto elegido está oculto, no se muestra (su página da 404) y la página usa el respaldo.
    "heroFeaturedCar": select(heroFeaturedCar->hidden != true => heroFeaturedCar->{
      name,
      "slug": slug.current,
      "imageUrl": mainImage.asset->url,
      basePrice,
      discountPrice,
      range,
      "brand": brand->{ name }
    }),
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
      // Solo si la versión es de otra electrificación/carrocería que el auto.
      "electricType": electricType->{ tag },
      "vehicleType": vehicleType->{ label },
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

// Foto del modelo citado en la franja de reseñas del home.
export const carImageBySlugQuery = groq`
  *[_type == "car" && slug.current == $slug && hidden != true][0]{ name, "imageUrl": mainImage.asset->url }
`;
