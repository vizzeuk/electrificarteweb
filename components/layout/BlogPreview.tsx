"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BlogPreviewPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readingTime: number;
  coverImage?: { asset?: { url: string }; alt?: string } | null;
  author?: { name: string; role: string } | null;
  tags?: string[];
}

interface BlogPreviewProps {
  title?: string;
  posts?: BlogPreviewPost[];
}

// ─── Static fallback posts (mostrar hasta que Francisco suba contenido) ───────
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
  "guia-compra": "bg-primary/10 text-primary-deep",
  comparativa:   "bg-purple-50 text-purple-700",
  noticias:      "bg-blue-50 text-blue-700",
  tecnologia:    "bg-cyan-50 text-cyan-700",
  ahorro:        "bg-green-50 text-green-700",
  carga:         "bg-amber-50 text-amber-700",
  legislacion:   "bg-orange-50 text-orange-700",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function BlogPreview({ title, posts }: BlogPreviewProps) {
  const displayPosts = (posts && posts.length > 0) ? posts : FALLBACK_POSTS;
  const [activeIdx, setActiveIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const featured = displayPosts[0];
  const rest     = displayPosts.slice(1, 3);

  return (
    <section className="py-16 md:py-20 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">
              Blog & Guías
            </p>
            <h2 className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tighter">
              {title ?? "Lo último sobre electromovilidad"}
            </h2>
          </div>
          <Link
            href="/blog"
            className="flex items-center gap-2 text-primary-deep font-semibold text-sm hover:text-primary transition-colors flex-shrink-0"
          >
            Ver todos los artículos
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>

        {/* Grid: featured + 2 cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Featured article (spans 2 cols) */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-2 group relative bg-black rounded-2xl overflow-hidden min-h-[340px] flex flex-col justify-end cursor-pointer"
          >
            {/* Background image or gradient */}
            {featured.coverImage?.asset?.url ? (
              <img
                src={featured.coverImage.asset.url}
                alt={featured.coverImage.alt ?? featured.title}
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-500"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary-deep/30 via-black to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

            <div className="relative z-10 p-7 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-black uppercase tracking-wide bg-primary text-black px-2.5 py-1 rounded-full">
                  {CATEGORY_LABELS[featured.category] ?? featured.category}
                </span>
                <span className="text-white/40 text-xs">
                  {featured.readingTime} min lectura
                </span>
              </div>
              <Link href={`/blog/${featured.slug}`}>
                <h3 className="font-headline font-black text-white text-2xl md:text-3xl leading-tight tracking-tight mb-3 group-hover:text-primary transition-colors">
                  {featured.title}
                </h3>
              </Link>
              <p className="text-white/60 text-sm leading-relaxed line-clamp-2 mb-5">
                {featured.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-white/30 text-xs">
                  {new Date(featured.publishedAt).toLocaleDateString("es-CL", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
                <Link
                  href={`/blog/${featured.slug}`}
                  className="flex items-center gap-1.5 text-primary font-bold text-sm hover:text-primary-dark transition-colors"
                >
                  Leer artículo
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </motion.article>

          {/* Side cards */}
          <div className="flex flex-col gap-6">
            {rest.map((post, i) => (
              <motion.article
                key={post._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i + 1) * 0.1 }}
                className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-300 flex flex-col"
              >
                {/* Image area */}
                <div className="aspect-[16/8] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden flex-shrink-0">
                  {post.coverImage?.asset?.url ? (
                    <img
                      src={post.coverImage.asset.url}
                      alt={post.coverImage.alt ?? post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[40px] text-gray-200">article</span>
                    </div>
                  )}
                  <span className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category] ?? "bg-gray-100 text-gray-600"}`}>
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
                  <p className="text-text-ghost text-xs leading-relaxed line-clamp-2 flex-1 mb-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <span className="text-text-ghost text-[11px]">
                      {post.readingTime} min
                    </span>
                    <span className="text-text-ghost text-[11px]">
                      {new Date(post.publishedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
