"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

export interface TestimonialData {
  name: string;
  car: string;
  savings: string;
  quote: string;
  rating: number;
  imageUrl?: string;
}

interface TestimonialsProps {
  title?: string;
  testimonials?: TestimonialData[];
}

const DEFAULT_TESTIMONIALS: TestimonialData[] = [
  { name: "Francisco M.", car: "Tesla Model 3",  savings: "$5.200.000", rating: 5, imageUrl: "/images/testimonial-tesla-model3.png", quote: "Electrificarte me consiguió un precio que ningún vendedor me ofreció directamente. El proceso fue rápido y totalmente transparente." },
  { name: "Sofía R.",     car: "Kia EV6",        savings: "$3.800.000", rating: 5, imageUrl: "/images/testimonial-kia-ev6.png",      quote: "Necesitaba un SUV amplio y en 48 horas tenía una oferta con financiamiento incluido que me ahorró casi 4 millones. Increíble." },
  { name: "Pablo V.",     car: "BYD Tang Pro",   savings: "$6.100.000", rating: 5, imageUrl: "/images/testimonial-byd-tang.png",     quote: "Lo mejor es que no tuve que negociar con nadie. Ellos hicieron todo el trabajo pesado y yo solo fui a retirar mi auto. 100% recomendado." },
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
              className="bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden h-full"
            >
              {/* Car photo */}
              {t.imageUrl && (
                <div className="relative w-full flex-shrink-0" style={{ height: "200px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.imageUrl}
                    alt={t.car}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
              )}

              <div className="p-6 md:p-8 flex flex-col flex-grow">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <Icon key={si} name="star" className="text-amber" size="sm" filled />
                  ))}
                </div>
                <blockquote className="text-text-main text-sm leading-relaxed flex-grow mb-6 line-clamp-4">
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
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
