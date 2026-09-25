"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { getBrandCountry } from "@/lib/utils/brand-country";
import { sanityImg } from "@/lib/sanityImage";
import { Icon } from "@/components/ui/Icon";

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  country?: string;
  /** Ya no se usa: el sistema v1 no tiene un color por marca. */
  accentColor?: string;
  isFeatured?: boolean;
  carCount: number;
}

/**
 * Buscador y grilla de marcas (sistema v1): barra fija bajo la navegación en escritorio con
 * el campo de búsqueda, dos pills (todas / destacadas) y el contador; cards con hairline y
 * logos en gris (excepción registrada en la guía de marca).
 */
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
      {/* Buscador + filtro */}
      <section className="z-30 border-b border-line bg-canvas md:sticky md:top-18" aria-label="Buscar marcas">
        <div className="wrap flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[18px] text-ink-3" />
            <input
              type="search"
              placeholder="Buscar marca o país"
              aria-label="Buscar marca o país"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:flex-1">
            <div className="flex gap-2" role="group" aria-label="Mostrar">
              {(["all", "featured"] as const).map((f) => (
                <button key={f} type="button" className="pill" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f === "all" ? "Todas" : "Destacadas"}
                </button>
              ))}
            </div>
            <p className="results__count m-0" aria-live="polite">
              <strong>{filtered.length}</strong> {filtered.length === 1 ? "marca" : "marcas"}
            </p>
          </div>
        </div>
      </section>

      {/* Grilla */}
      <section className="section">
        <div className="wrap">
          {filtered.length === 0 ? (
            <p className="empty">
              No hay marcas con ese nombre.{" "}
              <button type="button" className="clear-all" onClick={() => setSearch("")}>
                Limpiar búsqueda
              </button>
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((brand) => {
                const country = getBrandCountry(brand.slug, brand.country);
                return (
                  <Link key={brand._id} href={`/marcas/${brand.slug}`} className="card group relative flex h-full flex-col text-center">
                    <span className="flex h-28 items-center justify-center px-5 pt-5">
                      {brand.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sanityImg(brand.logoUrl, { w: 240, q: 90 })}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="max-h-16 max-w-full object-contain opacity-70 grayscale transition-opacity group-hover:opacity-100"
                        />
                      ) : (
                        <Icon name="directions_car" className="text-[40px] text-line-2" />
                      )}
                    </span>
                    <span className="flex flex-1 flex-col items-center gap-1 px-5 pt-3 pb-5">
                      <span className="t-h4">{brand.name}</span>
                      {country && <span className="t-small">{country}</span>}
                      <span className="t-label mt-auto pt-3">
                        {brand.carCount} {brand.carCount === 1 ? "modelo" : "modelos"}
                      </span>
                    </span>
                    {brand.isFeatured && <span className="chip chip--soft absolute top-3 right-3">Destacada</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
