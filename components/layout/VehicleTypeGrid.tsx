"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";

export interface ElectricTypeItem {
  _id: string;
  slug: string;
  label: string;
  tag: string;
  color?: string;
  icon?: string;
  tagline?: string;
  idealFor?: string;
  carCount: number;
}

interface ElectricTypeGridProps {
  types: ElectricTypeItem[];
}

const CARD_W = 300;
const GAP    = 16;

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
    trackRef.current?.scrollBy({
      left: dir === "right" ? CARD_W + GAP : -(CARD_W + GAP),
      behavior: "smooth",
    });
  }

  return (
    <section className="py-14 bg-gray-50 border-t border-gray-100" aria-labelledby="electric-types-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">
              Tecnologías disponibles
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

      {/* Carousel track */}
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
          const accent = type.color ?? "#00E5E5";
          const desc   = type.tagline ?? type.idealFor ?? null;

          return (
            <Link
              key={type._id}
              href={`/electrico/${type.slug}`}
              style={{ minWidth: CARD_W, scrollSnapAlign: "start" }}
              className="group flex flex-col gap-3 bg-white border border-gray-100 hover:border-gray-300 hover:shadow-md rounded-2xl p-5 transition-all duration-200 flex-shrink-0"
            >
              {/* Tag + icon */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${accent}20`, color: accent }}
                >
                  {type.tag}
                </span>
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ color: `${accent}99` }}
                >
                  {type.icon ?? "bolt"}
                </span>
              </div>

              {/* Label + description */}
              <div>
                <p className="font-headline font-bold text-sm text-text-main leading-tight mb-1">
                  {type.label}
                </p>
                {desc && (
                  <p className="text-[11px] text-text-ghost leading-snug line-clamp-2">
                    {desc}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                {type.carCount > 0 ? (
                  <span className="text-[10px] text-text-ghost">
                    {type.carCount} {type.carCount === 1 ? "modelo" : "modelos"}
                  </span>
                ) : (
                  <span />
                )}
                <span
                  className="text-[10px] font-bold flex items-center gap-0.5"
                  style={{ color: accent }}
                >
                  Ver todos
                  <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
