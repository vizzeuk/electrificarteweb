import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { HeroBgVideo } from "@/components/layout/HeroBgVideo";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { OFERTA_STANDBY } from "@/lib/products";
import { formatCLP } from "@/lib/utils";

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
  /** Precio del electrificado más accesible del catálogo (reemplaza la cifra de marcas: las marcas ya se ven en el carrusel). */
  fromPrice?: number | null;
  /** Siglas de los tipos eléctricos del catálogo, en el orden del sitio (EV, PHEV...). */
  technologies: string[];
}

interface HeroProps {
  data?: HeroData;
  facts?: HeroFacts;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/**
 * Hero del home, sistema de diseño v1: video de fondo con un solo velo (el único
 * degradado permitido), titular en Cabinet, bajada, dos caminos y una fila de cifras
 * reales con hairlines. Sin badge, sin glow y sin palabra destacada en color.
 */
export function Hero({ data, facts }: HeroProps) {
  // Giro sep-2026 (ver docs/PIVOT-WAITLIST-PLAN.md): el hero ya NO vende la Oferta
  // ($19.990, en standby). La acción principal es la **Asesoría $4.990** y la
  // secundaria abre el popup de **waitlist**. Por eso el título y el subtítulo de
  // Sanity (que describen el flujo pagado: "Ahorra millones...") se ignoran mientras
  // dure el standby; al apagar OFERTA_STANDBY vuelven los de Sanity.
  // OJO con el wording: la waitlist NO promete una oferta ni implica que el servicio
  // sea gratis — solo registra a los interesados.
  const sanityTitle = [data?.title, data?.titleHighlight].filter(Boolean).join(" ");
  const title = OFERTA_STANDBY || !sanityTitle ? "Elige bien tu próximo auto electrificado." : sanityTitle;
  const subtitle = OFERTA_STANDBY || !data?.subtitle
    ? "¿No sabes cuál te conviene? Te asesoramos por WhatsApp según tu uso, tus kilómetros y tu presupuesto."
    : data.subtitle;

  // Flujo principal — Asesoría ($4.990)
  const advCtaHref = data?.advisoryCtaHref ?? "/asesoria";
  const advPrice   = data?.advisoryPrice   ?? "$4.990";

  const cells = facts
    ? [
        { num: String(facts.models), label: "modelos electrificados en el catálogo" },
        facts.fromPrice
          ? { num: formatCLP(facts.fromPrice), label: "el electrificado más accesible del catálogo" }
          : { num: String(facts.brands), label: "marcas en un solo lugar" },
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

        <div className="hero__actions">
          <Link href={advCtaHref} className="btn btn--primary btn--lg">
            Quiero asesoría por {advPrice}
            <Icon name="arrow_forward" size="none" className="arrow" />
          </Link>
          <OfferCta source="hero" className="btn btn--secondary btn--lg">
            Únete a la waitlist
          </OfferCta>
          <a className="hero__how" href="#como-funciona">
            Cómo funciona
            <Icon name="expand_more" size="none" />
          </a>
        </div>

        {cells.length > 0 && (
          <div className="facts">
            {cells.map((c) => (
              <div className="fact" key={c.label}>
                <p className="fact__num">{c.num}</p>
                <p className="fact__label">{c.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
