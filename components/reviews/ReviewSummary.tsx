import { StarRating } from "./StarRating";
import { REVIEW_CATEGORIES, cuentaResenas, formatNota } from "@/lib/reviews/categories";
import type { ReviewSummary } from "@/lib/reviews/queries";

/**
 * Resumen de reseñas estilo Google: nota promedio grande, estrellas, cantidad, barras de
 * distribución 5→1 y el promedio de cada categoría (autonomía, confort, agilidad, calidad).
 *
 * Presentacional: sin estado, sirve en servidor y dentro de componentes cliente. Las
 * categorías solo se muestran si al menos una reseña las trae (las antiguas no tienen).
 * Barras macizas: pista en Línea, relleno en Laguna (`--link`).
 */

export function ReviewSummaryPanel({
  summary,
  children,
  className,
}: {
  summary: ReviewSummary;
  /** Acciones debajo del resumen (escribir, ver todas). */
  children?: React.ReactNode;
  className?: string;
}) {
  const max = Math.max(1, ...summary.distribucion);
  const categorias = REVIEW_CATEGORIES.filter((c) => summary.categorias[c.key] !== null);

  return (
    <div className={className ? `rv-sum ${className}` : "rv-sum"}>
      <div className="rv-sum__top">
        <p className="rv-sum__num">{formatNota(summary.promedio)}</p>
        <div>
          <StarRating value={summary.promedio} size={20} />
          <p className="rv-sum__count">{cuentaResenas(summary.total)}</p>
        </div>
      </div>

      <ol className="rv-sum__bars" aria-label="Reseñas por estrellas">
        {[5, 4, 3, 2, 1].map((n) => {
          const count = summary.distribucion[n - 1];
          return (
            <li key={n} aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}: ${cuentaResenas(count)}`}>
              <span className="rv-sum__star num" aria-hidden>{n}</span>
              <span className="rv-bar" aria-hidden>
                <span style={{ width: `${(count / max) * 100}%` }} />
              </span>
              <span className="rv-sum__n num" aria-hidden>{count}</span>
            </li>
          );
        })}
      </ol>

      {categorias.length > 0 && (
        <dl className="rv-sum__cats">
          {categorias.map((c) => {
            const v = summary.categorias[c.key] as number;
            return (
              <div key={c.key}>
                <dt>{c.label}</dt>
                <dd>
                  <span className="rv-bar" aria-hidden>
                    <span style={{ width: `${(v / 5) * 100}%` }} />
                  </span>
                  <span className="num">{formatNota(v)}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {children && <div className="rv-sum__actions">{children}</div>}
    </div>
  );
}
