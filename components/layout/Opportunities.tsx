"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatCLP } from "@/lib/utils";

export interface OpportunityCarData {
  _id?: string;
  name: string;
  slug: string;
  brand?: { name: string } | string;
  category?: { name: string } | string;
  imageUrl?: string;
  basePrice: number;
  discountPrice?: number;
  range?: number;
  batteryCapacity?: number;
  power?: number;
  isNew?: boolean;
  isHotDeal?: boolean;
}

interface OpportunitiesProps {
  title?: string;
  cars?: OpportunityCarData[];
}

const FALLBACK: OpportunityCarData[] = [
  { name: "MG Marvel R",      slug: "mg-marvel-r",      brand: "MG",    category: "SUV",          basePrice: 40500000, discountPrice: 29390000, range: 402, batteryCapacity: 70,  power: 288 },
  { name: "JAC E30X",         slug: "jac-e30x",         brand: "JAC",   category: "City Car",     basePrice: 22990000, discountPrice: 19590000, range: 322, batteryCapacity: 42,  power: 150 },
  { name: "BYD Yuan Plus",    slug: "byd-yuan-plus",    brand: "BYD",   category: "SUV Compacto", basePrice: 32500000, discountPrice: 22890000, range: 410, batteryCapacity: 60,  power: 204 },
  { name: "Tesla Model 3",    slug: "tesla-model-3",    brand: "Tesla", category: "Sedán",        basePrice: 48590000, discountPrice: 39990000, range: 513, batteryCapacity: 75,  power: 283 },
  { name: "Hyundai IONIQ 5",  slug: "hyundai-ioniq-5",  brand: "Hyundai", category: "SUV",        basePrice: 55990000, discountPrice: 44990000, range: 481, batteryCapacity: 77,  power: 225 },
  { name: "BYD Seal",         slug: "byd-seal",         brand: "BYD",   category: "Sedán",        basePrice: 42990000, discountPrice: 35990000, range: 570, batteryCapacity: 82,  power: 313 },
];

const CARD_W = 280; // px — card width
const GAP    = 16;  // px — gap between cards

export function Opportunities({ title = "Destacados Electrificarte", cars }: OpportunitiesProps) {
  const displayCars = cars && cars.length > 0 ? cars : FALLBACK;
  const trackRef    = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);

  function updateArrows() {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    return () => el.removeEventListener("scroll", updateArrows);
  }, [displayCars]);

  function scroll(dir: "left" | "right") {
    trackRef.current?.scrollBy({
      left: dir === "right" ? (CARD_W + GAP) * 2 : -(CARD_W + GAP) * 2,
      behavior: "smooth",
    });
  }

  return (
    <section className="py-20 md:py-24 overflow-hidden" aria-labelledby="opportunities-title">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">
              Selección exclusiva
            </p>
            <h2
              id="opportunities-title"
              className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tighter"
            >
              {title ?? "Destacados Electrificarte"}
            </h2>
          </div>

          {/* Desktop nav arrows */}
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

      {/* Carousel track — full width, overflows viewport */}
      <div className="relative">
        {/* Left fade */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 transition-opacity duration-200"
          style={{
            background: "linear-gradient(to right, white, transparent)",
            opacity: canLeft ? 1 : 0,
          }}
        />
        {/* Right fade */}
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 transition-opacity duration-200"
          style={{
            background: "linear-gradient(to left, white, transparent)",
            opacity: canRight ? 1 : 0,
          }}
        />

        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            paddingLeft: "max(1rem, calc((100vw - 1280px) / 2 + 2rem))",
            paddingRight: "max(1rem, calc((100vw - 1280px) / 2 + 2rem))",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          {displayCars.map((deal) => {
            const brandName    = deal.brand    ? (typeof deal.brand    === "string" ? deal.brand    : deal.brand.name)    : "";
            const categoryName = deal.category ? (typeof deal.category === "string" ? deal.category : deal.category.name) : "";
            const hasDiscount  = deal.discountPrice && deal.discountPrice < deal.basePrice;
            const discountPct  = hasDiscount
              ? Math.round(((deal.basePrice - deal.discountPrice!) / deal.basePrice) * 100)
              : 0;

            return (
              <article
                key={deal._id ?? deal.slug}
                style={{ minWidth: CARD_W, scrollSnapAlign: "start" }}
                className="group relative border border-gray-100 bg-white rounded-xl flex flex-col hover:border-primary/40 hover:shadow-md transition-all duration-300"
              >
                {/* Image */}
                <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-xl overflow-hidden relative">
                  {deal.imageUrl ? (
                    <img
                      src={deal.imageUrl}
                      alt={`${brandName} ${deal.name}`}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Icon name="electric_car" className="text-gray-200 mb-2" size="xl" />
                      <span className="text-[10px] uppercase tracking-widest text-text-ghost font-bold">
                        {categoryName}
                      </span>
                    </div>
                  )}
                  {deal.isNew && (
                    <span className="absolute top-3 left-3 bg-primary text-black text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Nuevo
                    </span>
                  )}
                  {hasDiscount && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      -{discountPct}%
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-text-ghost font-bold mb-0.5">{brandName}</p>
                  <h3 className="font-headline font-bold text-sm mb-3 leading-tight">
                    {deal.name}
                  </h3>

                  {/* Spec strip */}
                  <div className="flex gap-2 mb-3">
                    {deal.range && (
                      <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-[10px] text-text-ghost leading-none mb-0.5">Autonomía</p>
                        <p className="text-xs font-bold text-text leading-none">{deal.range} km</p>
                      </div>
                    )}
                    {deal.batteryCapacity && (
                      <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-[10px] text-text-ghost leading-none mb-0.5">Batería</p>
                        <p className="text-xs font-bold text-text leading-none">{deal.batteryCapacity} kWh</p>
                      </div>
                    )}
                    {deal.power && (
                      <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-[10px] text-text-ghost leading-none mb-0.5">Potencia</p>
                        <p className="text-xs font-bold text-text leading-none">{deal.power} CV</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 mb-4">
                    {hasDiscount && (
                      <div className="flex justify-between text-xs text-text-ghost">
                        <span>Precio lista</span>
                        <span className="line-through">{formatCLP(deal.basePrice)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold">{hasDiscount ? "Con descuento" : "Precio"}</span>
                      <span className="text-base font-headline font-black text-primary-deep">
                        {formatCLP(deal.discountPrice ?? deal.basePrice)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-2">
                    <Link
                      href={`/auto/${deal.slug}`}
                      className="flex-1 py-2.5 bg-primary hover:bg-primary-dark font-bold text-xs rounded-lg text-center transition-colors text-black after:absolute after:inset-0"
                    >
                      Ver detalle
                    </Link>
                    <Link
                      href={`/comparador?add=${deal.slug}`}
                      title="Comparar"
                      className="relative z-[1] px-3 border border-gray-200 hover:border-primary/40 text-text-muted hover:text-primary-deep rounded-lg flex items-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">compare</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Mobile nav arrows */}
      <div className="flex md:hidden justify-center gap-3 mt-4 px-4">
        <button
          onClick={() => scroll("left")}
          disabled={!canLeft}
          aria-label="Anterior"
          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        <button
          onClick={() => scroll("right")}
          disabled={!canRight}
          aria-label="Siguiente"
          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>
    </section>
  );
}
