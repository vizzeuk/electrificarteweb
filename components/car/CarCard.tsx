import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ElectricTypeBadge } from "@/components/car/ElectricTypeBadge";
import { formatCLP, carStats } from "@/lib/utils";
import { sanityImg } from "@/lib/sanityImage";

interface CarCardProps {
  name: string;
  brand: string;
  /** Ya no se dibuja (sistema v1: sin logo de marca en la card). Se conserva por compatibilidad. */
  brandLogo?: string;
  slug: string;
  image?: string;
  /** Ya no se dibuja: el tipo eléctrico va en el chip de la foto. Se conserva por compatibilidad. */
  category?: string;
  batteryCapacity?: number | null;
  range?: number | null;
  maxVersionRange?: number | null;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  electricTypeTag?: string | null;
  power?: number | null;
  basePrice: number;
  discountPrice?: number;
  isNew?: boolean;
  index?: number;
  noAnimate?: boolean;
  /** Cuántas specs mostrar en el bloque de stats (default 3). */
  maxStats?: number;
}

/**
 * Card de auto del sistema de diseño v1: hairline, radio 12, sin elevación. El tipo
 * eléctrico va como chip macizo sobre la foto; título, specs y precio, debajo.
 * Estilos en app/styles/brand.css (.car, .specs, .price).
 */
export function CarCard({
  name,
  brand,
  slug,
  image,
  batteryCapacity,
  range,
  maxVersionRange,
  electricRangeKm,
  fuelConsumption,
  rendimientoElectrico,
  electricTypeTag,
  power,
  basePrice,
  discountPrice,
  isNew,
  index = 0,
  noAnimate = false,
  maxStats = 3,
}: CarCardProps) {
  const hasDiscount = !!discountPrice && discountPrice < basePrice;

  const stats = carStats({ battery: batteryCapacity, range, maxVersionRange, electricRangeKm, fuelConsumption, rendimientoElectrico, electricTypeTag, power }).slice(0, maxStats);

  // CSS-based entry animation (replaces framer-motion m.article).
  // Desktop: .card-fade-in runs a short fade+slide. Mobile (@media ≤767 px):
  // animation:none, instant render. noAnimate (carousel context) → no animation.
  const animClass = noAnimate ? "" : "card-fade-in";
  const animStyle = noAnimate ? undefined : { animationDelay: `${index * 0.08}s` };

  return (
    <article className={`card car ${animClass}`} style={animStyle}>
      <Link href={`/auto/${slug}`} className="car__media skeleton-shimmer" tabIndex={-1} aria-hidden>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sanityImg(image, { w: 640, q: 75 })}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Icon name="electric_car" className="text-[48px] text-line-2" />
          </span>
        )}
        <span className="car__chips">
          <ElectricTypeBadge tag={electricTypeTag} />
          {isNew ? <span className="chip chip--soft">Nuevo</span> : <span />}
        </span>
      </Link>

      <div className="car__body">
        <div>
          <p className="car__brand">{brand}</p>
          <h3 className="car__name">
            <Link href={`/auto/${slug}`}>{name}</Link>
          </h3>
        </div>

        {stats.length > 0 && (
          <dl className="specs">
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="car__foot">
          <div className="car__price">
            <p className="car__price-label">{hasDiscount ? "Con descuento" : "Precio de lista"}</p>
            {hasDiscount ? (
              <>
                <p className="price-was">{formatCLP(basePrice)}</p>
                <p className="price">{formatCLP(discountPrice)}</p>
                <p className="price-save">Ahorras {formatCLP(basePrice - (discountPrice ?? basePrice))}</p>
              </>
            ) : (
              <p className="price">{formatCLP(basePrice)}</p>
            )}
            <p className="t-micro">Precio referencial. Consulta por financiamiento.</p>
          </div>
          <div className="car__actions">
            <Link href={`/auto/${slug}`} className="btn btn--secondary btn--sm btn--block">
              Ver detalle
            </Link>
            <Link
              href={`/comparador?add=${slug}`}
              title="Comparar"
              aria-label={`Comparar ${brand} ${name}`}
              className="btn btn--secondary btn--sm btn--icon"
            >
              <Icon name="compare_arrows" size="none" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
