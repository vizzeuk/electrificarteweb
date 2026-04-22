"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { BlogPreviewPost } from "@/components/layout/BlogPreview";

// ─── Static fallback posts ────────────────────────────────────────────────────
const FALLBACK_POSTS: BlogPreviewPost[] = [
  {
    _id: "f1",
    title: "Guía definitiva: ¿Cuál auto eléctrico conviene más en Chile en 2025?",
    slug: "guia-auto-electrico-chile-2025",
    excerpt: "Comparamos los 10 modelos más vendidos del mercado chileno en precio, autonomía y costo de mantención. Todo lo que necesitas saber antes de decidir.",
    category: "guia-compra",
    publishedAt: "2025-03-15T10:00:00Z",
    readingTime: 8,
    coverImage: null,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["guia", "comparativa", "2025"],
  },
  {
    _id: "f2",
    title: "¿Cuánto cuesta cargar un auto eléctrico en Chile? Cálculo real",
    slug: "costo-carga-auto-electrico-chile",
    excerpt: "Analizamos el costo por kilómetro de los principales EVs vs gasolina. Los números te van a sorprender: hasta 5 veces más barato en uso diario.",
    category: "ahorro",
    publishedAt: "2025-02-28T10:00:00Z",
    readingTime: 5,
    coverImage: null,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["ahorro", "carga", "costos"],
  },
  {
    _id: "f3",
    title: "BYD vs Hyundai vs MG: ¿qué marca eléctrica gana en Chile?",
    slug: "byd-vs-hyundai-vs-mg-chile",
    excerpt: "Las tres marcas dominan el mercado eléctrico chileno. Analizamos garantía, red de servicio, precio y tecnología para que elijas con información.",
    category: "comparativa",
    publishedAt: "2025-02-10T10:00:00Z",
    readingTime: 7,
    coverImage: null,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["BYD", "Hyundai", "MG", "comparativa"],
  },
  {
    _id: "f4",
    title: "Puntos de carga eléctrica en Santiago: mapa completo 2025",
    slug: "puntos-carga-santiago-2025",
    excerpt: "Levantamos todos los puntos de carga públicos, semi-públicos y rápidos en Santiago. Incluye CarsChile, Enel X, Zap y más.",
    category: "carga",
    publishedAt: "2025-01-20T10:00:00Z",
    readingTime: 6,
    coverImage: null,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["carga", "Santiago", "infraestructura"],
  },
  {
    _id: "f5",
    title: "Beneficios tributarios para autos eléctricos en Chile: guía 2025",
    slug: "beneficios-tributarios-electricos-chile-2025",
    excerpt: "Desde la exención de la Ley REP hasta los beneficios del seguro obligatorio. Todo lo que el Estado te da por pasarte al eléctrico.",
    category: "legislacion",
    publishedAt: "2025-01-05T10:00:00Z",
    readingTime: 5,
    coverImage: null,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["legislación", "beneficios", "impuestos"],
  },
  {
    _id: "f6",
    title: "¿Qué es un PHEV y cuándo conviene elegirlo?",
    slug: "que-es-phev-cuando-conviene",
    excerpt: "Explicamos cómo funciona el híbrido enchufable, cuándo te conviene frente a un BEV puro y cuáles son los modelos disponibles en Chile.",
    category: "tecnologia",
    publishedAt: "2024-12-18T10:00:00Z",
    readingTime: 6,
    coverImage: null,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["PHEV", "híbrido", "tecnología"],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  "guia-compra": "Guía de compra",
  comparativa:   "Comparativa",
  noticias:      "Noticias",
  tecnologia:    "Tecnología",
  ahorro:        "Ahorro",
  carga:         "Carga",
  legislacion:   "Legislación",
};

const CATEGORY_COLORS: Record<string, string> = {
  "guia-compra": "bg-primary/10 text-primary-deep border-primary/20",
  comparativa:   "bg-purple-50 text-purple-700 border-purple-200",
  noticias:      "bg-blue-50 text-blue-700 border-blue-200",
  tecnologia:    "bg-cyan-50 text-cyan-700 border-cyan-200",
  ahorro:        "bg-green-50 text-green-700 border-green-200",
  carga:         "bg-amber-50 text-amber-700 border-amber-200",
  legislacion:   "bg-orange-50 text-orange-700 border-orange-200",
};

const ALL_CATEGORIES = [
  { value: "",              label: "Todos" },
  { value: "guia-compra",  label: "Guías" },
  { value: "comparativa",  label: "Comparativas" },
  { value: "tecnologia",   label: "Tecnología" },
  { value: "ahorro",       label: "Ahorro" },
  { value: "carga",        label: "Carga" },
  { value: "legislacion",  label: "Legislación" },
  { value: "noticias",     label: "Noticias" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function BlogListingContent({ posts }: { posts: BlogPreviewPost[] }) {
  const displayPosts = posts.length > 0 ? posts : FALLBACK_POSTS;
  const [activeCategory, setActiveCategory] = useState("");

  const filtered = useMemo(() =>
    activeCategory
      ? displayPosts.filter((p) => p.category === activeCategory)
      : displayPosts,
    [displayPosts, activeCategory]
  );

  const featured = filtered[0];
  const rest     = filtered.slice(1);

  return (
    <>
      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="bg-black pt-20 pb-16 md:pt-24 md:pb-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[300px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-10">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/60">Blog</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full mb-6">
              <span className="material-symbols-outlined text-primary text-[16px]">article</span>
              <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Blog & Guías</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-headline font-black text-white tracking-tighter leading-[0.95] mb-5">
              Todo sobre <span className="text-primary">electromovilidad</span> en Chile
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl">
              Guías de compra, comparativas, costos reales de carga, legislación y tecnología. Todo lo que necesitas para dar el salto al eléctrico con confianza.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Category filter ───────────────────────────────────────────── */}
      <section className="sticky top-16 z-30 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  activeCategory === cat.value
                    ? "bg-black text-white"
                    : "text-text-muted hover:text-text-main hover:bg-gray-100"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Content ───────────────────────────────────────────────────── */}
      <section className="py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">

          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-gray-200 block mb-4">search_off</span>
              <p className="text-text-muted font-medium">No hay artículos en esta categoría aún.</p>
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && (
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="group mb-10 bg-black rounded-2xl overflow-hidden relative min-h-[320px] flex flex-col justify-end"
                >
                  {featured.coverImage?.asset?.url ? (
                    <img
                      src={featured.coverImage.asset.url}
                      alt={featured.coverImage.alt ?? featured.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-45 transition-opacity duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-deep/20 via-black to-black" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                  <div className="relative z-10 p-8 md:p-10 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-[10px] font-black uppercase tracking-wide bg-primary text-black px-2.5 py-1 rounded-full">
                        {CATEGORY_LABELS[featured.category] ?? featured.category}
                      </span>
                      <span className="text-white/40 text-xs">{featured.readingTime} min lectura</span>
                      <span className="text-white/40 text-xs">
                        {new Date(featured.publishedAt).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                    <Link href={`/blog/${featured.slug}`}>
                      <h2 className="font-headline font-black text-white text-3xl md:text-4xl leading-tight tracking-tight mb-3 group-hover:text-primary transition-colors">
                        {featured.title}
                      </h2>
                    </Link>
                    <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-2xl">
                      {featured.excerpt}
                    </p>
                    <Link
                      href={`/blog/${featured.slug}`}
                      className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
                    >
                      Leer artículo
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                </motion.article>
              )}

              {/* Grid */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((post, i) => (
                    <motion.article
                      key={post._id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.07 }}
                      className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-300 flex flex-col"
                    >
                      {/* Image */}
                      <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden flex-shrink-0">
                        {post.coverImage?.asset?.url ? (
                          <img
                            src={post.coverImage.asset.url}
                            alt={post.coverImage.alt ?? post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-[48px] text-gray-200">article</span>
                          </div>
                        )}
                        <span className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[post.category] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {CATEGORY_LABELS[post.category] ?? post.category}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex flex-col flex-1">
                        <Link href={`/blog/${post.slug}`}>
                          <h3 className="font-headline font-bold text-base leading-snug mb-2 group-hover:text-primary-deep transition-colors line-clamp-2">
                            {post.title}
                          </h3>
                        </Link>
                        <p className="text-text-ghost text-xs leading-relaxed line-clamp-3 flex-1 mb-4">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-text-ghost text-[11px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            {post.readingTime} min
                          </span>
                          <span className="text-text-ghost text-[11px]">
                            {new Date(post.publishedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ─── Bottom CTA ────────────────────────────────────────────────── */}
      <section className="py-14 bg-surface border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-black rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-primary text-xs uppercase tracking-widest font-bold mb-2">¿Listo para dar el paso?</p>
              <h2 className="text-white font-headline font-black text-2xl md:text-3xl tracking-tight">
                Encuentra el mejor precio en tu eléctrico
              </h2>
              <p className="text-white/50 text-sm mt-1">Negociamos con toda la red de concesionarios para darte el mejor precio disponible.</p>
            </div>
            <Link
              href="/solicitar"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-black px-8 py-4 rounded-xl transition-colors text-sm whitespace-nowrap"
            >
              Solicitar oferta
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
