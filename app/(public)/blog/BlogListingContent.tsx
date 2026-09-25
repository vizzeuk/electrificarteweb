"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { BlogPreviewPost } from "@/components/layout/BlogPreview";
import { formatFecha } from "@/lib/utils";
import { sanityImg } from "@/lib/sanityImage";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE, OFERTA_STANDBY } from "@/lib/products";

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

// Las categorías ya no tienen un color cada una: todas van en Laguna (.post-cat).
const CATEGORY_LABELS: Record<string, string> = {
  "guia-compra": "Guía de compra",
  comparativa:   "Comparativa",
  noticias:      "Noticias",
  tecnologia:    "Tecnología",
  ahorro:        "Ahorro",
  carga:         "Carga",
  legislacion:   "Legislación",
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

/** Foto de portada 16:10, radio 12. Sin texto encima; el zoom al hover lo pone .post. */
function PostMedia({ post, width, eager = false, className = "" }: { post: BlogPreviewPost; width: number; eager?: boolean; className?: string }) {
  const url = post.coverImage?.asset?.url;
  return (
    <div className={`post__media ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sanityImg(url, { w: width, q: 75 })}
          alt={post.coverImage?.alt ?? post.title}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          <Icon name="article" className="text-[48px] text-line-2" />
        </span>
      )}
    </div>
  );
}

function PostMeta({ post }: { post: BlogPreviewPost }) {
  return (
    <p className="post-meta">
      <span>{formatFecha(post.publishedAt, true)}</span>
      <span>{post.readingTime} min de lectura</span>
    </p>
  );
}

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

  // Artículos por categoría, para la cifra de cada filtro.
  const counts = useMemo(() => {
    const map: Record<string, number> = { "": displayPosts.length };
    for (const p of displayPosts) map[p.category] = (map[p.category] ?? 0) + 1;
    return map;
  }, [displayPosts]);

  const featured = filtered[0];
  const rest     = filtered.slice(1);

  return (
    <div className="page">
      {/* ─── Encabezado ──────────────────────────────────────────────── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Blog</span>
          </nav>
          <div className="mt-[clamp(32px,4vw,48px)]">
            <h1 className="t-h1 max-w-[18ch]">Todo sobre electromovilidad en Chile</h1>
            <p className="t-lead">
              Guías de compra, comparativas, costos reales de carga, legislación y tecnología. Todo lo que necesitas para dar el salto al auto electrificado con confianza.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Artículos ───────────────────────────────────────────────── */}
      <section className="section pt-section-sm" aria-label="Artículos">
        <div className="wrap">
          {/* En pantallas angostas los filtros se deslizan hasta el borde */}
          <div className="pills -mx-gutter px-gutter lg:mx-0 lg:px-0" role="group" aria-label="Filtrar por categoría">
            {ALL_CATEGORIES.map((cat) => {
              const n = counts[cat.value] ?? 0;
              const active = activeCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  className="pill"
                  aria-pressed={active}
                  disabled={!n && !active}
                  onClick={() => setActiveCategory(cat.value)}
                >
                  {cat.label}
                  <span className="n">{n}</span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <p className="empty">No hay artículos en esta categoría aún.</p>
          ) : (
            <>
              {/* Destacado: foto a la izquierda, texto a la derecha */}
              {featured && (
                <article className="post group relative mt-10 md:grid md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center md:gap-[clamp(32px,4vw,64px)]">
                  <PostMedia post={featured} width={1200} eager className="md:mb-0" />
                  <div>
                    <p className="post-cat">{CATEGORY_LABELS[featured.category] ?? featured.category}</p>
                    <h2 className="mt-2 font-display text-[clamp(1.625rem,1.2rem+1.4vw,2.25rem)] font-bold leading-[1.1] tracking-[-0.02em] text-balance">
                      <Link href={`/blog/${featured.slug}`} className="after:absolute after:inset-0">
                        {featured.title}
                      </Link>
                    </h2>
                    <p className="t-body mt-4">{featured.excerpt}</p>
                    <PostMeta post={featured} />
                    <p className="link-arrow mt-6">
                      Leer artículo
                      <Icon name="arrow_forward" size="none" className="group-hover:translate-x-[3px]" />
                    </p>
                  </div>
                </article>
              )}

              {/* Grilla */}
              {rest.length > 0 && (
                <div className="mt-[clamp(48px,6vw,72px)] grid gap-x-grid gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => (
                    <article key={post._id} className="post relative">
                      <PostMedia post={post} width={800} />
                      <p className="post-cat">{CATEGORY_LABELS[post.category] ?? post.category}</p>
                      <h3 className="post__title">
                        <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
                          {post.title}
                        </Link>
                      </h3>
                      <p className="post__text">{post.excerpt}</p>
                      <PostMeta post={post} />
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── CTA final: Asesoría (principal) y waitlist ─────────────── */}
          <div className="soft-block cta-row mt-section">
            <div>
              <h2 className="t-h2">¿No sabes cuál te conviene?</h2>
              <p>
                Te asesoramos por WhatsApp según tu uso, tus kilómetros y tu presupuesto, y comparamos contigo los modelos que calzan.
              </p>
            </div>
            <div className="cta-row__actions">
              <Link href="/asesoria" className="btn btn--primary btn--lg">
                Quiero asesoría por {ASESORIA_PRICE}
                <Icon name="arrow_forward" size="none" className="arrow" />
              </Link>
              <OfferCta source="blog" className="btn btn--secondary btn--lg">
                {OFERTA_STANDBY ? "Únete a la waitlist" : "Quiero mi oferta"}
              </OfferCta>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
