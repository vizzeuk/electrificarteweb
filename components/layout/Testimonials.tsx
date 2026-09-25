import Link from "next/link";
import { sanityImg } from "@/lib/sanityImage";
import { Icon } from "@/components/ui/Icon";
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

/** Estrellas en Tinta (macizas las ganadas, en contorno las que faltan). */
function Stars({ value, label }: { value: number; label?: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div
      className="stars"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Icon
          key={i}
          name="star"
          size="none"
          filled={i < filled}
          className={i < filled ? undefined : "text-ink-3"}
        />
      ))}
    </div>
  );
}

function Avatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={sanityImg(imageUrl, { w: 96, q: 85 })}
        alt=""
        className="avatar"
        loading="lazy"
        decoding="async"
      />
    );
  }
  const initials = (name ?? "").split(" ").map(n => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <span aria-hidden className="avatar grid place-items-center bg-canvas-2 text-small font-semibold text-ink-2">
      {initials}
    </span>
  );
}

function VerifiedChip({ onMedia }: { onMedia?: boolean }) {
  return (
    <span className={onMedia ? "chip chip--media" : "chip"}>
      <Icon name="check" size="none" className="text-[16px]" />
      Compra verificada
    </span>
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
    <section className="section section--subtle" aria-labelledby="testimonials-title">
      <div className="wrap">
        {/* ── Encabezado con resumen agregado ── */}
        <div className="section-head">
          <div className="section-head__text">
            <h2 id="testimonials-title" className="t-h2">{title}</h2>
          </div>
          {promedio > 0 && (
            <div className="rating">
              <Stars value={promedio} />
              <span className="rating__num">{promedio.toFixed(1).replace(".", ",")}</span>
              <span className="rating__count">
                {items.length} {items.length === 1 ? "reseña" : "reseñas"}
              </span>
            </div>
          )}
        </div>

        {/* ── Tarjetas (en móvil, carrusel horizontal desde el CSS) ── */}
        <div className="reviews">
          {items.map((t, i) => (
            <article key={`${t.name}-${i}`} className="card review">
              {/* La foto es opcional: las reseñas de usuarios llegan sin ella. */}
              {t.imageUrl && (
                <div className="review__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sanityImg(t.imageUrl, { w: 640, q: 75 })}
                    alt={t.car}
                    loading="lazy"
                    decoding="async"
                  />
                  {t.verified && <VerifiedChip onMedia />}
                </div>
              )}

              <div className="review__body">
                {/* min-h = alto del chip: la cita parte a la misma altura en todas las cards. */}
                <div className="flex min-h-6 items-center justify-between gap-3">
                  <Stars value={t.rating} label={`${t.rating} de 5 estrellas`} />
                  {!t.imageUrl && t.verified && <VerifiedChip />}
                </div>
                <blockquote className="review__quote">{t.quote}</blockquote>

                <div className="review__foot">
                  <div className="person">
                    <Avatar name={t.name} imageUrl={t.personImageUrl} />
                    <div className="min-w-0">
                      <p className="person__name truncate">{t.name}</p>
                      {t.carSlug ? (
                        <Link href={`/auto/${t.carSlug}`} className="person__car">
                          {t.car}
                        </Link>
                      ) : (
                        <p className="person__car no-underline">{t.car}</p>
                      )}
                    </div>
                  </div>
                  {t.savings && (
                    <p className="review__save">
                      <span className="t-label">Ahorro</span>
                      <strong>{t.savings}</strong>
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* ── CTA: dejar una reseña ── */}
        <div className="review-cta">
          <div>
            <h3 className="t-h3">¿Ya tienes tu auto electrificado?</h3>
            <p>
              Cuéntanos tu experiencia real: autonomía, carga y manejo. Ayudas a que el próximo
              comprador decida mejor.
            </p>
          </div>
          <ReviewCta source="home" className="btn btn--secondary btn--lg">
            <Icon name="star" size="none" filled />
            Escribir mi reseña
          </ReviewCta>
        </div>
      </div>
    </section>
  );
}
