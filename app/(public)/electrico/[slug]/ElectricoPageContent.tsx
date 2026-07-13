"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { formatCLP, calculateDiscount, carStats, DEFAULT_HOT_DEAL_LABEL } from "@/lib/utils";
import { PlpFilters } from "@/components/filters/PlpFilters";
import { useCarFilters } from "@/hooks/useCarFilters";
import type { FacetCar } from "@/lib/filters/types";
import { ElectricTypeBadge } from "@/components/car/ElectricTypeBadge";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ElectricoMeta {
  tag: string;
  label: string;
  icon: string;
  color: string;
  tagline: string;
  description: string;
  howItWorks: { icon: string; title: string; desc: string }[];
  pros: string[];
  cons: string[];
  idealFor: string;
}

export interface ElectricoCarData {
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  tipoSlug: string;
  tipoLabel: string;
  electricTypeTag: string;
  basePrice: number;
  discountPrice: number;
  range: number;
  maxVersionRange?: number | null;
  power: number;
  battery: number;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  traction?: string;
  seats?: number | null;
  euroNcap?: number | null;
  isHotDeal: boolean;
  tagline: string;
  imageUrl?: string;
}

// Adaptador estable raw → FacetCar (contexto: /electrico, oculta "tecnologia").
function electricoToFacet(c: ElectricoCarData): FacetCar {
  return {
    slug: c.slug,
    brandSlug: c.brandSlug,
    brandName: c.brand,
    vehicleTypeSlug: c.tipoSlug,
    vehicleTypeLabel: c.tipoLabel,
    electricTypeTag: "",
    electricTypeLabel: "",
    price: c.discountPrice ?? c.basePrice,
    basePrice: c.basePrice,
    discountPrice: c.discountPrice ?? c.basePrice,
    range: Math.max(c.range ?? 0, c.maxVersionRange ?? 0),
    seats: c.seats ?? null,
    euroNcap: c.euroNcap ?? null,
    traction: c.traction ?? "",
    isHotDeal: c.isHotDeal,
    isNew: false,
  };
}

export interface OtherElectricType {
  slug: string;
  label: string;
  icon: string;
  tag: string;
}

export interface AdCarData {
  name: string;
  slug: string;
  imageUrl?: string;
  brand: string;
  basePrice: number;
  discountPrice?: number;
  range?: number;
}

export interface PlpBannerData {
  mobileImageUrl?: string;
  imageUrl: string;
  ctaHref?: string;
  altText?: string;
}

interface ElectricoPageContentProps {
  slug: string;
  meta: ElectricoMeta;
  cars: ElectricoCarData[];
  otherTypes: OtherElectricType[];
  adCar?: AdCarData | null;
  adText?: string;
  plpBanners?: PlpBannerData[];
  hotDealUrgencyLabel?: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 9;

export default function ElectricoPageContent({ slug, meta, cars, otherTypes, adCar, adText, plpBanners = [], hotDealUrgencyLabel }: ElectricoPageContentProps) {
  const urgencyLabel = hotDealUrgencyLabel ?? DEFAULT_HOT_DEAL_LABEL;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openHowItem, setOpenHowItem] = useState<number | null>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const nextSlide = useCallback(() => setActiveSlide((p) => (p + 1) % (plpBanners.length || 1)), [plpBanners.length]);
  useEffect(() => {
    if (plpBanners.length < 2) return;
    const t = setInterval(nextSlide, 5000);
    return () => clearInterval(t);
  }, [nextSlide, plpBanners.length]);

  const filters = useCarFilters(cars, { toFacet: electricoToFacet, context: "tecnologia" });
  const { filtered } = filters;

  // Reinicia la paginación cuando cambian los filtros/orden.
  useEffect(() => setVisibleCount(PAGE_SIZE), [filtered]);

  const hotDeals = filtered.filter((c) => c.isHotDeal);
  const rest     = filtered.filter((c) => !c.isHotDeal);

  // Hot deal carousel
  const hotTrackRef  = useRef<HTMLDivElement>(null);
  const hotPausedRef = useRef(false);
  const [hotActiveIdx, setHotActiveIdx] = useState(0);
  useEffect(() => {
    const el = hotTrackRef.current;
    if (!el) return;
    function upd() {
      setHotActiveIdx(Math.round(el!.scrollLeft / el!.clientWidth));
    }
    upd();
    el.addEventListener("scroll", upd, { passive: true });
    return () => el.removeEventListener("scroll", upd);
  }, [hotDeals]);
  useEffect(() => {
    if (hotDeals.length < 2) return;
    const id = setInterval(() => {
      if (hotPausedRef.current) return;
      const el = hotTrackRef.current;
      if (!el) return;
      const next = Math.round(el.scrollLeft / el.clientWidth) + 1;
      el.scrollTo({ left: el.clientWidth * (next >= hotDeals.length ? 0 : next), behavior: "smooth" });
    }, 7000);
    return () => clearInterval(id);
  }, [hotDeals.length]);
  const visibleRest = rest.slice(0, visibleCount);
  const hasMore = visibleCount < rest.length;

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-black pt-20 pb-16 md:pt-28 md:pb-20 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ backgroundColor: meta.color }}
        />

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-10">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/60">{meta.label}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              {/* Mini badges */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {cars.length > 0 && (
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    <span className="material-symbols-outlined text-[14px]" style={{ color: meta.color }}>sell</span>
                    <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.60)" }}>Desde {formatCLP(Math.min(...cars.map((c) => c.discountPrice)))}</span>
                  </div>
                )}
                {hotDeals.length > 0 && (
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)" }}
                  >
                    <span className="material-symbols-outlined text-amber text-[14px]">local_fire_department</span>
                    <span className="text-amber text-xs font-bold">{hotDeals.length} Hot Deal{hotDeals.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>

              <h1 className="text-5xl md:text-6xl font-headline font-black text-white tracking-tighter leading-[0.92] mb-4">
                {meta.label}<span style={{ color: meta.color }}>.</span>
              </h1>
              <p className="font-headline text-xl md:text-2xl font-bold mb-6" style={{ color: meta.color }}>
                {meta.tagline}
              </p>
              <p className="text-white/60 text-base leading-relaxed max-w-md mb-8">
                {meta.description}
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                  {cars.length} modelo{cars.length !== 1 ? "s" : ""} disponible{cars.length !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                  Precios negociados al mejor valor
                </div>
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                  Respuesta en 48-96 h
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={`#catalogo-${slug}`}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_4px_20px_rgba(0,229,229,0.30)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]"
                >
                  Ver modelos
                  <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                </a>
              </div>
            </div>

            {/* Right – ad car card */}
            <div className="relative hidden md:block">
              {adCar && (
                <>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold mb-2 text-right">Publicidad</p>
                  <Link
                    href={`/auto/${adCar.slug}`}
                    className="block rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-primary/40 transition-all duration-300 group"
                  >
                    <div className="aspect-[16/9] relative overflow-hidden">
                      {adCar.imageUrl ? (
                        <img
                          src={adCar.imageUrl}
                          alt={`${adCar.brand} ${adCar.name}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[64px] text-white/10">electric_car</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="font-headline font-bold text-sm mb-2" style={{ color: meta.color }}>{adCar.brand} {adCar.name}</p>
                      <p className="text-white font-headline font-black text-xl leading-tight mb-4">{adText}</p>
                      <div className="flex items-end justify-between mb-4">
                        <div>
                          {adCar.discountPrice && adCar.discountPrice < adCar.basePrice && (
                            <p className="text-white/30 text-xs line-through">{formatCLP(adCar.basePrice)}</p>
                          )}
                          <p className="font-headline font-black text-2xl" style={{ color: meta.color }}>
                            {formatCLP(adCar.discountPrice && adCar.discountPrice < adCar.basePrice ? adCar.discountPrice : adCar.basePrice)}
                          </p>
                        </div>
                        {adCar.discountPrice && adCar.discountPrice < adCar.basePrice && (
                          <span className="text-xs font-black px-2 py-1 rounded-lg" style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
                            -{calculateDiscount(adCar.basePrice, adCar.discountPrice)}%
                          </span>
                        )}
                      </div>
                      <span className="block w-full text-center bg-primary hover:bg-primary-dark text-black font-bold py-2.5 rounded-xl text-sm transition-colors">
                        Ver modelo
                      </span>
                    </div>
                  </Link>
                </>
              )}
              <div
                className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20"
                style={{ backgroundColor: meta.color }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Info strip (howItWorks) ─────────────────────────────────── */}
      <section className="py-10 bg-surface border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Desktop: grid */}
          <div className="hidden md:grid grid-cols-4 gap-4">
            {meta.howItWorks.map((h, i) => (
              <m.div
                key={h.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                className="flex flex-col items-start gap-3 bg-white border border-gray-100 rounded-2xl p-5"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}18` }}>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: meta.color }}>{h.icon}</span>
                </div>
                <div>
                  <p className="font-headline font-bold text-sm leading-snug mb-1 text-text-main">{h.title}</p>
                  <p className="text-text-ghost text-[12px] leading-snug">{h.desc}</p>
                </div>
              </m.div>
            ))}
          </div>

          {/* Mobile: accordion */}
          <div className="md:hidden space-y-2">
            {meta.howItWorks.map((h, i) => (
              <div key={h.title} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  onClick={() => setOpenHowItem(openHowItem === i ? null : i)}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}18` }}>
                    <span className="material-symbols-outlined text-[18px]" style={{ color: meta.color }}>{h.icon}</span>
                  </div>
                  <span className="font-headline font-bold text-sm text-text-main flex-1 leading-tight">{h.title}</span>
                  <span className={["material-symbols-outlined text-[20px] text-text-ghost transition-transform duration-200 flex-shrink-0", openHowItem === i ? "rotate-180" : ""].join(" ")}>
                    expand_more
                  </span>
                </button>
                <AnimatePresence>
                  {openHowItem === i && (
                    <m.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-text-ghost text-sm leading-relaxed">{h.desc}</p>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Banner slideshow — solo si hay banners en Sanity ──────── */}
      {plpBanners.length > 0 && (
        <section className="py-8 bg-surface border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="relative rounded-2xl overflow-hidden">
              <picture>
                {plpBanners[activeSlide]?.mobileImageUrl && (
                  <source media="(max-width: 767px)" srcSet={plpBanners[activeSlide].mobileImageUrl} />
                )}
                <img src={plpBanners[activeSlide]?.imageUrl} alt="" aria-hidden className="w-full h-auto invisible" loading="lazy" decoding="async" />
              </picture>
              {plpBanners.map((b, i) => (
                <div key={i} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: i === activeSlide ? 1 : 0, pointerEvents: i === activeSlide ? "auto" : "none" }} onClick={plpBanners.length > 1 && !b.ctaHref ? nextSlide : undefined}>
                  {b.ctaHref ? (
                    <Link href={b.ctaHref} className="block w-full h-full">
                      <picture>
                        {b.mobileImageUrl && <source media="(max-width: 767px)" srcSet={b.mobileImageUrl} />}
                        <img src={b.imageUrl} alt={b.altText ?? ""} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      </picture>
                    </Link>
                  ) : (
                    <picture>
                      {b.mobileImageUrl && <source media="(max-width: 767px)" srcSet={b.mobileImageUrl} />}
                      <img src={b.imageUrl} alt={b.altText ?? ""} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </picture>
                  )}
                </div>
              ))}
              {plpBanners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {plpBanners.map((_, i) => (
                    <button key={i} onClick={(e) => { e.stopPropagation(); setActiveSlide(i); }} className="h-1.5 rounded-full transition-all duration-300" style={{ width: i === activeSlide ? 16 : 6, background: i === activeSlide ? "#00E5E5" : "rgba(0,0,0,0.35)" }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── Hot Deals ──────────────────────────────────────────────── */}
      {hotDeals.length > 0 && (
        <section className="py-6 sm:py-10 md:py-14 bg-black" onMouseEnter={() => { hotPausedRef.current = true; }} onMouseLeave={() => { hotPausedRef.current = false; }}>

          <div
            ref={hotTrackRef}
            className="flex overflow-x-auto"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {hotDeals.map((car) => {
              const discountPct = Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100);
              const primaryStats = carStats({ battery: car.battery, range: car.range, maxVersionRange: car.maxVersionRange, electricRangeKm: car.electricRangeKm, fuelConsumption: car.fuelConsumption, rendimientoElectrico: car.rendimientoElectrico, electricTypeTag: car.electricTypeTag, power: car.power });
              const specs = [
                ...primaryStats,
                { label: "Potencia", value: car.power ? `${car.power} CV` : null },
                { label: "Tipo",     value: meta.tag },
              ].filter((s, i, arr) => s.value && arr.findIndex(x => x.label === s.label) === i).slice(0, 4) as { label: string; value: string }[];
              return (
                <div key={car.slug} style={{ flex: "0 0 100%", scrollSnapAlign: "start" }}>
                  {/* ── MOBILE ── */}
                  <div className="lg:hidden px-4">
                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt={`${car.brand} ${car.name}`} className="w-full h-40 object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-full h-40 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[64px]" style={{ color: `${meta.color}4D` }}>electric_car</span>
                        </div>
                      )}
                      <div className="p-4 space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-amber text-black text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full">HOT DEAL</span>
                            <span className="text-white/40 text-xs">{urgencyLabel}</span>
                          </div>
                          <p className="text-white font-headline font-black text-base uppercase leading-tight">{car.brand} {car.name}</p>
                          <p className="text-white/50 text-xs mt-0.5">Al mejor precio de Chile</p>
                        </div>
                        <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
                          <div>
                            <p className="text-white/40 text-[10px] line-through">{formatCLP(car.basePrice)}</p>
                            <p className="text-primary font-headline font-black text-xl leading-none">{formatCLP(car.discountPrice)}</p>
                          </div>
                          <p className="text-white/30 text-[10px] text-right leading-snug">Ahorra {discountPct}%<br />bono Electrificarte</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                            <p className="text-primary text-sm font-headline font-bold">{primaryStats[0]?.value ?? "–"}</p>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>{primaryStats[0]?.label ?? "–"}</p>
                          </div>
                          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                            <p className="text-primary text-sm font-headline font-bold">{meta.tag}</p>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>Tipo</p>
                          </div>
                        </div>
                        <Link href={`/solicitar?auto=${car.slug}`} className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-dark text-black font-bold py-3 rounded-xl text-sm transition-colors">
                          Quiero esta oferta <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* ── DESKTOP ── */}
                  <div className="hidden lg:block max-w-7xl mx-auto px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                      <div>
                        <div className="flex items-center gap-3 mb-5">
                          <span className="bg-amber text-black text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full">HOT DEAL</span>
                          <span className="text-white/50 text-sm">{urgencyLabel}</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-headline font-black text-white mb-4 uppercase leading-tight">
                          {car.brand} {car.name} al mejor precio de Chile
                        </h2>
                        <div
                          className="rounded-xl p-4 mb-5 space-y-2"
                          style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                        >
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>Precio lista</span>
                            <span className="line-through" style={{ color: "rgba(255,255,255,0.40)" }}>{formatCLP(car.basePrice)}</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-white text-sm font-medium">Con descuento Electrificarte</span>
                            <span className="text-primary text-3xl font-headline font-black">{formatCLP(car.discountPrice)}</span>
                          </div>
                          <p className="text-xs pt-2" style={{ color: "rgba(255,255,255,0.30)", borderTop: "1px solid rgba(255,255,255,0.10)" }}>Ahorra {discountPct}% · Incluye bono concesionario + Electrificarte</p>
                        </div>
                        <div className="flex gap-3">
                          <Link href={`/solicitar?auto=${car.slug}`} className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_4px_20px_rgba(0,229,229,0.30)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]">
                            Quiero esta oferta <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          </Link>
                          <Link href={`/auto/${car.slug}`} className="inline-flex items-center justify-center gap-2 text-white font-medium px-6 py-3 rounded-xl transition-all text-sm" style={{ border: "1px solid rgba(255,255,255,0.20)" }}>
                            Ver especificaciones
                          </Link>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                        {car.imageUrl ? (
                          <img src={car.imageUrl} alt={`${car.brand} ${car.name}`} className="w-full aspect-[16/9] object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-full aspect-[16/9] flex items-center justify-center flex-col gap-2">
                            <span className="material-symbols-outlined text-[80px]" style={{ color: `${meta.color}4D` }}>electric_car</span>
                            <p className="text-white/40 text-sm">{car.brand} {car.name}</p>
                          </div>
                        )}
                        <div className="p-4 md:p-5">
                          <div className="grid grid-cols-2 gap-2">
                            {specs.map((s) => (
                              <div key={s.label} className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                                <p className="text-primary text-base font-headline font-bold">{s.value}</p>
                                <p className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>{s.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots */}
          {hotDeals.length > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => hotTrackRef.current?.scrollTo({ left: (hotTrackRef.current?.clientWidth ?? 0) * (hotActiveIdx > 0 ? hotActiveIdx - 1 : hotDeals.length - 1), behavior: "smooth" })}
                aria-label="Anterior"
                className="hidden lg:flex items-center justify-center w-6 h-6 rounded-full border border-white/20 hover:border-primary hover:bg-primary/10 transition-all"
              >
                <span className="material-symbols-outlined text-white/50 text-[14px]">chevron_left</span>
              </button>
              <div className="flex items-center gap-2">
                {hotDeals.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => hotTrackRef.current?.scrollTo({ left: (hotTrackRef.current?.clientWidth ?? 0) * i, behavior: "smooth" })}
                    aria-label={`Ir al hot deal ${i + 1}`}
                    style={{
                      width: i === hotActiveIdx ? 20 : 6,
                      height: 6,
                      borderRadius: 9999,
                      backgroundColor: i === hotActiveIdx ? "#00E5E5" : "rgba(255,255,255,0.2)",
                      transition: "all 0.3s",
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => hotTrackRef.current?.scrollTo({ left: (hotTrackRef.current?.clientWidth ?? 0) * (hotActiveIdx < hotDeals.length - 1 ? hotActiveIdx + 1 : 0), behavior: "smooth" })}
                aria-label="Siguiente"
                className="hidden lg:flex items-center justify-center w-6 h-6 rounded-full border border-white/20 hover:border-primary hover:bg-primary/10 transition-all"
              >
                <span className="material-symbols-outlined text-white/50 text-[14px]">chevron_right</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* ─── All cars ───────────────────────────────────────────────── */}
      <section id={`catalogo-${slug}`} className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">
              Catálogo {meta.tag}
            </p>
            <h2 className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tighter mb-6">
              Todos los {meta.label}
            </h2>

            <PlpFilters
              facetGroups={filters.facetGroups}
              active={filters.active}
              sort={filters.sort}
              onToggle={filters.toggle}
              onSortChange={filters.setSort}
              onClearAll={filters.clearAll}
              activeCount={filters.activeCount}
              total={filters.total}
              count={filters.count}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-[40px] text-gray-200 block mb-3">search_off</span>
              <p className="text-text-muted font-medium">No hay autos con estos filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {visibleRest.map((car, i) => {
                const pct = Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100);
                return (
                  <m.article
                    key={car.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="group relative flex flex-col border border-gray-100 bg-white rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-300"
                  >
                    <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 relative flex flex-col items-center justify-center overflow-hidden">
                      {pct > 0 && <span className="absolute top-3 right-3 bg-black text-white text-[10px] font-black px-2 py-0.5 rounded-full">-{pct}%</span>}
                      <ElectricTypeBadge tag={car.electricTypeTag} className="absolute bottom-3 left-3 z-10 shadow-sm" />
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt={`${car.brand} ${car.name}`} className="object-cover w-full h-full" loading="lazy" decoding="async" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[64px] text-gray-200">electric_car</span>
                          <span className="text-[10px] uppercase tracking-widest text-text-ghost font-bold mt-1">{car.brand}</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 p-3 sm:p-5">
                      <h3 className="font-headline font-bold text-sm sm:text-lg mb-1 group-hover:text-primary-deep transition-colors leading-tight">
                        {car.brand} {car.name}
                      </h3>
                      <p className="hidden sm:block text-xs text-text-ghost mb-2 sm:mb-3 leading-snug line-clamp-2">{car.tagline}</p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 mb-2 sm:mb-4">
                        {(() => {
                          const cs = carStats({ battery: car.battery, range: car.range, maxVersionRange: car.maxVersionRange, electricRangeKm: car.electricRangeKm, fuelConsumption: car.fuelConsumption, rendimientoElectrico: car.rendimientoElectrico, electricTypeTag: car.electricTypeTag, power: car.power });
                          const extra = { label: "Potencia", value: car.power ? `${car.power} CV` : null };
                          const all = [...cs, extra].filter((s, i, arr) => s.value && arr.findIndex(x => x.label === s.label) === i).slice(0, 3);
                          return all.map((s, i) => (
                            <div key={s.label} className={`bg-surface rounded-xl p-1.5 sm:p-2 text-center${i >= 2 ? " hidden sm:block" : ""}`}>
                              <p className="text-[10px] sm:text-[11px] font-bold text-text-main">{s.value}</p>
                              <p className="text-[9px] sm:text-[10px] text-text-ghost">{s.label}</p>
                            </div>
                          ));
                        })()}
                      </div>

                      <div className="mb-2 sm:mb-4">
                        {pct > 0 && <p className="text-[10px] text-text-ghost line-through">{formatCLP(car.basePrice)}</p>}
                        <p className="text-sm sm:text-xl font-headline font-black text-primary-deep">{formatCLP(pct > 0 ? car.discountPrice : car.basePrice)}</p>
                      </div>

                      <div className="flex gap-2 mt-auto">
                        <Link
                          href={`/auto/${car.slug}`}
                          className="flex-1 text-center bg-primary hover:bg-primary-dark text-black font-bold py-2.5 rounded-xl text-sm transition-colors after:absolute after:inset-0"
                        >
                          Ver auto
                        </Link>
                        <Link
                          href={`/comparador?add=${car.slug}`}
                          className="relative z-[1] px-3 border border-gray-200 hover:border-primary/40 text-text-muted hover:text-primary-deep rounded-xl flex items-center transition-colors"
                          title="Comparar"
                        >
                          <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
                        </Link>
                      </div>
                    </div>
                  </m.article>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="inline-flex items-center gap-2 border border-gray-200 hover:border-primary/40 hover:text-primary-deep text-text-muted font-semibold px-8 py-3 rounded-xl transition-all text-sm"
              >
                Ver más autos
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── Pros / Cons + Ideal for ─────────────────────────────────── */}
      <section className="py-14 bg-surface border-t border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-500 text-[16px]">thumb_up</span>
                </div>
                <h3 className="font-headline font-bold">Ventajas</h3>
              </div>
              <ul className="space-y-2.5">
                {meta.pros.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-text-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 mt-1.5" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-400 text-[16px]">thumb_down</span>
                </div>
                <h3 className="font-headline font-bold">A tener en cuenta</h3>
              </div>
              <ul className="space-y-2.5">
                {meta.cons.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-sm text-text-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0 mt-1.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-deep text-[16px]">person</span>
                </div>
                <h3 className="font-headline font-bold">Ideal para</h3>
              </div>
              <p className="text-text-muted text-sm leading-relaxed">{meta.idealFor}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fallback when no cars */}
      {cars.length === 0 && (
        <section className="py-24 text-center">
          <span className="material-symbols-outlined text-[64px] text-gray-200 block mb-4">electric_car</span>
          <p className="text-text-muted font-medium mb-6">
            Estamos cargando el catálogo {meta.tag}. Vuelve pronto.
          </p>
          <Link
            href="/solicitar"
            className="bg-primary hover:bg-primary-dark text-black font-bold px-8 py-3 rounded-xl transition-colors"
          >
            Solicitar oferta de todos modos
          </Link>
        </section>
      )}

      {/* ─── Explore other types ─────────────────────────────────────── */}
      {otherTypes.length > 0 && (
        <section className="py-14 bg-surface border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-6">
              Explorar otros tipos de eléctrico
            </p>
            <div className="flex flex-wrap gap-3">
              {otherTypes
                .filter((t) => t.slug !== slug)
                .map((t) => (
                  <Link
                    key={t.slug}
                    href={`/electrico/${t.slug}`}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 hover:border-primary/40 hover:text-primary-deep rounded-xl text-sm font-semibold transition-all group"
                  >
                    <span className="material-symbols-outlined text-[16px] text-text-ghost group-hover:text-primary-deep transition-colors">
                      {t.icon}
                    </span>
                    {t.label}
                    <span className="text-[9px] font-black text-text-ghost bg-surface px-1.5 py-0.5 rounded">{t.tag}</span>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Bottom CTA ──────────────────────────────────────────────── */}
      <section className="py-14 bg-surface border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-black rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-primary text-xs uppercase tracking-widest font-bold mb-2">¿Ya decidiste?</p>
              <h2 className="text-white font-headline font-black text-2xl md:text-3xl tracking-tight">
                Consigue el mejor precio en tu {meta.label}
              </h2>
              <p className="text-white/50 text-sm mt-1">
                Negociamos por ti con nuestra red exclusiva de concesionarios en Chile.
              </p>
            </div>
            <Link
              href="/solicitar"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-black px-8 py-4 rounded-xl transition-all text-sm whitespace-nowrap shadow-[0_4px_20px_rgba(0,229,229,0.30)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]"
            >
              Solicitar oferta ahora
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
