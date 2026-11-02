"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE, WAITLIST_PITCH } from "@/lib/products";

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
    description: "Te contactamos cuando abramos la negociación con vendedores oficiales y tengamos novedades para tu modelo.",
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
const POSTER = "/hero-video/explicativo-poster.jpg";
// Una vez por visita: sessionStorage dura lo que la pestaña. Una pestaña nueva lo vuelve a mostrar.
const SEEN_KEY = "ea_how_video_session";
const AUTO_OPEN_MS = 1000;

export function HowItWorks({ title = "Cómo funciona Electrificarte", steps, videoDesktopUrl }: HowItWorksProps) {
  // Un solo video 16:9 para todas las pantallas: no hay versión vertical vigente (en celular se ve
  // con franjas negras arriba y abajo).
  const VIDEO = videoDesktopUrl ?? FALLBACK_16x9;
  const [modalOpen, setModalOpen] = useState(false);
  // Si el popup se abre solo, el navegador no deja reproducir con sonido sin un clic: arranca
  // silenciado. El video trae subtítulos, así que se entiende igual.
  const [autoOpened, setAutoOpened] = useState(false);

  const waitlistSteps = steps && steps.length > 0 ? steps : OFERTA_STEPS;

  // Se abre solo al entrar al home, ~1 s después de cargar (deja pintar el hero primero).
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
    } catch {
      return; // sin sessionStorage (modo privado estricto) no se abre solo: no habría cómo no repetirlo
    }
    const timer = setTimeout(() => {
      setAutoOpened(true);
      setModalOpen(true);
      try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
    }, AUTO_OPEN_MS);
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
  }

  function openModal() {
    setAutoOpened(false);
    setModalOpen(true);
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
  }

  return (
    <>
      <section id="como-funciona" className="section section--subtle" aria-labelledby="howitworks-title">
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
              <p className="path__text">{WAITLIST_PITCH}</p>
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
              {" "}y te avisamos cuando abramos la negociación con vendedores oficiales.
            </p>
            <button type="button" onClick={openModal} className="btn btn--secondary">
              <Icon name="play_arrow" size="none" filled />
              Ver video explicativo
            </button>
          </div>
        </div>
      </section>

      {/* Popup del video, en <body> para que el position:fixed no dependa de ningún contenedor. */}
      {modalOpen && createPortal(
        <div
          className="modal is-open z-[200]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-modal-title"
          onClick={closeModal}
        >
          <div className="modal__card modal__card--video" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal__head">
              <div>
                <h2 id="video-modal-title" className="video-modal__title">Cómo funciona, en un minuto</h2>
                <p className="video-modal__text">La asesoría por WhatsApp y la lista de espera, de principio a fin.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="btn btn--secondary btn--icon btn--sm"
                aria-label="Cerrar video"
              >
                <Icon name="close" size="none" />
              </button>
            </div>
            <div className="video-modal__media">
              <video src={VIDEO} poster={POSTER} autoPlay muted={autoOpened} controls playsInline />
            </div>
            <div className="video-modal__foot">
              <p>¿Aún no sabes qué auto elegir?</p>
              <div className="video-modal__actions">
                {/* Sin lista de espera acá: suelta no se entiende (feedback 28-sep); vive en las fichas. */}
                <Link href="/marcas" className="btn btn--secondary" onClick={closeModal}>
                  Ver el catálogo
                </Link>
                <Link href="/asesoria" className="btn btn--primary" onClick={closeModal}>
                  Quiero asesoría por {ASESORIA_PRICE}
                  <Icon name="arrow_forward" size="none" className="arrow" />
                </Link>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
