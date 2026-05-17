"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { CarCard } from "@/components/car/CarCard";
import { useInViewport } from "@/lib/useInViewport";

export interface LaunchCarData {
  _id?: string;
  name: string;
  slug: string;
  brand: { name: string; slug?: string; logoUrl?: string } | string;
  category?: { name: string } | string;
  imageUrl?: string;
  batteryCapacity?: number | null;
  range?: number | null;
  maxVersionRange?: number | null;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  power?: number | null;
  electricType?: { tag?: string } | null;
  basePrice: number;
  discountPrice?: number;
  isNew?: boolean;
}

interface LatestLaunchesProps {
  title?: string;
  cars?: LaunchCarData[];
}

const FALLBACK_CARS: LaunchCarData[] = [
  { name: "EX30 Pure Electric", slug: "volvo-ex30",     brand: "Volvo", category: "SUV Compacto", batteryCapacity: 51,   range: 480, basePrice: 40500000, discountPrice: 36900000, isNew: true },
  { name: "Tavascan EV",        slug: "cupra-tavascan", brand: "Cupra", category: "SUV Coupé",    batteryCapacity: 77,   range: 520, basePrice: 47590000 },
  { name: "Seal EV Pro",        slug: "byd-seal",       brand: "BYD",   category: "Sedán",        batteryCapacity: 82.6, range: 570, basePrice: 45500000, discountPrice: 38990000 },
];

const CARD_W  = 320;
const GAP     = 24;
const AUTO_MS = 5000;

// On mobile (iOS WebKit specifically) we cap the cards rendered initially.
// iOS Safari has been seen to OOM-crash with 6 carousel cards × decoded
// images in memory. Brave skips speculative decoding so it survives 6 fine.
// Server-rendered count stays at the full set for SEO; client reduces post-
// hydration when matchMedia matches mobile.
const MOBILE_LIMIT = 3;

export function LatestLaunches({ title = "Últimos lanzamientos", cars }: LatestLaunchesProps) {
  const allCars = cars && cars.length > 0 ? cars : FALLBACK_CARS;
  const [limit, setLimit] = useState<number>(allCars.length);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const apply = () => setLimit(mql.matches ? MOBILE_LIMIT : allCars.length);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [allCars.length]);

  const displayCars    = useMemo(() => allCars.slice(0, limit), [allCars, limit]);
  const loopCars       = useMemo(() => [...displayCars, ...displayCars], [displayCars]);
  const singleSetWidth = useMemo(() => displayCars.length * (CARD_W + GAP), [displayCars]);

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef   = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const [canLeft,   setCanLeft]   = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const inView = useInViewport(sectionRef);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setScrollPct(singleSetWidth > 0 ? Math.min(el.scrollLeft / singleSetWidth, 1) : 0);
  }, [singleSetWidth]);

  // Silently reset when past the first copy — uses scrollend + fallback so it
  // never fires mid-animation and interrupts the smooth scroll.
  const scheduleReset = useCallback((el: HTMLElement) => {
    let fallback: ReturnType<typeof setTimeout>;
    const onSettled = () => {
      clearTimeout(fallback);
      if (el.scrollLeft >= singleSetWidth) {
        el.scrollLeft = el.scrollLeft - singleSetWidth;
      }
    };
    el.addEventListener("scrollend", onSettled, { once: true });
    fallback = setTimeout(onSettled, 900);
  }, [singleSetWidth]);

  const stopAuto = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startAuto = useCallback(() => {
    stopAuto();
    timerRef.current = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      el.scrollBy({ left: CARD_W + GAP, behavior: "smooth" });
      scheduleReset(el);
    }, AUTO_MS);
  }, [stopAuto, scheduleReset]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    if (inView) startAuto();
    else        stopAuto();
    return () => {
      el.removeEventListener("scroll", updateArrows);
      stopAuto();
    };
  }, [loopCars, updateArrows, startAuto, stopAuto, inView]);

  function handleArrow(dir: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;
    stopAuto();
    if (dir === "left") {
      if (el.scrollLeft <= 8) {
        el.scrollLeft = singleSetWidth;
      }
      el.scrollBy({ left: -(CARD_W + GAP), behavior: "smooth" });
    } else {
      el.scrollBy({ left: CARD_W + GAP, behavior: "smooth" });
      scheduleReset(el);
    }
    startAuto();
  }

  return (
    <section ref={sectionRef} className="py-20 md:py-24 bg-surface overflow-hidden" aria-labelledby="latest-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Novedades</p>
          <h2 id="latest-title" className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tight">
            {title}
          </h2>
        </div>

        {/* Flex row: [← button] [overflow-hidden track] [→ button] */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleArrow("left")}
            disabled={!canLeft}
            aria-label="Anterior"
            className="hidden sm:flex flex-shrink-0 w-11 h-11 rounded-full bg-black hover:bg-primary text-white hover:text-black items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          </button>

          <div className="flex-1 overflow-hidden">
            <div
              ref={trackRef}
              className="flex gap-6 overflow-x-auto pb-2 hide-scrollbar"
              style={{ scrollSnapType: "x mandatory" }}
              onMouseEnter={stopAuto}
              onMouseLeave={startAuto}
              onTouchStart={stopAuto}
              onTouchEnd={startAuto}
            >
              {loopCars.map((car, i) => {
                const brandObj     = typeof car.brand === "string" ? { name: car.brand } : car.brand;
                const categoryName = car.category
                  ? typeof car.category === "string" ? car.category : car.category.name
                  : undefined;
                return (
                  <div
                    key={`${car._id ?? car.slug}-${i}`}
                    className="flex-shrink-0"
                    style={{ width: CARD_W, scrollSnapAlign: "start" }}
                  >
                    <CarCard
                      name={car.name}
                      brand={brandObj.name}
                      brandLogo={brandObj.logoUrl}
                      slug={car.slug}
                      image={car.imageUrl}
                      category={categoryName}
                      batteryCapacity={car.batteryCapacity}
                      range={car.range}
                      maxVersionRange={car.maxVersionRange}
                      electricRangeKm={car.electricRangeKm}
                      fuelConsumption={car.fuelConsumption}
                      rendimientoElectrico={car.rendimientoElectrico}
                      electricTypeTag={car.electricType?.tag}
                      power={car.power}
                      basePrice={car.basePrice}
                      discountPrice={car.discountPrice}
                      isNew={car.isNew}
                      index={i % displayCars.length}
                      compact
                      noAnimate
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => handleArrow("right")}
            aria-label="Siguiente"
            className="hidden sm:flex flex-shrink-0 w-11 h-11 rounded-full bg-black hover:bg-primary text-white hover:text-black items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[22px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Progress bar — mobile only */}
      <div className="md:hidden mx-4 mt-5">
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ width: `${Math.max(scrollPct * 100, 8)}%`, backgroundColor: "#00E5E5" }}
          />
        </div>
      </div>
    </section>
  );
}
