"use client";

import React, { useState, useMemo } from "react";
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
}

export interface BrandData {
  name: string;
  country: string;
  foundedYear: string;
  description: string;
  heroTagline?: string;
  logoLetter: string;
  logoColor: string;
  accentColor: string;
  stats: { label: string; value: string }[];
  cars: BrandCarData[];
  hotDeal: HotDealData | null;
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

export default function BrandPageContent({ slug, brand }: BrandPageContentProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ tipo: "", electric: "" });
  const [sort, setSort] = useState("default");

  const tipoOptions = useMemo(() => {
    const vals = [...new Set(brand.cars.map((c) => c.tipoSlug))].filter(Boolean);
    return vals.map((v) => ({ value: v, label: TIPO_LABELS[v] ?? v, count: brand.cars.filter((c) => c.tipoSlug === v).length }));
  }, [brand.cars]);

  const electricOptions = useMemo(() => {
    const vals = [...new Set(brand.cars.map((c) => c.electricType))].filter(Boolean);
    return vals.map((v) => ({ value: v, label: ELECTRIC_LABELS[v] ?? v, count: brand.cars.filter((c) => c.electricType === v).length }));
  }, [brand.cars]);

  const filteredCars = useMemo(() => {
    let cars = [...brand.cars];
    if (activeFilters.tipo)     cars = cars.filter((c) => c.tipoSlug === activeFilters.tipo);
    if (activeFilters.electric) cars = cars.filter((c) => c.electricType === activeFilters.electric);
    if (sort === "price-asc")   cars.sort((a, b) => a.discountPrice - b.discountPrice);
    if (sort === "price-desc")  cars.sort((a, b) => b.discountPrice - a.discountPrice);
    if (sort === "range-desc")  cars.sort((a, b) => b.range - a.range);
    return cars;
  }, [brand.cars, activeFilters, sort]);

  const hotDeal = brand.hotDeal;
  const discountPct = hotDeal ? Math.round(((hotDeal.basePrice - hotDeal.discountPrice) / hotDeal.basePrice) * 100) : 0;

  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-black pt-16 pb-20 md:pt-20 md:pb-28 overflow-hidden relative">
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
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-headline font-black shadow-lg" style={{ backgroundColor: brand.logoColor }}>
                  {brand.logoLetter}
                </div>
                <p className="text-white/40 text-xs uppercase tracking-widest">{brand.country}{brand.foundedYear ? ` · Est. ${brand.foundedYear}` : ""}</p>
              </div>
              <h1 className="text-5xl md:text-7xl font-headline font-black text-white tracking-tighter leading-[0.9] mb-4">{brand.name}<span className="text-primary">.</span></h1>
              {brand.heroTagline && <p className="text-white/40 text-sm uppercase tracking-widest mb-3">{brand.heroTagline}</p>}
              <p className="text-white/60 text-base leading-relaxed max-w-md mb-8">{brand.description}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/solicitar" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                  Cotizar un {brand.name} <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
                <a href={`#autos-${slug}`} className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm">
                  Ver modelos
                </a>
              </div>
            </motion.div>
            {brand.stats.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="grid grid-cols-3 gap-4">
                {brand.stats.map((stat) => (
                  <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                    <p className="text-2xl md:text-3xl font-headline font-black mb-1 text-primary">{stat.value}</p>
                    <p className="text-white/40 text-[11px] uppercase tracking-wide leading-snug">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

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
            ) : filteredCars.map((car, i) => {
              const pct = Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100);
              return (
                <motion.article key={car.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="group flex flex-col border border-gray-100 bg-white rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300">
                  <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 relative flex flex-col items-center justify-center overflow-hidden">
                    {car.isHotDeal && <span className="absolute top-3 left-3 bg-amber text-black text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full z-10">HOT DEAL</span>}
                    <span className="absolute top-3 right-3 text-[10px] font-black text-white px-2 py-1 rounded-full z-10" style={{ backgroundColor: brand.accentColor }}>-{pct}%</span>
                    {car.imageUrl ? (
                      <img src={car.imageUrl} alt={`${brand.name} ${car.name}`} className="w-full h-full object-contain" />
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
                      <Link href={`/auto/${car.slug}`} className="flex-1 text-center bg-primary hover:bg-primary-dark text-black font-bold py-2.5 rounded-xl text-sm transition-colors">
                        Ver auto
                      </Link>
                      <Link href={`/comparador?add=${car.slug}`} title="Comparar"
                        className="px-3 border border-gray-200 hover:border-primary/40 text-text-muted hover:text-primary-deep rounded-xl flex items-center transition-colors">
                        <span className="material-symbols-outlined text-[18px]">compare</span>
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── HOT DEAL ─────────────────────────────────────────────── */}
      {hotDeal && (
        <section className="bg-black py-16 md:py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-amber text-black text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full">HOT DEAL</span>
                  <span className="text-white/50 text-sm">Oferta limitada</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-headline font-black text-white mb-6 uppercase leading-tight">
                  {brand.name} {hotDeal.carName} con bonos de hasta{" "}
                  <span className="text-primary">{formatCLP(hotDeal.bonus > 0 ? hotDeal.bonus : hotDeal.basePrice - hotDeal.discountPrice)}</span>
                </h2>
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-white/40 text-sm">Precio lista</span>
                    <span className="text-white/40 line-through">{formatCLP(hotDeal.basePrice)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-white text-sm font-medium">Con bono Electrificarte</span>
                    <span className="text-primary text-3xl font-headline font-black">{formatCLP(hotDeal.discountPrice)}</span>
                  </div>
                  <p className="text-white/30 text-xs pt-2 border-t border-white/10">Ahorra {discountPct}% · Incluye bono concesionario + Electrificarte</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href={`/solicitar?auto=${hotDeal.carSlug}`} className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-all">
                    Quiero esta oferta <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                  <Link href={`/auto/${hotDeal.carSlug}`} className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-8 py-4 rounded-xl transition-all">
                    Ver especificaciones
                  </Link>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }} className="relative">
                <div className="absolute -top-6 -right-6 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-8 md:p-10">
                  <div className="text-center mb-6">
                    <span className="material-symbols-outlined text-[80px] text-primary/30">electric_car</span>
                    <p className="text-white/40 text-sm mt-1">{brand.name} {hotDeal.carName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[{label:"Autonomía",value:`${hotDeal.range} km`},{label:"Potencia",value:hotDeal.power},{label:"Tracción",value:hotDeal.traction},{label:"0-100 km/h",value:hotDeal.acceleration}].map((s) => (
                      <div key={s.label} className="bg-white/5 rounded-xl p-4">
                        <p className="text-primary text-lg font-headline font-bold">{s.value}</p>
                        <p className="text-white/40 text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

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
                <p className="text-white/50 text-sm mt-1">Negociamos por ti. Ahorro promedio de 27% sobre precio lista.</p>
              </div>
              <Link href="/solicitar" className="flex-shrink-0 inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-black px-8 py-4 rounded-xl transition-colors text-sm whitespace-nowrap">
                Solicitar oferta ahora <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
