"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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

const PAGE_SIZE = 9;

export default function TipoPageContent({ slug, meta, cars, otherTypes }: TipoPageContentProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ brand: "", electric: "" });
  const [sort, setSort] = useState("default");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
    setVisibleCount(PAGE_SIZE);
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
  const visibleRest = rest.slice(0, visibleCount);
  const hasMore = visibleCount < rest.length;

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

  // Banner slideshow
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
              {/* Mini badges */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {cars.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                    <span className="material-symbols-outlined text-primary text-[14px]">sell</span>
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
                  Precios negociados al mejor valor
                </div>
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
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

            {/* Right – hero image area */}
            <div className="relative hidden md:block">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-[64px] text-white/10 block mb-3">image</span>
                  <p className="text-white/20 text-xs uppercase tracking-widest font-semibold">Foto del tipo {meta.label}</p>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            </div>
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
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActiveSlide(i); }}
                  className={[
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    i === activeSlide ? "bg-primary w-4" : "bg-gray-300",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

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
              const specs = [
                { label: "Autonomía",  value: `${car.range} km` },
                { label: "Potencia",   value: `${car.power} CV` },
                { label: "Tracción",   value: car.traction },
                { label: "0-100 km/h", value: car.acceleration ? `${car.acceleration} seg` : "–" },
              ];
              return (
                <div key={car.slug} style={{ flex: "0 0 100%", scrollSnapAlign: "start" }}>
                  {/* ── MOBILE ── */}
                  <div className="lg:hidden px-4">
                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt={`${car.brand} ${car.name}`} className="w-full h-40 object-cover" />
                      ) : (
                        <div className="w-full h-40 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[64px] text-primary/30">electric_car</span>
                        </div>
                      )}
                      <div className="p-4 space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-amber text-black text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full">HOT DEAL</span>
                            <span className="text-white/40 text-xs">Oferta limitada</span>
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
                          <div className="bg-white/5 rounded-lg px-3 py-2">
                            <p className="text-primary text-sm font-headline font-bold">{car.range} km</p>
                            <p className="text-white/40 text-[10px]">Autonomía</p>
                          </div>
                          <div className="bg-white/5 rounded-lg px-3 py-2">
                            <p className="text-primary text-sm font-headline font-bold">{car.traction}</p>
                            <p className="text-white/40 text-[10px]">Tracción</p>
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
                          <span className="text-white/50 text-sm">Oferta limitada</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-headline font-black text-white mb-4 uppercase leading-tight">
                          {car.brand} {car.name} al mejor precio de Chile
                        </h2>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 space-y-2">
                          <div className="flex justify-between items-baseline">
                            <span className="text-white/40 text-sm">Precio lista</span>
                            <span className="text-white/40 line-through">{formatCLP(car.basePrice)}</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-white text-sm font-medium">Con descuento Electrificarte</span>
                            <span className="text-primary text-3xl font-headline font-black">{formatCLP(car.discountPrice)}</span>
                          </div>
                          <p className="text-white/30 text-xs pt-2 border-t border-white/10">Ahorra {discountPct}% · Incluye bono concesionario + Electrificarte</p>
                        </div>
                        <div className="flex gap-3">
                          <Link href={`/solicitar?auto=${car.slug}`} className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_4px_20px_rgba(0,229,229,0.30)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]">
                            Quiero esta oferta <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          </Link>
                          <Link href={`/auto/${car.slug}`} className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-6 py-3 rounded-xl transition-all text-sm">
                            Ver especificaciones
                          </Link>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                        {car.imageUrl ? (
                          <img src={car.imageUrl} alt={`${car.brand} ${car.name}`} className="w-full aspect-[16/9] object-cover" />
                        ) : (
                          <div className="w-full aspect-[16/9] flex items-center justify-center flex-col gap-2">
                            <span className="material-symbols-outlined text-[80px] text-primary/30">electric_car</span>
                            <p className="text-white/40 text-sm">{car.brand} {car.name}</p>
                          </div>
                        )}
                        <div className="p-4 md:p-5">
                          <div className="grid grid-cols-2 gap-2">
                            {specs.map((s) => (
                              <div key={s.label} className="bg-white/5 rounded-xl p-3">
                                <p className="text-primary text-base font-headline font-bold">{s.value}</p>
                                <p className="text-white/40 text-xs">{s.label}</p>
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
            <div className="flex justify-center gap-2 mt-5">
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
          )}
        </section>
      )}

      {/* ─── All cars in type ────────────────────────────────────────── */}
      <section id={`catalogo-${slug}`} className="py-16 md:py-20">
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
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
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
                    {/* Image */}
                    <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 relative flex flex-col items-center justify-center overflow-hidden">
                      {pct > 0 && <span className="absolute top-3 right-3 bg-black text-white text-[10px] font-black px-2 py-0.5 rounded-full">-{pct}%</span>}
                      {car.imageUrl ? (
                        <img src={car.imageUrl} alt={`${car.brand} ${car.name}`} className="object-cover w-full h-full" />
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
                        {[
                          { label: "Autonomía", value: `${car.range} km`, mobile: true },
                          { label: "Potencia",  value: `${car.power} CV`, mobile: true },
                          { label: "Batería",   value: `${car.battery} kWh`, mobile: false },
                        ].map((s) => (
                          <div key={s.label} className={`bg-surface rounded-xl p-1.5 sm:p-2 text-center${s.mobile ? "" : " hidden sm:block"}`}>
                            <p className="text-[10px] sm:text-[11px] font-bold text-text-main">{s.value}</p>
                            <p className="text-[9px] sm:text-[10px] text-text-ghost">{s.label}</p>
                          </div>
                        ))}
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
