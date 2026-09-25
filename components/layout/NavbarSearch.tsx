"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { formatCLP } from "@/lib/utils";
import { sanityImg } from "@/lib/sanityImage";

interface SearchCar {
  name: string;
  slug: string;
  brand: string | null;
  brandLogo: string | null;
  basePrice: number | null;
  discountPrice: number | null;
  type: string | null;
  versions: (string | null)[] | null;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function NavbarSearch() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [index, setIndex]     = useState<SearchCar[] | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // El índice se descarga UNA sola vez, recién al abrir el buscador.
  useEffect(() => {
    if (!open || index || loading) return;
    setLoading(true);
    fetch("/api/search-index")
      .then((r) => r.json())
      .then((data: SearchCar[]) => setIndex(data))
      .catch(() => setIndex([]))
      .finally(() => setLoading(false));
  }, [open, index, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const results = useMemo(() => {
    if (!index || query.trim().length < 1) return [];
    const q = norm(query.trim());
    return index
      .filter((c) =>
        norm(`${c.brand ?? ""} ${c.name} ${(c.versions ?? []).filter(Boolean).join(" ")}`).includes(q),
      )
      .slice(0, 8);
  }, [index, query]);

  const close = () => { setOpen(false); setQuery(""); };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar buscador" : "Buscar vehículos"}
        aria-expanded={open}
        className="btn btn--quiet btn--icon"
      >
        <Icon name={open ? "close" : "search"} size="none" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Capa para cerrar al tocar fuera — transparente, no es un popup */}
            <div className="fixed inset-0 z-30" onClick={close} aria-hidden />

            <m.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
              className="fixed left-0 right-0 top-[72px] z-40"
            >
              <div className="wrap">
                <div className="overflow-hidden rounded-b-card border border-t-0 border-linea bg-papel text-tinta shadow-overlay">
                  {/* Input */}
                  <div className="flex h-14 items-center gap-3 border-b border-linea px-5">
                    <Icon name="search" className="text-[20px] text-piedra" />
                    <label htmlFor="navbar-search" className="sr-only">Buscar un modelo o marca</label>
                    <input
                      id="navbar-search"
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Busca un modelo o una marca"
                      className="flex-1 bg-transparent text-base text-tinta outline-none placeholder:text-piedra"
                    />
                    {query && (
                      <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="btn btn--quiet btn--icon btn--sm">
                        <Icon name="close" size="none" />
                      </button>
                    )}
                  </div>

                  {/* Resultados */}
                  <div className="max-h-[60vh] overflow-y-auto">
                    {loading && (
                      <p className="px-5 py-6 text-sm text-grafito">Cargando catálogo…</p>
                    )}
                    {!loading && query.trim().length < 1 && (
                      <p className="px-5 py-6 text-sm text-grafito">
                        Escribe el nombre de un modelo o de una marca.
                      </p>
                    )}
                    {!loading && query.trim().length >= 1 && results.length === 0 && (
                      <p className="px-5 py-6 text-sm text-grafito">
                        Sin resultados para “{query}”.
                      </p>
                    )}
                    {results.map((c) => {
                      const price = c.discountPrice ?? c.basePrice;
                      return (
                        <Link
                          key={c.slug}
                          href={`/auto/${c.slug}`}
                          onClick={close}
                          className="flex items-center justify-between gap-4 border-b border-linea px-5 py-3 transition-colors last:border-0 hover:bg-niebla"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-7 w-10 flex-shrink-0 items-center justify-center">
                              {c.brandLogo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={sanityImg(c.brandLogo, { w: 80, q: 80 })}
                                  alt=""
                                  className="max-h-6 w-auto max-w-10 object-contain opacity-60 grayscale"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <Icon name="electric_car" className="text-[18px] text-piedra" />
                              )}
                            </span>
                            <span className="flex min-w-0 items-baseline gap-2">
                              <span className="flex-shrink-0 text-label font-semibold text-piedra">{c.brand}</span>
                              <span className="truncate text-[15px] font-semibold text-tinta">{c.name}</span>
                              {c.type && <span className="chip flex-shrink-0">{c.type}</span>}
                            </span>
                          </span>
                          <span className="flex-shrink-0 text-[15px] font-semibold tabular-nums text-tinta">
                            {formatCLP(price)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
