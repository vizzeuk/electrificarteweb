import Link from "next/link";
import { sanityImg } from "@/lib/sanityImage";
import { Icon } from "@/components/ui/Icon";
import { cleanSeparators, sentenceCase } from "@/lib/utils";
import { electricTypeLabel } from "@/components/car/ElectricTypeBadge";

export interface ElectricTypeItem {
  _id: string;
  slug: string;
  label: string;
  tag: string;
  color?: string;
  icon?: string;
  tagline?: string;
  idealFor?: string;
  cardImageUrl?: string;
  carCount: number;
}

interface ElectricTypeGridProps {
  types: ElectricTypeItem[];
}

// El conteo de tecnologías sale del catálogo, nunca se escribe a mano.
const NUMBER_WORDS = ["", "Una", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve"];

/**
 * "¿Qué tipo de electrificado buscas?": grilla de los tipos eléctricos (foto 4:3, chip con
 * la sigla, conteo de modelos, título y tagline). Sin overlays ni colores por tipo. Bajo
 * 1100 px el CSS (.types en app/styles/home.css) la convierte en carrusel horizontal.
 */
export function VehicleTypeGrid({ types }: ElectricTypeGridProps) {
  if (!types || types.length === 0) return null;

  const n = types.length;
  const lead = `${NUMBER_WORDS[n] ?? n} ${n === 1 ? "tecnología" : "tecnologías"} y una misma meta: gastar menos en moverte. Parte por la que calza con tu rutina.`;

  return (
    <section className="section" aria-labelledby="electric-types-title">
      <div className="wrap">
        <div className="section-head">
          <div className="section-head__text">
            <h2 id="electric-types-title" className="t-h2">¿Qué tipo de electrificado buscas?</h2>
            <p className="t-lead">{lead}</p>
          </div>
        </div>

        <div className="types">
          {types.map((type) => {
            const desc = type.tagline ?? type.idealFor ?? null;
            return (
              <Link key={type._id} href={`/electrico/${type.slug}`} className="card type">
                <div className="type__media">
                  {type.cardImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sanityImg(type.cardImageUrl, { w: 560, h: 420, fit: "crop" })}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
                <div className="type__body">
                  <div className="type__top">
                    <span className="chip">{electricTypeLabel(type.tag) ?? type.tag}</span>
                    {type.carCount > 0 && (
                      <span className="t-label num">
                        {type.carCount} {type.carCount === 1 ? "modelo" : "modelos"}
                      </span>
                    )}
                  </div>
                  <h3 className="type__title">{sentenceCase(type.label)}</h3>
                  {desc && <p className="type__text">{cleanSeparators(desc)}</p>}
                  <span className="link-arrow">
                    Ver modelos
                    <Icon name="arrow_forward" size="none" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
