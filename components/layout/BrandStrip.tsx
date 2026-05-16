"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { sanityImg } from "@/lib/sanityImage";

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

export function BrandStrip({ brands }: BrandStripProps) {
  if (brands.length === 0) return null;

  const trackRef = useRef<HTMLDivElement>(null);
  const [visibleBrands, setVisibleBrands] = useState<BrandStripItem[]>(
    () => brands.slice(0, INITIAL_COUNT),
  );

  useEffect(() => {
    if (brands.length <= INITIAL_COUNT) return;
    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const mountAll = () => {
      if (cancelled) return;
      setVisibleBrands(brands);
    };

    if (typeof (window as any).requestIdleCallback === "function") {
      idleId = (window as any).requestIdleCallback(mountAll, { timeout: 3000 });
    } else {
      timeoutId = setTimeout(mountAll, 2000);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (idleId && typeof (window as any).cancelIdleCallback === "function") {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, [brands]);

  const items = [...visibleBrands, ...visibleBrands];

  return (
    <section className="bg-white py-10 border-t border-gray-100" aria-label="Marcas con las que trabajamos">
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-7">
        <div className="flex items-center gap-3">
          <span className="text-black/25 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap">
            Trabajamos con
          </span>
          <div className="flex-1 h-px bg-black/[0.07]" />
          <span className="text-black/25 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap">
            {brands.length}+ marcas
          </span>
        </div>
      </div>

      <div
        style={{ overflow: "hidden" }}
        onMouseEnter={() => trackRef.current?.classList.add("marquee-paused")}
        onMouseLeave={() => trackRef.current?.classList.remove("marquee-paused")}
      >
        <div ref={trackRef} className="marquee-left" style={{ display: "flex", width: "max-content", alignItems: "center" }}>
          {items.map((brand, i) => (
            <BrandLogo key={`${brand.slug}-${i}`} brand={brand} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandLogo({ brand }: { brand: BrandStripItem }) {
  return (
    <Link
      href={`/marcas/${brand.slug}`}
      title={brand.name}
      className="mx-4 flex-shrink-0 flex items-center justify-center rounded-2xl px-5 py-3 transition-all duration-300 hover:scale-[1.06] active:scale-[0.97] group"
      style={{ height: 64, minWidth: 104, maxWidth: 156 }}
    >
      {brand.logoUrl ? (
        <img
          src={sanityImg(brand.logoUrl, { w: 200, q: 85 })}
          alt={brand.name}
          width={120}
          height={40}
          className="max-h-10 max-w-full w-auto object-contain transition-all duration-300"
          loading="lazy"
          decoding="async"
          style={{ opacity: 0.65 }}
          onMouseEnter={e => {
            const img = e.currentTarget as HTMLImageElement;
            img.style.opacity = "1";
            img.style.filter = "drop-shadow(0 2px 8px rgba(0,0,0,0.12))";
          }}
          onMouseLeave={e => {
            const img = e.currentTarget as HTMLImageElement;
            img.style.opacity = "0.65";
            img.style.filter = "";
          }}
        />
      ) : (
        <span className="text-black/40 group-hover:text-primary-deep text-[11px] font-headline font-black uppercase tracking-widest text-center leading-tight transition-colors duration-200">
          {brand.name}
        </span>
      )}
    </Link>
  );
}
