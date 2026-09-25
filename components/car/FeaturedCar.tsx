import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ElectricTypeBadge } from "@/components/car/ElectricTypeBadge";
import { sanityImg } from "@/lib/sanityImage";
import { carStats, cleanSeparators, formatCLP, type CarStatInput } from "@/lib/utils";

/**
 * Auto destacado del encabezado de las PLP (tipo, electrificado y marca). Foto grande con
 * una ficha maciza que flota sobre su borde inferior: marca, modelo, tres specs reales y
 * precio. Reemplaza a la `.ad-card`, que en el hero se leía como un banner chico.
 *
 * `sponsored` = lo eligió Sanity (heroFeaturedCar), o sea espacio pagado → chip "Publicidad".
 * Si lo eligió el catálogo solo, no es publicidad y no se rotula como tal.
 */
export interface FeaturedCarProps {
  slug: string;
  name: string;
  brand: string;
  imageUrl?: string;
  basePrice: number;
  discountPrice?: number | null;
  /** Specs del auto; si el auto no está en el listado de la página, puede venir vacío. */
  specs?: CarStatInput | null;
  sponsored?: boolean;
  /** Primera imagen visible de la página: se pide con prioridad (LCP). */
  priority?: boolean;
}

/** URL de Sanity sin parámetros previos: el CDN respeta el primer `w` que encuentra. */
function baseUrl(url?: string | null): string | undefined {
  return url ? url.split("?")[0] : undefined;
}

export function FeaturedCar({ slug, name, brand, imageUrl, basePrice, discountPrice, specs, sponsored, priority }: FeaturedCarProps) {
  const hasDiscount = !!discountPrice && discountPrice < basePrice;
  const stats = specs ? carStats(specs) : [];
  const title = cleanSeparators(name);

  return (
    <Link href={`/auto/${slug}`} className="feature" aria-label={`${brand} ${title}`}>
      <div className="feature__media">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sanityImg(baseUrl(imageUrl), { w: 1200 })}
            alt=""
            decoding="async"
            fetchPriority={priority ? "high" : undefined}
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <Icon name="electric_car" className="text-[64px] text-line-2" />
          </span>
        )}
        <span className="feature__chips">
          {specs?.electricTypeTag ? <ElectricTypeBadge tag={specs.electricTypeTag} /> : <span />}
          <span className="chip chip--media">{sponsored ? "Publicidad" : "Destacado"}</span>
        </span>
      </div>

      <div className="feature__panel">
        <div>
          <p className="car__brand">{brand}</p>
          <p className="feature__name">{title}</p>
        </div>

        {stats.length > 0 && (
          <dl className="feature__specs" style={{ "--n": stats.length } as React.CSSProperties}>
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="feature__foot">
          <div>
            {hasDiscount ? (
              <>
                <p className="price-was">{formatCLP(basePrice)}</p>
                <p className="price price--lg">{formatCLP(discountPrice)}</p>
                <p className="price-save">Ahorras {formatCLP(basePrice - (discountPrice ?? basePrice))}</p>
              </>
            ) : (
              <>
                <p className="car__price-label">Precio de lista</p>
                <p className="price price--lg">{formatCLP(basePrice)}</p>
              </>
            )}
          </div>
          <span className="btn btn--secondary">
            Ver auto
            <Icon name="arrow_forward" size="none" className="arrow" />
          </span>
        </div>
      </div>
    </Link>
  );
}
