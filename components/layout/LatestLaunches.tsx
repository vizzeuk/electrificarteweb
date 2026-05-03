"use client";

import { useRef, useState, useEffect } from "react";
import { CarCard } from "@/components/car/CarCard";

export interface LaunchCarData {
  _id?: string;
  name: string;
  slug: string;
  brand: { name: string; slug: string } | string;
  category?: { name: string } | string;
  imageUrl?: string;
  batteryCapacity: number;
  range: number;
  basePrice: number;
  discountPrice?: number;
  isNew?: boolean;
}

interface LatestLaunchesProps {
  title?: string;
  cars?: LaunchCarData[];
}

const FALLBACK_CARS: LaunchCarData[] = [
  { name: "EX30 Pure Electric", slug: "volvo-ex30", brand: "Volvo", category: "SUV Compacto", batteryCapacity: 51, range: 480, basePrice: 40500000, discountPrice: 36900000, isNew: true },
  { name: "Tavascan EV",        slug: "cupra-tavascan", brand: "Cupra", category: "SUV Coupé", batteryCapacity: 77, range: 520, basePrice: 47590000 },
  { name: "Seal EV Pro",        slug: "byd-seal", brand: "BYD", category: "Sedán", batteryCapacity: 82.6, range: 570, basePrice: 45500000, discountPrice: 38990000 },
];

const CARD_W = 320;
const GAP    = 24;

export function LatestLaunches({ title = "Últimos lanzamientos", cars }: LatestLaunchesProps) {
  const displayCars = cars && cars.length > 0 ? cars : FALLBACK_CARS;
  const trackRef    = useRef<HTMLDivElement>(null);
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
  }, [displayCars]);

  function scroll(dir: "left" | "right") {
    trackRef.current?.scrollBy({
      left: dir === "right" ? CARD_W + GAP : -(CARD_W + GAP),
      behavior: "smooth",
    });
  }

  return (
    <section className="py-20 md:py-24 bg-surface overflow-hidden" aria-labelledby="latest-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Novedades</p>
            <h2 id="latest-title" className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tight">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <a href="/marcas" className="text-sm font-medium text-primary-deep hover:text-primary transition-colors">
              Ver todos &rarr;
            </a>
            {/* Nav arrows — desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scroll("left")}
                disabled={!canLeft}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-primary/40 hover:enabled:bg-primary/5"
                aria-label="Anterior"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canRight}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:border-primary/40 hover:enabled:bg-primary/5"
                aria-label="Siguiente"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Carousel track */}
        <div
          ref={trackRef}
          className="flex gap-6 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-8 md:px-8 hide-scrollbar scroll-smooth"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {displayCars.map((car, i) => {
            const brandName = typeof car.brand === "string" ? car.brand : car.brand.name;
            const categoryName = car.category ? (typeof car.category === "string" ? car.category : car.category.name) : undefined;
            return (
              <div
                key={car._id ?? car.slug}
                className="flex-shrink-0"
                style={{ width: CARD_W, scrollSnapAlign: "start" }}
              >
                <CarCard
                  name={car.name}
                  brand={brandName}
                  slug={car.slug}
                  image={car.imageUrl}
                  category={categoryName}
                  batteryCapacity={car.batteryCapacity}
                  range={car.range}
                  basePrice={car.basePrice}
                  discountPrice={car.discountPrice}
                  isNew={car.isNew}
                  index={i}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
