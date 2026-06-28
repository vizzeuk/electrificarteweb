"use client";

import React, { useState, useMemo } from "react";
import { m } from "framer-motion";
import Link from "next/link";
import { getBrandCountry } from "@/lib/utils/brand-country";

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  country?: string;
  accentColor?: string;
  isFeatured?: boolean;
  carCount: number;
}

export function MarcasGrid({ brands }: { brands: Brand[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "featured">("all");

  const filtered = useMemo(() => {
    let list = filter === "featured" ? brands.filter((b) => b.isFeatured) : [...brands];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          getBrandCountry(b.slug, b.country).toLowerCase().includes(q),
      );
    }
    return list;
  }, [brands, search, filter]);

  return (
    <>
      {/* Search + filters */}
      <section className="sticky top-16 md:top-20 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost text-[18px]">
              search
            </span>
            <input
              type="search"
              placeholder="Buscar marca o país..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 bg-surface"
            />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {(["all", "featured"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
                  filter === f ? "bg-primary text-black" : "bg-surface text-text-muted hover:text-text-main",
                ].join(" ")}
              >
                {f === "all" ? "Todas" : "Destacadas"}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-ghost flex-shrink-0">
            {filtered.length} {filtered.length === 1 ? "marca" : "marcas"}
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-gray-200 block mb-3">search_off</span>
              <p className="text-text-muted font-medium">No hay marcas con ese nombre.</p>
              <button
                onClick={() => setSearch("")}
                className="mt-4 text-primary-deep text-sm font-semibold hover:text-primary transition-colors"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.map((brand, i) => {
                const color = brand.accentColor ?? "#1a1a1a";
                const country = getBrandCountry(brand.slug, brand.country);
                return (
                  <m.div
                    key={brand._id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: (i % 12) * 0.04 }}
                  >
                    <Link
                      href={`/marcas/${brand.slug}`}
                      className="relative group flex flex-col items-center p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary/40 hover:shadow-lg hover:shadow-black/5 transition-all duration-300 h-full text-center"
                    >
                      <div className="w-full h-28 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105 flex-shrink-0">
                        {brand.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={brand.logoUrl}
                            alt={`Logo ${brand.name}`}
                            className="max-h-24 max-w-full object-contain"
                          />
                        ) : (
                          <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-headline font-black"
                            style={{ backgroundColor: color }}
                          >
                            {brand.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <p className="font-headline font-black text-sm text-text-main group-hover:text-primary-deep transition-colors leading-tight mb-1">
                        {brand.name}
                      </p>
                      {country && (
                        <p className="text-[10px] text-text-ghost uppercase tracking-wide mb-2">{country}</p>
                      )}
                      <span className="mt-auto inline-flex items-center gap-0.5 text-[10px] font-bold text-text-ghost bg-surface px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[11px]">directions_car</span>
                        {brand.carCount} {brand.carCount === 1 ? "modelo" : "modelos"}
                      </span>
                      {brand.isFeatured && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" title="Destacada" />
                      )}
                    </Link>
                  </m.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
