"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatCLP } from "@/lib/utils";
import { CarCard } from "@/components/car/CarCard";

const PAGE_SIZE = 9;

interface Highlight {
  icon:        string;
  title:       string;
  description: string;
}

interface CarData {
  _id:             string;
  name:            string;
  slug:            string;
  imageUrl?:       string;
  basePrice:       number;
  discountPrice:   number;
  range:           number;
  batteryCapacity: number;
  power:           number;
  isNew:           boolean;
  isHotDeal:       boolean;
  brand?:          { name: string; slug: string };
  vehicleType?:    { label: string; slug: string };
  electricType?:   { tag: string; label: string; slug: string };
}

interface ColData {
  title:         string;
  slug:          string;
  badge?:        string;
  subtitle?:     string;
  description?:  string;
  ctaText?:      string;
  heroImageUrl?: string;
  highlights?:   Highlight[];
}

interface Props {
  col:  ColData;
  cars: CarData[];
}

const ACCENT = "#00E5E5";

const DEFAULT_HIGHLIGHTS: Highlight[] = [
  { icon: "person_check",    title: "Ideal para ti si…",          description: "Buscas un auto electrificado con el mejor precio negociado del mercado chileno." },
  { icon: "family_restroom", title: "Perfecto para familias",     description: "Espacio, seguridad y tecnología para que todos viajen cómodos." },
  { icon: "savings",         title: "La mejor opción si ahorrar importa", description: "Precio lista vs. precio Electrificarte: diferencia promedio de $4.200.000." },
  { icon: "star",            title: "Lo elegirías porque…",       description: "Combina autonomía, equipamiento y precio mejor que cualquier alternativa." },
];

export default function ColeccionPageContent({ col, cars }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const hotDeals    = useMemo(() => cars.filter(c => c.isHotDeal), [cars]);
  const rest        = useMemo(() => cars.filter(c => !c.isHotDeal), [cars]);
  const visibleRest = rest.slice(0, visibleCount);
  const hasMore     = visibleCount < rest.length;
  const minPrice    = cars.length > 0 ? Math.min(...cars.map(c => c.discountPrice ?? c.basePrice)) : 0;

  const highlights = (col.highlights && col.highlights.length > 0)
    ? col.highlights
    : DEFAULT_HIGHLIGHTS;

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-black pt-20 pb-16 md:pt-28 md:pb-20 overflow-hidden relative">
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Glow */}
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ backgroundColor: ACCENT }}
        />

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-10">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/#colecciones" className="hover:text-white/60 transition-colors">Colecciones</Link>
            <span>/</span>
            <span className="text-white/60">{col.title}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left – copy */}
            <div>
              {col.badge && (
                <span className="inline-block bg-primary text-black text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
                  {col.badge}
                </span>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-6">
                {minPrice > 0 && (
                  <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                    <span className="material-symbols-outlined text-primary text-[14px]">sell</span>
                    <span className="text-white/60 text-xs font-semibold">Desde {formatCLP(minPrice)}</span>
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
                {col.title}<span className="text-primary">.</span>
              </h1>

              {col.subtitle && (
                <p className="font-headline text-xl md:text-2xl font-bold text-primary mb-4">
                  {col.subtitle}
                </p>
              )}

              {col.description && (
                <p className="text-white/60 text-base leading-relaxed max-w-md mb-8">
                  {col.description}
                </p>
              )}

              <div className="flex flex-wrap gap-4 mb-10">
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {cars.length} modelo{cars.length !== 1 ? "s" : ""} disponible{cars.length !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  Ahorro promedio 27%
                </div>
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
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
                  href={`#catalogo-${col.slug}`}
                  className="inline-flex items-center gap-2 border border-white/20 hover:border-white/50 hover:bg-white/5 text-white font-medium px-6 py-3 rounded-xl transition-all text-sm"
                >
                  Ver catálogo
                </a>
              </div>
            </div>

            {/* Right – hero image */}
            <div className="relative hidden md:block">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                {col.heroImageUrl ? (
                  <Image
                    src={col.heroImageUrl}
                    alt={col.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 50vw, 640px"
                    priority
                  />
                ) : (
                  <div className="text-center">
                    <span className="material-symbols-outlined text-[64px] text-white/10 block mb-3">photo_library</span>
                    <p className="text-white/20 text-xs uppercase tracking-widest font-semibold">{col.title}</p>
                  </div>
                )}
              </div>
              <div
                className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20"
                style={{ backgroundColor: ACCENT }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Highlights ───────────────────────────────────────────────── */}
      <section className="py-10 bg-surface border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {highlights.map((h, i) => (
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
                  style={{ backgroundColor: `${ACCENT}18` }}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ color: ACCENT }}>
                    {h.icon}
                  </span>
                </div>
                <div>
                  <p className="font-headline font-bold text-sm leading-snug mb-1 text-text-main">{h.title}</p>
                  <p className="text-text-ghost text-[12px] leading-snug">{h.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Catálogo ─────────────────────────────────────────────────── */}
      <section id={`catalogo-${col.slug}`} className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">

          {cars.length === 0 ? (
            <div className="text-center py-24">
              <span className="material-symbols-outlined text-[64px] text-gray-200">electric_car</span>
              <h2 className="text-xl font-headline font-bold text-text-main mt-4 mb-2">
                Sin autos en esta colección todavía
              </h2>
              <p className="text-text-muted text-sm mb-8">Estamos actualizando el catálogo. Vuelve pronto.</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-primary text-black font-bold px-6 py-3 rounded-xl transition-all hover:bg-primary-dark shadow-[0_4px_20px_rgba(0,229,229,0.30)]"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Volver al inicio
              </Link>
            </div>
          ) : (
            <>
              {/* Hot Deals */}
              {hotDeals.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-amber text-[22px]">local_fire_department</span>
                    <h2 className="font-headline font-black text-xl uppercase tracking-tight">Hot Deals</h2>
                    <span className="text-text-ghost text-sm">— precios especiales negociados</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hotDeals.map((car, i) => (
                      <CarCard
                        key={car._id}
                        name={car.name}
                        brand={car.brand?.name ?? ""}
                        slug={car.slug}
                        image={car.imageUrl}
                        category={car.vehicleType?.label ?? car.electricType?.tag}
                        batteryCapacity={car.batteryCapacity ?? 0}
                        range={car.range ?? 0}
                        basePrice={car.basePrice}
                        discountPrice={car.discountPrice}
                        isNew={car.isNew}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Rest */}
              {rest.length > 0 && (
                <div>
                  {hotDeals.length > 0 && (
                    <h2 className="font-headline font-black text-xl uppercase tracking-tight mb-6">
                      Todos los modelos
                    </h2>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleRest.map((car, i) => (
                      <CarCard
                        key={car._id}
                        name={car.name}
                        brand={car.brand?.name ?? ""}
                        slug={car.slug}
                        image={car.imageUrl}
                        category={car.vehicleType?.label ?? car.electricType?.tag}
                        batteryCapacity={car.batteryCapacity ?? 0}
                        range={car.range ?? 0}
                        basePrice={car.basePrice}
                        discountPrice={car.discountPrice}
                        isNew={car.isNew}
                        index={i}
                      />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="text-center mt-10">
                      <button
                        onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                        className="inline-flex items-center gap-2 border border-gray-200 hover:border-primary/40 text-text-main hover:text-primary font-semibold px-8 py-3 rounded-xl transition-all"
                      >
                        Ver más autos
                        <span className="material-symbols-outlined text-[18px]">expand_more</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ─── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-14 bg-surface border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-black rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-primary text-xs uppercase tracking-widest font-bold mb-2">¿Ya decidiste?</p>
              <h2 className="text-white font-headline font-black text-2xl md:text-3xl tracking-tight">
                Consigue el mejor precio en {col.title}
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
