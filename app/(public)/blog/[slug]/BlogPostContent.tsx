"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { PortableText, type PortableTextBlock, type PortableTextComponents } from "@portabletext/react";
import { formatCLP, formatFecha } from "@/lib/utils";
import { safeJsonLd } from "@/lib/seo";
import { sanityImg } from "@/lib/sanityImage";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE, OFERTA_STANDBY } from "@/lib/products";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Bloques de texto de Sanity más los tipos propios del cuerpo (image, callout). */
type BodyNode = PortableTextBlock | { _type: string; _key?: string; [key: string]: unknown };

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
  body?: BodyNode[];
  featuredSnippet?: string;
  faqBlock?: { question: string; answer: string }[];
  howToBlock?: { name: string; description: string; steps: { name: string; text: string }[] };
  articleType?: string;
  geoRegions?: string[];
  geoCities?: string[];
  articleCta?: {
    heading: string;
    subtext?: string;
    buttonLabel: string;
    buttonUrl: string;
  } | null;
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
// Cuerpo de lectura: Switzer 18 px con interlineado 1,65 (lo hereda del <article>), títulos en Cabinet.

const H2_CLASS = "font-display text-[clamp(1.5rem,1.25rem+1vw,2rem)] font-bold leading-[1.12] tracking-[-0.02em] text-ink text-balance";

// Íconos de los avisos: ya no hay un color ni un emoji por tipo.
const CALLOUT_ICON: Record<string, string> = { info: "info", tip: "lightbulb", warning: "error" };

const ptComponents: PortableTextComponents = {
  block: {
    h2: ({ children }) => <h2 className={`mb-4 mt-14 ${H2_CLASS}`}>{children}</h2>,
    h3: ({ children }) => <h3 className="t-h3 mb-3 mt-10 text-ink">{children}</h3>,
    h4: ({ children }) => <h4 className="t-h4 mb-2 mt-8 text-ink">{children}</h4>,
    normal: ({ children }) => <p className="mb-6 text-ink-2">{children}</p>,
    blockquote: ({ children }) => (
      <blockquote className="my-10 border-l-2 border-accent pl-6 text-[1.25rem] leading-[1.5] text-ink">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-6 list-disc space-y-2 pl-6 marker:text-ink-3">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="mb-6 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-ink-3">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="pl-1 text-ink-2">{children}</li>,
    number: ({ children }) => <li className="pl-1 text-ink-2">{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
    em:     ({ children }) => <em className="italic">{children}</em>,
    code:   ({ children }) => (
      <code className="rounded-chip bg-canvas-2 px-1.5 py-0.5 font-mono text-[0.9em] text-ink">{children}</code>
    ),
    link: ({ value, children }) => (
      <a
        href={value?.href}
        target={value?.blank ? "_blank" : "_self"}
        rel={value?.blank ? "noopener noreferrer" : undefined}
        className="link"
      >
        {children}
      </a>
    ),
  },
  types: {
    image: ({ value }) =>
      value?.asset?.url ? (
        <figure className="my-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sanityImg(value.asset.url, { w: 1400, q: 80 })}
            alt={value.alt ?? ""}
            className="w-full rounded-card object-cover" loading="lazy" decoding="async" />
          {value.caption && (
            <figcaption className="t-micro mt-3">
              {value.caption}
            </figcaption>
          )}
        </figure>
      ) : null,
    callout: ({ value }) => (
      <aside className="my-8 flex gap-3 rounded-card bg-canvas-2 p-5 md:p-6">
        <Icon name={CALLOUT_ICON[value.type] ?? "lightbulb"} className="mt-0.5 flex-none text-[20px] text-link" />
        <p className="text-[1rem] leading-[1.6] text-ink">{value.text}</p>
      </aside>
    ),
  },
};

// ─── JSON-LD builder ──────────────────────────────────────────────────────────

function buildJsonLd(post: BlogPost) {
  const schemas: Record<string, unknown>[] = [];

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

const WAITLIST_LABEL = OFERTA_STANDBY ? "Únete a la waitlist" : "Quiero mi oferta";

// Alto de la barra fija móvil: 12 + 40 + 12 de relleno y 1 de hairline.
const MOBILE_BAR_H = 65;

/**
 * La barra fija móvil queda bajo el lanzador del chat y el widget de feedback. Los levanta
 * con el mismo contrato que StickyCTA y la PDP: --sticky-h y --chat-bottom en <html>, más el
 * estilo en línea del lanzador (en Safari la herencia de variables en el shadow DOM falla).
 */
function useLiftFloatingWidgets() {
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const root = document.documentElement;
    const lifted = `${24 + MOBILE_BAR_H}px`;
    let launcherDone = false;

    // El chat se monta diferido: su lanzador puede no existir todavía.
    const syncLauncher = () => {
      if (launcherDone) return;
      try {
        const el = document.querySelector("ev-chat-widget")?.shadowRoot?.querySelector("#launcher") as HTMLElement | null;
        if (!el) return;
        el.style.bottom = mq.matches ? lifted : "";
        launcherDone = true;
      } catch { /* no bloquea */ }
    };
    const apply = () => {
      root.style.setProperty("--sticky-h", mq.matches ? `${MOBILE_BAR_H}px` : "0px");
      root.style.setProperty("--chat-bottom", mq.matches ? lifted : "24px");
      launcherDone = false;
      syncLauncher();
    };

    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("scroll", syncLauncher, { passive: true });
    customElements.whenDefined("ev-chat-widget").then(() => requestAnimationFrame(syncLauncher));

    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("scroll", syncLauncher);
      launcherDone = true;
      root.style.setProperty("--sticky-h", "0px");
      root.style.setProperty("--chat-bottom", "24px");
      try {
        const el = document.querySelector("ev-chat-widget")?.shadowRoot?.querySelector("#launcher") as HTMLElement | null;
        if (el) el.style.bottom = "";
      } catch { /* no bloquea */ }
    };
  }, []);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BlogPostContent({ post }: { post: BlogPost }) {
  const schemas = buildJsonLd(post);
  useLiftFloatingWidgets();

  return (
    <div className="page">
      {/* ─── JSON-LD ─────────────────────────────────────────────────── */}
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
        />
      ))}

      {/* ─── Encabezado ──────────────────────────────────────────────── */}
      <section className="pt-[clamp(40px,5vw,72px)]">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <Link href="/blog">Blog</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="max-w-[200px] truncate sm:max-w-[420px]">{post.title}</span>
          </nav>

          <div className="mt-[clamp(32px,4vw,48px)] max-w-[56rem]">
            <p className="post-cat">{CATEGORY_LABELS[post.category] ?? post.category}</p>
            <h1 className="t-h1 mt-3">{post.title}</h1>
            <p className="t-lead mt-6 max-w-[42rem]">{post.excerpt}</p>

            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              {post.author && (
                <div className="person">
                  {post.author.avatar?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.author.avatar.url} alt={post.author.name} className="avatar" loading="lazy" decoding="async" />
                  ) : (
                    <span className="chat__avatar" aria-hidden="true">{post.author.name.charAt(0)}</span>
                  )}
                  <div>
                    <p className="person__name">{post.author.name}</p>
                    <p className="t-label font-normal">{post.author.role}</p>
                  </div>
                </div>
              )}
              <p className="post-meta mt-0">
                <span>{formatFecha(post.publishedAt, true)}</span>
                <span>{post.readingTime} min de lectura</span>
              </p>
            </div>
          </div>

          {/* Portada: sin texto ni velo encima */}
          {post.coverImage?.asset?.url && (
            <div className="mt-[clamp(40px,5vw,64px)] aspect-[16/9] overflow-hidden rounded-card bg-canvas-2 md:aspect-[21/9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sanityImg(post.coverImage.asset.url, { w: 1600, q: 80 })}
                alt={post.coverImage.alt ?? post.title}
                className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </div>
          )}
        </div>
      </section>

      {/* ─── Body ────────────────────────────────────────────────────── */}
      <section className="section pb-12 pt-[clamp(48px,6vw,80px)] lg:pb-0">
        <div className="wrap grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-[clamp(48px,6vw,96px)]">

          {/* Article body */}
          <article className="min-w-0 max-w-[68ch] text-[1.125rem] leading-[1.65]">
            {/* Featured snippet box (AEO) */}
            {post.featuredSnippet && (
              <div className="mb-10 rounded-card border border-line p-6">
                <p className="t-label flex items-center gap-2">
                  <Icon name="lightbulb" className="text-[18px] text-link" />
                  Resumen rápido
                </p>
                <p className="mt-3 text-ink">
                  {post.featuredSnippet}
                </p>
              </div>
            )}

            {/* PortableText body */}
            {post.body && post.body.length > 0 ? (
              <PortableText value={post.body} components={ptComponents} />
            ) : (
              <p className="text-ink-2">Contenido próximamente.</p>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap gap-2 border-t border-line pt-8">
                {post.tags.map((tag) => (
                  <span key={tag} className="chip">#{tag}</span>
                ))}
              </div>
            )}

            {/* FAQ block (AEO) */}
            {post.faqBlock && post.faqBlock.length > 0 && (
              <div className="mt-16">
                <h2 className={`mb-6 ${H2_CLASS}`}>Preguntas frecuentes</h2>
                <div>
                  {post.faqBlock.map((faq, i) => (
                    <details key={i} className="qa">
                      <summary>
                        {faq.question}
                        <Icon name="add" size="none" className="flex-none text-[20px]" />
                      </summary>
                      <p className="qa__a">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Article CTA (desde Sanity) */}
            {post.articleCta && (
              <div className="card mt-12 flex flex-col gap-6 p-6 sm:flex-row sm:items-center md:p-8">
                <div className="min-w-0 flex-1">
                  <h3 className="t-h3">{post.articleCta.heading}</h3>
                  {post.articleCta.subtext && (
                    <p className="t-small mt-2">{post.articleCta.subtext}</p>
                  )}
                </div>
                <Link href={post.articleCta.buttonUrl} className="btn btn--primary flex-none">
                  {post.articleCta.buttonLabel}
                  <Icon name="arrow_forward" size="none" className="arrow" />
                </Link>
              </div>
            )}

            {/* Related cars */}
            {post.relatedCars && post.relatedCars.length > 0 && (
              <div className="mt-16">
                <h2 className={`mb-6 ${H2_CLASS}`}>Autos mencionados en este artículo</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {post.relatedCars.map((car) => {
                    const pct = Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100);
                    return (
                      <Link key={car._id} href={`/auto/${car.slug}`} className="card card--link p-5">
                        <p className="car__brand">{car.brand?.name}</p>
                        <p className="mt-0.5 truncate font-semibold text-ink">{car.name}</p>
                        {car.tagline && <p className="t-small mt-1 truncate">{car.tagline}</p>}
                        <p className="mt-3 flex items-baseline gap-2">
                          <span className="font-semibold tabular-nums text-ink">{formatCLP(car.discountPrice)}</span>
                          {pct > 0 && <span className="price-save">-{pct}%</span>}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 grid gap-10">
              {/* CTA */}
              <div className="card p-6">
                <p className="t-h4">¿No sabes cuál te conviene?</p>
                <p className="t-small mt-2">
                  Te asesoramos por WhatsApp según tu uso, tus kilómetros y tu presupuesto.
                </p>
                <div className="mt-5 grid gap-2">
                  <Link href="/asesoria" className="btn btn--primary btn--block">
                    Quiero asesoría por {ASESORIA_PRICE}
                  </Link>
                  <OfferCta source="blog" className="btn btn--secondary btn--block">
                    {WAITLIST_LABEL}
                  </OfferCta>
                </div>
              </div>

              {/* Related posts */}
              {post.relatedPosts && post.relatedPosts.length > 0 && (
                <div>
                  <p className="t-label mb-4">Artículos relacionados</p>
                  <ul className="grid gap-4">
                    {post.relatedPosts.map((rp) => (
                      <li key={rp._id}>
                        <Link href={`/blog/${rp.slug}`} className="group flex gap-3">
                          <span className="h-14 w-20 flex-none overflow-hidden rounded-control bg-canvas-2">
                            {rp.coverImage?.asset?.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={sanityImg(rp.coverImage.asset.url, { w: 240, q: 75 })} alt={rp.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center">
                                <Icon name="article" className="text-[20px] text-line-2" />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-ink transition-colors group-hover:text-link">
                              {rp.title}
                            </span>
                            <span className="t-micro mt-1 block">{rp.readingTime} min de lectura</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Share */}
              <div>
                <p className="t-label mb-3">Compartir</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="btn btn--secondary btn--sm btn--block"
                >
                  <Icon name="link" size="none" />
                  Copiar link
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ─── Mobile CTA: fija abajo mientras se lee ────────────────────── */}
      <div className="sticky bottom-0 z-40 border-t border-line bg-canvas lg:hidden">
        <div className="wrap flex gap-2 py-3">
          <OfferCta source="blog" className="btn btn--secondary btn--sm flex-1">
            {WAITLIST_LABEL}
          </OfferCta>
          <Link href="/asesoria" className="btn btn--primary btn--sm flex-1">
            Quiero asesoría
          </Link>
        </div>
      </div>

      {/* ─── CTA final: Asesoría (principal) y waitlist ─────────────── */}
      <section className="section" aria-label="Asesoría y waitlist">
        <div className="wrap">
          <div className="soft-block cta-row">
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
                {WAITLIST_LABEL}
              </OfferCta>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
