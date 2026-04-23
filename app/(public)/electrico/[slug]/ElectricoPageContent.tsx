"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatCLP } from "@/lib/utils";
import { CatalogFilters, type ActiveFilters } from "@/components/ui/CatalogFilters";

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
  basePrice: number;
  discountPrice: number;
  range: number;
  power: number;
  battery: number;
  isHotDeal: boolean;
  tagline: string;
  imageUrl?: string;
}

export interface OtherElectricType {
  slug: string;
  label: string;
  icon: string;
  tag: string;
}

interface ElectricoPageContentProps {
  slug: string;
  meta: ElectricoMeta;
  cars: ElectricoCarData[];
  otherTypes: OtherElectricType[];
}

// ─── Component ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 9;

export default function ElectricoPageContent({ slug, meta, cars, otherTypes }: ElectricoPageContentProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ brand: "", tipo: "" });
  const [sort, setSort] = useState("default");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  const brandOptions = useMemo(() => {
    const vals = [...new Set(cars.map((c) => c.brandSlug))];
    return vals.map((v) => ({
      value: v,
      label: cars.find((c) => c.brandSlug === v)?.brand ?? v,
      count: cars.filter((c) => c.brandSlug === v).length,
    }));
  }, [cars]);

  const tipoOptions = useMemo(() => {
    const vals = [...new Set(cars.map((c) => c.tipoSlug))];
    return vals.map((v) => ({
      value: v,
      label: cars.find((c) => c.tipoSlug === v)?.tipoLabel ?? v,
      count: cars.filter((c) => c.tipoSlug === v).length,
    }));
  }, [cars]);

  const filteredCars = useMemo(() => {
    setVisibleCount(PAGE_SIZE);
    let list = [...cars];
    if (activeFilters.brand) list = list.filter((c) => c.brandSlug === activeFilters.brand);
    if (activeFilters.tipo)  list = list.filter((c) => c.tipoSlug === activeFilters.tipo);
    if (sort === "price-asc")  list.sort((a, b) => a.discountPrice - b.discountPrice);
    if (sort === "price-desc") list.sort((a, b) => b.discountPrice - a.discountPrice);
    if (sort === "range-desc") list.sort((a, b) => b.range - a.range);
    return list;
  }, [cars, activeFilters, sort]);

  const hotDeals = filteredCars.filter((c) => c.isHotDeal);
  const rest     = filteredCars.filter((c) => !c.isHotDeal);
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
                  <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                    <span className="material-symbols-outlined text-[14px]" style={{ color: meta.color }}>sell</span>
                    <span className="text-white/60 text-xs font-semibold">Desde {formatCLP(Math.min(...cars.map((c) => c.discountPrice)))}</span>
                  </div>
                )}
                {hotDeals.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 bg-amber/10 border border-amber/30 px-3 py-1.5 rounded-full">
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
                  Respuesta en 24 h
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/solicitar"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_4px_20px_rgba(0,229,229,0.30)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]"
                >
                  Solicitar oferta
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
                <a
                  href={`#catalogo-${slug}`}
                  className="inline-flex items-center gap-2 border border-white/20 hover:border-white/50 hover:bg-white/5 text-white font-medium px-6 py-3 rounded-xl transition-all text-sm"
                >
                  Ver catálogo
                </a>
              </div>
            </div>

            {/* Right – hero image */}
            <div className="relative hidden md:block">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-[64px] text-white/10 block mb-3">image</span>
                  <p className="text-white/20 text-xs uppercase tracking-widest font-semibold">Foto {meta.label}</p>
                </div>
              </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {meta.howItWorks.map((h, i) => (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                className="flex flex-col items-start gap-3 bg-white border border-gray-100 rounded-2xl p-5"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${meta.color}18` }}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ color: meta.color }}>
                    {h.icon}
                  </span>
                </div>
                <div>
                  <p className="font-headline font-bold text-sm leading-snug mb-1 text-text-main">{h.title}</p>
                  <p className="text-text-ghost text-[12px] leading-snug">{h.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
                    {b.label} — {meta.label}
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
                    i === activeSlide ? "w-4" : "bg-gray-300",
                  ].join(" ")}
                  style={i === activeSlide ? { backgroundColor: meta.color } : {}}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

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

            <CatalogFilters
              groups={[
                ...(brandOptions.length > 1 ? [{ id: "brand", label: "Marca", options: brandOptions }] : []),
                ...(tipoOptions.length > 1  ? [{ id: "tipo",  label: "Tipo de vehículo", options: tipoOptions }] : []),
              ]}
              active={activeFilters}
              onChange={(id, val) => setActiveFilters((p) => ({ ...p, [id]: val }))}
              sort={sort}
              onSortChange={setSort}
              total={cars.length}
              count={filteredCars.length}
            />
          </div>

          {filteredCars.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-[40px] text-gray-200 block mb-3">search_off</span>
              <p className="text-text-muted font-medium">No hay autos con estos filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleRest.map((car, i) => {
                const pct = Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100);
                return (
                  <motion.article
                    key={car.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="group relative flex flex-col border border-gray-100 bg-white rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-300"
                  >
                    <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 relative flex flex-col items-center justify-center overflow-hidden">
                      {pct > 0 && <span className="absolute top-3 right-3 bg-black text-white text-[10px] font-black px-2 py-0.5 rounded-full">-{pct}%</span>}
                      <span
                        className="absolute top-3 left-3 text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: meta.color === "#00E5E5" ? "#006A61" : meta.color }}
                      >
                        {meta.tag}
                      </span>
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt={`${car.brand} ${car.name}`} className="object-cover w-full h-full" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[64px] text-gray-200">electric_car</span>
                          <span className="text-[10px] uppercase tracking-widest text-text-ghost font-bold mt-1">{car.brand}</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 p-5">
                      <h3 className="font-headline font-bold text-lg mb-1 group-hover:text-primary-deep transition-colors">
                        {car.brand} {car.name}
                      </h3>
                      <p className="text-xs text-text-ghost mb-4 leading-snug line-clamp-2">{car.tagline}</p>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                          { label: car.range > 0 ? "Autonomía" : "Tracción", value: car.range > 0 ? `${car.range} km` : "híbrido" },
                          { label: "Potencia", value: `${car.power} CV` },
                          { label: "Batería",  value: car.battery >= 1 ? `${car.battery} kWh` : "48V" },
                        ].map((s) => (
                          <div key={s.label} className="bg-surface rounded-xl p-2 text-center">
                            <p className="text-[11px] font-bold text-text-main">{s.value}</p>
                            <p className="text-[10px] text-text-ghost">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-baseline mb-4">
                        <span className="text-xs text-text-ghost line-through">{formatCLP(car.basePrice)}</span>
                        <span className="text-xl font-headline font-black text-primary-deep">{formatCLP(car.discountPrice)}</span>
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
                          <span className="material-symbols-outlined text-[18px]">compare</span>
                        </Link>
                      </div>
                    </div>
                  </motion.article>
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

      {/* ─── Hot Deals ──────────────────────────────────────────────── */}
      {hotDeals.length > 0 && (
        <section className="py-14 md:py-16 bg-black">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-center gap-3 mb-8">
              <span className="bg-amber text-black text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full">
                HOT DEAL
              </span>
              <p className="text-white/50 text-sm">Ofertas exclusivas en {meta.label}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hotDeals.map((car, i) => {
                const pct = Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100);
                return (
                  <motion.article
                    key={car.slug}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="aspect-[16/7] bg-gradient-to-br from-white/5 to-transparent relative flex items-center justify-center overflow-hidden">
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt={`${car.brand} ${car.name}`} className="object-cover w-full h-full" />
                      ) : (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-40 h-40 rounded-full blur-3xl opacity-20" style={{ backgroundColor: meta.color }} />
                          </div>
                          <span className="material-symbols-outlined text-[80px] text-white/10 relative z-10">electric_car</span>
                        </>
                      )}
                      {pct > 0 && <span className="absolute top-3 left-3 bg-amber text-black text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full z-10">-{pct}% ahorro</span>}
                    </div>

                    <div className="p-6">
                      <p className="text-white/40 text-[11px] uppercase tracking-widest font-semibold mb-1">{car.brand}</p>
                      <h3 className="font-headline font-black text-white text-2xl mb-1">{car.name}</h3>
                      <p className="text-white/50 text-sm mb-5">{car.tagline}</p>

                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                          { label: car.range > 0 ? "Autonomía" : "Sistema", value: car.range > 0 ? `${car.range} km` : "Híbrido" },
                          { label: "Potencia", value: `${car.power} CV` },
                          { label: "Batería",  value: car.battery >= 1 ? `${car.battery} kWh` : "48V" },
                        ].map((s) => (
                          <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-primary font-headline font-bold text-base">{s.value}</p>
                            <p className="text-white/30 text-[10px] mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-baseline justify-between mb-4">
                        <span className="text-white/30 text-sm line-through">{formatCLP(car.basePrice)}</span>
                        <span className="text-primary text-3xl font-headline font-black">{formatCLP(car.discountPrice)}</span>
                      </div>

                      <div className="flex gap-3">
                        <Link
                          href={`/solicitar?auto=${car.slug}`}
                          className="flex-1 text-center bg-primary hover:bg-primary-dark text-black font-bold py-3 rounded-xl transition-colors text-sm"
                        >
                          Quiero esta oferta
                        </Link>
                        <Link
                          href={`/marcas/${car.brandSlug}`}
                          className="px-4 border border-white/20 hover:border-white/40 text-white font-medium rounded-xl transition-colors text-sm flex items-center"
                        >
                          Ver marca
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>
      )}

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
