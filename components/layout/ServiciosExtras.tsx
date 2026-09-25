import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { cleanSeparators, sentenceCase } from "@/lib/utils";

interface ServicioExtra {
  badge?:       string;
  title:        string;
  description:  string;
  ctaText:      string;
  ctaHref:      string;
  imageUrl?:    string | null;
}

interface ServiciosExtrasProps {
  items?: ServicioExtra[] | null;
}

const DEFAULTS: ServicioExtra[] = [
  {
    badge:       "Domicilio",
    title:       "Adquiere tu wallbox domiciliario con descuento",
    description: "Cotiza e instala tu cargador en casa con buenos precios y técnicos certificados.",
    ctaText:     "Ver cargadores",
    ctaHref:     "https://copecvoltex.cl/collections/cargadores-y-cables",
    imageUrl:    "/images/cargadores.webp",
  },
  {
    badge:       "Preferencial",
    title:       "Contrata el seguro de tu auto electrificado a valores preferenciales",
    description: "Seguros especializados para vehículos electrificados, con coberturas pensadas para ellos.",
    ctaText:     "Cotizar seguro",
    ctaHref:     "https://seguro-auto.comparaonline.cl/quote",
    imageUrl:    "/images/seguros.webp",
  },
];

/**
 * Servicios de terceros (cargador y seguro): card con foto a la izquierda y texto a la
 * derecha; en móvil la foto va arriba. Sin velo ni texto sobre la foto.
 */
export function ServiciosExtras({ items }: ServiciosExtrasProps) {
  const cards = (items && items.length > 0 ? items : DEFAULTS).slice(0, 2);

  return (
    <section className="section section--subtle" aria-labelledby="servicios-title">
      <div className="wrap">
        <div className="section-head">
          <div className="section-head__text">
            <h2 id="servicios-title" className="t-h2">Todo lo que necesitas para tu auto electrificado</h2>
          </div>
        </div>

        <div className="services">
          {cards.map((card, i) => {
            const external = !!card.ctaHref?.startsWith("http");
            return (
              <article key={i} className="card service">
                <div className="service__media">
                  {card.imageUrl && (
                    <Image
                      src={card.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 559px) 100vw, (max-width: 1023px) 40vw, 240px"
                    />
                  )}
                </div>
                <div className="service__body">
                  {card.badge && <span className="chip">{sentenceCase(cleanSeparators(card.badge))}</span>}
                  <h3 className="service__title">{card.title}</h3>
                  <p className="service__text">{card.description}</p>
                  <a
                    href={card.ctaHref}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="btn btn--secondary btn--sm"
                  >
                    {card.ctaText}
                    {external ? (
                      <Icon name="north_east" size="none" />
                    ) : (
                      <Icon name="arrow_forward" size="none" className="arrow" />
                    )}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
