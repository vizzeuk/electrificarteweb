"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

export interface TestimonialData {
  name: string;
  car: string;
  savings: string;
  quote: string;
  rating: number;
}

interface TestimonialsProps {
  title?: string;
  testimonials?: TestimonialData[];
}

const DEFAULT_TESTIMONIALS: TestimonialData[] = [
  { name: "Francisco M.", car: "Tesla Model 3",  savings: "$5.200.000", rating: 5, quote: "Pensé que era demasiado bueno para ser real, pero Electrificarte me consiguió un precio que ningún concesionario me ofreció directamente. El proceso fue rápido y transparente." },
  { name: "Sofía R.",     car: "Kia EV6",        savings: "$3.800.000", rating: 5, quote: "Me vine a vivir a Chile y necesitaba un SUV amplio. En 48 horas tenía una oferta con financiamiento incluido que me ahorró casi 4 millones." },
  { name: "Pablo V.",     car: "BYD Tang Pro",   savings: "$6.100.000", rating: 5, quote: "Lo mejor es que no tuve que negociar con nadie. Ellos hicieron todo el trabajo pesado y yo solo fui a retirar mi auto. 100% recomendado." },
];

export function Testimonials({ title = "Lo que dicen nuestros clientes", testimonials }: TestimonialsProps) {
  const displayTestimonials = testimonials && testimonials.length > 0 ? testimonials : DEFAULT_TESTIMONIALS;

  return (
    <section className="py-20 md:py-24 bg-surface" aria-labelledby="testimonials-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Testimonios reales</p>
          <h2 id="testimonials-title" className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tight">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {displayTestimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 flex flex-col"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, si) => (
                  <Icon key={si} name="star" className="text-amber" size="sm" filled />
                ))}
              </div>
              <blockquote className="text-text-main text-sm leading-relaxed flex-grow mb-6">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="border-t border-gray-100 pt-4 flex justify-between items-end">
                <div>
                  <p className="font-headline font-bold">{t.name}</p>
                  <p className="text-text-muted text-xs">{t.car}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-text-ghost uppercase tracking-wide">Ahorro</p>
                  <p className="text-primary-deep font-headline font-bold">{t.savings}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
