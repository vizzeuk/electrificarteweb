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

export function NavbarSearch({ transparent }: { transparent: boolean }) {
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
        onClick={() => setOpen((v) => !v)}
        aria-label="Buscar vehículos"
        aria-expanded={open}
        className={[
          "inline-flex items-center justify-center gap-2 h-10 px-3 lg:px-4 rounded-xl text-sm font-semibold transition-all",
          transparent
            ? "text-white/80 hover:text-white border border-white/20 hover:border-white/50 hover:bg-white/5"
            : "text-text-main border border-gray-200 hover:border-primary/40 hover:text-primary hover:bg-surface",
        ].join(" ")}
      >
        <Icon name={open ? "close" : "search"} size="sm" />
        <span className="hidden lg:inline">{open ? "Cerrar" : "Busca tu auto"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Capa para cerrar al tocar fuera — transparente, no es un popup */}
            <div className="fixed inset-0 z-30" onClick={close} aria-hidden />

            <m.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed left-0 right-0 top-16 md:top-20 z-40"
            >
              <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="bg-white rounded-b-2xl border border-gray-100 shadow-lg shadow-black/10 overflow-hidden">
                  {/* Input */}
                  <div className="flex items-center gap-3 px-4 md:px-5 h-14 border-b border-gray-100">
                    <span className="material-symbols-outlined text-[20px] text-text-ghost">search</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar cualquier modelo…"
                      className="flex-1 bg-transparent outline-none text-sm md:text-base text-text-main placeholder:text-text-ghost"
                    />
                    {query && (
                      <button onClick={() => setQuery("")} aria-label="Limpiar" className="text-text-ghost hover:text-text-main">
                        <Icon name="close" size="sm" />
                      </button>
                    )}
                  </div>

                  {/* Resultados */}
                  <div className="max-h-[60vh] overflow-y-auto">
                    {loading && (
                      <p className="px-5 py-6 text-sm text-text-ghost">Cargando catálogo…</p>
                    )}
                    {!loading && query.trim().length < 1 && (
                      <p className="px-5 py-6 text-sm text-text-ghost">
                        Escribí el nombre de un modelo o marca.
                      </p>
                    )}
                    {!loading && query.trim().length >= 1 && results.length === 0 && (
                      <p className="px-5 py-6 text-sm text-text-ghost">
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
                          className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface transition-colors border-b border-gray-50 last:border-0"
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <span className="w-9 h-7 flex items-center justify-center flex-shrink-0">
                              {c.brandLogo ? (
                                <img
                                  src={sanityImg(c.brandLogo, { w: 72, q: 80 })}
                                  alt={c.brand ?? ""}
                                  className="max-h-7 max-w-9 w-auto object-contain opacity-70"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <span className="material-symbols-outlined text-[18px] text-gray-200">electric_car</span>
                              )}
                            </span>
                            <span className="flex items-baseline gap-2 min-w-0">
                              <span className="text-[11px] uppercase tracking-wide text-text-ghost font-semibold flex-shrink-0">
                                {c.brand}
                              </span>
                              <span className="font-semibold text-sm text-text-main truncate">
                                {c.name}
                              </span>
                              {c.type && (
                                <span className="text-[9px] font-black text-text-ghost bg-surface px-1.5 py-0.5 rounded flex-shrink-0">
                                  {c.type}
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="text-sm font-headline font-bold text-primary-deep flex-shrink-0">
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
