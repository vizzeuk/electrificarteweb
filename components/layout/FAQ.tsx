"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

export interface FAQItem {
  question: string;
  answer: string;
  icon?: string;
}

interface FAQProps {
  title?: string;
  faqs?: FAQItem[];
}

const DEFAULT_FAQS: FAQItem[] = [
  { icon: "savings",       question: "¿Cuánto ahorro realmente usando Electrificarte?",  answer: "El ahorro depende del modelo y del momento de compra. Negociamos con nuestra red de concesionarios para conseguirte la mejor oferta disponible, incluyendo bonos y descuentos que no están al alcance del público general. Nuestros clientes han ahorrado desde $800.000 hasta más de $6.000.000." },
  { icon: "groups",        question: "¿Cómo logran esos descuentos?",                    answer: "Trabajamos con una amplia red de concesionarios y distribuidores en Chile. Al agrupar múltiples solicitudes de compra, podemos negociar descuentos por volumen, acceder a bonos exclusivos y encontrar ofertas de inventario que no están disponibles al público general." },
  { icon: "payments",      question: "¿Tiene algún costo para mí?",                      answer: "Solo pagas una tarifa única de $19.990 para activar el servicio. No hay costos ocultos, suscripciones ni comisiones adicionales. Si no logramos un descuento significativo, te devolvemos el dinero." },
  { icon: "directions_car",question: "¿Tengo que comprar sin ver el auto?",              answer: "Para nada. Nosotros te conseguimos la mejor oferta y te conectamos con el concesionario que la ofrece. Puedes visitarlo, hacer test drive y revisar el vehículo antes de tomar cualquier decisión. La oferta final siempre es tuya para aceptar o rechazar." },
  { icon: "shield",        question: "¿Qué pasa si no consiguen un buen precio?",        answer: "PENDIENTE — respuesta a cargo del equipo Electrificarte." },
];

export function FAQ({ title = "Preguntas frecuentes", faqs }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const displayFaqs = faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS;

  return (
    <section className="py-24 bg-gray-50" aria-labelledby="faq-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-[3fr_2fr] gap-12 lg:gap-16 items-start">

          {/* ── Left: accordion ─────────────────────────────── */}
          <div>
            <h2
              id="faq-title"
              className="text-3xl md:text-4xl font-headline font-black mb-10 uppercase"
            >
              {title}
            </h2>

            <div className="space-y-3" role="list">
              {displayFaqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.07 }}
                  className="border border-gray-200 bg-white rounded-xl overflow-hidden hover:border-primary/30 transition-colors duration-200"
                  role="listitem"
                >
                  <button
                    className="w-full px-5 py-4 text-left flex items-center gap-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    aria-expanded={openIndex === i}
                    aria-controls={`faq-answer-${i}`}
                  >
                    {/* Number + icon */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-black text-primary/50 tracking-widest leading-none">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] text-primary-deep">
                          {faq.icon ?? "help"}
                        </span>
                      </div>
                    </div>

                    <span className="flex-1 font-bold text-sm text-text-main pr-2">
                      {faq.question}
                    </span>

                    <motion.span
                      animate={{ rotate: openIndex === i ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="material-symbols-outlined text-[20px] text-gray-300 flex-shrink-0"
                    >
                      add
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {openIndex === i && (
                      <motion.div
                        id={`faq-answer-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 pl-[4.5rem] text-sm text-text-muted leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Right: trust card ───────────────────────────── */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-black rounded-2xl border border-white/10 p-8 space-y-6"
            >
              {/* Guarantee highlight */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon name="shield" className="text-primary" size="sm" />
                </div>
                <div>
                  <p className="text-white font-headline font-bold text-base leading-snug">
                    Garantía de devolución
                  </p>
                  <p className="text-white/50 text-xs mt-1 leading-relaxed">
                    Si no conseguimos un precio mejor al que encuentras por tu cuenta, te devolvemos el 100% de tu pago.
                  </p>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-primary text-2xl font-headline font-bold">500+</p>
                  <p className="text-white/40 text-xs mt-1">Compras negociadas</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-primary text-2xl font-headline font-bold">24h</p>
                  <p className="text-white/40 text-xs mt-1">Tiempo de respuesta</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-primary text-2xl font-headline font-bold">$19.990</p>
                  <p className="text-white/40 text-xs mt-1">Pago único</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-primary text-2xl font-headline font-bold">0</p>
                  <p className="text-white/40 text-xs mt-1">Costos ocultos</p>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              {/* CTA */}
              <div className="space-y-3">
                <p className="text-white/60 text-xs text-center">
                  ¿Listo para conseguir tu mejor precio?
                </p>
                <Link
                  href="/solicitar"
                  className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-dark text-black font-bold py-3.5 rounded-xl transition-all text-sm shadow-[0_4px_20px_rgba(0,229,229,0.22)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.35)] hover:scale-[1.02] active:scale-[0.99]"
                >
                  Solicitar oferta
                  <Icon name="arrow_forward" size="sm" />
                </Link>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
