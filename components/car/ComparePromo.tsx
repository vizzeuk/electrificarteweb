import Link from "next/link";
import { formatCLP } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

interface Rival {
  slug: string;
  name: string;
  brand: string;
  basePrice?: number | null;
  discountPrice?: number | null;
}

/**
 * Módulo de comparación: el auto frente a sus rivales, con precio y un acceso al comparador.
 * Sistema de diseño v1: card con hairline, filas separadas por línea, precio en Switzer 600
 * y acción secundaria (el primario de la vista es siempre la oferta o la asesoría).
 */
export function ComparePromo({
  carName,
  carBrand,
  carSlug,
  rivals,
}: {
  carName: string;
  carBrand: string;
  carSlug: string;
  rivals: Rival[];
}) {
  return (
    <div className="card">
      <div className="flex items-start gap-3 p-5">
        <Icon name="compare_arrows" className="mt-0.5 text-[20px] text-link" />
        <div>
          <p className="t-h4">Comparador</p>
          <p className="t-small mt-1">Enfrenta el {carBrand} {carName} con sus rivales</p>
        </div>
      </div>

      {rivals.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {rivals.map((r) => (
            <li key={r.slug} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="min-w-0">
                <span className="car__brand block">{r.brand}</span>
                <span className="block truncate text-[0.9375rem] font-semibold text-ink">{r.name}</span>
              </span>
              <span className="num flex-none text-[0.9375rem] font-semibold text-ink">
                {formatCLP(r.discountPrice || r.basePrice)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="p-5">
        <Link href={`/comparador?add=${carSlug}`} className="btn btn--secondary btn--block">
          <Icon name="compare_arrows" size="none" />
          Comparar el {carName}
        </Link>
      </div>
    </div>
  );
}
