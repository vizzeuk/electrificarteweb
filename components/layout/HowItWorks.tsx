"use client";

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

export function HowItWorks({ title = "Cómo funciona Electrificarte", subtitle, steps }: HowItWorksProps) {
  const displaySteps = steps && steps.length > 0 ? steps : DEFAULT_STEPS;
  const displaySubtitle = subtitle ?? "En 4 pasos pasas de buscar a estrenar tu auto eléctrico al mejor precio de Chile.";
  const n = displaySteps.length;
  const pct = (100 / (n * 2)).toFixed(4);

  return (
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
            {/* Dashed connecting line */}
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
                {/* Node */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 flex items-center justify-center mb-6 shadow-[0_0_24px_rgba(0,229,229,0.12)]">
                  <Icon name={step.icon} className="text-primary-deep" />
                </div>
                {/* Card */}
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
          {/* Vertical dashed line */}
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
              {/* Node dot */}
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

        <div className="text-center mt-14">
          <Link
            href="/solicitar"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-all text-lg"
          >
            Comenzar ahora
            <Icon name="arrow_forward" size="sm" />
          </Link>
        </div>
      </div>
    </section>
  );
}
