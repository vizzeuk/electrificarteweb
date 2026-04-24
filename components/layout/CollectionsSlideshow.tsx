"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";

export interface CollectionCardData {
  _id:           string;
  title:         string;
  slug:          string;
  badge?:        string | null;
  subtitle?:     string | null;
  ctaText?:      string | null;
  heroImageUrl?: string | null;
}

interface CollectionsSlideshowProps {
  collections?: CollectionCardData[];
}

const FALLBACK: CollectionCardData[] = [
  {
    _id:      "f1",
    title:    "Autos eléctricos desde $20M",
    slug:     "desde-20-millones",
    badge:    "ACCESIBLES",
    subtitle: "Los mejores precios del mercado eléctrico en Chile",
    ctaText:  "Ver colección",
  },
  {
    _id:      "f2",
    title:    "SUV Familiares de 7 Asientos",
    slug:     "suv-7-asientos",
    badge:    "7 ASIENTOS",
    subtitle: "3 corridas de asientos, espacio para toda la familia",
    ctaText:  "Ver colección",
  },
  {
    _id:      "f3",
    title:    "Lo mejor de BYD",
    slug:     "mejores-byd",
    badge:    "BYD",
    subtitle: "La marca más vendida del mundo en vehículos eléctricos",
    ctaText:  "Ver colección",
  },
];

const CARD_W = 380;
const GAP    = 20;

const GRADIENTS = [
  "from-[#002a2a] via-[#004040] to-[#00595a]",
  "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
  "from-[#1c0a2c] via-[#2d1144] to-[#3b1d5a]",
  "from-[#0a1628] via-[#112240] to-[#1b3a6b]",
];

export function CollectionsSlideshow({ collections }: CollectionsSlideshowProps) {
  const items        = collections && collections.length > 0 ? collections : FALLBACK;
  const trackRef     = useRef<HTMLDivElement>(null);
  const mobileRef    = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  // Desktop scroll state
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    function upd() {
      setCanLeft(el!.scrollLeft > 8);
      setCanRight(el!.scrollLeft < el!.scrollWidth - el!.clientWidth - 8);
    }
    upd();
    el.addEventListener("scroll", upd, { passive: true });
    return () => el.removeEventListener("scroll", upd);
  }, [items]);

  // Mobile active dot
  useEffect(() => {
    const el = mobileRef.current;
    if (!el) return;
    function upd() {
      const idx = Math.round(el!.scrollLeft / el!.clientWidth);
      setActiveIdx(idx);
    }
    el.addEventListener("scroll", upd, { passive: true });
    return () => el.removeEventListener("scroll", upd);
  }, [items]);

  function scroll(dir: "left" | "right") {
    trackRef.current?.scrollBy({
      left: dir === "right" ? (CARD_W + GAP) * 1.5 : -(CARD_W + GAP) * 1.5,
      behavior: "smooth",
    });
  }

  return (
    <section className="pb-20 md:pb-24" aria-label="Colecciones destacadas">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">
              Colecciones
            </p>
            <h2 className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tighter">
              Encuentra tu auto ideal
            </h2>
          </div>
          {/* Desktop arrows */}
          <div className="hidden md:flex gap-2 shrink-0">
            <button
              onClick={() => scroll("left")}
              disabled={!canLeft}
              aria-label="Anterior"
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-text-muted hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canRight}
              aria-label="Siguiente"
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-text-muted hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE carousel (md:hidden) ── */}
      <div className="md:hidden">
        <div
          ref={mobileRef}
          className="flex overflow-x-auto"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {items.map((col, i) => (
            <Link
              key={col._id}
              href={`/coleccion/${col.slug}`}
              style={{ flex: "0 0 100%", scrollSnapAlign: "start" }}
              className="px-4"
              aria-label={col.title}
            >
              <div className="relative rounded-2xl overflow-hidden h-52">
                {col.heroImageUrl ? (
                  <img
                    src={col.heroImageUrl}
                    alt={col.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`} />
                )}
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10 p-5 h-full flex flex-col justify-between">
                  <div>
                    {col.badge && (
                      <span className="inline-block bg-primary text-black text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full">
                        {col.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-headline font-bold text-lg leading-snug mb-1">
                      {col.title}
                    </h3>
                    {col.subtitle && (
                      <p className="text-white/60 text-xs leading-snug mb-3">{col.subtitle}</p>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-primary font-bold text-sm">
                      {col.ctaText ?? "Ver colección"}
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => mobileRef.current?.scrollTo({ left: mobileRef.current.clientWidth * i, behavior: "smooth" })}
              className="transition-all duration-300"
              style={{
                width:  i === activeIdx ? 20 : 6,
                height: 6,
                borderRadius: 9999,
                backgroundColor: i === activeIdx ? "var(--color-primary, #00E5E5)" : "#d1d5db",
              }}
              aria-label={`Ir a colección ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ── DESKTOP carousel (hidden md:block) ── */}
      <div className="hidden md:block relative">
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10 transition-opacity duration-200"
          style={{ background: "linear-gradient(to right, white, transparent)", opacity: canLeft ? 1 : 0 }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10 transition-opacity duration-200"
          style={{ background: "linear-gradient(to left, white, transparent)", opacity: canRight ? 1 : 0 }}
        />
        <div
          ref={trackRef}
          className="flex gap-5 overflow-x-auto pb-3"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            paddingLeft:  "max(1rem, calc((100vw - 1280px) / 2 + 2rem))",
            paddingRight: "max(1rem, calc((100vw - 1280px) / 2 + 2rem))",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          {items.map((col, i) => (
            <Link
              key={col._id}
              href={`/coleccion/${col.slug}`}
              style={{ minWidth: CARD_W, scrollSnapAlign: "start" }}
              className="relative rounded-2xl overflow-hidden flex flex-col justify-end group cursor-pointer"
              aria-label={col.title}
            >
              <div className="relative h-[220px] w-full">
                {col.heroImageUrl ? (
                  <img
                    src={col.heroImageUrl}
                    alt={col.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`} />
                )}
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-300" />
                <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                  <div>
                    {col.badge && (
                      <span className="inline-block bg-primary text-black text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full">
                        {col.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-headline font-bold text-xl leading-snug mb-1 group-hover:text-primary transition-colors duration-200">
                      {col.title}
                    </h3>
                    {col.subtitle && (
                      <p className="text-white/60 text-sm leading-snug mb-3">{col.subtitle}</p>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-primary font-bold text-sm group-hover:gap-2.5 transition-all duration-200">
                      {col.ctaText ?? "Ver colección"}
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
