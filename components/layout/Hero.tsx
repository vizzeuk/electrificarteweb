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
}

interface HeroProps {
  data?: HeroData;
  facts?: HeroFacts;
}

/**
 * Hero del home, sistema de diseño v1: video de fondo con un solo velo (el único
 * degradado permitido), titular en Cabinet, bajada, el buscador del catálogo al centro con
 * un enlace a las colecciones, y abajo tres caminos con hairlines: comparar, calcular el
 * ahorro y la Asesoría.
 */
export function Hero({ data, facts }: HeroProps) {
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

  // Tres caminos al pie del hero. La Asesoría ($4.990) es el de quien no sabe cuál elegir.
  const advCtaHref = data?.advisoryCtaHref ?? "/asesoria";
  const advPrice   = data?.advisoryPrice   ?? "$4.990";
  const tools = [
    { icon: "compare_arrows", title: "Compara modelos", text: "Pon dos o más autos lado a lado y mira en qué se diferencian.", href: "/comparador" },
    { icon: "savings", title: "Calcula tu ahorro", text: "Cuánto ahorras frente a la bencina con tus kilómetros.", href: "/calculadora" },
    { icon: "forum", title: "¿No sabes cuál elegir?", text: `Asesoría por WhatsApp por ${advPrice}, durante 10 días.`, href: advCtaHref },
  ];

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

        {/* Enlace de texto (sin botones) a las colecciones del home. */}
        <a href="#colecciones" className="hero__browse">
          <span className="hero__browse-text">O explora nuestro catálogo</span>
          <Icon name="arrow_forward" size="none" className="arrow" />
        </a>

        <nav className="hero__tools" aria-label="Herramientas">
          {tools.map((t) => (
            <Link key={t.href} href={t.href} className="hero__tool">
              <Icon name={t.icon} size="none" className="hero__tool-icon" />
              <span>
                <span className="hero__tool-title t-h3">{t.title}</span>
                <span className="hero__tool-text">{t.text}</span>
              </span>
              <Icon name="arrow_forward" size="none" className="arrow hero__tool-arrow" />
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
