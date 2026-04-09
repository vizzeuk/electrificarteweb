"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export interface HowItWorksStep {
  number?: string;
  icon: string;
  title: string;
  description: string;
}

interface HowItWorksProps {
  title?: string;
  subtitle?: string;
  steps?: HowItWorksStep[];
}

const DEFAULT_STEPS: HowItWorksStep[] = [
  { number: "01", icon: "search",      title: "Elige tu auto",             description: "Explora nuestro catálogo o dinos qué modelo te interesa. Tenemos acceso a todas las marcas eléctricas en Chile." },
  { number: "02", icon: "payments",    title: "Paga tu asesoría ($19.990)", description: "Con un pago único activas nuestro servicio. Negociamos con nuestra red exclusiva de concesionarios para conseguirte el mejor precio." },
  { number: "03", icon: "handshake",   title: "Recibe tu oferta en 24h",   description: "Te presentamos la mejor oferta del mercado con todos los bonos y financiamiento incluido. Tú decides si la tomas." },
  { number: "04", icon: "celebration", title: "Estrena tu auto",            description: "Te acompañamos en todo el proceso de compra hasta que retires tu vehículo nuevo con total tranquilidad." },
];

export function HowItWorks({ title = "Cómo funciona Electrificarte", subtitle, steps }: HowItWorksProps) {
  const displaySteps = steps && steps.length > 0 ? steps : DEFAULT_STEPS;
  const displaySubtitle = subtitle ?? "En 4 simples pasos pasas de buscar a estrenar tu auto eléctrico al mejor precio de Chile.";

  return (
    <section id="como-funciona" className="py-20 md:py-24" aria-labelledby="howitworks-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Proceso simple</p>
          <h2 id="howitworks-title" className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tight mb-4">
            {title}
          </h2>
          <p className="text-text-muted max-w-2xl mx-auto">{displaySubtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {displaySteps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative bg-white border border-gray-100 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              {step.number && (
                <span className="text-[80px] font-headline font-black text-gray-50 absolute -top-2 right-4 leading-none select-none">
                  {step.number}
                </span>
              )}
              <div className="relative z-10">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                  <Icon name={step.icon} className="text-primary-deep" />
                </div>
                <h3 className="font-headline font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
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
