"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { CarCard } from "@/components/car/CarCard";
import { useInViewport } from "@/lib/useInViewport";
import { Icon } from "@/components/ui/Icon";

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

  const displayCars = useMemo(() => allCars.slice(0, limit), [allCars, limit]);
  // Dos copias seguidas para el loop infinito.
  const loopCars    = useMemo(() => [...displayCars, ...displayCars], [displayCars]);
  const setCount    = displayCars.length;

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef   = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const inView = useInViewport(sectionRef);

  // Paso de una card (ancho + gap), medido del DOM: el ancho lo decide el CSS del
  // .rail (296 px en desktop, hasta 300 px en móvil) y el gap cambia con el viewport.
  const stepWidth = useCallback(() => {
    const el    = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 0;
    return first.getBoundingClientRect().width + (parseFloat(getComputedStyle(el).columnGap) || 0);
  }, []);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
  }, []);

  // Silently reset when past the first copy — uses scrollend + fallback so it
  // never fires mid-animation and interrupts the smooth scroll.
  const scheduleReset = useCallback((el: HTMLElement) => {
    const onSettled = () => {
      clearTimeout(fallback);
      const setWidth = stepWidth() * setCount;
      if (setWidth > 0 && el.scrollLeft >= setWidth) {
        el.scrollLeft = el.scrollLeft - setWidth;
      }
    };
    el.addEventListener("scrollend", onSettled, { once: true });
    const fallback = setTimeout(onSettled, 900);
  }, [stepWidth, setCount]);

  const stopAuto = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startAuto = useCallback(() => {
    stopAuto();
    timerRef.current = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      el.scrollBy({ left: stepWidth(), behavior: "smooth" });
      scheduleReset(el);
    }, AUTO_MS);
  }, [stopAuto, scheduleReset, stepWidth]);

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
    const step = stepWidth();
    if (dir === "left") {
      if (el.scrollLeft <= 8) {
        el.scrollLeft = step * setCount;
      }
      el.scrollBy({ left: -step, behavior: "smooth" });
    } else {
      el.scrollBy({ left: step, behavior: "smooth" });
      scheduleReset(el);
    }
    startAuto();
  }

  return (
    <section ref={sectionRef} className="section section--subtle" aria-labelledby="latest-title">
      <div className="wrap section-head">
        <div className="section-head__text">
          <h2 id="latest-title" className="t-h2">{title}</h2>
          <p className="t-lead">Lo más nuevo que entró al catálogo, con precio de lista y specs clave.</p>
        </div>
        {/* Flechas: ocultas en móvil (ahí se desliza con el dedo). */}
        <div className="section-head__side">
          <button
            type="button"
            data-rail-prev="rail-latest"
            onClick={() => handleArrow("left")}
            disabled={!canLeft}
            aria-label="Anterior"
            className="btn btn--secondary btn--icon btn--sm"
          >
            <Icon name="chevron_left" size="none" />
          </button>
          <button
            type="button"
            data-rail-next="rail-latest"
            onClick={() => handleArrow("right")}
            aria-label="Siguiente"
            className="btn btn--secondary btn--icon btn--sm"
          >
            <Icon name="chevron_right" size="none" />
          </button>
        </div>
      </div>

      {/* La primera card se alinea con el contenedor; el resto sale por la derecha. */}
      <div
        ref={trackRef}
        id="rail-latest"
        className="rail"
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
            <div key={`${car._id ?? car.slug}-${i}`}>
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
                index={i % setCount}
                maxStats={2}
                noAnimate
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
