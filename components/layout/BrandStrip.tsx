"use client";

import Link from "next/link";

export interface BrandStripItem {
  slug: string;
  name: string;
  accentColor?: string;
  logoUrl?: string;
}

interface BrandStripProps {
  brands: BrandStripItem[];
}

export function BrandStrip({ brands }: BrandStripProps) {
  if (brands.length === 0) return null;

  const items = [...brands, ...brands];

  return (
    <section className="bg-black py-6 border-t border-white/[0.07]" aria-label="Marcas con las que trabajamos">
      {/* Label */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-white/25 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap">
            Trabajamos con
          </span>
          <div className="flex-1 h-px bg-white/[0.07]" />
          <span className="text-white/25 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap">
            {brands.length}+ marcas
          </span>
        </div>
      </div>

      {/* Single marquee row */}
      <div style={{ overflow: "hidden" }}>
        <div className="marquee-left" style={{ display: "flex", width: "max-content" }}>
          {items.map((brand, i) => (
            <BrandPill key={`${brand.slug}-${i}`} brand={brand} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandPill({ brand }: { brand: BrandStripItem }) {
  const color   = brand.accentColor || "#00E5E5";
  const initial = brand.name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/marcas/${brand.slug}`}
      title={brand.name}
      className="mx-2 flex items-center justify-center w-20 h-20 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.10] hover:border-white/20 transition-all duration-200 flex-shrink-0 group"
    >
      {brand.logoUrl ? (
        <img
          src={brand.logoUrl}
          alt={brand.name}
          className="w-12 h-12 object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-200"
          loading="lazy"
        />
      ) : (
        <span
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-headline font-black text-white opacity-70 group-hover:opacity-100 transition-opacity duration-200"
          style={{ backgroundColor: color + "33" }}
        >
          {initial}
        </span>
      )}
    </Link>
  );
}
