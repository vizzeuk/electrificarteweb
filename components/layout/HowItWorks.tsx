"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

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
}

const DEFAULT_STEPS: HowItWorksStep[] = [
  {
    number: "01",
    icon: "search",
    tag: "Explora el catálogo",
    title: "Cuéntanos qué buscas",
    description: "Explora el catálogo o dinos el modelo que te interesa. Si no estás seguro, te ayudamos a decidir.",
  },
  {
    number: "02",
    icon: "payments",
    tag: "Pago único $19.990",
    title: "Activamos tu búsqueda",
    description: "Con un pago único de $19.990 negociamos en tu nombre con nuestra red exclusiva de concesionarios.",
  },
  {
    number: "03",
    icon: "handshake",
    tag: "Respuesta en 24h",
    title: "Recibe la mejor oferta",
    description: "Comparamos precios, bonos y financiamiento disponible. Tú decides si la tomas.",
  },
  {
    number: "04",
    icon: "celebration",
    tag: "A estrenar",
    title: "Estrena tu auto",
    description: "Coordinas directamente con el concesionario los últimos detalles y retiras tu vehículo nuevo.",
  },
];

const LOCAL_VIDEO = "/hero-video/hero.mp4";
const SEEN_KEY = "ea_how_video_seen";

export function HowItWorks({ title = "Cómo funciona Electrificarte", subtitle, steps, videoUrl }: HowItWorksProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const displaySteps = steps && steps.length > 0 ? steps : DEFAULT_STEPS;
  const displaySubtitle = subtitle ?? "En 4 pasos pasas de buscar a estrenar tu auto eléctrico al mejor precio de Chile.";
  const n = displaySteps.length;
  const pct = (100 / (n * 2)).toFixed(4);

  // Auto-open for first-time visitors after 5 seconds
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(SEEN_KEY)) return;
    const timer = setTimeout(() => {
      setModalOpen(true);
      localStorage.setItem(SEEN_KEY, "1");
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  function closeModal() {
    setModalOpen(false);
    // Mark as seen if they close manually (button click counts too)
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
          <div className="text-center mb-20">
            <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Proceso simple</p>
            <h2 id="howitworks-title" className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tight mb-4">
              {title}
            </h2>
            <p className="text-text-muted max-w-2xl mx-auto">{displaySubtitle}</p>
          </div>

          {/* ── Desktop roadmap ─────────────────────────────────── */}
          <div className="hidden md:block">
            <div className="relative flex items-start justify-between">
              <div
                className="absolute top-8 h-px border-t-2 border-dashed border-primary/30 z-0"
                style={{ left: `${pct}%`, right: `${pct}%` }}
              />

              {displaySteps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="flex-1 flex flex-col items-center z-10"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 flex items-center justify-center mb-6 shadow-[0_0_24px_rgba(0,229,229,0.12)]">
                    <Icon name={step.icon} className="text-primary-deep" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 mx-2 text-center hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 w-full">
                    {step.tag && (
                      <span className="inline-block bg-primary/10 text-primary-deep text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
                        {step.tag}
                      </span>
                    )}
                    <h3 className="font-headline font-bold text-base mb-2">{step.title}</h3>
                    <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Mobile roadmap — vertical ────────────────────────── */}
          <div className="md:hidden relative pl-8">
            <div className="absolute left-4 top-4 bottom-4 w-px border-l-2 border-dashed border-primary/30" />

            {displaySteps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative mb-6 last:mb-0"
              >
                <div className="absolute -left-8 top-4 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 flex items-center justify-center">
                  <Icon name={step.icon} className="text-primary-deep" size="sm" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-primary/30 transition-colors">
                  {step.tag && (
                    <span className="inline-block bg-primary/10 text-primary-deep text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-2">
                      {step.tag}
                    </span>
                  )}
                  <h3 className="font-headline font-bold mb-1">{step.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={openModal}
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-all text-lg"
            >
              <Icon name="play_circle" size="sm" />
              Ver video explicativo
            </button>
            <Link
              href="/solicitar"
              className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-primary/40 text-gray-700 font-bold px-8 py-4 rounded-xl transition-all text-lg"
            >
              Comenzar ahora
              <Icon name="arrow_forward" size="sm" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Video modal ───────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={LOCAL_VIDEO}
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
