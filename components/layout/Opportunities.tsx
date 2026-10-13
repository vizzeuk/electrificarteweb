"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { CarCard } from "@/components/car/CarCard";
import { useInViewport } from "@/lib/useInViewport";

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
  /** Exactamente los elegidos en Sanity; con la lista vacía el home no monta la sección. */
  cars: OpportunityCarData[];
}

const AUTO_MS = 5000;
/** Cards que avanza cada paso (auto y flechas). */
const STEP_CARDS = 2;

// Ancho de card de esta franja (la maqueta la hace un poco más angosta que la de lanzamientos).
const RAIL_STYLE = { "--rail-w": "280px" } as React.CSSProperties;

export function Opportunities({ title = "Destacados Electrificarte", cars }: OpportunitiesProps) {
  const displayCars = cars;

  // Móvil: todos los autos UNA vez. Antes se mostraban solo 4 (tope contra los cierres por
  // memoria de iOS Safari) y duplicados por el loop. Sin la copia del loop el DOM queda en la
  // mitad y las imágenes son lazy. Mismo criterio que LatestLaunches.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // Escritorio: dos copias seguidas para el loop infinito de las flechas y el autoplay.
  const loopCars = useMemo(() => (isMobile ? displayCars : [...displayCars, ...displayCars]), [displayCars, isMobile]);
  const setCount = displayCars.length;

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
    if (isMobile) return; // sin copia del loop no hay nada que reiniciar
    const onSettled = () => {
      clearTimeout(fallback);
      const setWidth = stepWidth() * setCount;
      if (setWidth > 0 && el.scrollLeft >= setWidth) {
        el.scrollLeft = el.scrollLeft - setWidth;
      }
    };
    el.addEventListener("scrollend", onSettled, { once: true });
    const fallback = setTimeout(onSettled, 900);
  }, [stepWidth, setCount, isMobile]);

  const stopAuto = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startAuto = useCallback(() => {
    stopAuto();
    timerRef.current = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      // Móvil (una sola copia): al llegar al final, vuelve al primero.
      if (isMobile && el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      el.scrollBy({ left: stepWidth() * STEP_CARDS, behavior: "smooth" });
      scheduleReset(el);
    }, AUTO_MS);
  }, [stopAuto, scheduleReset, stepWidth, isMobile]);

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

  return (
    // Blanca entre los tipos (Niebla) y las colecciones (Niebla): el home alterna fondos.
    <section ref={sectionRef} className="section" aria-labelledby="opportunities-title">
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
