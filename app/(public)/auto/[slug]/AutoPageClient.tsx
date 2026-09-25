"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn, formatCLP, formatNumber, classifyElectric, sentenceCase, cleanSeparators } from "@/lib/utils";
import { sanityImg } from "@/lib/sanityImage";
import { Icon } from "@/components/ui/Icon";
import { ElectricTypeBadge } from "@/components/car/ElectricTypeBadge";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { PdpReviewPrompt } from "@/components/reviews/PdpReviewPrompt";
import { ASESORIA_PRICE, HOT_DEALS_ENABLED } from "@/lib/products";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface VersionData {
  name: string;
  price: number;
  discountPrice: number;
  battery: number;
  range: number;
  electricRangeKm?: number | null;
  power: number;
  torque: number;
  traction: string;
  acceleration: number;
  topSpeed: number;
  chargeTimeDC: string;
  chargeTimeAC: string;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  maxDCChargingPower?: number | null;
  maxACChargingPower?: number | null;
  transmission?: string | null;
  /** Maletero de la versión (trunkCapacity), con respaldo en el del auto. */
  cargo?: number | null;
}

export interface CarData {
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: string;
  tagline: string;
  description: string;
  basePrice: number;
  discountPrice: number;
  hotDealBonus?: number;
  isHotDeal: boolean;
  isNew: boolean;
  isTopSeller?: boolean;
  electricTypeTag?: string | null;
  battery: number;
  range: number;
  electricRangeKm?: number | null;
  power: number;
  torque: number;
  traction: string;
  acceleration: number;
  topSpeed: number;
  seats: number;
  cargo: number;
  chargeTimeDC: string;
  chargeTimeAC: string;
  chargeType: string;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  warranty?: string;
  modelYear?: number | null;
  euroNcap?: number | null;
  airbags?: number | null;
  batteryType?: string | null;
  connectorType?: string | null;
  maxDCChargingPower?: number | null;
  maxACChargingPower?: number | null;
  transmission?: string | null;
  frunkCapacity?: number | null;
  groundClearance?: number | null;
  versions: VersionData[];
  gallery?: string[];
  videoUrl?: string;
  videoTitle?: string;
  videoDuration?: string;
  safetyFeatures: string[];
  techFeatures: string[];
  comfortFeatures: string[];
  fichaUrl?: string;
  brandLogoUrl?: string;
  highlights?: {
    title: string;
    description?: string;
    badge?: string;
    icon?: string;
    imageUrl?: string;
    imagePosition?: "left" | "right";
  }[];
}

export interface SimilarCarData {
  slug: string;
  name: string;
  brand: string;
  category: string;
  discountPrice: number;
  range: number;
  imageUrl?: string;
  basePrice?: number;
}

interface AutoPageClientProps {
  car: CarData;
  similarCars: SimilarCarData[];
  /** Lista de reseñas aprobadas. Llega ya renderizada desde el server component
   *  (page.tsx), porque los datos viven en Supabase y esto es un client component. */
  reviewsSlot?: React.ReactNode;
}

type Highlight = NonNullable<CarData["highlights"]>[number];
type ElectricClass = ReturnType<typeof classifyElectric>;
type SpecCell = { icon: string; label: string; value: string };

// ─── Formato de datos ────────────────────────────────────────────────────────

const TRACTION_LABEL: Record<string, string> = {
  FWD: "Delantera (FWD)",
  RWD: "Trasera (RWD)",
  AWD: "Total (AWD)",
};

/** "RWD" pasa a "Trasera (RWD)". Cualquier otro valor de Sanity se muestra tal cual. */
function tractionLabel(value?: string | null): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  return TRACTION_LABEL[v.toUpperCase()] ?? v;
}

/** Cifra en formato chileno con su unidad, o null si no hay dato (0 cuenta como vacío). */
function fmt(n: number | null | undefined, unit: string): string | null {
  return n != null && n > 0 ? `${formatNumber(n)} ${unit}` : null;
}

/** Texto libre de Sanity: fuera "N/D", guiones sueltos y el punto medio como separador. */
function tidyText(value?: string | null): string | null {
  const v = cleanSeparators(value).replace(/\s+\u2014\s+/g, ", ").trim();
  if (!v || ["N/D", "N/A", "-", "\u2014"].includes(v.toUpperCase())) return null;
  return v;
}

interface ChargeInfo {
  /** "18 min", "2 h 42 min". */
  value: string;
  /** "del 10 al 80 %", o null si el dato no trae el rango de carga. */
  span: string | null;
}

/**
 * Tiempos de carga de Sanity ("18 min (10-80%) a 800V", "2h 42min (0-100%)") a valor y
 * rango: "18 min" y "del 10 al 80 %". Si el texto no calza con el patrón se devuelve tal
 * cual (normalizado), nunca se inventa. "N/D" y vacíos devuelven null.
 */
function parseCharge(raw?: string | null): ChargeInfo | null {
  const s = (raw ?? "").trim();
  if (!s || ["N/D", "N/A", "-"].includes(s.toUpperCase())) return null;
  const tidy = (t: string) =>
    t
      .replace(/(\d+(?:[.,]\d+)?)\s*(min|h|horas?|hrs?)(?![a-záéíóú])/gi, (_m, n: string, u: string) => `${n.replace(".", ",")} ${u.toLowerCase()} `)
      .replace(/\s+/g, " ")
      .trim();
  const m = s.match(/^(.*?)\s*\(\s*(\d+)\s*(?:-|\u2013|a)\s*(\d+)\s*%/);
  if (m && /\d/.test(m[1])) return { value: tidy(m[1]), span: `del ${m[2]} al ${m[3]} %` };
  return { value: tidy(s), span: null };
}

/** Versión corta de un tiempo de carga para los datos clave: sin el paréntesis final. */
function shortTime(c: ChargeInfo | null): string | null {
  if (!c) return null;
  const v = c.value.replace(/\s*\(.*$/, "").trim();
  return /^[<≤~]?\s*\d/.test(v) && v.length <= 16 ? v : null;
}

/**
 * Tiempos de carga de la versión. Si la versión dice "N/D" se usa el dato del auto, igual
 * que el resto de las specs de versión (que ya vienen con respaldo en el auto desde page.tsx).
 */
function chargeTimes(car: CarData, v: VersionData): { dc: ChargeInfo | null; ac: ChargeInfo | null } {
  return {
    dc: parseCharge(v.chargeTimeDC) ?? parseCharge(car.chargeTimeDC),
    ac: parseCharge(v.chargeTimeAC) ?? parseCharge(car.chargeTimeAC),
  };
}

/** Carga para los datos clave: DC si hay un tiempo legible; si no, AC. */
function chargeCell(car: CarData, v: VersionData): { label: string; value: string } | null {
  const { dc, ac } = chargeTimes(car, v);
  const options: ["DC" | "AC", ChargeInfo | null][] = [["DC", dc], ["AC", ac]];
  for (const [kind, c] of options) {
    const value = shortTime(c);
    if (c && value) return { label: `Carga ${kind}${c.span ? `, ${c.span}` : ""}`, value };
  }
  return null;
}

// Siglas de 4 letras o más que se quedan en mayúscula dentro del nombre de una versión.
const VERSION_KEEP_CAPS = new Set(["PHEV", "MHEV", "REEV", "EREV", "TFSI", "IONIQ", "NCAP", "WLTP"]);

function tidyVersionWord(word: string, keep: Set<string>): string {
  if (word.length < 4 || !/^[A-ZÁÉÍÓÚÑÜ]+$/.test(word) || keep.has(word)) return word;
  return word.charAt(0) + word.slice(1).toLowerCase();
}

/**
 * Nombres de versión legibles, como en la maqueta: se quita el prefijo común que repite
 * el modelo ("IONIQ 5 NE EV PREMIUM" pasa a "Premium") y se bajan las palabras que llegan
 * en MAYÚSCULA sostenida desde Sanity. Siglas, códigos con cifras y palabras del nombre del
 * auto se respetan. El prefijo solo se recorta si parte por el modelo: "LIMITED 4x2" y
 * "LIMITED AWD" (bZ4X) quedan completos.
 */
function versionLabels(names: string[], carName: string): string[] {
  const keep = new Set([...VERSION_KEEP_CAPS, ...carName.split(/\s+/)]);
  const words = names.map((n) => (n ?? "").trim().split(/\s+/).filter(Boolean));
  let common = 0;
  if (words.length > 1) {
    const first = words[0];
    while (
      common < first.length &&
      words.every((w) => w.length > common + 1 && w[common].toUpperCase() === first[common].toUpperCase())
    ) common++;
    const modelWord = carName.trim().split(/\s+/)[0]?.toUpperCase();
    if (!modelWord || first[0]?.toUpperCase() !== modelWord) common = 0;
  }
  return words.map((w, i) => w.slice(common).map((x) => tidyVersionWord(x, keep)).join(" ") || `Versión ${i + 1}`);
}

/** Datos clave (6 celdas) de la versión elegida, priorizados por tecnología. Nunca vacíos. */
function keySpecs(car: CarData, v: VersionData, cls: ElectricClass): SpecCell[] {
  const out: SpecCell[] = [];
  const add = (icon: string, label: string, value: string | null | undefined) => {
    if (value && !out.some((c) => c.label === label)) out.push({ icon, label, value });
  };
  const battery = fmt(v.battery, "kWh");
  const power = fmt(v.power, "CV");
  const accel = fmt(v.acceleration, "s");
  const torque = fmt(v.torque, "Nm");
  const traction = tractionLabel(v.traction);

  if (cls === "HEV") {
    add("local_gas_station", "Rendimiento", fmt(v.fuelConsumption ?? car.fuelConsumption, "km/L"));
    add("speed", "Potencia", power);
    add("schedule", "0 a 100 km/h", accel);
    add("directions_car", "Tracción", traction);
    add("settings", "Torque", torque);
    add("battery_charging_full", "Batería", battery);
  } else {
    const isPHEV = cls === "PHEV";
    add("route", isPHEV ? "Autonomía eléctrica" : "Autonomía", fmt(isPHEV ? v.electricRangeKm ?? car.electricRangeKm : v.range, "km"));
    add("battery_charging_full", "Batería", battery);
    const charge = chargeCell(car, v);
    if (charge) add("bolt", charge.label, charge.value);
    add("speed", "Potencia", power);
    add("schedule", "0 a 100 km/h", accel);
    add("directions_car", "Tracción", traction);
    add("eco", isPHEV ? "Eficiencia eléctrica" : "Eficiencia", fmt(v.rendimientoElectrico ?? car.rendimientoElectrico, "km/kWh"));
    add("settings", "Torque", torque);
  }
  add("airline_seat_recline_normal", "Plazas", car.seats > 0 ? String(car.seats) : null);
  add("category", "Segmento", car.category ? sentenceCase(car.category) : null);
  return out.slice(0, 6);
}

/** Línea corta bajo el nombre de cada versión: "295 km, 170 CV, RWD". */
function versionMeta(v: VersionData, cls: ElectricClass): string {
  const eRange = fmt(v.electricRangeKm, "km");
  const main =
    cls === "EV" ? fmt(v.range, "km") :
    cls === "PHEV" ? (eRange ? `${eRange} eléctricos` : null) :
    fmt(v.fuelConsumption, "km/L");
  return [main, fmt(v.power, "CV"), (v.traction ?? "").trim() || null].filter(Boolean).join(", ");
}

function buildFallbackHighlights(car: CarData): Highlight[] {
  const gallery = car.gallery ?? [];
  const cls = classifyElectric(car);
  const n = (x?: number | null) => formatNumber(x);
  const seats = car.seats || 5;
  const dc = parseCharge(car.chargeTimeDC);
  const ac = parseCharge(car.chargeTimeAC);
  const dcTime = shortTime(dc);
  const acTime = shortTime(ac);
  const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const comfortFeatures = car.comfortFeatures.map((f) => tidyText(f)).filter((f): f is string => !!f);
  const comfortHighlight: Highlight = {
    title:       `${seats} plazas de puro confort`,
    description: comfortFeatures.length > 0
      ? `El interior del ${car.name} combina materiales premium con tecnología conectada. ${comfortFeatures.slice(0, 2).join(", ")} y mucho más para que cada viaje sea placentero.`
      : `El interior del ${car.name} está pensado para quienes buscan confort y funcionalidad. Con ${seats} plazas${car.cargo > 0 ? ` y ${n(car.cargo)} litros de maletero` : ""}, tiene espacio para todo lo que necesitas.`,
    badge:       "Interior",
    imageUrl:    gallery[3],
  };

  if (cls === "EV") {
    return [
      {
        title:       car.range ? `Hasta ${n(car.range)} km de autonomía real` : "Autonomía para el día a día",
        description: car.range
          ? `El ${car.brand} ${car.name} está diseñado para ir lejos sin preocupaciones. ${car.battery ? `Con una batería de ${n(car.battery)} kWh, ofrece` : "Ofrece"} hasta ${n(car.range)} km de autonomía WLTP para que cada trayecto sea una experiencia sin ansiedad de rango.`
          : `El ${car.brand} ${car.name} es un vehículo eléctrico de última generación${car.rendimientoElectrico ? ` con una eficiencia de ${n(car.rendimientoElectrico)} km/kWh` : ""}, diseñado para maximizar cada kilómetro recorrido.`,
        badge:       "Rendimiento",
        imageUrl:    gallery[1],
      },
      {
        title:       dcTime ? (dc?.span ? `${upper(dc.span)} en ${dcTime}` : `Carga rápida en ${dcTime}`) : "Carga inteligente y flexible",
        description: `Olvídate de las esperas largas. ${car.chargeType ? `Compatible con ${car.chargeType}, el` : "El"} ${car.name} se adapta tanto a cargadores domésticos como a puntos de carga rápida DC para que siempre estés listo para salir.`,
        badge:       "Carga",
        imageUrl:    gallery[2],
      },
      comfortHighlight,
    ];
  }

  if (cls === "PHEV") {
    const chargeText = dcTime
      ? ` Carga rápida ${dc?.span ? `${dc.span} ` : ""}en ${dcTime}.`
      : acTime
        ? (ac?.span ? ` Carga ${ac.span} en ${acTime}.` : ` Carga completa en ${acTime}.`)
        : "";
    return [
      {
        title:       car.electricRangeKm ? `${n(car.electricRangeKm)} km en modo 100% eléctrico` : "Lo mejor de dos mundos",
        description: `El ${car.brand} ${car.name} combina motor eléctrico y combustión para la máxima versatilidad.${car.electricRangeKm ? ` Recorre hasta ${n(car.electricRangeKm)} km en modo eléctrico puro para trayectos urbanos sin emisiones.` : ""}${car.rendimientoElectrico ? ` Eficiencia eléctrica de ${n(car.rendimientoElectrico)} km/kWh para maximizar cada kWh.` : ""}`,
        badge:       "Electrificación",
        imageUrl:    gallery[1],
      },
      {
        title:       car.rendimientoElectrico ? `${n(car.rendimientoElectrico)} km/kWh de eficiencia eléctrica` : "Carga inteligente para ciudad y carretera",
        description: `Con su sistema híbrido enchufable, el ${car.name} optimiza automáticamente el uso de energía según tu forma de conducir.${chargeText}`,
        badge:       "Eficiencia",
        imageUrl:    gallery[2],
      },
      comfortHighlight,
    ];
  }

  // HEV / MHEV
  const traction = tractionLabel(car.traction);
  return [
    {
      title:       car.fuelConsumption ? `${n(car.fuelConsumption)} km/L: eficiencia sin enchufes` : "Eficiencia híbrida automática",
      description: `El ${car.brand} ${car.name} recupera energía en cada frenada y desaceleración para recargar su batería de forma automática, sin necesidad de enchufarse. ${car.fuelConsumption ? `Esto se traduce en un rendimiento de ${n(car.fuelConsumption)} km/L` : "El resultado es un ahorro real de combustible"} en uso mixto urbano e interurbano.`,
      badge:       "Eficiencia",
      imageUrl:    gallery[1],
    },
    {
      title:       car.power ? `${n(car.power)} CV con tecnología híbrida` : "Potencia e inteligencia combinadas",
      description: `El motor híbrido del ${car.name} combina un motor de combustión con asistencia eléctrica para ofrecer una conducción más suave, potente y eficiente.${traction ? ` Tracción ${traction.charAt(0).toLowerCase()}${traction.slice(1)} para mayor control en todas las situaciones.` : ""}`,
      badge:       "Motor",
      imageUrl:    gallery[2],
    },
    comfortHighlight,
  ];
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AutoPageClient({ car, similarCars, reviewsSlot }: AutoPageClientProps) {
  const [activeVersion, setActiveVersion] = useState(0);
  const [galleryIndex,  setGalleryIndex]  = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const buyActionsRef = useRef<HTMLDivElement>(null);
  const thumbsRef     = useRef<HTMLDivElement>(null);

  const model = `${car.brand} ${car.name}`;
  const cls = classifyElectric(car);
  const hasVersions = car.versions.length > 0;
  const labels = useMemo(() => versionLabels(car.versions.map((v) => v.name), car.name), [car.versions, car.name]);

  const ver: VersionData = car.versions[activeVersion] ?? {
    name: "Base", price: car.basePrice, discountPrice: car.discountPrice,
    battery: car.battery, range: car.range, power: car.power, torque: car.torque,
    traction: car.traction, acceleration: car.acceleration, topSpeed: car.topSpeed,
    chargeTimeDC: car.chargeTimeDC, chargeTimeAC: car.chargeTimeAC,
    electricRangeKm: car.electricRangeKm, fuelConsumption: car.fuelConsumption,
    rendimientoElectrico: car.rendimientoElectrico,
  };
  const verLabel = hasVersions ? labels[activeVersion] : null;

  // isHotDeal sigue mandando sobre qué precio se muestra (misma regla de siempre):
  // precio con descuento solo si el auto es hot deal y la versión trae un ahorro real.
  const priceOf = (v: VersionData) => {
    const savings = v.price - v.discountPrice;
    const pct = Math.round((savings / v.price) * 100);
    const discounted = car.isHotDeal && pct > 0;
    return { list: v.price, final: discounted ? v.discountPrice : v.price, discounted, savings };
  };
  const price = priceOf(ver);

  const galleryImages = car.gallery ?? [];
  const photoCount = galleryImages.length;
  const showPhoto = (i: number) => setGalleryIndex(((i % photoCount) + photoCount) % photoCount);
  const compareHref = `/comparador?add=${car.slug}`;

  // Barra fija inferior: aparece cuando los botones de compra quedan arriba del viewport.
  // El margen inferior enorme extiende la raíz hacia abajo: el único cambio de estado es
  // cruzar el borde superior, así un salto de scroll (ancla, recarga, fling en móvil) que
  // pasa de "debajo" a "arriba" sin tocar el viewport también la muestra.
  useEffect(() => {
    const el = buyActionsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      setStickyVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    }, { rootMargin: "0px 0px 100000px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Con la barra visible, el lanzador del chat sube para no taparla (mismo trato que StickyCTA).
  useEffect(() => {
    const LIFTED = "97px"; // 24 px de margen + 73 px de la barra (12 + 48 + 12 + 1 de hairline)
    const BASE   = "24px";
    const root = document.documentElement;
    root.style.setProperty("--sticky-h",    stickyVisible ? "73px" : "0px");
    root.style.setProperty("--chat-bottom", stickyVisible ? LIFTED : BASE);
    try {
      const widget   = document.querySelector("ev-chat-widget");
      const launcher = widget?.shadowRoot?.querySelector("#launcher") as HTMLElement | null;
      const panel    = widget?.shadowRoot?.querySelector("#panel")    as HTMLElement | null;
      if (launcher) launcher.style.bottom = stickyVisible ? LIFTED : "";
      if (panel)    panel.style.setProperty("--chat-bottom", stickyVisible ? LIFTED : BASE);
    } catch { /* no bloquea */ }
    return () => {
      root.style.setProperty("--sticky-h",    "0px");
      root.style.setProperty("--chat-bottom", BASE);
      try {
        const widget   = document.querySelector("ev-chat-widget");
        const launcher = widget?.shadowRoot?.querySelector("#launcher") as HTMLElement | null;
        if (launcher) launcher.style.bottom = "";
      } catch { /* no bloquea */ }
    };
  }, [stickyVisible]);

  // Miniaturas con scroll horizontal (móvil, o más de 8 fotos): la activa queda a la vista.
  useEffect(() => {
    const box = thumbsRef.current;
    const thumb = box?.children[galleryIndex] as HTMLElement | undefined;
    if (!box || !thumb || box.scrollWidth <= box.clientWidth) return;
    const offset = thumb.getBoundingClientRect().left - box.getBoundingClientRect().left;
    box.scrollBy({ left: offset - (box.clientWidth - thumb.offsetWidth) / 2, behavior: "smooth" });
  }, [galleryIndex]);

  // ─── Derivados de la versión elegida ──────────────────────────────────────
  const specs = keySpecs(car, ver, cls);
  const tagline = tidyText(car.tagline);
  const taglineText = tagline && !/[.!?…]$/.test(tagline) ? `${tagline}.` : tagline;
  const description = tidyText(car.description);

  const mediaChips: string[] = [];
  if (HOT_DEALS_ENABLED && car.isHotDeal) mediaChips.push("Oferta destacada");
  if (car.isNew) mediaChips.push("Nuevo");
  if (car.isTopSeller) mediaChips.push("Más vendido");

  const headChips = [
    car.category ? sentenceCase(car.category) : null,
    car.modelYear ? `Modelo ${car.modelYear}` : null,
    car.euroNcap ? `Euro NCAP ${car.euroNcap} ${car.euroNcap === 1 ? "estrella" : "estrellas"}` : null,
  ].filter((c): c is string => !!c);

  const highlights = car.highlights && car.highlights.length > 0 ? car.highlights : buildFallbackHighlights(car);

  const allVersionRows: { label: string; get: (v: VersionData) => string | null }[] = [
    cls === "EV"   ? { label: "Autonomía",           get: (v) => fmt(v.range, "km") } :
    cls === "PHEV" ? { label: "Autonomía eléctrica", get: (v) => fmt(v.electricRangeKm, "km") } :
                     { label: "Rendimiento",         get: (v) => fmt(v.fuelConsumption, "km/L") },
    { label: "Potencia",     get: (v) => fmt(v.power, "CV") },
    { label: "Torque",       get: (v) => fmt(v.torque, "Nm") },
    { label: "Tracción",     get: (v) => tractionLabel(v.traction) },
    { label: "0 a 100 km/h", get: (v) => fmt(v.acceleration, "s") },
    cls === "HEV"
      ? { label: "Velocidad máxima", get: (v) => fmt(v.topSpeed, "km/h") }
      : { label: "Batería",          get: (v) => fmt(v.battery, "kWh") },
  ];
  const versionRows = allVersionRows.filter((row) => car.versions.some((v) => row.get(v)));
  const showVersionTable = car.versions.length > 1 && versionRows.length > 0;

  const equipGroups = [
    { key: "safety",  label: "Seguridad",  features: car.safetyFeatures },
    { key: "tech",    label: "Tecnología", features: car.techFeatures },
    { key: "comfort", label: "Confort",    features: car.comfortFeatures },
  ]
    .map((g) => ({ ...g, features: (g.features ?? []).map((f) => tidyText(f)).filter((f): f is string => !!f) }))
    .filter((g) => g.features.length > 0);

  const { dc, ac } = chargeTimes(car, ver);
  const batteryType = tidyText(car.batteryType);
  const fichaGroups = [
    {
      title: "Batería y carga",
      rows: [
        ["Batería", fmt(ver.battery, "kWh")],
        ["Química", batteryType && batteryType.toLowerCase() !== "other" ? batteryType : null],
        ["Autonomía WLTP", fmt(ver.range, "km")],
        ["Autonomía eléctrica", cls === "PHEV" ? fmt(ver.electricRangeKm, "km") : null],
        ["Eficiencia", fmt(ver.rendimientoElectrico ?? car.rendimientoElectrico, "km/kWh")],
        [`Carga rápida DC${dc?.span ? `, ${dc.span}` : ""}`, dc?.value ?? null],
        ["Potencia máxima DC", fmt(ver.maxDCChargingPower ?? car.maxDCChargingPower, "kW")],
        [`Carga AC${ac?.span ? `, ${ac.span}` : ""}`, ac?.value ?? null],
        ["Potencia máxima AC", fmt(ver.maxACChargingPower ?? car.maxACChargingPower, "kW")],
        ["Conector", tidyText(car.chargeType) ?? tidyText(car.connectorType)],
      ],
    },
    {
      title: "Motor y rendimiento",
      rows: [
        ["Rendimiento", cls === "PHEV" ? null : fmt(ver.fuelConsumption ?? car.fuelConsumption, "km/L")],
        ["Potencia", ver.power > 0 ? `${formatNumber(ver.power)} CV (${formatNumber(Math.round(ver.power * 0.7355))} kW)` : null],
        ["Torque", fmt(ver.torque, "Nm")],
        ["Tracción", tractionLabel(ver.traction)],
        ["0 a 100 km/h", fmt(ver.acceleration, "s")],
        ["Velocidad máxima", fmt(ver.topSpeed, "km/h")],
        ["Transmisión", tidyText(ver.transmission ?? car.transmission)],
      ],
    },
    {
      title: "Dimensiones y capacidad",
      rows: [
        ["Plazas", car.seats > 0 ? String(car.seats) : null],
        ["Maletero", fmt(ver.cargo ?? car.cargo, "L")],
        ["Maletero delantero", fmt(car.frunkCapacity, "L")],
        ["Altura libre al suelo", fmt(car.groundClearance, "mm")],
      ],
    },
    {
      title: "Seguridad y garantía",
      rows: [
        ["Euro NCAP", car.euroNcap ? `${car.euroNcap} ${car.euroNcap === 1 ? "estrella" : "estrellas"}` : null],
        ["Airbags", car.airbags ? String(car.airbags) : null],
        ["Garantía", tidyText(car.warranty)],
      ],
    },
  ]
    .map((g) => ({ ...g, rows: g.rows.filter((r): r is [string, string] => !!r[1]) }))
    .filter((g) => g.rows.length > 0);

  // Hairline solo entre dos secciones blancas seguidas (regla del sistema).
  const equipRule = !showVersionTable;
  const fichaRule = equipGroups.length > 0 || !showVersionTable;
  const hasSimilar = similarCars.length > 0;

  return (
    <div className="page">
      {/* ─── Arriba: galería, datos clave y compra ──────────────────────── */}
      <section className="section pt-8" aria-label={model}>
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            {car.brandSlug ? <Link href={`/marcas/${car.brandSlug}`}>{car.brand}</Link> : <span>{car.brand}</span>}
            <span aria-hidden="true">/</span>
            <span aria-current="page">{car.name}</span>
          </nav>

          <div className="pdp-top">
            <div className="gallery">
              <div className="gallery__main">
                {photoCount > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sanityImg(galleryImages[galleryIndex], { w: 1400, h: 875, fit: "crop", q: 80 })}
                    srcSet={`${sanityImg(galleryImages[galleryIndex], { w: 800, h: 500, fit: "crop", q: 80 })} 800w, ${sanityImg(galleryImages[galleryIndex], { w: 1400, h: 875, fit: "crop", q: 80 })} 1400w`}
                    sizes="(max-width: 1023px) 100vw, 700px"
                    alt={galleryIndex === 0 ? model : `${model}, foto ${galleryIndex + 1} de ${photoCount}`}
                    fetchPriority={galleryIndex === 0 ? "high" : "auto"}
                    decoding="async"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <Icon name="electric_car" className="text-[96px] text-line-2" />
                  </span>
                )}
                {(car.electricTypeTag || mediaChips.length > 0) && (
                  <div className="gallery__chips">
                    <ElectricTypeBadge tag={car.electricTypeTag} />
                    {mediaChips.map((c) => (
                      <span key={c} className="chip chip--soft">{c}</span>
                    ))}
                  </div>
                )}
                {photoCount > 1 && (
                  <div className="gallery__nav">
                    <span className="chip chip--media" aria-live="polite">{galleryIndex + 1} / {photoCount}</span>
                    <button type="button" className="btn btn--secondary btn--icon btn--sm" onClick={() => showPhoto(galleryIndex - 1)} aria-label="Foto anterior">
                      <Icon name="chevron_left" size="none" />
                    </button>
                    <button type="button" className="btn btn--secondary btn--icon btn--sm" onClick={() => showPhoto(galleryIndex + 1)} aria-label="Foto siguiente">
                      <Icon name="chevron_right" size="none" />
                    </button>
                  </div>
                )}
              </div>

              {photoCount > 1 && (
                <div
                  ref={thumbsRef}
                  className={cn(
                    // 4 px de aire para que el scroll no recorte el outline de la miniatura activa
                    // (el margen negativo lo compensa: la fila queda donde la pone .thumbs).
                    "thumbs -mx-1 -mb-1 mt-2 p-1",
                    // Más de 8 fotos: una sola fila con scroll en vez de dos filas de miniaturas.
                    photoCount > 8 && "[grid-template-columns:none] grid-flow-col auto-cols-[calc((100%_-_3.5rem)/8)] max-lg:auto-cols-[88px] overflow-x-auto [scrollbar-width:none]",
                  )}
                >
                  {galleryImages.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      className="thumb"
                      aria-label={`Foto ${i + 1}`}
                      aria-current={i === galleryIndex}
                      onClick={() => showPhoto(i)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sanityImg(src, { w: 240, h: 150, fit: "crop" })} alt="" loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              )}

              {specs.length > 0 && (
                <dl className="specband specband--in" aria-label="Datos clave">
                  {specs.map((s) => (
                    <div key={s.label}>
                      <dt className="mt-0">
                        <Icon name={s.icon} size="none" className="mb-3 block h-[22px]" />
                        {s.label}
                      </dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <aside className="buy" aria-label="Precio y versiones">
              <div className="buy__brand">
                <p className="car__brand text-[15px]">{car.brand}</p>
                {car.brandLogoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sanityImg(car.brandLogoUrl, { w: 160, q: 85 })} alt="" loading="lazy" decoding="async" />
                )}
              </div>
              <h1 className="t-h1">
                {/* Las palabras con guion no se cortan ("Plug-in", "e-Hybrid"). */}
                {car.name.split(" ").map((word, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && " "}
                    {word.includes("-") ? <span className="whitespace-nowrap">{word}</span> : word}
                  </React.Fragment>
                ))}
              </h1>
              {taglineText && <p className="buy__tagline">{taglineText}</p>}
              {headChips.length > 0 && (
                <div className="head-chips">
                  {headChips.map((c) => (
                    <span key={c} className="chip">{c}</span>
                  ))}
                </div>
              )}

              {hasVersions && (
                <>
                  <p className="buy__label" id="pdp-version-label">
                    Versión <span>{car.versions.length} {car.versions.length === 1 ? "disponible" : "disponibles"}</span>
                  </p>
                  <div className="vers" role="radiogroup" aria-labelledby="pdp-version-label">
                    {car.versions.map((v, i) => {
                      const meta = versionMeta(v, cls);
                      return (
                        <label key={`${i}-${v.name}`} className="ver">
                          <input
                            type="radio"
                            name="pdp-version"
                            value={i}
                            checked={i === activeVersion}
                            onChange={() => setActiveVersion(i)}
                          />
                          <span className="ver__name">{labels[i]}</span>
                          <span className="ver__price">{formatCLP(priceOf(v).final)}</span>
                          {meta && <span className="ver__meta">{meta}</span>}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="pricebox" aria-live="polite">
                {price.discounted ? (
                  <>
                    <div className="pricebox__row">
                      <span className="pricebox__label">Precio de lista</span>
                      <span className="price-was">{formatCLP(price.list)}</span>
                    </div>
                    <div className="pricebox__row">
                      <span className="pricebox__label">Con bonos</span>
                      <span className="price price--lg">{formatCLP(price.final)}</span>
                    </div>
                    <div className="pricebox__foot">
                      <span className="price-save">Ahorras {formatCLP(price.savings)}</span>
                      <span className="t-micro">Incluye bonos. Precio referencial.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pricebox__row">
                      <span className="pricebox__label">Precio de lista</span>
                      <span className="price price--lg">{formatCLP(price.final)}</span>
                    </div>
                    <div className="pricebox__foot">
                      <span className="t-micro">Precio referencial. Consulta por financiamiento y bonos disponibles.</span>
                    </div>
                  </>
                )}
              </div>

              <div ref={buyActionsRef} className="buy__actions">
                <OfferCta carSlug={car.slug} model={model} source="pdp" className="btn btn--primary btn--lg">
                  Quiero esta oferta
                  <Icon name="arrow_forward" size="none" className="arrow" />
                </OfferCta>
                <Link href={compareHref} className="btn btn--secondary btn--lg">
                  <Icon name="compare_arrows" size="none" />
                  Comparar
                </Link>
              </div>
              <p className="buy__help">
                ¿Dudas si es para ti?{" "}
                <Link href="/asesoria" className="link">Asesoría por WhatsApp, {ASESORIA_PRICE}</Link>
              </p>
            </aside>
          </div>
        </div>
      </section>

      {/* ─── Reseñas: pegadas al bloque de compra (decisión de master) ──── */}
      <PdpReviewPrompt
        carSlug={car.slug}
        carBrand={car.brand}
        carModel={car.name}
        carName={model}
      />

      {reviewsSlot}

      {/* ─── Destacados (foto + texto, alternados) ─────────────────────── */}
      <section className="section" aria-label={description ? undefined : "Lo destacado"} aria-labelledby={description ? "pdp-about-t" : undefined}>
        <div className="wrap">
          {description && (
            <div className="section-head">
              <div className="section-head__text">
                <h2 className="t-h2" id="pdp-about-t">Sobre el {model}</h2>
                <p className="t-lead">{description}</p>
              </div>
            </div>
          )}
          {highlights.map((hl, idx) => (
            <div key={idx} className={cn("hl", !hl.imageUrl && "grid-cols-1")}>
              <div className="hl__text">
                {hl.badge && <span className="t-label">{sentenceCase(hl.badge)}</span>}
                <h2 className="t-h2">{tidyText(hl.title) ?? hl.title}</h2>
                {hl.description && <p>{tidyText(hl.description)}</p>}
              </div>
              {hl.imageUrl && (
                <div className={cn("hl__media", idx % 2 === 1 && "min-[900px]:order-first")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sanityImg(hl.imageUrl, { w: 1200, q: 75 })} alt="" loading="lazy" decoding="async" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Compara las versiones ──────────────────────────────────────── */}
      {showVersionTable && (
        <section className="section section--subtle" aria-labelledby="pdp-ver-t">
          <div className="wrap">
            <div className="section-head">
              <div className="section-head__text">
                <h2 className="t-h2" id="pdp-ver-t">Compara las versiones</h2>
                <p className="t-lead">La versión marcada es la que elegiste arriba.</p>
              </div>
            </div>
            {/* relative: contiene los sr-only (absolutos) dentro del scroll de la tabla. */}
            <div className="vtable-wrap relative">
              <table className="vtable">
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">Especificación</span></th>
                    {car.versions.map((v, i) => (
                      <th key={`${i}-${v.name}`} scope="col" className={cn(i === activeVersion && "is-sel")}>
                        {labels[i]}
                        {i === activeVersion && <span className="sr-only">, versión elegida</span>}
                        <span className="t-label">{formatCLP(priceOf(v).final)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {versionRows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {car.versions.map((v, i) => (
                        <td key={`${i}-${v.name}`} className={cn(i === activeVersion && "is-sel")}>
                          {row.get(v) ?? <span className="text-ink-3">Sin dato</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ─── Equipamiento ───────────────────────────────────────────────── */}
      {equipGroups.length > 0 && (
        <section className={cn("section", equipRule && "section--rule")} aria-labelledby="pdp-eq-t">
          <div className="wrap">
            <div className="section-head">
              <div className="section-head__text">
                <h2 className="t-h2" id="pdp-eq-t">Equipamiento</h2>
              </div>
            </div>
            <div
              className={cn(
                "equip",
                equipGroups.length === 2 && "min-[900px]:grid-cols-2",
                equipGroups.length === 1 && "min-[900px]:grid-cols-1",
              )}
            >
              {equipGroups.map((g) => (
                <div key={g.key}>
                  <h3 className="t-h3">
                    {g.label} <span>{g.features.length}</span>
                  </h3>
                  <ul>
                    {g.features.map((f, i) => (
                      <li key={`${i}-${f}`}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Ficha técnica ──────────────────────────────────────────────── */}
      <section className={cn("section", fichaRule && "section--rule")} aria-labelledby="pdp-ficha-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="pdp-ficha-t">Ficha técnica</h2>
              {verLabel && <p className="t-lead">Versión {verLabel}</p>}
            </div>
            {car.fichaUrl && car.fichaUrl !== "#" && (
              <div className="section-head__side">
                <a href={car.fichaUrl} target="_blank" rel="noopener noreferrer" className="link-arrow">
                  Ficha oficial {car.brand}
                  <Icon name="north_east" size="none" />
                </a>
              </div>
            )}
          </div>
          <div className="ficha">
            {fichaGroups.map((g) => (
              <div key={g.title}>
                <h3>{g.title}</h3>
                <dl>
                  {g.rows.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Similares y bloque Glaciar final ──────────────────────────── */}
      <section className="section section--rule" aria-labelledby={hasSimilar ? "pdp-sim-t" : "pdp-cta-t"}>
        <div className="wrap">
          {hasSimilar && (
            <>
              <div className="section-head">
                <div className="section-head__text">
                  <h2 className="t-h2" id="pdp-sim-t">También te puede interesar</h2>
                  <p className="t-lead">Autos de precio y tipo parecidos al {car.name}.</p>
                </div>
              </div>
              <div className="sim-grid">
                {similarCars.map((s) => {
                  const meta = [s.range > 0 ? `${formatNumber(s.range)} km` : null, s.category ? sentenceCase(s.category) : null]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <article key={s.slug} className="card sim">
                      <Link href={`/auto/${s.slug}`} className="card__media block" tabIndex={-1} aria-hidden>
                        {s.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sanityImg(s.imageUrl, { w: 640, q: 75 })} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Icon name="electric_car" className="text-[48px] text-line-2" />
                          </span>
                        )}
                      </Link>
                      <div className="sim__body">
                        <div>
                          <p className="car__brand">{s.brand}</p>
                          <h3 className="car__name">{s.name}</h3>
                        </div>
                        <div className="sim__row">
                          <p className="price">{formatCLP(s.discountPrice)}</p>
                          {meta && <p className="t-small">{meta}</p>}
                        </div>
                        <div className="sim__vs">
                          <Link href={`/auto/${s.slug}`} className="btn btn--secondary btn--sm btn--block">
                            Ver auto
                          </Link>
                          <Link href={`/comparador?add=${s.slug}`} className="btn btn--secondary btn--sm" aria-label={`Comparar ${s.brand} ${s.name}`}>
                            <Icon name="compare_arrows" size="none" />
                            Comparar
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          <div className={cn("soft-block cta-row", hasSimilar && "mt-[var(--section-y)]")}>
            <div>
              <h2 className="t-h2" id="pdp-cta-t">¿No sabes si el {car.name} es para ti?</h2>
              <p>Te asesoramos por WhatsApp según tu uso, tus kilómetros y tu presupuesto, y lo comparamos con otras opciones del catálogo.</p>
            </div>
            <div className="cta-row__actions">
              <Link href="/asesoria" className="btn btn--primary btn--lg">
                Quiero asesoría por {ASESORIA_PRICE}
                <Icon name="arrow_forward" size="none" className="arrow" />
              </Link>
              <OfferCta carSlug={car.slug} model={model} source="pdp" className="btn btn--secondary btn--lg">
                Únete a la waitlist
              </OfferCta>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Barra fija inferior ────────────────────────────────────────── */}
      <div className={cn("sticky-bar sticky-bar--buy", stickyVisible && "is-visible")} aria-hidden={!stickyVisible}>
        <div className="wrap sticky-bar__in">
          <div className="sticky-bar__car">
            {galleryImages[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sanityImg(galleryImages[0], { w: 160, h: 100, fit: "crop" })} alt="" loading="lazy" decoding="async" />
            )}
            <div className="min-w-0">
              <strong className="truncate">{model}</strong>
              {verLabel && <span>{verLabel}</span>}
            </div>
          </div>
          <div className="sticky-bar__actions">
            <span className="sticky-bar__price">{formatCLP(price.final)}</span>
            <Link href={compareHref} className="btn btn--secondary">
              Comparar
            </Link>
            <OfferCta carSlug={car.slug} model={model} source="pdp" className="btn btn--primary">
              Quiero esta oferta
            </OfferCta>
          </div>
        </div>
      </div>
    </div>
  );
}
