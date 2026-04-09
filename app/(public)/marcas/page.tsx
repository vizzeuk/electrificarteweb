"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect } from "react";
import { allBrandsQuery } from "@/lib/queries/car";
import { client } from "@/lib/sanity/client";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  country?: string;
  foundedYear?: number;
  accentColor?: string;
  isFeatured?: boolean;
  carCount: number;
}

// ─── Origin map (for brands without country in Sanity) ───────────────────────
const COUNTRY_MAP: Record<string, string> = {
  audi: "Alemania", bmw: "Alemania", mercedes: "Alemania", volkswagen: "Alemania", skoda: "Alemania",
  byd: "China", changan: "China", chery: "China", deepal: "China", dfsk: "China",
  dongfeng: "China", gac: "China", geely: "China", gwm: "China", haval: "China",
  jac: "China", jaecoo: "China", jetour: "China", jmc: "China", leapmotor: "China",
  lynk: "China", maxus: "China", mg: "China", nammi: "China", omoda: "China",
  ora: "China", riddara: "China", smart: "China",
  hyundai: "Corea del Sur", kia: "Corea del Sur",
  tesla: "Estados Unidos", chevrolet: "Estados Unidos", ford: "Estados Unidos", jeep: "Estados Unidos",
  toyota: "Japón", honda: "Japón", mazda: "Japón", nissan: "Japón", lexus: "Japón",
  peugeot: "Francia", ds: "Francia", renault: "Francia",
  fiat: "Italia",
  volvo: "Suecia",
  cupra: "España",
  mini: "Reino Unido",
  subaru: "Japón", suzuki: "Japón",
  ssangyong: "Corea del Sur",
  lynk_co: "China",
};

function getCountry(slug: string, country?: string) {
  if (country) return country;
  const key = slug.replace(/-/g, "_").toLowerCase();
  return COUNTRY_MAP[key] ?? COUNTRY_MAP[slug.split("-")[0]] ?? "";
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function MarcasPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "featured">("all");

  useEffect(() => {
    client.fetch(allBrandsQuery)
      .then((data) => setBrands(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...brands];
    if (filter === "featured") list = list.filter((b) => b.isFeatured);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q) || getCountry(b.slug, b.country).toLowerCase().includes(q));
    }
    return list;
  }, [brands, search, filter]);

  const featured = brands.filter((b) => b.isFeatured);

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-black pt-20 pb-16 md:pt-28 md:pb-20 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-primary-deep/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-10">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/60">Marcas</span>
          </nav>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full mb-6">
              <span className="material-symbols-outlined text-primary text-[16px]">verified</span>
              <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">{brands.length} marcas disponibles</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-headline font-black text-white tracking-tighter leading-[0.9] mb-5">
              Todas las<br /><span className="text-primary">Marcas</span><span className="text-white">.</span>
            </h1>
            <p className="text-white/50 text-base leading-relaxed max-w-lg mb-10">
              Explora el catálogo completo de marcas eléctricas e híbridas disponibles en Chile. Compara modelos y encuentra el mejor precio con Electrificarte.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-6">
              {[
                { value: brands.length.toString(), label: "Marcas" },
                { value: brands.reduce((s, b) => s + b.carCount, 0).toString(), label: "Modelos" },
                { value: [...new Set(brands.map((b) => getCountry(b.slug, b.country)).filter(Boolean))].length.toString(), label: "Países" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-3xl font-headline font-black text-primary">{s.value}</p>
                  <p className="text-white/40 text-xs uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Search + filters ────────────────────────────────────────── */}
      <section className="sticky top-16 md:top-20 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost text-[18px]">search</span>
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
                  filter === f
                    ? "bg-primary text-black"
                    : "bg-surface text-text-muted hover:text-text-main",
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

      {/* ─── Grid ─────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-gray-200 block mb-3">search_off</span>
              <p className="text-text-muted font-medium">No hay marcas con ese nombre.</p>
              <button onClick={() => setSearch("")} className="mt-4 text-primary-deep text-sm font-semibold hover:text-primary transition-colors">
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.map((brand, i) => {
                const color = brand.accentColor ?? "#1a1a1a";
                const country = getCountry(brand.slug, brand.country);
                return (
                  <motion.div
                    key={brand._id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: (i % 12) * 0.04 }}
                  >
                    <Link
                      href={`/marcas/${brand.slug}`}
                      className="group flex flex-col items-center p-5 bg-white border border-gray-100 rounded-2xl hover:border-primary/40 hover:shadow-lg hover:shadow-black/5 transition-all duration-300 h-full text-center"
                    >
                      {/* Logo circle */}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-headline font-black mb-3 transition-transform duration-300 group-hover:scale-110 flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {brand.name.charAt(0).toUpperCase()}
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
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── CTA bottom ───────────────────────────────────────────────── */}
      <section className="py-16 bg-black">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p className="text-primary text-xs uppercase tracking-widest font-bold mb-2">¿No encuentras tu marca?</p>
              <h2 className="text-white font-headline font-black text-2xl md:text-3xl tracking-tight mb-2">
                Cotizamos cualquier eléctrico o híbrido en Chile
              </h2>
              <p className="text-white/40 text-sm">Cuéntanos qué auto buscas y negociamos el mejor precio por ti.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link href="/solicitar" className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-colors text-sm whitespace-nowrap">
                Solicitar oferta
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <Link href="/comparador" className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-8 py-4 rounded-xl transition-colors text-sm whitespace-nowrap">
                <span className="material-symbols-outlined text-[18px]">compare</span>
                Comparador
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
