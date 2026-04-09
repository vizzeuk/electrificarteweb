"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  title?: string;
  faqs?: FAQItem[];
}

const DEFAULT_FAQS: FAQItem[] = [
  { question: "¿Cómo puedo obtener un descuento en un auto?",     answer: "Al registrarte en nuestra plataforma y pagar una tarifa única de $19.990, activamos nuestro servicio de búsqueda exclusiva. Nuestro equipo negocia directamente con nuestra red de concesionarios para conseguirte el mejor precio posible en el vehículo que elijas." },
  { question: "¿Cómo logran esos descuentos?",                    answer: "Trabajamos con una amplia red de concesionarios y distribuidores en Chile. Al agrupar múltiples solicitudes de compra, podemos negociar descuentos por volumen, acceder a bonos exclusivos y encontrar ofertas de inventario que no están disponibles al público general." },
  { question: "¿Tiene algún costo para mí?",                      answer: "Solo pagas una tarifa única de $19.990 para activar el servicio. No hay costos ocultos, suscripciones ni comisiones adicionales. Si no logramos un descuento significativo, te devolvemos el dinero." },
  { question: "¿Puedo ver el auto antes de comprar?",             answer: "Absolutamente. Nosotros te conectamos con el concesionario que ofrezca el mejor precio. Puedes visitarlo, hacer test drive y verificar todo antes de tomar tu decisión. Nuestro rol es asegurarte la mejor oferta, la decisión final siempre es tuya." },
];

export function FAQ({ title = "Preguntas frecuentes", faqs }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const displayFaqs = faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS;

  return (
    <section className="py-24 bg-gray-50" aria-labelledby="faq-title">
      <div className="max-w-3xl mx-auto px-4 md:px-8">
        <h2 id="faq-title" className="text-3xl font-headline font-black mb-12 uppercase italic text-center">
          {title}
        </h2>

        <div className="space-y-4" role="list">
          {displayFaqs.map((faq, i) => (
            <div
              key={i}
              className="border border-gray-200 bg-white rounded-xl overflow-hidden"
              role="listitem"
            >
              <button
                className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
                aria-controls={`faq-answer-${i}`}
              >
                <span className="font-bold text-sm pr-4">{faq.question}</span>
                <Icon name={openIndex === i ? "remove" : "add"} className="text-gray-400 flex-shrink-0" />
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
                    <p className="px-6 pb-5 text-sm text-text-muted leading-relaxed">{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
