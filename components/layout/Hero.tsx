import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { HeroBgVideo } from "@/components/layout/HeroBgVideo";
import { OfferCta } from "@/components/waitlist/OfferCta";

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

interface HeroProps {
  data?: HeroData;
}

export function Hero({ data }: HeroProps) {
  const badge     = data?.badge          ?? "El mejor precio en autos electrificados de Chile";
  const title     = data?.title          ?? "Ahorra millones en tu próximo";
  const highlight = data?.titleHighlight ?? "auto electrificado";

  // Giro sep-2026 (ver docs/PIVOT-WAITLIST-PLAN.md): el hero ya NO vende la Oferta
  // ($19.990, en standby). La acción principal es la **Asesoría $4.990** y la
  // secundaria abre el popup de **waitlist**. Por eso el subtítulo de Sanity —que
  // describe el flujo pagado— se ignora mientras dure el standby.
  const heroSubtitle = "¿No sabes cuál te conviene? Te asesoramos para elegir el auto electrificado ideal para ti. Y si ya lo tienes claro, súmate a la waitlist para conseguir la mejor oferta.";

  // Flujo principal — Asesoría ($4.990)
  const advCtaHref  = data?.advisoryCtaHref  ?? "/asesoria";
  const advPrice    = data?.advisoryPrice    ?? "$4.990";

  // Prueba social + ancla de ahorro (venden el ROI de la oferta paga)
  const avgSavings = data?.statSavings ?? "$4.200.000";
  const avatars = [
    "/images/testimonial-person-1.jpg",
    "/images/testimonial-person-2.jpg",
    "/images/testimonial-person-3.jpg",
  ];

  return (
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden bg-black pt-16 md:pt-20"
      aria-label="Bienvenida"
    >
      {/* Fondo — video con poster para pintado instantáneo */}
      <div className="absolute inset-0 z-0">
        <HeroBgVideo
          poster="/images/video-fondo-hero-poster.jpg"
          srcMp4="/images/video-fondo-hero.mp4"
        />
        {/* Overlay base + degradado a la izquierda para legibilidad del texto */}
        <div className="absolute inset-0 bg-black/72" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-amber/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20 lg:py-24 w-full">
        {/* Bloque editorial — alineado a la izquierda, con jerarquía clara */}
        <div className="hero-fade-in max-w-3xl">
          <Badge variant="primary" className="mb-5">{badge}</Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-headline font-extrabold text-white leading-[1.03] mb-5">
            {title}{" "}
            <span className="text-primary">{highlight}</span>
          </h1>
          <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-xl mb-8">
            {heroSubtitle}
          </p>

          {/* CTA principal (Asesoría $4.990) + camino secundario (waitlist).
              Ambos comparten estructura ícono + dos líneas; el principal va
              relleno (teal) para marcar jerarquía. El orden se invirtió con el
              giro: antes el relleno era la Oferta $19.990, hoy en standby. */}
          <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-4">
            <Link
              href={advCtaHref}
              className="group inline-flex items-center gap-3 rounded-xl bg-primary hover:bg-primary-dark text-black px-5 py-4 transition-all shadow-[0_6px_32px_rgba(0,229,229,0.30)] hover:shadow-[0_10px_44px_rgba(0,229,229,0.50)] hover:scale-[1.02] active:scale-[0.99]"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-black/15 shrink-0">
                <Icon name="forum" className="text-[20px]" />
              </span>
              <span className="text-left leading-tight">
                <span className="block text-base md:text-lg font-extrabold">Te ayudamos a elegir</span>
                <span className="block text-xs font-semibold text-black/70">Asesoría personalizada por {advPrice}</span>
              </span>
              <Icon name="chevron_right" className="text-[20px] transition-transform group-hover:translate-x-0.5" />
            </Link>

            <OfferCta
              source="hero"
              className="group inline-flex items-center gap-3 rounded-xl border border-white/15 hover:border-primary/50 bg-white/[0.02] hover:bg-white/[0.05] px-5 py-4 transition-all"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/15 text-primary shrink-0">
                <Icon name="sell" className="text-[20px]" />
              </span>
              <span className="text-left leading-tight">
                <span className="block text-base md:text-lg font-extrabold text-white">Consigue la mejor oferta</span>
                <span className="block text-xs font-semibold text-white/55">Únete a la waitlist · gratis</span>
              </span>
              <Icon name="chevron_right" className="text-[20px] text-white/40 transition-transform group-hover:translate-x-0.5" />
            </OfferCta>
          </div>

          {/* Microcopy */}
          <p className="text-xs text-white/45 mt-5">
            Sin costo y sin compromiso: te avisamos apenas tengamos la mejor oferta para tu auto.
          </p>
        </div>

        {/* Prueba social + ancla de ahorro — vende el ROI, no un tablero de stats */}
        <div className="hero-fade-in mt-11 md:mt-14 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
          {/* Red de vendedores — el mecanismo real que consigue el descuento */}
          <div className="flex items-center gap-3.5">
            <div className="flex -space-x-3">
              {avatars.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  aria-hidden
                  className="w-10 h-10 rounded-full border-2 border-black object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
            <div className="leading-tight">
              <p className="text-white text-sm font-bold">+15 vendedores oficiales</p>
              <p className="text-xs text-white/55 mt-0.5">compiten por tu mejor precio</p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-11 bg-white/15" />

          {/* Ancla de ahorro — el argumento de venta del pago */}
          <div className="leading-tight">
            <p className="text-xs text-white/55">Nuestros clientes ahorran en promedio</p>
            <p className="font-headline font-extrabold text-white text-xl md:text-2xl mt-0.5">
              <span className="text-primary">{avgSavings}</span> por auto
            </p>
          </div>
        </div>

        {/* Enlace secundario a "Cómo funciona" */}
        <div className="mt-8">
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm font-medium transition-colors"
          >
            ¿Cómo funciona cada camino?
            <Icon name="expand_more" size="sm" />
          </a>
        </div>
      </div>
    </section>
  );
}
