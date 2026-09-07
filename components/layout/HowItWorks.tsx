"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";

export interface HowItWorksStep {
  number?: string;
  icon: string;
  title: string;
  description: string;
  tag?: string;
}

interface HowItWorksProps {
  title?: string;
  subtitle?: string;
  steps?: HowItWorksStep[];
  videoUrl?: string;
  videoDesktopUrl?: string;
  videoMobileUrl?: string;
}

// ─── Track OFERTA — fallback si Sanity no trae pasos ───
// Giro sep-2026: la Oferta ($19.990) está en standby. Estos pasos describen el
// camino de la WAITLIST — no mencionan precio ni prometen una oferta.
const OFERTA_STEPS: HowItWorksStep[] = [
  {
    number: "01",
    icon: "search",
    title: "Elige tu modelo",
    description: "Ya sabes qué auto quieres. Dinos el modelo desde el catálogo o el buscador.",
  },
  {
    number: "02",
    // `person` ya está en el subset de la fuente de íconos. Al cambiarlo por uno
    // nuevo hay que regenerar: scripts/subset-icon-font.ts (ver CLAUDE.md).
    icon: "person",
    title: "Súmate a la waitlist",
    description: "Déjanos tus datos y quedas registrado como interesado en ese modelo.",
  },
  {
    number: "03",
    icon: "handshake",
    title: "Te avisamos",
    description: "Te contactamos cuando abramos el acceso y tengamos novedades para tu modelo.",
  },
  {
    number: "04",
    icon: "celebration",
    title: "Estrena tu auto",
    description: "Coordinas con el vendedor oficial los últimos detalles y retiras tu vehículo nuevo.",
  },
];

// ─── Track ASESORÍA ($4.990) — hardcodeado; listo para subir a Sanity ───
const ASESORIA_STEPS: HowItWorksStep[] = [
  {
    number: "01",
    icon: "forum",
    title: "Contratas y te escribimos",
    description: "Pagas $4.990 y Francisco IA te contacta por WhatsApp al instante.",
  },
  {
    number: "02",
    icon: "psychology",
    title: "Analizamos tu caso",
    description: "Revisamos tu uso diario, presupuesto y necesidades reales para filtrar el catálogo por ti.",
  },
  {
    number: "03",
    icon: "check_circle",
    title: "Llegas a tu auto ideal",
    description: "Terminas con claridad total sobre qué modelo comprar. Es una conversación, no una venta.",
  },
];

type Accent = "amber" | "teal";

const ACCENT: Record<Accent, {
  label: string; text: string; chipBg: string; card: string;
  numBg: string; line: string; btn: string;
}> = {
  amber: {
    label: "Asesoría · $4.990",
    text: "text-amber-dark",
    chipBg: "bg-amber/10 text-amber-dark",
    card: "hover:border-amber/40 hover:shadow-amber/5",
    numBg: "from-amber/20 to-amber/5 border-amber/40 text-amber-dark",
    line: "border-amber/30",
    btn: "bg-amber hover:bg-amber-dark",
  },
  teal: {
    label: "Oferta",
    text: "text-primary-deep",
    chipBg: "bg-primary/10 text-primary-deep",
    card: "hover:border-primary/40 hover:shadow-primary/5",
    numBg: "from-primary/20 to-primary/5 border-primary/40 text-primary-deep",
    line: "border-primary/30",
    btn: "bg-primary hover:bg-primary-dark",
  },
};

function Track({
  accent, heading, description, steps, ctaText, ctaHref, offer,
}: {
  accent: Accent;
  heading: string;
  description: string;
  steps: HowItWorksStep[];
  ctaText: string;
  /** Destino del CTA. Se ignora cuando `offer` es true (lo decide `OfferCta`). */
  ctaHref?: string;
  /** Track de la Oferta: el CTA pasa por `OfferCta` (waitlist o `/solicitar`). */
  offer?: boolean;
}) {
  const a = ACCENT[accent];
  const ctaClass = `mt-7 inline-flex items-center justify-center ${a.btn} text-black font-bold px-6 py-3 rounded-xl transition-all text-base`;
  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <span className={`inline-block ${a.chipBg} text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3`}>
          {a.label}
        </span>
        <h3 className="font-headline font-bold text-xl md:text-2xl mb-2">{heading}</h3>
        <p className="text-sm text-text-muted leading-relaxed">{description}</p>
      </div>

      {/* Vertical roadmap */}
      <div className="relative pl-10 flex-1">
        <div className={`absolute left-4 top-4 bottom-4 w-px border-l-2 border-dashed ${a.line}`} />
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="fade-in-up relative mb-5 last:mb-0"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className={`absolute -left-10 top-1 w-8 h-8 rounded-full bg-gradient-to-br ${a.numBg} border-2 flex items-center justify-center`}>
              <Icon name={step.icon} size="sm" />
            </div>
            <h4 className="font-headline font-bold text-base mb-1">{step.title}</h4>
            <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>

      {offer ? (
        <OfferCta source="howitworks" className={ctaClass}>
          {ctaText}
        </OfferCta>
      ) : ctaHref ? (
        <Link href={ctaHref} className={ctaClass}>
          {ctaText}
        </Link>
      ) : null}
    </div>
  );
}

const FALLBACK_16x9 = "/hero-video/explicativo-16x9.mp4";
const FALLBACK_9x16 = "/hero-video/explicativo-9x16.mp4";
const SEEN_KEY = "ea_how_video_seen";

export function HowItWorks({ title = "Cómo funciona Electrificarte", subtitle, steps, videoDesktopUrl, videoMobileUrl }: HowItWorksProps) {
  const VIDEO_16x9 = videoDesktopUrl ?? FALLBACK_16x9;
  const VIDEO_9x16 = videoMobileUrl ?? FALLBACK_9x16;
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileVideoOpen, setMobileVideoOpen] = useState(false);

  const ofertaSteps = steps && steps.length > 0 ? steps : OFERTA_STEPS;
  const ofertaDescription = subtitle ?? "Comparamos precios, bonos y financiamiento con nuestra red de vendedores y te traemos la mejor oferta del mercado.";

  // Auto-open desktop modal for first-time visitors after 5 seconds
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(SEEN_KEY)) return;
    // Only auto-open on desktop — mobile uses inline video to avoid iOS fixed-position bugs
    if (window.innerWidth < 640) return;
    const timer = setTimeout(() => {
      setModalOpen(true);
      localStorage.setItem(SEEN_KEY, "1");
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  function closeModal() {
    setModalOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(SEEN_KEY, "1");
    }
  }

  function openModal() {
    setModalOpen(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(SEEN_KEY, "1");
    }
  }

  return (
    <>
      <section id="como-funciona" className="py-20 md:py-24 overflow-hidden" aria-labelledby="howitworks-title">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14 md:mb-16">
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Proceso simple</p>
            <h2 id="howitworks-title" className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tight mb-4">
              {title}
            </h2>
            <p className="text-text-muted max-w-2xl mx-auto">
              Dos caminos, un mismo objetivo: que estrenes tu auto electrificado al mejor precio de Chile. Elige según dónde estás hoy.
            </p>
          </div>

          {/* Two parallel tracks — stacked on mobile, side-by-side on desktop */}
          <div className="grid gap-12 md:gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            <Track
              accent="amber"
              heading="Aún no sé qué auto quiero"
              description="Te ayudamos a decidir con una asesoría IA por WhatsApp, según tu uso y presupuesto reales."
              steps={ASESORIA_STEPS}
              ctaText="Quiero asesoría"
              ctaHref="/asesoria"
            />
            <Track
              accent="teal"
              heading="Ya sé qué auto quiero"
              description={ofertaDescription}
              steps={ofertaSteps}
              ctaText="Quiero mi oferta"
              offer
            />
          </div>

          {/* Optional bridge — parallel, not a ladder */}
          <p className="text-center text-sm text-text-muted mt-10">
            ¿Hiciste la asesoría y ya decidiste? Súmate a la{" "}
            <OfferCta source="howitworks" className="text-primary-deep font-semibold hover:underline">waitlist</OfferCta>.
          </p>

          <div className="text-center mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Mobile: toggle inline video */}
            <button
              onClick={() => setMobileVideoOpen((o) => !o)}
              className="sm:hidden inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-primary/40 text-gray-700 font-bold px-8 py-4 rounded-xl transition-all text-lg"
            >
              <Icon name={mobileVideoOpen ? "pause_circle" : "play_circle"} size="sm" />
              {mobileVideoOpen ? "Cerrar video" : "Ver video explicativo"}
            </button>
            {/* Desktop: open modal */}
            <button
              onClick={openModal}
              className="hidden sm:inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-primary/40 text-gray-700 font-bold px-8 py-4 rounded-xl transition-all text-lg"
            >
              <Icon name="play_circle" size="sm" />
              Ver video explicativo
            </button>
          </div>

          {/* Mobile inline video — no modal, no fixed positioning issues on iOS */}
          {mobileVideoOpen && (
            <div className="sm:hidden mt-6 rounded-2xl overflow-hidden bg-black shadow-xl">
              <video
                key="mobile-video"
                src={VIDEO_9x16}
                className="w-full"
                autoPlay
                controls
                playsInline
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Desktop video modal ───────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] hidden sm:flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={VIDEO_16x9}
              className="w-full h-full object-cover"
              autoPlay
              controls
              playsInline
            />
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors z-10"
              aria-label="Cerrar video"
            >
              <Icon name="close" size="sm" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
