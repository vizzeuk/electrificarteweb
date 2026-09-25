"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { sanityImg } from "@/lib/sanityImage";
import { useInViewport } from "@/lib/useInViewport";

export interface BrandStripItem {
  slug: string;
  name: string;
  accentColor?: string;
  logoUrl?: string;
}

interface BrandStripProps {
  brands: BrandStripItem[];
}

// Show the first N brands immediately; defer the rest until the browser is
// idle. On mobile Safari, rendering 98 logo nodes (49 × 2 for the marquee
// duplication) blocks the initial paint and dominates layout time on the
// main thread. Showing 24 first (12 × 2 duplicated) keeps the marquee
// visually continuous while cutting the initial DOM by ~75%.
const INITIAL_COUNT = 12;

/** Alto del logo en la franja (lo fija `.marquee img` en app/styles/home.css). */
const LOGO_H = 32;

/**
 * Las URLs de Sanity traen las dimensiones del original (`…-2400x1260.webp`). Con ellas
 * reservamos el ancho exacto de cada logo antes de que cargue: si el ancho cambiara al
 * cargar (son lazy), la pista cambiaría de largo en pleno movimiento y el marquee saltaría.
 */
function logoSize(url: string): { width: number; height: number } | undefined {
  const m = url.match(/-(\d+)x(\d+)\.[a-z0-9]+(?:\?|$)/i);
  if (!m) return undefined;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return undefined;
  return { width: Math.round((LOGO_H * w) / h), height: LOGO_H };
}

/**
 * Franja de marcas bajo el hero: el total del catálogo a la izquierda y un marquee de
 * logos en gris. Solo entran las marcas con logo (las que no tienen igual suman al total).
 */
export function BrandStrip({ brands }: BrandStripProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const inView     = useInViewport(sectionRef);
  const logoBrands = useMemo(() => brands.filter((b) => !!b.logoUrl), [brands]);
  const [visibleBrands, setVisibleBrands] = useState<BrandStripItem[]>(
    () => logoBrands.slice(0, INITIAL_COUNT),
  );

  useEffect(() => {
    if (logoBrands.length <= INITIAL_COUNT) return;
    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const mountAll = () => {
      if (cancelled) return;
      setVisibleBrands(logoBrands);
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(mountAll, { timeout: 3000 });
    } else {
      timeoutId = setTimeout(mountAll, 2000);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (idleId && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [logoBrands]);

  if (logoBrands.length === 0) return null;

  const items = [...visibleBrands, ...visibleBrands];

  // La animación corre SOLO cuando ya montaron todas las marcas — así nunca
  // cambia el ancho de la pista en pleno movimiento (eso causaba el salto) — y
  // solo con la franja en pantalla: una animación infinita fuera de vista hace
  // repintar sin parar a iOS Safari. El hover la pausa desde el CSS (.marquee:hover).
  // Su duración es proporcional a la cantidad de logos, por lo que la
  // velocidad es constante sin importar cuántas marcas haya.
  const allMounted = visibleBrands.length >= logoBrands.length;
  const running = allMounted && inView;
  const marqueeDuration = Math.round(visibleBrands.length * 1.15);

  return (
    <section ref={sectionRef} className="section--tight brands" aria-label="Marcas del catálogo">
      <div className="wrap brands__in">
        <p className="brands__label">
          <strong>{brands.length} marcas</strong>en el catálogo
        </p>
        <div className="marquee">
          <div
            className="marquee__track"
            style={{
              animationDuration: `${marqueeDuration}s`,
              ...(running ? null : { animationPlayState: "paused" }),
            }}
          >
            {items.map((brand, i) => (
              <BrandLogo key={`${brand.slug}-${i}`} brand={brand} duplicate={i >= visibleBrands.length} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** `duplicate`: la segunda copia del marquee existe solo para el loop; se oculta al lector y al tab. */
function BrandLogo({ brand, duplicate }: { brand: BrandStripItem; duplicate: boolean }) {
  const size = brand.logoUrl ? logoSize(brand.logoUrl) : undefined;
  return (
    <Link
      href={`/marcas/${brand.slug}`}
      title={brand.name}
      aria-hidden={duplicate || undefined}
      tabIndex={duplicate ? -1 : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sanityImg(brand.logoUrl, { w: 240, q: 85 })}
        alt={brand.name}
        width={size?.width}
        height={size?.height}
        loading="lazy"
        decoding="async"
      />
    </Link>
  );
}
