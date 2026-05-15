"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { formatCLP } from "@/lib/utils";

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

// ─── Component ───────────────────────────────────────────────────────────────
interface AutoPageClientProps {
  car: CarData;
  similarCars: SimilarCarData[];
}

const galleryGradients = [
  "from-slate-800 to-slate-900",
  "from-gray-800 to-gray-900",
  "from-zinc-800 to-zinc-900",
  "from-neutral-800 to-neutral-900",
  "from-stone-800 to-stone-900",
  "from-gray-900 to-black",
];

function validCharge(val: string | null | undefined): string | null {
  if (!val) return null;
  const v = val.trim().toUpperCase();
  if (v === "N/D" || v === "N/A" || v === "-" || v === "") return null;
  return val;
}

function buildFallbackHighlights(car: CarData) {
  const gallery = car.gallery ?? [];
  const tag = (car.electricTypeTag ?? "").toUpperCase();
  const isBEV  = tag === "BEV"  || (!car.fuelConsumption && (car.battery ?? 0) >= 10 && tag !== "PHEV" && tag !== "HEV" && tag !== "MHEV" && tag !== "REEV");
  const isPHEV = tag === "PHEV" || tag === "REEV";
  const isHEV  = !isBEV && !isPHEV;

  const comfortDesc = car.comfortFeatures.length > 0
    ? `El interior del ${car.name} combina materiales premium con tecnología conectada. ${car.comfortFeatures.slice(0, 2).join(", ")} y mucho más para que cada viaje sea placentero.`
    : `El interior del ${car.name} está pensado para quienes buscan confort y funcionalidad. Con ${car.seats} plazas y ${car.cargo} litros de maletero, tiene espacio para todo lo que necesitas.`;

  const comfortHighlight = {
    title:         `${car.seats || 5} plazas de puro confort`,
    description:   comfortDesc,
    badge:         "Interior",
    icon:          "airline_seat_recline_extra",
    imageUrl:      gallery[3] ?? gallery[0] ?? undefined,
    imagePosition: "right" as const,
  };

  if (isBEV) {
    return [
      {
        title:         car.range ? `Hasta ${car.range} km de autonomía real` : "Autonomía para el día a día",
        description:   car.range
          ? `El ${car.brand} ${car.name} está diseñado para ir lejos sin preocupaciones. ${car.battery ? `Con una batería de ${car.battery} kWh, ` : ""}ofrece hasta ${car.range} km de autonomía WLTP para que cada trayecto sea una experiencia sin ansiedad de rango.`
          : `El ${car.brand} ${car.name} es un vehículo eléctrico de última generación${car.rendimientoElectrico ? ` con una eficiencia de ${car.rendimientoElectrico} km/kWh` : ""}, diseñado para maximizar cada kilómetro recorrido.`,
        badge:         "Rendimiento",
        icon:          "electric_car",
        imageUrl:      gallery[1] ?? gallery[0] ?? undefined,
        imagePosition: "right" as const,
      },
      {
        title:         validCharge(car.chargeTimeDC) ? `Carga rápida en ${car.chargeTimeDC}` : "Carga inteligente y flexible",
        description:   `Olvídate de las esperas largas. ${car.chargeType ? `Compatible con ${car.chargeType}, ` : ""}el ${car.name} se adapta tanto a cargadores domésticos como a puntos de carga rápida DC para que siempre estés listo para salir.`,
        badge:         "Carga",
        icon:          "bolt",
        imageUrl:      gallery[2] ?? gallery[0] ?? undefined,
        imagePosition: "left" as const,
      },
      comfortHighlight,
    ];
  }

  if (isPHEV) {
    return [
      {
        title:         car.electricRangeKm ? `${car.electricRangeKm} km en modo 100% eléctrico` : "Lo mejor de dos mundos",
        description:   `El ${car.brand} ${car.name} combina motor eléctrico y combustión para la máxima versatilidad. ${car.electricRangeKm ? `Recorre hasta ${car.electricRangeKm} km en modo eléctrico puro para trayectos urbanos sin emisiones.` : ""}${car.rendimientoElectrico ? ` Eficiencia eléctrica de ${car.rendimientoElectrico} km/kWh para maximizar cada kWh.` : ""}`,
        badge:         "Electrificación",
        icon:          "electric_car",
        imageUrl:      gallery[1] ?? gallery[0] ?? undefined,
        imagePosition: "right" as const,
      },
      {
        title:         car.rendimientoElectrico ? `${car.rendimientoElectrico} km/kWh de eficiencia eléctrica` : "Carga inteligente para ciudad y carretera",
        description:   `Con su sistema híbrido enchufable, el ${car.name} optimiza automáticamente el uso de energía según tu forma de conducir. ${validCharge(car.chargeTimeDC) ? `Carga rápida en ${car.chargeTimeDC}.` : validCharge(car.chargeTimeAC) ? `Carga completa en ${car.chargeTimeAC}.` : ""}`,
        badge:         "Eficiencia",
        icon:          "savings",
        imageUrl:      gallery[2] ?? gallery[0] ?? undefined,
        imagePosition: "left" as const,
      },
      comfortHighlight,
    ];
  }

  // HEV / MHEV
  return [
    {
      title:         car.fuelConsumption ? `${car.fuelConsumption} km/L: eficiencia sin enchufes` : "Eficiencia híbrida automática",
      description:   `El ${car.brand} ${car.name} recupera energía en cada frenada y desaceleración para recargar su batería de forma automática, sin necesidad de enchufarse. ${car.fuelConsumption ? `Esto se traduce en un rendimiento de ${car.fuelConsumption} km/L` : "El resultado es un ahorro real de combustible"} en uso mixto urbano e interurbano.`,
      badge:         "Eficiencia",
      icon:          "savings",
      imageUrl:      gallery[1] ?? gallery[0] ?? undefined,
      imagePosition: "right" as const,
    },
    {
      title:         car.power ? `${car.power} CV con tecnología híbrida` : "Potencia e inteligencia combinadas",
      description:   `El motor híbrido del ${car.name} combina un motor de combustión con asistencia eléctrica para ofrecer una conducción más suave, potente y eficiente. ${car.traction ? `Tracción ${car.traction} para mayor control en todas las situaciones.` : ""}`,
      badge:         "Motor",
      icon:          "settings",
      imageUrl:      gallery[2] ?? gallery[0] ?? undefined,
      imagePosition: "left" as const,
    },
    comfortHighlight,
  ];
}

export default function AutoPageClient({ car, similarCars }: AutoPageClientProps) {
  const [activeVersion, setActiveVersion] = useState(0);
  const [galleryIndex,  setGalleryIndex]  = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [openEquip,     setOpenEquip]     = useState<Record<string, boolean>>({});
  const heroRef = useRef<HTMLElement>(null);

  function toggleEquip(key: string) {
    setOpenEquip((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (heroRef.current) obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, []);

  const ver: VersionData = car.versions[activeVersion] ?? {
    name: "Base", price: car.basePrice, discountPrice: car.discountPrice,
    battery: car.battery, range: car.range, power: car.power, torque: car.torque,
    traction: car.traction, acceleration: car.acceleration, topSpeed: car.topSpeed,
    chargeTimeDC: car.chargeTimeDC, chargeTimeAC: car.chargeTimeAC,
  };

  const savings    = ver.price - ver.discountPrice;
  const savingsPct = Math.round((savings / ver.price) * 100);
  const totalBonus = savings + (car.hotDealBonus ?? 0);
  const galleryImages = car.gallery ?? [];
  const galleryCount  = galleryImages.length > 0 ? galleryImages.length : 6;

  return (
    <>
      {/* ─── Sticky offer bar ────────────────────────────────────────── */}
      <AnimatePresence>
        {stickyVisible && (
          <m.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 md:top-20 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm"
          >
            <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {car.brandLogoUrl ? (
                  <img src={car.brandLogoUrl} alt={car.brand} className="h-5 sm:h-6 w-auto object-contain flex-shrink-0" loading="lazy" decoding="async" />
                ) : (
                  <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0">electric_car</span>
                )}
                <div className="min-w-0">
                  <p className="font-headline font-bold text-xs sm:text-sm truncate leading-tight">{car.brand} {car.name}</p>
                  <span className="text-text-ghost text-[10px] hidden sm:block truncate">{ver.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="hidden sm:block text-right">
                  {car.isHotDeal && savingsPct > 0 && (
                    <p className="text-xs text-text-ghost line-through">{formatCLP(ver.price)}</p>
                  )}
                  <p className="font-headline font-black text-primary-deep text-sm sm:text-base leading-none">
                    {formatCLP(car.isHotDeal && savingsPct > 0 ? ver.discountPrice : ver.price)}
                  </p>
                </div>
                <Link
                  href={`/solicitar?auto=${car.slug}&nombre=${encodeURIComponent(car.brand + " " + car.name)}`}
                  className="bg-primary hover:bg-primary-dark text-black font-bold px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap"
                >
                  Solicitar oferta
                </Link>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ─── Hero (full-image) ──────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="bg-black overflow-hidden relative flex flex-col"
        style={{ minHeight: "90vh" }}
      >
        {/* Grid pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        {/* Car image — object-cover fills the hero horizontally, gradients protect edges */}
        <div className="absolute inset-0">
          {galleryImages[0] ? (
            <img
              src={galleryImages[0]}
              alt={`${car.brand} ${car.name}`}
              className="w-full h-full object-cover object-center"
              fetchPriority="high"
              decoding="async"
            />
          ) : (
            <span className="material-symbols-outlined text-[240px] text-white/5">electric_car</span>
          )}
        </div>

        {/* Edge gradients — darken sides so text is readable, car shows in center */}
        <div className="absolute inset-y-0 left-0 w-[44%] pointer-events-none"
          style={{ background: "linear-gradient(to right, #000000 0%, rgba(0,0,0,0.65) 60%, transparent 100%)" }} />
        <div className="absolute inset-y-0 right-0 w-[44%] pointer-events-none"
          style={{ background: "linear-gradient(to left, #000000 0%, rgba(0,0,0,0.65) 60%, transparent 100%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-64 pointer-events-none"
          style={{ background: "linear-gradient(to top, #000000 0%, transparent 100%)" }} />
        <div className="absolute inset-x-0 top-0 h-48 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, #000000 0%, transparent 100%)" }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col flex-1 max-w-7xl mx-auto px-4 md:px-8 w-full pt-20 md:pt-24 pb-12 md:pb-16">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-6">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href={`/marcas/${car.brandSlug}`} className="hover:text-white/60 transition-colors">{car.brand}</Link>
            <span>/</span>
            <span className="text-white/60">{car.name}</span>
          </nav>

          {/* Spacer — pushes info to bottom */}
          <div className="flex-1" />

          {/* Bottom info row */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-end">

            {/* Left: brand / name / tagline. CTAs hidden on mobile (shown below stats). */}
            <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {car.isHotDeal && <span className="bg-amber text-black text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full">HOT DEAL</span>}
                {car.isNew && <span className="bg-primary text-black text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full">NUEVO</span>}
                {car.isTopSeller && <span className="bg-white text-black text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full">MÁS VENDIDO</span>}
                <span className="text-white/30 text-xs uppercase tracking-widest">{car.category}</span>
              </div>
              <p className="text-white/40 text-sm font-semibold mb-1">{car.brand}</p>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-headline font-black text-white tracking-tighter leading-[0.9] mb-4">
                {car.name}<span className="text-primary">.</span>
              </h1>
              <p className="text-white/60 text-base mb-6 max-w-sm leading-relaxed">{car.tagline}</p>

              {/* CTAs — desktop only (lg+). On mobile they appear below the stats block. */}
              <div className="hidden lg:flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/solicitar?auto=${car.slug}&nombre=${encodeURIComponent(car.brand + " " + car.name)}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-black font-black px-7 py-4 rounded-xl transition-colors"
                >
                  Obtén la mejor oferta
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
                <Link
                  href={`/comparador?add=${car.slug}`}
                  className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-5 py-4 rounded-xl transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">compare</span>
                  Comparar
                </Link>
              </div>
            </m.div>

            {/* Right: stats + price */}
            <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
              {/* Stats — 2 cols on mobile, 4 on sm+ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                {(() => {
                  const tag = (car.electricTypeTag ?? "").toUpperCase();
                  const isBEV  = tag === "BEV"  || (!car.fuelConsumption && (car.battery ?? 0) >= 10 && tag !== "PHEV" && tag !== "HEV" && tag !== "MHEV" && tag !== "REEV");
                  const isPHEV = tag === "PHEV" || tag === "REEV";
                  const stat1 = isBEV
                    ? { label: "Autonomía",   value: ver.range ? `${ver.range} km` : (car.rendimientoElectrico ? `${car.rendimientoElectrico} km/kWh` : "—") }
                    : isPHEV
                      ? { label: "Autón. e-",   value: (ver.electricRangeKm ?? car.electricRangeKm) ? `${ver.electricRangeKm ?? car.electricRangeKm} km` : "—" }
                      : { label: "Rendimiento", value: (ver.fuelConsumption ?? car.fuelConsumption) ? `${ver.fuelConsumption ?? car.fuelConsumption} km/L` : "—" };
                  const stat2 = isBEV
                    ? { label: "Batería",     value: ver.battery ? `${ver.battery} kWh` : "—" }
                    : isPHEV
                      ? { label: "Efic. e-",    value: (ver.rendimientoElectrico ?? car.rendimientoElectrico) ? `${ver.rendimientoElectrico ?? car.rendimientoElectrico} km/kWh` : "—" }
                      : { label: "Potencia",    value: ver.power ? `${ver.power} CV` : "—" };
                  return [
                    stat1,
                    stat2,
                    { label: "0–100",  value: ver.acceleration ? `${ver.acceleration}s` : "—" },
                    { label: "Plazas", value: `${car.seats || 5} plz` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-2.5 sm:p-3 text-center" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(8px)" }}>
                      <p className="text-primary font-headline font-black text-base sm:text-lg leading-none">{s.value}</p>
                      <p className="text-[9px] sm:text-[10px] mt-1 uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.40)" }}>{s.label}</p>
                    </div>
                  ));
                })()}
              </div>

              {/* Price box */}
              <div className="relative rounded-2xl p-4 sm:p-5" style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.10)" }}>
                {car.isHotDeal && savingsPct > 0 ? (
                  <>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-white/40 text-sm">Precio lista</span>
                      <span className="text-white/40 line-through text-sm">{formatCLP(ver.price)}</span>
                    </div>
                    <div className="flex justify-between items-end gap-2">
                      <span className="text-white text-sm font-medium leading-tight">Con bono Electrificarte</span>
                      <span className="text-primary text-xl sm:text-3xl font-headline font-black flex-shrink-0">{formatCLP(ver.discountPrice)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
                        Ahorras {formatCLP(savings)} ({savingsPct}%)
                        {car.hotDealBonus ? ` · Bono ${formatCLP(car.hotDealBonus)}` : ""}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-1">
                      <span className="text-white/40 text-sm">Precio Electrificarte</span>
                    </div>
                    <div>
                      <span className="text-primary text-2xl sm:text-3xl font-headline font-black">{formatCLP(ver.price)}</span>
                    </div>
                    <p className="text-xs mt-3 pt-3" style={{ color: "rgba(255,255,255,0.30)", borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                      *Precio referencial. Consulta por financiamiento y bonos disponibles.
                    </p>
                  </>
                )}
                {car.isHotDeal && savingsPct > 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-black text-xs font-black px-3 py-1.5 rounded-full whitespace-nowrap">
                    -{savingsPct}% con Electrificarte
                  </div>
                )}
              </div>
            </m.div>

            {/* CTAs — mobile only (below stats). Hidden on lg+ where they appear in the left column. */}
            <div className="flex lg:hidden flex-col sm:flex-row gap-3">
              <Link
                href={`/solicitar?auto=${car.slug}&nombre=${encodeURIComponent(car.brand + " " + car.name)}`}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-black font-black px-7 py-4 rounded-xl transition-colors"
              >
                Obtén la mejor oferta
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <Link
                href={`/comparador?add=${car.slug}`}
                className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-5 py-4 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">compare</span>
                Comparar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Version selector ─────────────────────────────────────────── */}
      {car.versions.length > 1 && (
        <section className="bg-black py-10" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-5">Elige tu versión</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {car.versions.map((v, i) => {
                const vSavings = v.price - v.discountPrice;
                const vPct     = Math.round((vSavings / v.price) * 100);
                const isActive = i === activeVersion;
                return (
                  <button
                    key={v.name}
                    onClick={() => setActiveVersion(i)}
                    className="text-left rounded-2xl p-5 transition-all duration-200"
                    style={isActive
                      ? { backgroundColor: "rgba(0,229,229,0.10)", border: "1px solid rgba(0,229,229,0.50)", boxShadow: "0 0 0 1px rgba(0,229,229,0.30)" }
                      : { backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className={["font-headline font-bold text-sm", isActive ? "text-primary" : "text-white"].join(" ")}>{v.name}</span>
                      {isActive && (
                        <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-black text-[12px]">check</span>
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {(() => {
                        const tag = (car.electricTypeTag ?? "").toUpperCase();
                        const isBEV  = tag === "BEV"  || (!car.fuelConsumption && (car.battery ?? 0) >= 10 && tag !== "PHEV" && tag !== "HEV" && tag !== "MHEV" && tag !== "REEV");
                        const isPHEV = tag === "PHEV" || tag === "REEV";
                        const vStats = isBEV
                          ? [{label:"Autonomía",value:v.range ? `${v.range} km` : "—"},{label:"Batería",value:v.battery ? `${v.battery} kWh` : "—"},{label:"Tracción",value:v.traction||"—"},{label:"0–100",value:v.acceleration ? `${v.acceleration}s` : "—"}]
                          : isPHEV
                          ? [{label:"Autón. e-",value:(v.electricRangeKm ?? car.electricRangeKm) ? `${v.electricRangeKm ?? car.electricRangeKm} km` : "—"},{label:"Eficiencia e-",value:(v.rendimientoElectrico ?? car.rendimientoElectrico) ? `${v.rendimientoElectrico ?? car.rendimientoElectrico} km/kWh` : "—"},{label:"Tracción",value:v.traction||"—"},{label:"0–100",value:v.acceleration ? `${v.acceleration}s` : "—"}]
                          : [{label:"Rendimiento",value:(v.fuelConsumption ?? car.fuelConsumption) ? `${v.fuelConsumption ?? car.fuelConsumption} km/L` : "—"},{label:"Potencia",value:v.power ? `${v.power} CV` : "—"},{label:"Tracción",value:v.traction||"—"},{label:"0–100",value:v.acceleration ? `${v.acceleration}s` : "—"}];
                        return vStats.map((s) => (
                          <div key={s.label}>
                            <p className="text-xs font-bold" style={{ color: isActive ? "rgba(0,229,229,0.80)" : "rgba(255,255,255,0.60)" }}>{s.value}</p>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.30)" }}>{s.label}</p>
                          </div>
                        ));
                      })()}
                    </div>
                    <div>
                      {car.isHotDeal && vPct > 0 && (
                        <p className="text-white/30 text-xs line-through">{formatCLP(v.price)}</p>
                      )}
                      <p className={["font-headline font-black text-xl", isActive ? "text-primary" : "text-white"].join(" ")}>
                        {formatCLP(car.isHotDeal && vPct > 0 ? v.discountPrice : v.price)}
                      </p>
                      {car.isHotDeal && vPct > 0 && (
                        <p className="text-green-400 text-[10px] font-bold mt-0.5">-{vPct}% ahorro</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Highlights (foto + texto) ────────────────────────────────── */}
      {(car.highlights && car.highlights.length > 0 ? car.highlights : buildFallbackHighlights(car)).map((hl, idx) => {
        const imgLeft = idx % 2 !== 0;
        return (
          <section key={idx} className={idx % 2 === 0 ? "py-16 md:py-24 bg-white" : "py-16 md:py-24 bg-gray-50"}>
            <div className="max-w-7xl mx-auto px-4 md:px-8">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Text */}
                <div className={imgLeft ? "lg:order-2" : ""}>
                  {(hl.badge || hl.icon) && (
                    <div className="flex items-center gap-2 mb-4">
                      {hl.icon && <span className="material-symbols-outlined text-primary text-[18px]">{hl.icon}</span>}
                      {hl.badge && <span className="text-[11px] uppercase tracking-widest text-primary-deep font-bold">{hl.badge}</span>}
                    </div>
                  )}
                  <h2 className="font-headline font-black text-3xl md:text-4xl tracking-tighter leading-tight mb-5">
                    {hl.title}
                  </h2>
                  {hl.description && (
                    <p className="text-text-muted leading-relaxed text-base md:text-lg">
                      {hl.description}
                    </p>
                  )}
                </div>
                {/* Image */}
                <div className={imgLeft ? "lg:order-1" : ""}>
                  <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                    {hl.imageUrl ? (
                      <img src={hl.imageUrl} alt={hl.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-[64px] text-gray-200">{hl.icon ?? "photo_camera"}</span>
                        <span className="text-[10px] uppercase tracking-widest text-gray-300 font-bold">Foto próximamente</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ─── Overview ─────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-3">Sobre el vehículo</p>
            <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tighter uppercase mb-6">{car.brand} {car.name}</h2>
            <p className="text-text-muted leading-relaxed mb-10">{car.description}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(() => {
                const tag = (car.electricTypeTag ?? "").toUpperCase();
                const isBEV  = tag === "BEV"  || (!car.fuelConsumption && (car.battery ?? 0) >= 10 && tag !== "PHEV" && tag !== "HEV" && tag !== "MHEV" && tag !== "REEV");
                const isPHEV = tag === "PHEV" || tag === "REEV";
                const perf = isBEV
                  ? { icon: "electric_car", text: ver.range ? `Hasta ${ver.range} km de autonomía` : car.rendimientoElectrico ? `Eficiencia ${car.rendimientoElectrico} km/kWh` : "Vehículo 100% eléctrico" }
                  : isPHEV
                  ? { icon: "electric_car", text: [car.electricRangeKm ? `${car.electricRangeKm} km eléctrico` : null, car.rendimientoElectrico ? `${car.rendimientoElectrico} km/kWh eficiencia` : null].filter(Boolean).join(" · ") || "Híbrido enchufable" }
                  : { icon: "savings",      text: car.fuelConsumption ? `Rendimiento ${car.fuelConsumption} km/L · auto-recarga` : "Híbrido de auto-recarga" };
                const charge = isBEV || isPHEV
                  ? { icon: "bolt", text: [car.chargeType, validCharge(car.chargeTimeDC) ? `carga DC en ${car.chargeTimeDC}` : null].filter(Boolean).join(" · ") || "Carga eléctrica compatible" }
                  : { icon: "bolt", text: "Sin necesidad de enchufarse · auto-recarga" };
                return [
                  charge,
                  perf,
                  { icon: "airline_seat_recline_extra", text: `${car.seats || 5} plazas · maletero ${car.cargo || "—"} L` },
                  { icon: "shield", text: car.safetyFeatures[0] ?? "Garantía de precio más bajo del mercado" },
                ].map((h) => (
                  <div key={h.icon} className="flex items-center gap-3 bg-surface rounded-xl p-3.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(0,229,229,0.10)" }}>
                      <span className="material-symbols-outlined text-primary text-[16px]">{h.icon}</span>
                    </div>
                    <span className="text-text-muted text-sm">{h.text}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Equipamiento (accordion) ─────────────────────────────────── */}
      {(car.safetyFeatures.length > 0 || car.techFeatures.length > 0 || car.comfortFeatures.length > 0) && (
        <section className="py-16 md:py-20 bg-surface border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="mb-8">
              <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Equipamiento</p>
              <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tighter uppercase">Seguridad, tecnología y confort</h2>
            </div>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white max-w-3xl">
              {[
                { key: "safety",  icon: "shield",  label: "Seguridad",  iconCls: "text-red-500",      bgCls: "bg-red-50",      dotCls: "bg-red-400",    features: car.safetyFeatures },
                { key: "tech",    icon: "memory",  label: "Tecnología", iconCls: "text-primary-deep", bgCls: "bg-primary/10",  dotCls: "bg-primary",    features: car.techFeatures },
                { key: "comfort", icon: "airline_seat_recline_extra", label: "Confort", iconCls: "text-blue-500", bgCls: "bg-blue-50", dotCls: "bg-blue-400", features: car.comfortFeatures },
              ].filter((g) => g.features.length > 0).map((group) => (
                <div key={group.key}>
                  <button
                    onClick={() => toggleEquip(group.key)}
                    className="w-full flex items-center justify-between px-6 py-5 hover:bg-surface transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 ${group.bgCls} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <span className={`material-symbols-outlined ${group.iconCls} text-[18px]`}>{group.icon}</span>
                      </div>
                      <div>
                        <p className="font-headline font-bold text-sm">{group.label}</p>
                        <p className="text-text-ghost text-xs">{group.features.length} características</p>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined text-[20px] text-text-ghost transition-transform duration-200 ${openEquip[group.key] ? "rotate-180" : ""}`}>
                      expand_more
                    </span>
                  </button>
                  {openEquip[group.key] && (
                    <div className="px-6 pb-5 pt-1 border-t border-gray-50">
                      <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-3">
                        {group.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-sm text-text-muted">
                            <span className={`w-1.5 h-1.5 rounded-full ${group.dotCls} flex-shrink-0 mt-1.5`} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Ficha técnica ────────────────────────────────────────────── */}
      <section className="py-14 bg-surface border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-1">Datos técnicos</p>
              <h2 className="text-2xl md:text-3xl font-headline font-black tracking-tighter uppercase">
                Ficha técnica — {ver.name}
              </h2>
            </div>
            {car.fichaUrl && car.fichaUrl !== "#" && (
              <a href={car.fichaUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-gray-200 hover:border-primary/40 text-text-muted hover:text-primary-deep font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex-shrink-0">
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Ver ficha oficial {car.brand}
              </a>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {[
              { section: "Batería y Autonomía", rows: [
                { label: "Batería",              value: ver.battery ? `${ver.battery} kWh` : null },
                { label: "Autonomía WLTP",       value: ver.range   ? `${ver.range} km`    : null },
                { label: "Eficiencia eléctrica", value: (ver.rendimientoElectrico ?? car.rendimientoElectrico) ? `${ver.rendimientoElectrico ?? car.rendimientoElectrico} km/kWh` : null },
                { label: "Rendimiento híbrido",  value: (["PHEV","REEV"].includes((car.electricTypeTag ?? "").toUpperCase())) ? null : ((ver.fuelConsumption ?? car.fuelConsumption) ? `${ver.fuelConsumption ?? car.fuelConsumption} km/L` : null) },
                { label: "Carga rápida DC",      value: validCharge(ver.chargeTimeDC) },
                { label: "Carga AC",             value: validCharge(ver.chargeTimeAC) },
                { label: "Tipo de conector",     value: car.chargeType   || null },
              ]},
              { section: "Motor y Rendimiento", rows: [
                { label: "Potencia",          value: ver.power        ? `${ver.power} CV (${Math.round(ver.power * 0.7355)} kW)` : null },
                { label: "Torque",            value: ver.torque       ? `${ver.torque} Nm`        : null },
                { label: "Tracción",          value: ver.traction     || null },
                { label: "Aceleración 0–100", value: ver.acceleration ? `${ver.acceleration} s`   : null },
                { label: "Velocidad máxima",  value: ver.topSpeed     ? `${ver.topSpeed} km/h`    : null },
              ]},
              { section: "Dimensiones y Capacidad", rows: [
                { label: "Plazas",   value: car.seats ? String(car.seats) : null },
                { label: "Maletero", value: car.cargo ? `${car.cargo} litros` : null },
              ]},
            ].map((group) => {
              const visibleRows = group.rows.filter(r => r.value);
              if (!visibleRows.length) return null;
              return (
                <div key={group.section}>
                  <div className="bg-surface px-6 py-3 border-b border-gray-100">
                    <p className="text-[11px] uppercase tracking-widest font-bold text-primary-deep">{group.section}</p>
                  </div>
                  {visibleRows.map((row, ri) => (
                    <div key={row.label} className={["grid grid-cols-2 px-6 py-3.5 text-sm", ri < visibleRows.length - 1 ? "border-b border-gray-50" : "border-b border-gray-100"].join(" ")}>
                      <span className="text-text-muted font-medium">{row.label}</span>
                      <span className="font-semibold text-text-main">{row.value}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Gallery ──────────────────────────────────────────────────── */}
      <section className="py-14 bg-black">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-primary font-bold mb-1">Galería</p>
              <h2 className="text-2xl md:text-3xl font-headline font-black text-white tracking-tighter uppercase">{car.brand} {car.name}</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setGalleryIndex((i) => (i === 0 ? galleryCount - 1 : i - 1))} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors" aria-label="Anterior">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button onClick={() => setGalleryIndex((i) => (i === galleryCount - 1 ? 0 : i + 1))} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors" aria-label="Siguiente">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="relative aspect-[16/7] rounded-2xl overflow-hidden mb-4">
            <AnimatePresence mode="wait">
              <m.div key={galleryIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                {galleryImages[galleryIndex] ? (
                  <img src={galleryImages[galleryIndex]} alt={`${car.brand} ${car.name} foto ${galleryIndex + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${galleryGradients[galleryIndex % galleryGradients.length]} flex items-center justify-center`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-60 h-60 bg-primary/8 rounded-full blur-3xl" />
                    </div>
                    <span className="material-symbols-outlined text-[100px] text-white/10 relative z-10">electric_car</span>
                    <span className="absolute bottom-4 right-4 text-white/20 text-xs uppercase tracking-widest font-bold">{galleryIndex + 1} / {galleryCount}</span>
                  </div>
                )}
              </m.div>
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Array.from({ length: galleryCount }).map((_, i) => (
              <button key={i} onClick={() => setGalleryIndex(i)}
                className={["aspect-video rounded-xl overflow-hidden border-2 transition-all", i === galleryIndex ? "border-primary scale-105" : "border-transparent opacity-50 hover:opacity-80"].join(" ")}>
                {galleryImages[i] ? (
                  <img src={galleryImages[i]} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${galleryGradients[i % galleryGradients.length]} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-white/20 text-[16px]">electric_car</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Vehículos similares ──────────────────────────────────────── */}
      {similarCars.length > 0 && (
        <section className="py-16 bg-surface border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">También te puede interesar</p>
            <h2 className="text-2xl md:text-3xl font-headline font-black tracking-tighter uppercase mb-8">Vehículos similares</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {similarCars.map((s) => (
                <Link key={s.slug} href={`/auto/${s.slug}`} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-300">
                  <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt={`${s.brand} ${s.name}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-[56px] text-gray-200">electric_car</span>
                        <span className="text-[10px] uppercase tracking-widest text-text-ghost font-bold mt-1">{s.brand}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-headline font-bold group-hover:text-primary-deep transition-colors">{s.brand} {s.name}</h3>
                    <p className="text-xs text-text-ghost mb-3">{s.category} · {s.range} km</p>
                    <p className="font-headline font-black text-lg text-primary-deep">{formatCLP(s.discountPrice)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-14 bg-surface border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-black rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-primary text-xs uppercase tracking-widest font-bold mb-2">¿Listo para ahorrar?</p>
              <h2 className="text-white font-headline font-black text-2xl md:text-3xl tracking-tight">
                {car.isHotDeal ? `Obtén la mejor oferta del ${car.brand} ${car.name}` : `¿Te interesa el ${car.brand} ${car.name}?`}
              </h2>
              <p className="text-white/50 text-sm mt-1">
                {car.isHotDeal && savingsPct > 0
                  ? `Negociamos por ti. Ahorras hasta ${formatCLP(totalBonus)} sobre precio lista.`
                  : "Consulta disponibilidad, financiamiento y los mejores precios del mercado."}
              </p>
            </div>
            <Link href={`/solicitar?auto=${car.slug}&nombre=${encodeURIComponent(car.brand + " " + car.name)}`} className="flex-shrink-0 inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-black px-8 py-4 rounded-xl transition-colors text-sm whitespace-nowrap">
              Solicitar oferta ahora
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
