import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { allBrandsQuery } from "@/lib/queries/car";
import { getBrandCountry } from "@/lib/utils/brand-country";
import { MarcasGrid } from "./MarcasGrid";
import type { Brand } from "./MarcasGrid";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Marcas eléctricas e híbridas en Chile | Electrificarte",
  description:
    "Explora todas las marcas de autos eléctricos e híbridos disponibles en Chile. Compara modelos y consigue el mejor precio con Electrificarte.",
};

export default async function MarcasPage() {
  const brands: Brand[] = await client.fetch(
    allBrandsQuery,
    {},
    { next: { tags: ["brand"], revalidate: 3600 } },
  );

  const totalModels = brands.reduce((s, b) => s + b.carCount, 0);
  const uniqueCountries = new Set(
    brands.map((b) => getBrandCountry(b.slug, b.country)).filter(Boolean),
  ).size;

  return (
    <>
      {/* ─── Hero ──────────────────────────────────────────────────────── */}
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
              <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                {brands.length} marcas disponibles
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-headline font-black text-white tracking-tighter leading-[0.9] mb-5">
              Todas las<br /><span className="text-primary">Marcas</span><span className="text-white">.</span>
            </h1>
            <p className="text-white/50 text-base leading-relaxed max-w-lg mb-10">
              Explora el catálogo completo de marcas eléctricas e híbridas disponibles en Chile. Compara modelos y encuentra el mejor precio con Electrificarte.
            </p>

            <div className="flex flex-wrap gap-6">
              {[
                { value: brands.length, label: "Marcas" },
                { value: totalModels, label: "Modelos" },
                { value: uniqueCountries, label: "Países" },
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

      {/* ─── Interactive grid (client island) ─────────────────────────── */}
      <MarcasGrid brands={brands} />

      {/* ─── CTA bottom ────────────────────────────────────────────────── */}
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
              <Link
                href="/solicitar"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-colors text-sm whitespace-nowrap"
              >
                Solicitar oferta
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <Link
                href="/comparador"
                className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-8 py-4 rounded-xl transition-colors text-sm whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
                Comparador
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
