import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { AllReviews } from "@/components/reviews/AllReviews";
import { getAllReviews } from "@/lib/reviews/queries";

/**
 * /resenas/todas: todas las reseñas aprobadas, con el resumen general, filtros por marca y
 * modelo y orden (recientes o mejor nota). Cada reseña enlaza a la ficha de su auto.
 *
 * Se llega desde /resenas, desde la franja y los testimonios del home y desde la sección de
 * reseñas de cada ficha. Estática con ISR: /api/reviews la revalida cuando se publica una
 * reseña sin fotos; las con fotos aparecen al aprobarlas (o a los 60 s).
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Todas las reseñas de autos electrificados",
  description:
    "Opiniones de dueños de autos eléctricos e híbridos en Chile: autonomía real, confort, agilidad y calidad, con fotos. Filtra por marca y modelo.",
  alternates: { canonical: "/resenas/todas" },
};

export default async function TodasLasResenasPage() {
  const reviews = await getAllReviews();
  const modelos = new Set(reviews.map((r) => r.carSlug ?? `${r.carBrand} ${r.carModel}`)).size;

  return (
    <div className="page">
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <Link href="/resenas">Reseñas</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Todas</span>
          </nav>
          <div className="page-head__grid grid-cols-1">
            <div>
              <h1 className="t-h1">Todas las reseñas</h1>
              <p className="t-lead">
                {reviews.length > 0
                  ? `Lo que cuentan dueños de autos electrificados en Chile sobre ${modelos} ${modelos === 1 ? "modelo" : "modelos"}: autonomía real, confort, agilidad y calidad.`
                  : "Lo que cuentan dueños de autos electrificados en Chile: autonomía real, confort, agilidad y calidad."}
              </p>
              <div className="page-head__actions">
                <Link href="/resenas/escribir" className="btn btn--primary btn--lg">
                  Escribir mi reseña
                  <Icon name="arrow_forward" size="none" className="arrow" />
                </Link>
                <Link href="/resenas" className="btn btn--quiet">
                  Cómo funcionan
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--subtle" aria-label="Reseñas">
        <div className="wrap">
          <AllReviews reviews={reviews} />
        </div>
      </section>
    </div>
  );
}
