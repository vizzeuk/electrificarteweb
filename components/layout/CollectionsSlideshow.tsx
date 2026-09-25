import Link from "next/link";
import { sanityImg } from "@/lib/sanityImage";
import { Icon } from "@/components/ui/Icon";
import { cleanSeparators, sentenceCase } from "@/lib/utils";

export interface CollectionCardData {
  _id:           string;
  title:         string;
  slug:          string;
  badge?:        string | null;
  subtitle?:     string | null;
  ctaText?:      string | null;
  heroImageUrl?: string | null;
}

interface CollectionsSlideshowProps {
  collections?: CollectionCardData[];
}

const FALLBACK: CollectionCardData[] = [
  {
    _id:      "f1",
    title:    "Autos electrificados desde $20 millones",
    slug:     "desde-20-millones",
    badge:    "Accesibles",
    subtitle: "Los mejores precios del mercado electrificado en Chile",
    ctaText:  "Ver colección",
  },
  {
    _id:      "f2",
    title:    "SUV familiares de 7 asientos",
    slug:     "suv-7-asientos",
    badge:    "7 asientos",
    subtitle: "3 corridas de asientos, espacio para toda la familia",
    ctaText:  "Ver colección",
  },
  {
    _id:      "f3",
    title:    "Lo mejor de BYD",
    slug:     "mejores-byd",
    badge:    "BYD",
    subtitle: "La marca más vendida del mundo en vehículos electrificados",
    ctaText:  "Ver colección",
  },
];

/**
 * "Encuentra tu auto ideal": grilla de colecciones (foto 3:2 arriba; chip, título, bajada y
 * enlace debajo). Sin texto ni velo sobre la foto. En móvil se apilan en una columna.
 */
export function CollectionsSlideshow({ collections }: CollectionsSlideshowProps) {
  const items = collections && collections.length > 0 ? collections : FALLBACK;

  return (
    <section className="section section--rule" aria-labelledby="collections-title">
      <div className="wrap">
        <div className="section-head">
          <div className="section-head__text">
            <h2 id="collections-title" className="t-h2">Encuentra tu auto ideal</h2>
            <p className="t-lead">Colecciones armadas por presupuesto, espacio o marca.</p>
          </div>
        </div>

        <div className="collections">
          {items.map((col) => {
            const title = sentenceCase(col.title);
            return (
              <Link key={col._id} href={`/coleccion/${col.slug}`} className="collection" aria-label={title}>
                <div className="collection__media">
                  {col.heroImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sanityImg(col.heroImageUrl, { w: 800, h: 533, fit: "crop" })}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
                <div className="collection__body">
                  {col.badge && <span className="chip">{sentenceCase(cleanSeparators(col.badge))}</span>}
                  <h3 className="collection__title">{title}</h3>
                  {col.subtitle && <p className="collection__text">{cleanSeparators(col.subtitle)}</p>}
                  <span className="link-arrow">
                    {col.ctaText ?? "Ver colección"}
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
