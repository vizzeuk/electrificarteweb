"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatCLP } from "@/lib/utils";
import { CatalogFilters, type ActiveFilters } from "@/components/ui/CatalogFilters";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface BrandCarData {
  name: string;
  slug: string;
  basePrice: number;
  discountPrice: number;
  range: number;
  power: string;
  traction: string;
  category: string;
  tipoSlug: string;
  electricType: string;
  isHotDeal: boolean;
  isTopSeller?: boolean;
  imageUrl?: string;
  specs: { battery: string; charge0to80: string; topSpeed: string };
}

interface VideoData {
  id: string;
  title: string;
  duration: string;
  views: string;
  channel: string;
  thumbnail: null;
  videoUrl?: string | null;
}

interface HotDealData {
  carName: string;
  carSlug: string;
  basePrice: number;
  discountPrice: number;
  bonus: number;
  range: number;
  power: string;
  traction: string;
  acceleration: string;
  imageUrl?: string;
}

export interface BrandData {
  name: string;
  country: string;
  foundedYear: string;
  description: string;
  heroTagline?: string;
  logoLetter: string;
  logoColor: string;
  logoUrl?: string;
  accentColor: string;
  stats: { label: string; value: string }[];
  heroFeaturedCar?: { name: string; slug: string; basePrice: number; discountPrice: number; imageUrl?: string } | null;
  cars: BrandCarData[];
  hotDeals: HotDealData[];
  videos: VideoData[];
}

// ─── Label maps ───────────────────────────────────────────────────────────────
const TIPO_LABELS: Record<string, string> = {
  suv: "SUV", sedan: "Sedán", "city-car": "City Car", pickup: "Pickup", hatchback: "Hatchback",
};
const ELECTRIC_LABELS: Record<string, string> = {
  ev: "Eléctrico Puro", phev: "Híbrido Enchufable", hev: "Híbrido Clásico", erev: "Autonomía Extendida", mhev: "Microhíbrido",
};

// ─── Component ────────────────────────────────────────────────────────────────
interface BrandPageContentProps {
  slug: string;
  brand: BrandData;
}

const PAGE_SIZE = 9;

export default function BrandPageContent({ slug, brand }: BrandPageContentProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ tipo: "", electric: "" });
  const [sort, setSort] = useState("default");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const tipoOptions = useMemo(() => {
    const vals = [...new Set(brand.cars.map((c) => c.tipoSlug))].filter(Boolean);
    return vals.map((v) => ({ value: v, label: TIPO_LABELS[v] ?? v, count: brand.cars.filter((c) => c.tipoSlug === v).length }));
  }, [brand.cars]);

  const electricOptions = useMemo(() => {
    const vals = [...new Set(brand.cars.map((c) => c.electricType))].filter(Boolean);
    return vals.map((v) => ({ value: v, label: ELECTRIC_LABELS[v] ?? v, count: brand.cars.filter((c) => c.electricType === v).length }));
  }, [brand.cars]);

  const filteredCars = useMemo(() => {
    setVisibleCount(PAGE_SIZE);
    let cars = [...brand.cars];
    if (activeFilters.tipo)     cars = cars.filter((c) => c.tipoSlug === activeFilters.tipo);
    if (activeFilters.electric) cars = cars.filter((c) => c.electricType === activeFilters.electric);
    if (sort === "price-asc")   cars.sort((a, b) => a.discountPrice - b.discountPrice);
    if (sort === "price-desc")  cars.sort((a, b) => b.discountPrice - a.discountPrice);
    if (sort === "range-desc")  cars.sort((a, b) => b.range - a.range);
    return cars;
  }, [brand.cars, activeFilters, sort]);

  const visibleCars = filteredCars.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCars.length;

  // Hot deal carousel
  const hotDeals = brand.hotDeals;
  const hotTrackRef = useRef<HTMLDivElement>(null);
  const [hotCanLeft,  setHotCanLeft]  = useState(false);
  const [hotCanRight, setHotCanRight] = useState(false);
  useEffect(() => {
    const el = hotTrackRef.current;
    if (!el) return;
    function upd() {
      setHotCanLeft(el!.scrollLeft > 8);
      setHotCanRight(el!.scrollLeft < el!.scrollWidth - el!.clientWidth - 8);
    }
    upd();
    el.addEventListener("scroll", upd, { passive: true });
    return () => el.removeEventListener("scroll", upd);
  }, [hotDeals]);

  // Featured car for hero — Sanity override > hot deal > top seller > first with image
  const featuredCarForHero = useMemo(() => {
    if (brand.heroFeaturedCar) {
      const fc = brand.heroFeaturedCar;
      return { name: fc.name, slug: fc.slug, imageUrl: fc.imageUrl, discountPrice: fc.discountPrice, basePrice: fc.basePrice, isHotDeal: false, isSponsored: true };
    }
    if (brand.hotDeals.length > 0) {
      const hd = brand.hotDeals[0];
      return { name: hd.carName, slug: hd.carSlug, imageUrl: hd.imageUrl, discountPrice: hd.discountPrice, basePrice: hd.basePrice, isHotDeal: true, isSponsored: false };
    }
    const topSeller = brand.cars.find((c) => c.isTopSeller && c.imageUrl);
    const withImg   = topSeller ?? brand.cars.find((c) => c.imageUrl);
    if (withImg) return { name: withImg.name, slug: withImg.slug, imageUrl: withImg.imageUrl, discountPrice: withImg.discountPrice, basePrice: withImg.basePrice, isHotDeal: false, isSponsored: false };
    return null;
  }, [brand.heroFeaturedCar, brand.hotDeals, brand.cars]);

  const banners = [
    { id: 1, label: "Banner 1", bg: "from-primary/10 to-primary-deep/5" },
    { id: 2, label: "Banner 2", bg: "from-gray-100 to-gray-50" },
    { id: 3, label: "Banner 3", bg: "from-primary-deep/10 to-primary/5" },
  ];
  const [activeSlide, setActiveSlide] = useState(0);
  const nextSlide = useCallback(() => setActiveSlide((p) => (p + 1) % banners.length), [banners.length]);
  useEffect(() => {
    const t = setInterval(nextSlide, 5000);
    return () => clearInterval(t);
  }, [nextSlide]);


  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-black pt-24 pb-20 md:pt-28 md:pb-28 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ backgroundColor: brand.logoColor }} />
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-10">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/marcas" className="hover:text-white/60 transition-colors">Marcas</Link>
            <span>/</span>
            <span className="text-white/60">{brand.name}</span>
          </nav>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-4 mb-6">
                {brand.logoUrl ? (
                  <img
                    src={brand.logoUrl}
                    alt={`${brand.name} logo`}
                    className="h-16 w-auto max-w-[180px] object-contain flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-headline font-black shadow-lg flex-shrink-0" style={{ backgroundColor: brand.logoColor }}>
                    {brand.logoLetter}
                  </div>
                )}
                <p className="text-white/40 text-xs uppercase tracking-widest">{brand.country}{brand.foundedYear ? ` · Est. ${brand.foundedYear}` : ""}</p>
              </div>
              <h1 className="text-5xl md:text-7xl font-headline font-black text-white tracking-tighter leading-[0.9] mb-4">{brand.name}<span className="text-primary">.</span></h1>
              {brand.heroTagline && <p className="text-white/40 text-sm uppercase tracking-widest mb-3">{brand.heroTagline}</p>}
              <p className="text-white/60 text-base leading-relaxed max-w-md mb-8">{brand.description}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/solicitar" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_4px_20px_rgba(0,229,229,0.30)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]">
                  Cotizar un {brand.name} <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
                <a href={`#autos-${slug}`} className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm">
                  Ver modelos
                </a>
              </div>
            </motion.div>
            {featuredCarForHero && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>

                {/* Label publicidad — encima de la card */}
                {featuredCarForHero.isSponsored && (
                  <p className="text-[11px] uppercase tracking-widest text-primary/70 font-semibold mb-3 text-right">
                    · Publicidad
                  </p>
                )}

                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-primary/40 transition-all duration-300 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">

                  {/* Imagen clicable */}
                  <Link href={`/auto/${featuredCarForHero.slug}`} className="block group overflow-hidden">
                    {featuredCarForHero.imageUrl ? (
                      <img
                        src={featuredCarForHero.imageUrl}
                        alt={`${brand.name} ${featuredCarForHero.name}`}
                        className="w-full aspect-[16/10] object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full aspect-[16/10] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[80px] text-white/10">electric_car</span>
                      </div>
                    )}
                  </Link>

                  {/* Footer */}
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div>
                      {featuredCarForHero.isHotDeal && (
                        <span className="inline-block bg-amber text-black text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full mb-1.5">HOT DEAL</span>
                      )}
                      <p className="text-white font-headline font-bold text-base leading-tight">{brand.name} {featuredCarForHero.name}</p>
                      <p className="text-white/40 text-xs line-through mt-0.5">{formatCLP(featuredCarForHero.basePrice)}</p>
                      <p className="text-primary font-headline font-black text-xl">{formatCLP(featuredCarForHero.discountPrice)}</p>
                    </div>
                    <Link
                      href={`/auto/${featuredCarForHero.slug}`}
                      className="shrink-0 inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.99]"
                    >
                      Ver modelo
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </Link>
                  </div>

                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Stats strip ────────────────────────────────────────────── */}
      {brand.stats.length > 0 && (
        <section className="bg-black border-t border-white/[0.07]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {brand.stats.map((stat) => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                  <p className="text-2xl md:text-3xl font-headline font-black mb-1 text-primary">{stat.value}</p>
                  <p className="text-white/40 text-[11px] uppercase tracking-wide leading-snug">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Banner slideshow ───────────────────────────────────────── */}
      <section className="py-8 bg-surface border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="relative overflow-hidden rounded-2xl h-40 md:h-56 cursor-pointer" onClick={nextSlide}>
            {banners.map((b, i) => (
              <div
                key={b.id}
                className={[
                  "absolute inset-0 bg-gradient-to-r flex items-center justify-center transition-opacity duration-700",
                  b.bg,
                  i === activeSlide ? "opacity-100" : "opacity-0 pointer-events-none",
                ].join(" ")}
              >
                <div className="border-2 border-dashed border-gray-200 rounded-xl w-full h-full mx-4 flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[36px] text-gray-300">image</span>
                  <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">
                    {b.label} — {brand.name}
                  </p>
                </div>
              </div>
            ))}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActiveSlide(i); }}
                  className={[
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    i === activeSlide ? "w-4 bg-primary" : "bg-gray-300",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOT DEAL ─────────────────────────────────────────────── */}
      {hotDeals.length > 0 && (
        <section className="bg-black py-10 md:py-14 overflow-hidden">
          {/* Nav arrows — solo si hay más de 1 */}
          {hotDeals.length > 1 && (
            <div className="max-w-7xl mx-auto px-4 md:px-8 mb-6 flex justify-end gap-2">
              <button onClick={() => hotTrackRef.current?.scrollBy({ left: -hotTrackRef.current.offsetWidth, behavior: "smooth" })} disabled={!hotCanLeft}
                className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:border-primary hover:text-primary disabled:opacity-25 transition-all">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button onClick={() => hotTrackRef.current?.scrollBy({ left: hotTrackRef.current.offsetWidth, behavior: "smooth" })} disabled={!hotCanRight}
                className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:border-primary hover:text-primary disabled:opacity-25 transition-all">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}

          <div
            ref={hotTrackRef}
            className="flex overflow-x-auto"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {hotDeals.map((deal) => {
              const discountPct = Math.round(((deal.basePrice - deal.discountPrice) / deal.basePrice) * 100);
              return (
                <div
                  key={deal.carSlug}
                  style={{ minWidth: "100%" }}
                  className="flex-shrink-0 scroll-snap-align-start"
                >
                  <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                      <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                        <div className="flex items-center gap-3 mb-6">
                          <span className="bg-amber text-black text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full">HOT DEAL</span>
                          <span className="text-white/50 text-sm">Oferta limitada</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-headline font-black text-white mb-4 uppercase leading-tight">
                          {brand.name} {deal.carName} con bonos de hasta{" "}
                          <span className="text-primary">{formatCLP(deal.bonus > 0 ? deal.bonus : deal.basePrice - deal.discountPrice)}</span>
                        </h2>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 space-y-2">
                          <div className="flex justify-between items-baseline">
                            <span className="text-white/40 text-sm">Precio lista</span>
                            <span className="text-white/40 line-through">{formatCLP(deal.basePrice)}</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-white text-sm font-medium">Con bono Electrificarte</span>
                            <span className="text-primary text-3xl font-headline font-black">{formatCLP(deal.discountPrice)}</span>
                          </div>
                          <p className="text-white/30 text-xs pt-2 border-t border-white/10">Ahorra {discountPct}% · Incluye bono concesionario + Electrificarte</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Link href={`/solicitar?auto=${deal.carSlug}`} className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,229,229,0.30)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]">
                            Quiero esta oferta <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          </Link>
                          <Link href={`/auto/${deal.carSlug}`} className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-6 py-3 rounded-xl transition-all">
                            Ver especificaciones
                          </Link>
                        </div>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }} className="relative">
                        <div className="absolute -top-6 -right-6 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                          {deal.imageUrl ? (
                            <img src={deal.imageUrl} alt={`${brand.name} ${deal.carName}`} className="w-full aspect-[16/10] object-cover" />
                          ) : (
                            <div className="p-8 md:p-10">
                              <div className="text-center mb-6">
                                <span className="material-symbols-outlined text-[80px] text-primary/30">electric_car</span>
                                <p className="text-white/40 text-sm mt-1">{brand.name} {deal.carName}</p>
                              </div>
                            </div>
                          )}
                          <div className="p-4 md:p-5">
                            <div className="grid grid-cols-2 gap-2">
                              {[{label:"Autonomía",value:`${deal.range} km`},{label:"Potencia",value:deal.power},{label:"Tracción",value:deal.traction},{label:"0-100 km/h",value:deal.acceleration}].map((s) => (
                                <div key={s.label} className="bg-white/5 rounded-xl p-3">
                                  <p className="text-primary text-base font-headline font-bold">{s.value}</p>
                                  <p className="text-white/40 text-xs">{s.label}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── AUTOS ────────────────────────────────────────────────── */}
      <section id={`autos-${slug}`} className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Catálogo eléctrico</p>
            <h2 className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tighter mb-6">Autos {brand.name} disponibles</h2>
            <CatalogFilters
              groups={[
                ...(tipoOptions.length > 1 ? [{ id: "tipo", label: "Tipo de vehículo", options: tipoOptions }] : []),
                ...(electricOptions.length > 1 ? [{ id: "electric", label: "Tecnología", options: electricOptions }] : []),
              ]}
              active={activeFilters}
              onChange={(id, val) => setActiveFilters((p) => ({ ...p, [id]: val }))}
              sort={sort} onSortChange={setSort}
              total={brand.cars.length} count={filteredCars.length}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCars.length === 0 ? (
              <div className="col-span-3 py-16 text-center">
                <span className="material-symbols-outlined text-[40px] text-gray-200 block mb-3">search_off</span>
                <p className="text-text-muted font-medium">No hay autos con estos filtros.</p>
              </div>
            ) : visibleCars.map((car, i) => {
              const pct = Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100);
              return (
                <motion.article key={car.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="group relative flex flex-col border border-gray-100 bg-white rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300">
                  <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 relative flex flex-col items-center justify-center overflow-hidden">
                    {car.isHotDeal && <span className="absolute top-3 left-3 bg-amber text-black text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full z-10">HOT DEAL</span>}
                    {pct > 0 && <span className="absolute top-3 right-3 text-[10px] font-black text-white px-2 py-1 rounded-full z-10" style={{ backgroundColor: brand.accentColor }}>-{pct}%</span>}
                    {car.imageUrl ? (
                      <img src={car.imageUrl} alt={`${brand.name} ${car.name}`} className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[72px] text-gray-200">electric_car</span>
                        <span className="text-[10px] uppercase tracking-widest text-text-ghost font-bold mt-1">{car.category}</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="font-headline font-bold text-lg mb-1 group-hover:text-primary-deep transition-colors">{brand.name} {car.name}</h3>
                    <p className="text-xs text-text-ghost mb-4 leading-snug line-clamp-2">{car.range} km · {car.power} · {car.traction}</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-surface rounded-lg p-2 text-center"><p className="text-[11px] font-bold">{car.specs.battery}</p><p className="text-[10px] text-text-ghost">Batería</p></div>
                      <div className="bg-surface rounded-lg p-2 text-center"><p className="text-[11px] font-bold">{car.specs.charge0to80}</p><p className="text-[10px] text-text-ghost">0→80%</p></div>
                      <div className="bg-surface rounded-lg p-2 text-center"><p className="text-[11px] font-bold">{car.specs.topSpeed}</p><p className="text-[10px] text-text-ghost">V. máx</p></div>
                    </div>
                    <div className="flex justify-between items-baseline mb-4">
                      <span className="text-xs text-text-ghost line-through">{formatCLP(car.basePrice)}</span>
                      <span className="text-xl font-headline font-black text-primary-deep">{formatCLP(car.discountPrice)}</span>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <Link href={`/auto/${car.slug}`} className="flex-1 text-center bg-primary hover:bg-primary-dark text-black font-bold py-2.5 rounded-xl text-sm transition-colors after:absolute after:inset-0">
                        Ver auto
                      </Link>
                      <Link href={`/comparador?add=${car.slug}`} title="Comparar"
                        className="relative z-[1] px-3 border border-gray-200 hover:border-primary/40 text-text-muted hover:text-primary-deep rounded-xl flex items-center transition-colors">
                        <span className="material-symbols-outlined text-[18px]">compare</span>
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>

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

      {/* ─── VIDEOS ───────────────────────────────────────────────── */}
      {brand.videos.length > 0 && (
        <section className="py-20 md:py-24 bg-surface">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="mb-12">
              <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Multimedia</p>
              <h2 className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tighter">Videos y contenido</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {brand.videos.map((video, i) => (
                <motion.div key={video.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all duration-300 cursor-pointer">
                  <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
                    <div className="absolute inset-0 flex items-center justify-center"><div className="w-32 h-32 rounded-full blur-3xl opacity-30" style={{ backgroundColor: brand.logoColor }} /></div>
                    <span className="material-symbols-outlined text-[48px] text-white/20 relative z-10">electric_car</span>
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="w-14 h-14 bg-white/10 group-hover:bg-primary/90 backdrop-blur-sm border border-white/20 group-hover:border-primary rounded-full flex items-center justify-center transition-all duration-300 shadow-lg group-hover:scale-110">
                        <span className="material-symbols-outlined text-white group-hover:text-black text-[22px] ml-0.5 transition-colors">play_arrow</span>
                      </div>
                    </div>
                    {video.duration && <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-bold px-2 py-0.5 rounded">{video.duration}</span>}
                  </div>
                  <div className="p-4">
                    {(video.channel || video.views) && <p className="text-[10px] text-text-ghost uppercase tracking-wide font-semibold mb-1">{video.channel}{video.views ? ` · ${video.views} vistas` : ""}</p>}
                    <h3 className="font-headline font-bold text-sm leading-snug group-hover:text-primary-deep transition-colors line-clamp-2">{video.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-14 bg-black rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-primary text-xs uppercase tracking-widest font-bold mb-2">¿Te convenció?</p>
                <h3 className="text-white font-headline font-black text-2xl md:text-3xl tracking-tight">Consigue el mejor precio en tu {brand.name}</h3>
                <p className="text-white/50 text-sm mt-1">Negociamos por ti con nuestra red exclusiva de concesionarios en Chile.</p>
              </div>
              <Link href="/solicitar" className="flex-shrink-0 inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-black px-8 py-4 rounded-xl transition-all text-sm whitespace-nowrap shadow-[0_4px_20px_rgba(0,229,229,0.30)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]">
                Solicitar oferta ahora <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
