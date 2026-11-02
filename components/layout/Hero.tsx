import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { HeroBgVideo } from "@/components/layout/HeroBgVideo";
import { HeroSearch } from "@/components/layout/HeroSearch";
import { OFERTA_STANDBY } from "@/lib/products";

export interface HeroData {
  badge?: string;
  title?: string;
  titleHighlight?: string;
  // ─── Flujo principal: Oferta ($19.990) — alimentado por Sanity ───
  subtitle?: string;
  cta1Text?: string;
  cta1Href?: string;
  cta2Text?: string;
  offerPrice?: string;
  // ─── Flujo secundario: Asesoría ($4.990) — fallbacks; listo para Sanity ───
  advisoryTitle?: string;
  advisoryPrice?: string;
  advisoryCtaText?: string;
  advisoryCtaHref?: string;
  // ─── Stats de confianza ───
  statSavings?: string;
  statCars?: string;
  statDiscount?: string;
  statResponse?: string;
  offerOldPrice?: string;
  offerNewPrice?: string;
  offerBadge?: string;
  videoUrl?: string;
}

/** Cifras del hero. Se calculan desde el catálogo (page.tsx), nunca se escriben a mano. */
export interface HeroFacts {
  models: number;
  brands: number;
  /** Siglas de los tipos eléctricos del catálogo, en el orden del sitio (EV, PHEV...). */
  technologies: string[];
}

/** Accesos rápidos bajo el buscador (tipos de vehículo y de electrificado, desde Sanity). */
export interface HeroQuickLink {
  label: string;
  href: string;
}

interface HeroProps {
  data?: HeroData;
  facts?: HeroFacts;
  quickLinks?: HeroQuickLink[];
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/**
 * Hero del home, sistema de diseño v1: video de fondo con un solo velo (el único
 * degradado permitido), titular en Cabinet, bajada, el buscador del catálogo al centro,
 * accesos por tipo, la Asesoría como segundo camino y una fila de cifras reales con hairlines.
 */
export function Hero({ data, facts, quickLinks = [] }: HeroProps) {
  // Giro sep-2026 (ver docs/PIVOT-WAITLIST-PLAN.md): el hero ya NO vende la Oferta
  // ($19.990, en standby). Nov-2026: lo primero es el catálogo (buscador al centro) y la
  // **Asesoría $4.990** queda como segundo camino, para quien no sabe cuál elegir. La
  // waitlist vive en las fichas de auto y en lo ligado a un modelo, no acá. El título y el
  // subtítulo de Sanity (que describen el flujo pagado: "Ahorra millones...") se ignoran
  // mientras dure el standby; al apagar OFERTA_STANDBY vuelven los de Sanity.
  const sanityTitle = [data?.title, data?.titleHighlight].filter(Boolean).join(" ");
  const title = OFERTA_STANDBY || !sanityTitle ? "Encuentra tu próximo auto electrificado." : sanityTitle;
  const catalogLead = facts?.models
    ? `${facts.models} modelos eléctricos e híbridos a la venta en Chile, con precios y fichas reales.`
    : "Autos eléctricos e híbridos a la venta en Chile, con precios y fichas reales.";
  const subtitle = OFERTA_STANDBY || !data?.subtitle
    ? `${catalogLead} Búscalo, compáralo y calcula cuánto ahorras.`
    : data.subtitle;

  // Segundo camino — Asesoría ($4.990)
  const advCtaHref = data?.advisoryCtaHref ?? "/asesoria";
  const advPrice   = data?.advisoryPrice   ?? "$4.990";

  // Cifras reales del catálogo + una celda que invita a la calculadora de ahorro
  // (sin cifra: el ahorro depende del auto y de los kilómetros de cada persona).
  const cells: { num: string; label: string; href?: string }[] = facts
    ? [
        { num: String(facts.models), label: "modelos electrificados en el catálogo" },
        {
          num: "Tu ahorro",
          label: "frente a la bencina, en la calculadora",
          href: "/calculadora",
        },
        { num: String(facts.technologies.length), label: `tecnologías: ${joinList(facts.technologies)}` },
        { num: "10 días", label: "de asesoría por WhatsApp" },
      ].filter((c) => c.num !== "0")
    : [];

  return (
    <section className="hero theme-dark" aria-label="Bienvenida">
      {/* Fondo — video con poster para pintado instantáneo. Un solo velo para leer el texto. */}
      <div className="hero__media">
        <HeroBgVideo poster="/images/video-fondo-hero-poster.jpg" srcMp4="/images/video-fondo-hero.mp4" />
      </div>
      <div className="hero__veil" />

      <div className="wrap hero__in hero-fade-in">
        <h1 className="t-display hero__title">{title}</h1>
        <p className="hero__lead">{subtitle}</p>

        <HeroSearch />

        {quickLinks.length > 0 && (
          <nav className="hero__quick" aria-label="Explorar el catálogo">
            <span className="hero__quick-label">O explora por</span>
            {quickLinks.map((l) => (
              <Link key={l.href} href={l.href} className="btn btn--secondary btn--sm">
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="hero__adv">
          <span>¿No sabes cuál elegir?</span>
          <Link href={advCtaHref} className="btn btn--secondary">
            Asesoría por WhatsApp por {advPrice}
            <Icon name="arrow_forward" size="none" className="arrow" />
          </Link>
        </div>

        {cells.length > 0 && (
          <div className="facts">
            {cells.map((c) =>
              c.href ? (
                <Link className="fact fact--link" href={c.href} key={c.label}>
                  <p className="fact__num">{c.num}</p>
                  <p className="fact__label">
                    {c.label}
                    <Icon name="arrow_forward" size="none" className="arrow fact__arrow" />
                  </p>
                </Link>
              ) : (
                <div className="fact" key={c.label}>
                  <p className="fact__num">{c.num}</p>
                  <p className="fact__label">{c.label}</p>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}
