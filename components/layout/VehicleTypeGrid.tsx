"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { sanityImg } from "@/lib/sanityImage";
import { electricTypeColor } from "@/components/car/ElectricTypeBadge";

export interface ElectricTypeItem {
  _id: string;
  slug: string;
  label: string;
  tag: string;
  color?: string;
  icon?: string;
  tagline?: string;
  idealFor?: string;
  cardImageUrl?: string;
  carCount: number;
}

interface ElectricTypeGridProps {
  types: ElectricTypeItem[];
}

const CARD_W_MAX = 360;
const CARD_W     = 300; // desktop fallback for JS scroll calc; actual width driven by CSS
const GAP        = 16;

export function VehicleTypeGrid({ types }: ElectricTypeGridProps) {
  if (!types || types.length === 0) return null;

  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    function upd() {
      const max = el!.scrollWidth - el!.clientWidth;
      setCanLeft(el!.scrollLeft > 8);
      setCanRight(el!.scrollLeft < max - 8);
    }
    upd();
    el.addEventListener("scroll", upd, { passive: true });
    return () => el.removeEventListener("scroll", upd);
  }, [types]);

  function scroll(dir: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;
    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? CARD_W;
    el.scrollBy({ left: dir === "right" ? w + GAP : -(w + GAP), behavior: "smooth" });
  }

  return (
    <section className="py-14 bg-gray-50 border-t border-gray-100" aria-labelledby="electric-types-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">
              Electrificados disponibles
            </p>
            <h2
              id="electric-types-title"
              className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tighter"
            >
              ¿Qué tipo de electrificado buscas?
            </h2>
          </div>

          {/* Nav arrows — desktop */}
          <div className="hidden md:flex gap-2 shrink-0">
            <button
              onClick={() => scroll("left")}
              disabled={!canLeft}
              aria-label="Anterior"
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-text-muted hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canRight}
              aria-label="Siguiente"
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-text-muted hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Carousel track — full-bleed */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          paddingLeft:  "max(1rem, calc((100vw - 1280px) / 2 + 2rem))",
          paddingRight: "max(1rem, calc((100vw - 1280px) / 2 + 2rem))",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {types.map((type) => {
          // Usar el mismo color que el ribbon de tipo eléctrico (ElectricTypeBadge);
          // fallback al color de Sanity y luego al cyan primario.
          const accent   = electricTypeColor(type.tag) ?? type.color ?? "#00E5E5";
          const desc     = type.tagline ?? type.idealFor ?? null;
          const hasImage = !!type.cardImageUrl;

          return (
            <Link
              key={type._id}
              href={`/electrico/${type.slug}`}
              style={{
                width: `min(${CARD_W_MAX}px, calc(100vw - 80px))`,
                minWidth: `min(${CARD_W_MAX}px, calc(100vw - 80px))`,
                maxWidth: CARD_W_MAX,
                height: 420,
                scrollSnapAlign: "start",
              }}
              className="group relative flex flex-col rounded-2xl overflow-hidden flex-shrink-0"
            >
              {/* Background — photo or gradient */}
              {hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sanityImg(type.cardImageUrl, { w: 800, q: 85 })}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(135deg, ${accent}22 0%, #0a0a0a 60%)` }}
                />
              )}

              {/* Dark overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: hasImage
                    ? "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.92) 100%)"
                    : "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)",
                }}
              />

              {/* Top row — tag + icon */}
              <div className="relative flex items-start justify-between p-4">
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-sm"
                  style={{ backgroundColor: `${accent}30`, color: accent, border: `1px solid ${accent}50` }}
                >
                  {type.tag}
                </span>
                <span className="material-symbols-outlined text-[26px] opacity-80" style={{ color: accent }}>
                  {type.icon ?? "bolt"}
                </span>
              </div>

              <div className="flex-1" />

              {/* Bottom content */}
              <div className="relative px-4 pb-4 space-y-2">
                <div>
                  <p className="font-headline font-black text-lg text-white leading-tight tracking-tight line-clamp-1">
                    {type.label}
                  </p>
                  {desc && (
                    <p className="text-[12px] leading-snug mt-1 line-clamp-2" style={{ color: "rgba(255,255,255,0.70)" }}>
                      {desc}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  {type.carCount > 0 ? (
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.50)" }}>
                      {type.carCount} {type.carCount === 1 ? "modelo" : "modelos"}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: accent }}>
                    Ver todos
                    <span className="material-symbols-outlined text-[13px] transition-transform group-hover:translate-x-0.5">
                      arrow_forward
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
