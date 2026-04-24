"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatCLP } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface VersionData {
  name: string;
  price: number;
  discountPrice: number;
  battery: number;
  range: number;
  power: number;
  torque: number;
  traction: string;
  acceleration: number;
  topSpeed: number;
  chargeTimeDC: string;
  chargeTimeAC: string;
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
  battery: number;
  range: number;
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
}

export interface SimilarCarData {
  slug: string;
  name: string;
  brand: string;
  category: string;
  discountPrice: number;
  range: number;
  imageUrl?: string;
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

export default function AutoPageClient({ car, similarCars }: AutoPageClientProps) {
  const [activeVersion, setActiveVersion] = useState(0);
  const [galleryIndex,  setGalleryIndex]  = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

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
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 md:top-20 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm"
          >
            <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0">electric_car</span>
                <div className="min-w-0">
                  <span className="font-headline font-bold text-sm truncate">{car.brand} {car.name}</span>
                  <span className="text-text-ghost text-xs ml-2 hidden sm:inline">{ver.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="hidden sm:block text-right">
                  {car.isHotDeal && savingsPct > 0 && (
                    <p className="text-xs text-text-ghost line-through">{formatCLP(ver.price)}</p>
                  )}
                  <p className="font-headline font-black text-primary-deep text-base leading-none">
                    {formatCLP(car.isHotDeal && savingsPct > 0 ? ver.discountPrice : ver.price)}
                  </p>
                </div>
                <Link
                  href={`/solicitar?auto=${car.slug}`}
                  className="bg-primary hover:bg-primary-dark text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                >
                  Solicitar oferta
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section ref={heroRef} className="bg-black pt-20 pb-0 md:pt-24 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
          <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-8">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href={`/marcas/${car.brandSlug}`} className="hover:text-white/60 transition-colors">{car.brand}</Link>
            <span>/</span>
            <span className="text-white/60">{car.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-end pb-14 md:pb-20">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-2 mb-5">
                {car.isHotDeal && <span className="bg-amber text-black text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full">HOT DEAL</span>}
                {car.isNew && <span className="bg-primary text-black text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full">NUEVO</span>}
                {car.isTopSeller && <span className="bg-white text-black text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full">🏆 MÁS VENDIDO</span>}
                <span className="text-white/30 text-xs uppercase tracking-widest">{car.category}</span>
              </div>
              <p className="text-white/40 text-sm font-semibold mb-1">{car.brand}</p>
              <h1 className="text-5xl md:text-7xl font-headline font-black text-white tracking-tighter leading-[0.9] mb-4">
                {car.name}<span className="text-primary">.</span>
              </h1>
              <p className="text-white/60 text-lg mb-8 max-w-md leading-relaxed">{car.tagline}</p>

              <div className="grid grid-cols-4 gap-3 mb-8">
                {[
                  { label: "Autonomía",   value: `${ver.range} km` },
                  { label: "Potencia",    value: `${ver.power} CV` },
                  { label: "0–100",       value: `${ver.acceleration}s` },
                  { label: "Asistentes",  value: car.safetyFeatures.length > 0 ? `${car.safetyFeatures.length} ADAS` : `${car.seats} plz` },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-primary font-headline font-black text-lg leading-none">{s.value}</p>
                    <p className="text-white/40 text-[10px] mt-1 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-7">
                {car.isHotDeal && savingsPct > 0 ? (
                  <>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-white/40 text-sm">Precio lista</span>
                      <span className="text-white/40 line-through text-sm">{formatCLP(ver.price)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-white font-medium">Con bono Electrificarte</span>
                      <span className="text-primary text-3xl font-headline font-black">{formatCLP(ver.discountPrice)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-white/40 text-xs">
                        Ahorras {formatCLP(savings)} ({savingsPct}%)
                        {car.hotDealBonus ? ` · Bono adicional ${formatCLP(car.hotDealBonus)}` : ""}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-white/40 text-sm">Precio Electrificarte</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-primary text-3xl font-headline font-black">{formatCLP(ver.price)}</span>
                    </div>
                    <p className="text-white/30 text-xs mt-3 pt-3 border-t border-white/10">
                      *Precio referencial. Consulta por financiamiento y bonos disponibles.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/solicitar?auto=${car.slug}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-black px-7 py-4 rounded-xl transition-colors"
                >
                  Obtén la mejor oferta
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
                <Link
                  href="/comparador"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-5 py-4 rounded-xl transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">compare</span>
                  Comparar
                </Link>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="relative">
              <div className="absolute -top-10 -right-10 w-72 h-72 bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
              <div className="relative aspect-[16/10] bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
                </div>
                {galleryImages[0] ? (
                  <img src={galleryImages[0]} alt={`${car.brand} ${car.name}`} className="w-full h-full object-cover relative z-10" />
                ) : (
                  <span className="material-symbols-outlined text-[100px] text-white/10 relative z-10">electric_car</span>
                )}
                {car.isHotDeal && savingsPct > 0 && (
                  <div className="absolute top-4 right-4 bg-primary text-black text-xs font-black px-3 py-1.5 rounded-full z-20">
                    -{savingsPct}% con Electrificarte
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Version selector ─────────────────────────────────────────── */}
      {car.versions.length > 1 && (
        <section className="bg-black border-t border-white/5 py-10">
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
                    className={["text-left rounded-2xl border p-5 transition-all duration-200", isActive ? "bg-primary/10 border-primary/50 ring-1 ring-primary/30" : "bg-white/5 border-white/10 hover:border-white/20"].join(" ")}
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
                      {[{label:"Autonomía",value:`${v.range} km`},{label:"Potencia",value:`${v.power} CV`},{label:"Tracción",value:v.traction},{label:"0–100",value:`${v.acceleration}s`}].map((s) => (
                        <div key={s.label}>
                          <p className={["text-xs font-bold", isActive ? "text-primary/80" : "text-white/60"].join(" ")}>{s.value}</p>
                          <p className="text-white/30 text-[10px]">{s.label}</p>
                        </div>
                      ))}
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

      {/* ─── Overview + Video ─────────────────────────────────────────── */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-3">Sobre el vehículo</p>
              <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tighter uppercase mb-6">{car.brand} {car.name}</h2>
              <p className="text-text-muted leading-relaxed mb-8">{car.description}</p>
              <div className="space-y-3">
                {[
                  { icon: "bolt",            text: `${car.chargeType} · carga en ${car.chargeTimeDC}` },
                  { icon: "electric_car",    text: `Hasta ${ver.range} km de autonomía real` },
                  { icon: "airline_seat_recline_extra", text: `${car.seats} plazas · maletero ${car.cargo} L` },
                  { icon: "shield",          text: car.safetyFeatures[0] ?? "Garantía de precio más bajo del mercado" },
                ].map((h) => (
                  <div key={h.icon} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-[16px]">{h.icon}</span>
                    </div>
                    <span className="text-text-muted text-sm">{h.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-3">Video</p>
              {car.videoUrl ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden">
                  <iframe src={car.videoUrl} title={car.videoTitle ?? `${car.brand} ${car.name}`} className="w-full h-full" allowFullScreen />
                </div>
              ) : (
                <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden group cursor-pointer border border-gray-100">
                  <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 bg-primary/15 rounded-full blur-3xl" />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <div className="w-16 h-16 bg-white/10 group-hover:bg-primary/90 backdrop-blur-sm border border-white/20 group-hover:border-primary rounded-full flex items-center justify-center transition-all duration-300 shadow-lg group-hover:scale-110 mb-4">
                      <span className="material-symbols-outlined text-white group-hover:text-black text-[26px] ml-1 transition-colors">play_arrow</span>
                    </div>
                    {car.videoTitle && <p className="text-white font-headline font-bold text-sm text-center px-6 leading-snug">{car.videoTitle}</p>}
                    {car.videoDuration && <p className="text-white/40 text-xs mt-1">{car.videoDuration}</p>}
                  </div>
                  {car.videoDuration && <span className="absolute bottom-3 right-3 bg-black/70 text-white text-[11px] font-bold px-2 py-0.5 rounded">{car.videoDuration}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Equipamiento ─────────────────────────────────────────────── */}
      {(car.safetyFeatures.length > 0 || car.techFeatures.length > 0 || car.comfortFeatures.length > 0) && (
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="mb-10">
              <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Equipamiento</p>
              <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tighter uppercase">Seguridad, tecnología y confort</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {car.safetyFeatures.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-500 text-[16px]">shield</span>
                    </div>
                    <h3 className="font-headline font-bold">Seguridad</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {car.safetyFeatures.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {car.techFeatures.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary-deep text-[16px]">memory</span>
                    </div>
                    <h3 className="font-headline font-bold">Tecnología</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {car.techFeatures.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {car.comfortFeatures.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-500 text-[16px]">airline_seat_recline_extra</span>
                    </div>
                    <h3 className="font-headline font-bold">Confort</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {car.comfortFeatures.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                { label: "Batería",          value: `${ver.battery} kWh` },
                { label: "Autonomía WLTP",   value: `${ver.range} km` },
                { label: "Carga rápida DC",  value: ver.chargeTimeDC },
                { label: "Carga AC",         value: ver.chargeTimeAC },
                { label: "Tipo de conector", value: car.chargeType },
              ]},
              { section: "Motor y Rendimiento", rows: [
                { label: "Potencia",           value: `${ver.power} CV (${Math.round(ver.power * 0.7355)} kW)` },
                { label: "Torque",             value: `${ver.torque} Nm` },
                { label: "Tracción",           value: ver.traction },
                { label: "Aceleración 0–100",  value: `${ver.acceleration} segundos` },
                { label: "Velocidad máxima",   value: `${ver.topSpeed} km/h` },
              ]},
              { section: "Dimensiones y Capacidad", rows: [
                { label: "Plazas",    value: String(car.seats) },
                { label: "Maletero", value: `${car.cargo} litros` },
                ...(car.warranty ? [{ label: "Garantía", value: car.warranty }] : []),
              ]},
            ].map((group) => (
              <div key={group.section}>
                <div className="bg-surface px-6 py-3 border-b border-gray-100">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-primary-deep">{group.section}</p>
                </div>
                {group.rows.map((row, ri) => (
                  <div key={row.label} className={["grid grid-cols-2 px-6 py-3.5 text-sm", ri < group.rows.length - 1 ? "border-b border-gray-50" : "border-b border-gray-100"].join(" ")}>
                    <span className="text-text-muted font-medium">{row.label}</span>
                    <span className="font-semibold text-text-main">{row.value}</span>
                  </div>
                ))}
              </div>
            ))}
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
              <motion.div key={galleryIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                {galleryImages[galleryIndex] ? (
                  <img src={galleryImages[galleryIndex]} alt={`${car.brand} ${car.name} foto ${galleryIndex + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${galleryGradients[galleryIndex % galleryGradients.length]} flex items-center justify-center`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-60 h-60 bg-primary/8 rounded-full blur-3xl" />
                    </div>
                    <span className="material-symbols-outlined text-[100px] text-white/10 relative z-10">electric_car</span>
                    <span className="absolute bottom-4 right-4 text-white/20 text-xs uppercase tracking-widest font-bold">{galleryIndex + 1} / {galleryCount}</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: galleryCount }).map((_, i) => (
              <button key={i} onClick={() => setGalleryIndex(i)}
                className={["aspect-video rounded-xl overflow-hidden border-2 transition-all", i === galleryIndex ? "border-primary scale-105" : "border-transparent opacity-50 hover:opacity-80"].join(" ")}>
                {galleryImages[i] ? (
                  <img src={galleryImages[i]} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
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
                      <img src={s.imageUrl} alt={`${s.brand} ${s.name}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
            <Link href={`/solicitar?auto=${car.slug}`} className="flex-shrink-0 inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-black px-8 py-4 rounded-xl transition-colors text-sm whitespace-nowrap">
              Solicitar oferta ahora
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
