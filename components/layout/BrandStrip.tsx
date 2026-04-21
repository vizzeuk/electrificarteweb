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
    <section className="bg-black py-8 border-t border-white/[0.07]" aria-label="Marcas con las que trabajamos">
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-6">
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

      <div style={{ overflow: "hidden" }}>
        <div className="marquee-left" style={{ display: "flex", width: "max-content", alignItems: "center" }}>
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
          src={brand.logoUrl}
          alt={brand.name}
          className="max-h-10 max-w-full w-auto object-contain transition-all duration-300 group-hover:opacity-100"
          style={{
            opacity: 0.55,
            filter: "invert(1)",
            mixBlendMode: "screen",
          }}
          onMouseEnter={e => {
            const img = e.currentTarget as HTMLImageElement;
            img.style.filter = "invert(1) drop-shadow(0 0 8px rgba(0,229,229,0.95)) drop-shadow(0 0 22px rgba(0,229,229,0.5))";
            img.style.opacity = "1";
          }}
          onMouseLeave={e => {
            const img = e.currentTarget as HTMLImageElement;
            img.style.filter = "invert(1)";
            img.style.opacity = "0.55";
          }}
          loading="lazy"
        />
      ) : (
        <span className="text-white/40 group-hover:text-primary text-[11px] font-headline font-black uppercase tracking-widest text-center leading-tight transition-colors duration-200">
          {brand.name}
        </span>
      )}
    </Link>
  );
}
