"use client";

import { m } from "framer-motion";
import { sanityImg } from "@/lib/sanityImage";

export interface TestimonialData {
  name: string;
  car: string;
  savings: string;
  quote: string;
  rating: number;
  imageUrl?: string;
  personImageUrl?: string;
}

interface TestimonialsProps {
  title?: string;
  testimonials?: TestimonialData[];
}

const DEFAULT_TESTIMONIALS: TestimonialData[] = [
  { name: "Francisco M.", car: "Tesla Model 3",  savings: "$5.200.000", rating: 4, imageUrl: "/images/testimonial-tesla-model3.png", quote: "Llevaba meses mirando el Model 3. Electrificarte consiguió un precio que no encontré en ningún concesionario. En dos semanas ya manejaba con 500 km de autonomía." },
  { name: "Sofía R.",     car: "Kia EV6",        savings: "$3.800.000", rating: 5, imageUrl: "/images/testimonial-kia-ev6.png",      quote: "Quería carga rápida para el día a día y autonomía para los fines de semana. Me trajeron una oferta con bono incluido que no habría conseguido negociando sola." },
  { name: "Pablo V.",     car: "BYD Tang Pro",   savings: "$6.100.000", rating: 4, imageUrl: "/images/testimonial-byd-tang.png",     quote: "Para un auto de ese precio esperaba un proceso largo. Todo lo contrario: oferta en 48 horas, sin pisar concesionarias. El ahorro en un auto así es muy significativo." },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="16" height="16" viewBox="0 0 24 24"
          fill={i < rating ? "#F59E0B" : "none"}
          stroke={i < rating ? "#F59E0B" : "#D1D5DB"}
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function Avatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={sanityImg(imageUrl, { w: 96, q: 85 })}
        alt={name}
        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" loading="lazy" decoding="async" />
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary-deep/20 border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0">
      <span className="text-primary-deep font-headline font-black text-sm">{initials}</span>
    </div>
  );
}

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
          {displayTestimonials.map((t, i) => (
            <m.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden"
            >
              {/* Car photo */}
              {t.imageUrl && (
                <div className="relative w-full flex-shrink-0" style={{ height: "200px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sanityImg(t.imageUrl, { w: 480, q: 75 })}
                    alt={t.car}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} loading="lazy" decoding="async" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
              )}

              <div className="p-6 md:p-8 flex flex-col flex-grow">
                <StarRating rating={t.rating} />
                <blockquote className="text-text-main text-sm leading-relaxed flex-grow mt-4 mb-6 line-clamp-4">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={t.name} imageUrl={t.personImageUrl} />
                    <div className="min-w-0">
                      <p className="font-headline font-bold leading-tight truncate">{t.name}</p>
                      <p className="text-text-muted text-xs truncate">{t.car}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-text-ghost uppercase tracking-wide">Ahorro</p>
                    <p className="text-primary-deep font-headline font-bold">{t.savings}</p>
                  </div>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}
