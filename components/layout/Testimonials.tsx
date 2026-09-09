import Link from "next/link";
import { sanityImg } from "@/lib/sanityImage";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/reviews/StarRating";
import { ReviewCta } from "@/components/reviews/ReviewCta";

export interface TestimonialData {
  name: string;
  car: string;
  carSlug?: string;
  /** Ahorro logrado. Opcional: las reseñas de usuarios no lo traen. */
  savings?: string;
  quote: string;
  rating: number;
  imageUrl?: string;
  personImageUrl?: string;
  /** Marca "Compra verificada" cuando la reseña vino por invitación. */
  verified?: boolean;
}

interface TestimonialsProps {
  title?: string;
  testimonials?: TestimonialData[];
}

const DEFAULT_TESTIMONIALS: TestimonialData[] = [
  { name: "Rodrigo M.", car: "Tesla Model 3",  carSlug: "tesla-model-3", savings: "$5.200.000", rating: 5, imageUrl: "/images/testimonial-tesla-model3.webp", personImageUrl: "/images/testimonial-person-1.jpg", quote: "Llevaba meses mirando el Model 3. Electrificarte consiguió un precio que no encontré por mi cuenta. En dos semanas ya manejaba con 500 km de autonomía." },
  { name: "Sofía R.",     car: "Kia EV6",        carSlug: "kia-ev6",       savings: "$3.800.000", rating: 5, imageUrl: "/images/testimonial-kia-ev6.webp",      personImageUrl: "/images/testimonial-person-2.jpg", quote: "Quería carga rápida para el día a día y autonomía para los fines de semana. Me trajeron una oferta con bono incluido que no habría conseguido negociando sola." },
  { name: "Pablo V.",     car: "BYD Tang Pro",   carSlug: "byd-tang",      savings: "$6.100.000", rating: 5, imageUrl: "/images/testimonial-byd-tang.webp",     personImageUrl: "/images/testimonial-person-3.jpg", quote: "Para un auto de ese precio esperaba un proceso largo. Todo lo contrario: sin pisar una sola sucursal. El ahorro en un auto así es muy significativo." },
];

function Avatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  const initials = (name ?? "").split(" ").map(n => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={sanityImg(imageUrl, { w: 96, q: 85 })}
        alt={name}
        className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" loading="lazy" decoding="async" />
    );
  }
  return (
    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-primary-deep/20 border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0">
      <span className="text-primary-deep font-headline font-black text-sm">{initials}</span>
    </div>
  );
}

export function Testimonials({ title = "Lo que dicen nuestros clientes", testimonials }: TestimonialsProps) {
  const items = testimonials && testimonials.length > 0 ? testimonials : DEFAULT_TESTIMONIALS;

  // Resumen agregado: es la prueba social más fuerte y lo que después alimenta
  // el AggregateRating de structured data.
  const promedio = items.length
    ? Math.round((items.reduce((acc, t) => acc + (t.rating || 0), 0) / items.length) * 10) / 10
    : 0;

  return (
    <section className="py-20 md:py-24 bg-surface" aria-labelledby="testimonials-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* ── Encabezado con resumen agregado ── */}
        <div className="text-center mb-12 md:mb-14">
          <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Reseñas reales</p>
          <h2 id="testimonials-title" className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tight mb-5">
            {title}
          </h2>
          {promedio > 0 && (
            <div className="inline-flex items-center gap-3 rounded-full border border-gray-200 bg-white px-5 py-2.5 shadow-sm">
              <StarRating value={Math.round(promedio)} size={18} />
              <span className="font-headline text-lg font-black leading-none">{promedio.toFixed(1)}</span>
              <span className="h-4 w-px bg-gray-200" />
              <span className="text-sm text-text-muted">
                {items.length} {items.length === 1 ? "reseña" : "reseñas"}
              </span>
            </div>
          )}
        </div>

        {/* ── Tarjetas ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
          {items.map((t, i) => (
            <article
              key={`${t.name}-${i}`}
              className="fade-in-up group bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {t.imageUrl && (
                <div className="relative w-full flex-shrink-0 overflow-hidden" style={{ height: "200px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sanityImg(t.imageUrl, { w: 480, q: 75 })}
                    alt={t.car}
                    className="transition-transform duration-500 group-hover:scale-[1.03]"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} loading="lazy" decoding="async" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                  {t.verified && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                      <Icon name="verified" className="text-[13px] text-primary" />
                      Compra verificada
                    </span>
                  )}
                </div>
              )}

              <div className="p-6 md:p-7 flex flex-col flex-grow">
                <StarRating value={t.rating} size={16} />
                <blockquote className="text-text-main text-sm leading-relaxed flex-grow mt-4 mb-6">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={t.name} imageUrl={t.personImageUrl} />
                    <div className="min-w-0">
                      <p className="font-headline font-bold leading-tight truncate">{t.name}</p>
                      {t.carSlug ? (
                        <Link
                          href={`/auto/${t.carSlug}`}
                          className="text-text-muted text-xs truncate block hover:text-primary-deep underline decoration-dotted underline-offset-2 transition-colors"
                        >
                          {t.car}
                        </Link>
                      ) : (
                        <p className="text-text-muted text-xs truncate">{t.car}</p>
                      )}
                    </div>
                  </div>
                  {t.savings && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-text-ghost uppercase tracking-wide">Ahorro</p>
                      <p className="text-primary-deep font-headline font-bold">{t.savings}</p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* ── CTA: dejar una reseña ── */}
        <div className="mt-12 md:mt-14">
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-7 md:px-10 md:py-8 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
            <div>
              <h3 className="font-headline text-xl md:text-2xl font-black tracking-tight">
                ¿Ya tienes tu auto electrificado?
              </h3>
              <p className="text-text-muted text-sm mt-1.5 max-w-xl">
                Cuéntanos tu experiencia real — autonomía, carga, manejo. Ayudas a que el próximo
                comprador decida mejor.
              </p>
            </div>
            <ReviewCta
              source="home"
              className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-dark text-black font-bold px-7 py-3.5 text-sm transition-all shadow-[0_4px_20px_rgba(0,229,229,0.25)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.4)] hover:scale-[1.02] active:scale-[0.99]"
            >
              <Icon name="star" className="text-[18px]" />
              Escribir mi reseña
            </ReviewCta>
          </div>
        </div>
      </div>
    </section>
  );
}
