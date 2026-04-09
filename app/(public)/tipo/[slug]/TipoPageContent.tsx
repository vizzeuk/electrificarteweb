"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatCLP } from "@/lib/utils";
import { CatalogFilters, type ActiveFilters } from "@/components/ui/CatalogFilters";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TipoCarData {
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  electricTypeSlug: string;
  electricTypeLabel: string;
  basePrice: number;
  discountPrice: number;
  range: number;
  power: number;
  battery: number;
  traction: string;
  acceleration: number;
  isHotDeal: boolean;
  tagline: string;
  imageUrl?: string;
}

export interface TipoMeta {
  label: string;
  icon: string;
  heroDesc: string;
}

export interface OtherType {
  slug: string;
  label: string;
  icon: string;
}

interface TipoPageContentProps {
  slug: string;
  meta: TipoMeta;
  cars: TipoCarData[];
  otherTypes: OtherType[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TipoPageContent({ slug, meta, cars, otherTypes }: TipoPageContentProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ brand: "", electric: "" });
  const [sort, setSort] = useState("default");

  const brandOptions = useMemo(() => {
    const vals = [...new Set(cars.map((c) => c.brandSlug))];
    return vals.map((v) => ({
      value: v,
      label: cars.find((c) => c.brandSlug === v)?.brand ?? v,
      count: cars.filter((c) => c.brandSlug === v).length,
    }));
  }, [cars]);

  const electricOptions = useMemo(() => {
    const vals = [...new Set(cars.map((c) => c.electricTypeSlug))];
    return vals.map((v) => ({
      value: v,
      label: cars.find((c) => c.electricTypeSlug === v)?.electricTypeLabel ?? v,
      count: cars.filter((c) => c.electricTypeSlug === v).length,
    }));
  }, [cars]);

  const filteredCars = useMemo(() => {
    let list = [...cars];
    if (activeFilters.brand)   list = list.filter((c) => c.brandSlug === activeFilters.brand);
    if (activeFilters.electric) list = list.filter((c) => c.electricTypeSlug === activeFilters.electric);
    if (sort === "price-asc")  list.sort((a, b) => a.discountPrice - b.discountPrice);
    if (sort === "price-desc") list.sort((a, b) => b.discountPrice - a.discountPrice);
    if (sort === "range-desc") list.sort((a, b) => b.range - a.range);
    return list;
  }, [cars, activeFilters, sort]);

  const hotDeals = filteredCars.filter((c) => c.isHotDeal);
  const rest = filteredCars.filter((c) => !c.isHotDeal);

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-black pt-20 pb-16 md:pt-24 md:pb-20 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-[500px] h-[300px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-primary-deep/10 rounded-full blur-[100px] pointer-events-none" />

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
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full mb-6">
                <span className="material-symbols-outlined text-primary text-[16px]">
                  {meta.icon}
                </span>
                <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  {meta.label}
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl font-headline font-black text-white tracking-tighter leading-[0.95] mb-5">
                Autos <span className="text-primary">{meta.label}</span>{" "}
                eléctricos en Chile
              </h1>

              <p className="text-white/60 text-base leading-relaxed max-w-lg mb-8">
                {meta.heroDesc}
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {cars.length} modelo{cars.length !== 1 ? "s" : ""} disponible{cars.length !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Ahorro promedio 27%
                </div>
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Respuesta en 24 h
                </div>
              </div>

              <Link
                href="/solicitar"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-7 py-3.5 rounded-xl transition-colors"
              >
                Solicitar oferta en {meta.label}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>

            {/* Right – stat cards */}
            {cars.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Autonomía máx.", value: `${Math.max(...cars.map((c) => c.range))} km` },
                  { label: "Precio desde", value: formatCLP(Math.min(...cars.map((c) => c.discountPrice))) },
                  { label: "Potencia máx.", value: `${Math.max(...cars.map((c) => c.power))} CV` },
                  { label: "Hot Deals activos", value: `${hotDeals.length}` },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-headline font-black text-primary">{s.value}</p>
                    <p className="text-white/40 text-[11px] uppercase tracking-wide mt-1 leading-snug">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── All cars in type ────────────────────────────────────────── */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">
              Catálogo completo
            </p>
            <h2 className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tighter mb-6">
              Todos los {meta.label} eléctricos
            </h2>

            <CatalogFilters
              groups={[
                ...(brandOptions.length > 1 ? [{ id: "brand", label: "Marca", options: brandOptions }] : []),
                ...(electricOptions.length > 1 ? [{ id: "electric", label: "Tecnología", options: electricOptions }] : []),
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
              {rest.map((car, i) => {
                const pct = Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100);
                return (
                  <motion.article
                    key={car.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="group flex flex-col border border-gray-100 bg-white rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-300"
                  >
                    {/* Image */}
                    <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 relative flex flex-col items-center justify-center overflow-hidden">
                      <span className="absolute top-3 right-3 bg-black text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        -{pct}%
                      </span>
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt={`${car.brand} ${car.name}`} className="object-contain w-full h-full" />
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
                          { label: "Autonomía", value: `${car.range} km` },
                          { label: "Potencia", value: `${car.power} CV` },
                          { label: "Batería", value: `${car.battery} kWh` },
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
                          className="flex-1 text-center bg-primary hover:bg-primary-dark text-black font-bold py-2.5 rounded-xl text-sm transition-colors"
                        >
                          Ver auto
                        </Link>
                        <Link
                          href={`/comparador?add=${car.slug}`}
                          className="px-3 border border-gray-200 hover:border-primary/40 text-text-muted hover:text-primary-deep rounded-xl flex items-center transition-colors"
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
                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 group"
                  >
                    {/* Image area */}
                    <div className="aspect-[16/7] bg-gradient-to-br from-white/5 to-transparent relative flex items-center justify-center overflow-hidden">
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt={`${car.brand} ${car.name}`} className="object-contain w-full h-full" />
                      ) : (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                          </div>
                          <span className="material-symbols-outlined text-[80px] text-white/10 relative z-10">electric_car</span>
                        </>
                      )}
                      <span className="absolute top-3 left-3 bg-amber text-black text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full z-10">
                        -{pct}% ahorro
                      </span>
                    </div>

                    <div className="p-6">
                      <p className="text-white/40 text-[11px] uppercase tracking-widest font-semibold mb-1">
                        {car.brand}
                      </p>
                      <h3 className="font-headline font-black text-white text-2xl mb-1">
                        {car.name}
                      </h3>
                      <p className="text-white/50 text-sm mb-5">{car.tagline}</p>

                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                          { label: "Autonomía", value: `${car.range} km` },
                          { label: "Potencia", value: `${car.power} CV` },
                          { label: "Tracción", value: car.traction },
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

      {/* ─── Explore other types ─────────────────────────────────────── */}
      {otherTypes.length > 0 && (
        <section className="py-14 bg-surface border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-6">
              Explorar otras categorías
            </p>
            <div className="flex flex-wrap gap-3">
              {otherTypes
                .filter((t) => t.slug !== slug)
                .map((t) => (
                  <Link
                    key={t.slug}
                    href={`/tipo/${t.slug}`}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 hover:border-primary/40 hover:text-primary-deep rounded-xl text-sm font-semibold transition-all group"
                  >
                    <span className="material-symbols-outlined text-[16px] text-text-ghost group-hover:text-primary-deep transition-colors">
                      {t.icon}
                    </span>
                    {t.label}
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
              <p className="text-primary text-xs uppercase tracking-widest font-bold mb-2">
                ¿Ya decidiste?
              </p>
              <h2 className="text-white font-headline font-black text-2xl md:text-3xl tracking-tight">
                Consigue el mejor precio en tu {meta.label} eléctrico
              </h2>
              <p className="text-white/50 text-sm mt-1">
                Negociamos por ti. Ahorro promedio de 27% sobre precio lista.
              </p>
            </div>
            <Link
              href="/solicitar"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-black px-8 py-4 rounded-xl transition-colors text-sm whitespace-nowrap"
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
