"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { CarCard } from "@/components/car/CarCard";
import { useInViewport } from "@/lib/useInViewport";
import { HOT_DEALS_ENABLED } from "@/lib/products";

export interface OpportunityCarData {
  _id?: string;
  name: string;
  slug: string;
  brand?: { name: string } | string;
  category?: { name: string } | string;
  imageUrl?: string;
  basePrice: number;
  discountPrice?: number;
  range?: number | null;
  maxVersionRange?: number | null;
  batteryCapacity?: number | null;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  power?: number | null;
  isNew?: boolean;
  isHotDeal?: boolean;
  electricType?: { tag?: string } | null;
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

const AUTO_MS = 5000;
/** Cards que avanza cada paso (auto y flechas). */
const STEP_CARDS = 2;

// Mobile cap: iOS WebKit may OOM with 8 decoded car images simultaneously.
// SSR keeps the full set for SEO; client reduces after hydration on mobile.
const MOBILE_LIMIT = 4;

// Ancho de card de esta franja (la maqueta la hace un poco más angosta que la de lanzamientos).
const RAIL_STYLE = { "--rail-w": "280px" } as React.CSSProperties;

export function Opportunities({ title = "Destacados Electrificarte", cars }: OpportunitiesProps) {
  const allCars = cars && cars.length > 0 ? cars : FALLBACK;
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
  // Double items for seamless infinite loop
  const loopCars    = useMemo(() => [...displayCars, ...displayCars], [displayCars]);
  const setCount    = displayCars.length;

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef   = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const inView = useInViewport(sectionRef);

  // Paso de una card (ancho + gap), medido del DOM: el gap del .rail cambia con el viewport.
  const stepWidth = useCallback(() => {
    const el    = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 0;
    return first.getBoundingClientRect().width + (parseFloat(getComputedStyle(el).columnGap) || 0);
  }, []);

  const updateState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
  }, []);

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
      el.scrollBy({ left: stepWidth() * STEP_CARDS, behavior: "smooth" });
      scheduleReset(el);
    }, AUTO_MS);
  }, [stopAuto, scheduleReset, stepWidth]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateState();
    el.addEventListener("scroll", updateState, { passive: true });
    if (inView) startAuto();
    else        stopAuto();
    return () => {
      el.removeEventListener("scroll", updateState);
      stopAuto();
    };
  }, [loopCars, updateState, startAuto, stopAuto, inView]);

  function scroll(dir: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;
    const step = stepWidth();
    if (dir === "left") {
      if (el.scrollLeft <= 8) el.scrollLeft = step * setCount;
      el.scrollBy({ left: -step * STEP_CARDS, behavior: "smooth" });
    } else {
      el.scrollBy({ left: step * STEP_CARDS, behavior: "smooth" });
      scheduleReset(el);
    }
  }

  // Con la Oferta destacada apagada, esta sección queda pegada a la de tipos (ambas en
  // blanco): una línea fina las separa. Con la banda oscura de por medio no hace falta.
  const sectionClass = HOT_DEALS_ENABLED ? "section" : "section section--rule";

  return (
    <section ref={sectionRef} className={sectionClass} aria-labelledby="opportunities-title">
      <div className="wrap section-head">
        <div className="section-head__text">
          <p className="chip mb-4">Publicidad</p>
          <h2 id="opportunities-title" className="t-h2">
            {title ?? "Destacados Electrificarte"}
          </h2>
        </div>

        {/* Flechas: ocultas en móvil (ahí se desliza con el dedo). */}
        <div className="section-head__side">
          <button
            type="button"
            data-rail-prev="rail-opportunities"
            onClick={() => { stopAuto(); scroll("left"); startAuto(); }}
            disabled={!canLeft}
            aria-label="Anterior"
            className="btn btn--secondary btn--icon btn--sm"
          >
            <Icon name="chevron_left" size="none" />
          </button>
          <button
            type="button"
            data-rail-next="rail-opportunities"
            onClick={() => { stopAuto(); scroll("right"); startAuto(); }}
            aria-label="Siguiente"
            className="btn btn--secondary btn--icon btn--sm"
          >
            <Icon name="chevron_right" size="none" />
          </button>
        </div>
      </div>

      {/* Móvil: la primera card se alinea con el título y el resto sale por la derecha. Escritorio: contenido en el ancho de la página (ver .rail en home.css). */}
      <div
        ref={trackRef}
        id="rail-opportunities"
        className="rail"
        style={RAIL_STYLE}
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        onTouchStart={stopAuto}
        onTouchEnd={startAuto}
      >
        {loopCars.map((deal, loopIdx) => {
          const brandName    = deal.brand    ? (typeof deal.brand    === "string" ? deal.brand    : deal.brand.name)    : "";
          const categoryName = deal.category ? (typeof deal.category === "string" ? deal.category : deal.category.name) : undefined;
          return (
            <div key={`${deal._id ?? deal.slug}-${loopIdx}`}>
              <CarCard
                name={deal.name}
                brand={brandName}
                slug={deal.slug}
                image={deal.imageUrl}
                category={categoryName}
                batteryCapacity={deal.batteryCapacity}
                range={deal.range}
                maxVersionRange={deal.maxVersionRange}
                electricRangeKm={deal.electricRangeKm}
                fuelConsumption={deal.fuelConsumption}
                rendimientoElectrico={deal.rendimientoElectrico}
                electricTypeTag={deal.electricType?.tag}
                power={deal.power}
                basePrice={deal.basePrice}
                discountPrice={deal.discountPrice}
                isNew={deal.isNew}
                index={loopIdx % setCount}
                maxStats={3}
                noAnimate
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
