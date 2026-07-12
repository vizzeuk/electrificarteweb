import Link from "next/link";
import { formatCLP } from "@/lib/utils";

interface Rival {
  slug: string;
  name: string;
  brand: string;
  basePrice?: number | null;
  discountPrice?: number | null;
}

/**
 * Módulo de comparación de la PDP — reemplaza al botón "Comparador" del navbar.
 * Diseñado como un panel gemelo del acordeón de Equipamiento que tiene al lado:
 * mismo borde, radio, ritmo de filas y tipografía.
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
    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
      {/* Cabecera — mismo formato que las filas del acordeón de equipamiento */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary-deep text-[18px]">compare_arrows</span>
        </div>
        <div>
          <p className="font-headline font-bold text-sm">Comparador</p>
          <p className="text-text-ghost text-xs">Enfrentá el {carBrand} {carName} con sus rivales</p>
        </div>
      </div>

      {/* Rivales sugeridos */}
      {rivals.length > 0 && (
        <div className="divide-y divide-gray-50">
          {rivals.map((r) => (
            <div key={r.slug} className="flex items-center justify-between gap-3 px-6 py-3">
              <span className="flex items-baseline gap-2 min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-text-ghost font-semibold flex-shrink-0">
                  {r.brand}
                </span>
                <span className="text-sm font-semibold text-text-main truncate">{r.name}</span>
              </span>
              <span className="text-xs font-headline font-bold text-text-muted flex-shrink-0">
                {formatCLP(r.discountPrice || r.basePrice)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="px-6 py-5 border-t border-gray-100">
        <Link
          href={`/comparador?add=${carSlug}`}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold py-3 rounded-xl text-sm transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
          Comparar el {carName}
        </Link>
      </div>
    </div>
  );
}
