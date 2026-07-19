import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { HeroBgVideo } from "@/components/layout/HeroBgVideo";

export interface HeroData {
  badge?: string;
  title?: string;
  titleHighlight?: string;
  // ─── Panel Oferta ($19.990) — alimentado por Sanity ───
  subtitle?: string;
  cta1Text?: string;
  cta1Href?: string;
  cta2Text?: string;
  offerPrice?: string;
  // ─── Panel Asesoría ($4.990) — hoy con fallbacks; listo para subir a Sanity ───
  advisoryEyebrow?: string;
  advisoryTitle?: string;
  advisorySubtitle?: string;
  advisoryPrice?: string;
  advisoryCtaText?: string;
  advisoryCtaHref?: string;
  // ─── Campos heredados (aún llegan desde page.tsx; no se renderizan hoy) ───
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
  const badge     = data?.badge          ?? "Marketplace #1 de autos eléctricos en Chile";
  const title     = data?.title          ?? "Estrena tu próximo";
  const highlight = data?.titleHighlight ?? "auto electrificado";

  // Panel Oferta ($19.990)
  const offerSubtitle = data?.subtitle  ?? "Ya sabes qué auto quieres. Negociamos con nuestra red de vendedores oficiales y te traemos la mejor oferta del mercado en 48-96 horas. Si no ahorras, te devolvemos el dinero.";
  const offerCtaText  = data?.cta1Text  ?? "Quiero mi oferta";
  const offerCtaHref  = data?.cta1Href  ?? "/solicitar";
  const offerPrice    = data?.offerPrice ?? data?.offerNewPrice ?? "$19.990";

  // Panel Asesoría ($4.990)
  const advEyebrow  = data?.advisoryEyebrow  ?? "Aún no sé cuál elegir";
  const advTitle    = data?.advisoryTitle    ?? "Te ayudamos a decidir";
  const advSubtitle = data?.advisorySubtitle ?? "Francisco, nuestro asesor IA, analiza tu uso y presupuesto por WhatsApp y te ayuda a encontrar tu modelo ideal, sin presión de venta.";
  const advCtaText  = data?.advisoryCtaText  ?? "Quiero asesoría";
  const advCtaHref  = data?.advisoryCtaHref  ?? "/asesoria";
  const advPrice    = data?.advisoryPrice    ?? "$4.990";

  return (
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden bg-black pt-16 md:pt-20"
      aria-label="Bienvenida"
    >
      <div className="absolute inset-0 z-0">
        {/* Background video with poster frame for instant paint */}
        <HeroBgVideo
          poster="/images/video-fondo-hero-poster.jpg"
          srcMp4="/images/video-fondo-hero.mp4"
        />
        {/* Dark overlay keeps text readable */}
        <div className="absolute inset-0 bg-black/78" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-primary/5 rounded-full blur-[140px]" />
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-amber/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20 lg:py-24 w-full">
        {/* Shared header. Plain <div> (not m.div) — keeps CSS entry animation
            without adding a framer-motion consumer that choked iOS Safari. */}
        <div className="hero-fade-in text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <Badge variant="primary" className="mb-5">{badge}</Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-extrabold text-white leading-[1.05] mb-4">
            {title}{" "}
            <span className="text-primary">{highlight}</span>
          </h1>
          <p className="text-base md:text-lg text-white/70">
            ¿No sabes cuál modelo elegir? Te ayudamos.
          </p>
          <p className="text-base md:text-lg text-white/50 mt-1">
            ¿Ya te decidiste por tu próximo electrificado? Te conseguimos el mejor precio.
          </p>
        </div>

        {/* Two co-equal panels. On mobile they stack (Asesoría first). */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 max-w-5xl mx-auto items-stretch">
          {/* ── Panel Asesoría (amber) ── */}
          <div className="card-fade-in flex flex-col rounded-2xl border border-amber/30 bg-white/[0.03] p-6 md:p-8 hover:border-amber/60 hover:bg-white/[0.05] transition-all">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber/15 text-amber">
                <Icon name="forum" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber">{advEyebrow}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-white mb-3 leading-tight">
              {advTitle}
            </h2>
            <p className="text-sm md:text-base text-white/60 leading-relaxed mb-6 flex-1">
              {advSubtitle}
            </p>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl md:text-4xl font-headline font-extrabold text-white">{advPrice}</span>
              <span className="text-xs text-white/40">pago único · acceso por 10 días</span>
            </div>
            <Link
              href={advCtaHref}
              className="inline-flex items-center justify-center gap-2 bg-amber hover:bg-amber-dark text-black font-bold px-6 py-3.5 rounded-xl transition-all text-base shadow-[0_6px_32px_rgba(245,158,11,0.30)] hover:shadow-[0_8px_40px_rgba(245,158,11,0.45)] hover:scale-[1.02] active:scale-[0.99]"
            >
              {advCtaText}
              <Icon name="arrow_forward" size="sm" />
            </Link>
          </div>

          {/* ── Panel Oferta (teal) ── */}
          <div className="card-fade-in flex flex-col rounded-2xl border border-primary/30 bg-white/[0.03] p-6 md:p-8 hover:border-primary/60 hover:bg-white/[0.05] transition-all">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 text-primary">
                <Icon name="verified" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Ya sé qué quiero</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-white mb-3 leading-tight">
              Conseguimos tu mejor precio
            </h2>
            <p className="text-sm md:text-base text-white/60 leading-relaxed mb-6 flex-1">
              {offerSubtitle}
            </p>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl md:text-4xl font-headline font-extrabold text-white">{offerPrice}</span>
              <span className="text-xs text-white/40">pago único</span>
            </div>
            <Link
              href={offerCtaHref}
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3.5 rounded-xl transition-all text-base shadow-[0_6px_32px_rgba(0,229,229,0.30)] hover:shadow-[0_8px_40px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]"
            >
              {offerCtaText}
              <Icon name="arrow_forward" size="sm" />
            </Link>
          </div>
        </div>

        {/* Secondary CTA — anchors to the two-track "Cómo funciona" section */}
        <div className="text-center mt-8">
          <a
            href="#como-funciona"
            className="inline-flex items-center justify-center gap-1.5 text-white/50 hover:text-white text-sm font-medium transition-colors"
          >
            ¿Cómo funciona cada uno?
            <Icon name="expand_more" size="sm" />
          </a>
        </div>
      </div>
    </section>
  );
}
