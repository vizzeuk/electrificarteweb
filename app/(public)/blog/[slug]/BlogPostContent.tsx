"use client";

import React from "react";
import Link from "next/link";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { formatCLP } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readingTime: number;
  tags?: string[];
  coverImage?: { asset?: { url: string }; alt?: string } | null;
  author?: { name: string; role: string; avatar?: { url: string } } | null;
  body?: any[];
  featuredSnippet?: string;
  faqBlock?: { question: string; answer: string }[];
  howToBlock?: { name: string; description: string; steps: { name: string; text: string }[] };
  articleType?: string;
  geoRegions?: string[];
  geoCities?: string[];
  relatedCars?: {
    _id: string; name: string; slug: string; tagline: string;
    discountPrice: number; basePrice: number; range: number;
    brand?: { name: string; slug: string };
    vehicleType?: { label: string };
  }[];
  relatedPosts?: {
    _id: string; title: string; slug: string; excerpt: string;
    category: string; publishedAt: string; readingTime: number;
    coverImage?: { asset?: { url: string }; alt?: string } | null;
  }[];
}

// ─── PortableText renderers ───────────────────────────────────────────────────

const ptComponents: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="font-headline font-black text-2xl md:text-3xl tracking-tight mt-10 mb-4 text-text-main">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-headline font-bold text-xl md:text-2xl mt-8 mb-3 text-text-main">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="font-headline font-bold text-lg mt-6 mb-2 text-text-main">{children}</h4>
    ),
    normal: ({ children }) => (
      <p className="text-text-muted text-base leading-relaxed mb-5">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary pl-5 py-1 my-6 text-text-muted italic text-base leading-relaxed">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="space-y-2 mb-6 pl-1">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="space-y-2 mb-6 pl-1 list-decimal list-inside">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="flex items-start gap-2.5 text-text-muted text-base leading-relaxed">
        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2.5" />
        <span>{children}</span>
      </li>
    ),
    number: ({ children }) => (
      <li className="text-text-muted text-base leading-relaxed">{children}</li>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-bold text-text-main">{children}</strong>,
    em:     ({ children }) => <em className="italic">{children}</em>,
    code:   ({ children }) => (
      <code className="bg-gray-100 text-primary-deep font-mono text-sm px-1.5 py-0.5 rounded">{children}</code>
    ),
    link: ({ value, children }) => (
      <a
        href={value?.href}
        target={value?.blank ? "_blank" : "_self"}
        rel={value?.blank ? "noopener noreferrer" : undefined}
        className="text-primary-deep underline underline-offset-2 hover:text-primary transition-colors"
      >
        {children}
      </a>
    ),
  },
  types: {
    image: ({ value }) =>
      value?.asset?.url ? (
        <figure className="my-8">
          <img
            src={value.asset.url}
            alt={value.alt ?? ""}
            className="w-full rounded-2xl object-cover"
          />
          {value.caption && (
            <figcaption className="text-center text-text-ghost text-xs mt-2">
              {value.caption}
            </figcaption>
          )}
        </figure>
      ) : null,
    callout: ({ value }) => {
      const styles: Record<string, string> = {
        info:    "bg-blue-50  border-blue-200  text-blue-800",
        tip:     "bg-green-50 border-green-200 text-green-800",
        warning: "bg-amber-50 border-amber-200 text-amber-800",
      };
      const icons: Record<string, string> = { info: "💡", tip: "✅", warning: "⚠️" };
      return (
        <div className={`border rounded-xl px-5 py-4 my-6 text-sm leading-relaxed ${styles[value.type] ?? styles.tip}`}>
          <span className="mr-2">{icons[value.type] ?? "📌"}</span>
          {value.text}
        </div>
      );
    },
  },
};

// ─── JSON-LD builder ──────────────────────────────────────────────────────────

function buildJsonLd(post: BlogPost) {
  const schemas: any[] = [];

  // Article / NewsArticle schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": post.articleType ?? "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author?.name ?? "Equipo Electrificarte",
    },
    publisher: {
      "@type": "Organization",
      name: "Electrificarte",
      logo: { "@type": "ImageObject", url: "https://electrificarte.cl/logo.png" },
    },
    ...(post.coverImage?.asset?.url ? { image: post.coverImage.asset.url } : {}),
  });

  // FAQPage schema
  if (post.faqBlock && post.faqBlock.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faqBlock.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  // HowTo schema
  if (post.howToBlock?.steps?.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: post.howToBlock.name,
      description: post.howToBlock.description,
      step: post.howToBlock.steps.map((s) => ({
        "@type": "HowToStep",
        name: s.name,
        text: s.text,
      })),
    });
  }

  return schemas;
}

const CATEGORY_LABELS: Record<string, string> = {
  "guia-compra": "Guía de compra", comparativa: "Comparativa",
  noticias: "Noticias", tecnologia: "Tecnología",
  ahorro: "Ahorro", carga: "Carga", legislacion: "Legislación",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function BlogPostContent({ post }: { post: BlogPost }) {
  const schemas = buildJsonLd(post);

  return (
    <>
      {/* ─── JSON-LD ─────────────────────────────────────────────────── */}
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="bg-black pt-20 pb-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[600px] h-[400px] bg-primary/6 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 md:px-8 relative z-10 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-8">
            <Link href="/"     className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white/60 transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-white/60 truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* Category + meta */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="text-[10px] font-black uppercase tracking-wide bg-primary text-black px-2.5 py-1 rounded-full">
              {CATEGORY_LABELS[post.category] ?? post.category}
            </span>
            <span className="text-white/40 text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">schedule</span>
              {post.readingTime} min de lectura
            </span>
            <span className="text-white/40 text-xs">
              {new Date(post.publishedAt).toLocaleDateString("es-CL", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          </div>

          <h1 className="font-headline font-black text-white text-3xl md:text-5xl tracking-tight leading-[1.05] mb-6">
            {post.title}
          </h1>

          <p className="text-white/60 text-lg leading-relaxed mb-8">
            {post.excerpt}
          </p>

          {/* Author */}
          {post.author && (
            <div className="flex items-center gap-3 pb-8">
              {post.author.avatar?.url ? (
                <img src={post.author.avatar.url} alt={post.author.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/40 text-[18px]">person</span>
                </div>
              )}
              <div>
                <p className="text-white text-sm font-semibold">{post.author.name}</p>
                <p className="text-white/40 text-xs">{post.author.role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Cover image */}
        {post.coverImage?.asset?.url && (
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="aspect-[21/9] overflow-hidden rounded-t-2xl">
              <img
                src={post.coverImage.asset.url}
                alt={post.coverImage.alt ?? post.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </section>

      {/* ─── Body ────────────────────────────────────────────────────── */}
      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-[1fr_260px] gap-12 items-start">

            {/* Article body */}
            <article>
              {/* Featured snippet box (AEO) */}
              {post.featuredSnippet && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[18px]">lightbulb</span>
                    <span className="text-primary-deep text-xs font-bold uppercase tracking-wide">Resumen rápido</span>
                  </div>
                  <p className="text-text-main text-base leading-relaxed font-medium">
                    {post.featuredSnippet}
                  </p>
                </div>
              )}

              {/* PortableText body */}
              {post.body && post.body.length > 0 ? (
                <PortableText value={post.body} components={ptComponents} />
              ) : (
                <p className="text-text-muted">Contenido próximamente.</p>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-gray-100">
                  {post.tags.map((tag) => (
                    <span key={tag} className="bg-surface border border-gray-200 text-text-ghost text-xs px-3 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* FAQ block (AEO) */}
              {post.faqBlock && post.faqBlock.length > 0 && (
                <div className="mt-12">
                  <h2 className="font-headline font-black text-2xl tracking-tight mb-6">
                    Preguntas frecuentes
                  </h2>
                  <div className="space-y-4">
                    {post.faqBlock.map((faq, i) => (
                      <details key={i} className="group border border-gray-200 rounded-2xl overflow-hidden">
                        <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-semibold text-sm hover:bg-surface transition-colors">
                          {faq.question}
                          <span className="material-symbols-outlined text-[18px] text-text-ghost group-open:rotate-180 transition-transform flex-shrink-0 ml-3">
                            expand_more
                          </span>
                        </summary>
                        <div className="px-5 pb-4 text-text-muted text-sm leading-relaxed">
                          {faq.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* Related cars */}
              {post.relatedCars && post.relatedCars.length > 0 && (
                <div className="mt-12">
                  <h2 className="font-headline font-black text-xl tracking-tight mb-5">
                    Autos mencionados en este artículo
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {post.relatedCars.map((car) => {
                      const pct = Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100);
                      return (
                        <Link
                          key={car._id}
                          href={`/auto/${car.slug}`}
                          className="group flex gap-4 border border-gray-100 hover:border-primary/40 rounded-2xl p-4 transition-all hover:shadow-sm"
                        >
                          <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-[28px] text-gray-200">electric_car</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-text-ghost text-[11px] uppercase tracking-wide mb-0.5">{car.brand?.name}</p>
                            <p className="font-headline font-bold text-sm group-hover:text-primary-deep transition-colors truncate">{car.name}</p>
                            <p className="text-text-ghost text-[11px] truncate mb-1">{car.tagline}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-primary-deep font-black text-sm">{formatCLP(car.discountPrice)}</span>
                              {pct > 0 && (
                                <span className="bg-black text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">-{pct}%</span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {/* CTA */}
                <div className="bg-black rounded-2xl p-6">
                  <p className="text-primary text-[10px] uppercase tracking-widest font-bold mb-2">¿Listo para el salto?</p>
                  <p className="text-white font-headline font-black text-lg leading-tight mb-3">
                    Solicita tu oferta personalizada
                  </p>
                  <p className="text-white/50 text-xs mb-5">
                    Negociamos con toda la red de concesionarios para darte el mejor precio disponible.
                  </p>
                  <Link
                    href="/solicitar"
                    className="block text-center bg-primary hover:bg-primary-dark text-black font-bold py-3 rounded-xl text-sm transition-colors"
                  >
                    Solicitar oferta
                  </Link>
                </div>

                {/* Related posts */}
                {post.relatedPosts && post.relatedPosts.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-4">
                      Artículos relacionados
                    </p>
                    <div className="space-y-4">
                      {post.relatedPosts.map((rp) => (
                        <Link
                          key={rp._id}
                          href={`/blog/${rp.slug}`}
                          className="group flex gap-3 hover:bg-surface rounded-xl p-2 -mx-2 transition-colors"
                        >
                          <div className="w-14 h-14 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                            {rp.coverImage?.asset?.url ? (
                              <img src={rp.coverImage.asset.url} alt={rp.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-[20px] text-gray-300">article</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-primary-deep transition-colors">
                              {rp.title}
                            </p>
                            <p className="text-text-ghost text-[11px] mt-1">{rp.readingTime} min</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Share */}
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-text-ghost font-bold mb-3">Compartir</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(window.location.href)}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 hover:border-primary/40 hover:text-primary-deep rounded-xl py-2 text-xs font-semibold transition-all"
                    >
                      <span className="material-symbols-outlined text-[15px]">link</span>
                      Copiar link
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ─── Mobile CTA ──────────────────────────────────────────────── */}
      <div className="lg:hidden sticky bottom-0 z-40 p-4 bg-white/95 backdrop-blur border-t border-gray-100">
        <Link
          href="/solicitar"
          className="block w-full text-center bg-primary hover:bg-primary-dark text-black font-bold py-3.5 rounded-xl text-sm transition-colors"
        >
          Solicitar oferta personalizada
        </Link>
      </div>
    </>
  );
}
