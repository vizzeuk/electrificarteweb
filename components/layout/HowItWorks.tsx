"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE } from "@/lib/products";

export interface HowItWorksStep {
  number?: string;
  icon: string;
  title: string;
  description: string;
  tag?: string;
}

interface HowItWorksProps {
  title?: string;
  /**
   * Se sigue aceptando (viene de Sanity), pero ya no se dibuja: describía el flujo pagado
   * de la Oferta, en standby. El camino de la derecha usa el copy de la waitlist.
   */
  subtitle?: string;
  steps?: HowItWorksStep[];
  videoUrl?: string;
  videoDesktopUrl?: string;
  videoMobileUrl?: string;
}

// ─── Camino WAITLIST — fallback si Sanity no trae pasos ───
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

// ─── Camino ASESORÍA ($4.990) — hardcodeado; listo para subir a Sanity ───
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
    description: "Revisamos tu uso diario, tu presupuesto y tus necesidades reales para filtrar el catálogo por ti.",
  },
  {
    number: "03",
    icon: "check_circle",
    title: "Llegas a tu auto ideal",
    description: "Terminas con claridad sobre qué modelo comprar. Es una conversación, no una venta.",
  },
];

/** Pasos numerados con hairline entre ellos (el número lo da el orden). */
function Steps({ steps }: { steps: HowItWorksStep[] }) {
  return (
    <ol className="steps">
      {steps.map((step, i) => (
        <li key={step.title} className="step">
          <span className="step__n">{String(i + 1).padStart(2, "0")}</span>
          <div>
            <p className="step__title">{step.title}</p>
            <p className="step__text">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const FALLBACK_16x9 = "/hero-video/explicativo-16x9.mp4";
const FALLBACK_9x16 = "/hero-video/explicativo-9x16.mp4";
const SEEN_KEY = "ea_how_video_seen";

export function HowItWorks({ title = "Cómo funciona Electrificarte", steps, videoDesktopUrl, videoMobileUrl }: HowItWorksProps) {
  const VIDEO_16x9 = videoDesktopUrl ?? FALLBACK_16x9;
  const VIDEO_9x16 = videoMobileUrl ?? FALLBACK_9x16;
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileVideoOpen, setMobileVideoOpen] = useState(false);

  const waitlistSteps = steps && steps.length > 0 ? steps : OFERTA_STEPS;

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

  // Escape cierra el video.
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

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
      <section id="como-funciona" className="section" aria-labelledby="howitworks-title">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 id="howitworks-title" className="t-h2">{title}</h2>
              <p className="t-lead">Dos caminos, según dónde estás hoy. Elige el tuyo.</p>
            </div>
          </div>

          {/* Dos caminos paralelos: la Asesoría en bloque Glaciar (principal), la waitlist con borde. */}
          <div className="paths">
            <div className="path path--primary">
              <div className="path__label">
                <span className="t-label">Asesoría por WhatsApp</span>
                <span className="chip chip--solid">{ASESORIA_PRICE}</span>
              </div>
              <h3 className="path__title">Aún no sé qué auto quiero</h3>
              <p className="path__text">
                Te ayudamos a decidir con una asesoría por WhatsApp, según tu uso y tu presupuesto reales.
              </p>
              <Steps steps={ASESORIA_STEPS} />
              <div className="path__cta">
                <Link href="/asesoria" className="btn btn--primary btn--lg">
                  Quiero asesoría
                  <Icon name="arrow_forward" size="none" className="arrow" />
                </Link>
              </div>
            </div>

            <div className="path path--secondary">
              <div className="path__label">
                <span className="t-label">Waitlist</span>
              </div>
              <h3 className="path__title">Ya sé qué auto quiero</h3>
              <p className="path__text">
                Súmate a la waitlist y te avisamos cuando abramos el acceso para tu modelo.
              </p>
              <Steps steps={waitlistSteps} />
              <div className="path__cta">
                <OfferCta source="howitworks" className="btn btn--secondary btn--lg">
                  Únete a la waitlist
                </OfferCta>
              </div>
            </div>
          </div>

          {/* Puente opcional — paralelo, no una escalera */}
          <div className="paths__foot">
            <p>
              ¿Hiciste la asesoría y ya decidiste?{" "}
              <OfferCta source="howitworks" className="link cursor-pointer">
                Súmate a la waitlist
              </OfferCta>
              .
            </p>
            {/* Móvil: video inline (sin modal: evita los bugs de position fixed de iOS) */}
            <button
              type="button"
              onClick={() => setMobileVideoOpen((o) => !o)}
              aria-expanded={mobileVideoOpen}
              className="btn btn--secondary sm:hidden"
            >
              {mobileVideoOpen ? (
                <Icon name="close" size="none" />
              ) : (
                <Icon name="play_arrow" size="none" filled />
              )}
              {mobileVideoOpen ? "Cerrar video" : "Ver video explicativo"}
            </button>
            {/* Desktop: modal */}
            <button
              type="button"
              onClick={openModal}
              className="btn btn--secondary hidden sm:inline-flex"
            >
              <Icon name="play_arrow" size="none" filled />
              Ver video explicativo
            </button>
          </div>

          {/* Mobile inline video — no modal, no fixed positioning issues on iOS */}
          {mobileVideoOpen && (
            <div className="mt-6 overflow-hidden rounded-card bg-tinta sm:hidden">
              <video
                key="mobile-video"
                src={VIDEO_9x16}
                className="block w-full"
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
          className="modal is-open z-[200] hidden sm:grid"
          role="dialog"
          aria-modal="true"
          aria-label="Video explicativo"
          onClick={closeModal}
        >
          <div className="modal__card modal__card--video" onClick={(e) => e.stopPropagation()}>
            <video src={VIDEO_16x9} autoPlay controls playsInline />
            <button
              type="button"
              onClick={closeModal}
              className="btn btn--secondary btn--icon btn--sm modal__close"
              aria-label="Cerrar video"
            >
              <Icon name="close" size="none" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
