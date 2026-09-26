import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ReviewForm, type ReviewCarOption } from "@/components/reviews/ReviewForm";
import { client } from "@/lib/sanity/client";

/**
 * /resenas/escribir: el formulario de reseña en una página propia (se llega desde /resenas).
 * Es el MISMO ReviewForm del popup de la ficha: mismo envío a /api/reviews → n8n, mismos correos
 * y misma moderación. Acá la persona indica marca y modelo; ?calificacion=N llega desde las
 * estrellas del home y deja la calificación puesta.
 */

export const metadata: Metadata = {
  title: "Escribe tu reseña",
  description: "Cuéntanos cómo te ha ido con tu auto electrificado y ayuda al próximo comprador a elegir bien.",
  alternates: { canonical: "/resenas/escribir" },
  // La página útil para buscadores es /resenas; esta es solo el formulario.
  robots: { index: false, follow: true },
};

type PageProps = { searchParams: Promise<{ calificacion?: string }> };

// Catálogo publicado para los selectores: así la reseña queda enlazada a la ficha de su modelo.
const CARS_QUERY = `*[_type == "car" && hidden != true && defined(slug.current)]{ "slug": slug.current, name, "brand": brand->name } | order(brand asc, name asc)`;

export default async function EscribirResenaPage({ searchParams }: PageProps) {
  const [{ calificacion }, cars] = await Promise.all([
    searchParams,
    client.fetch<ReviewCarOption[]>(CARS_QUERY, {}, { next: { tags: ["car"], revalidate: 300 } }).catch(() => []),
  ]);
  const n = Number(calificacion);
  const rating = Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;

  return (
    <div className="page">
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <Link href="/resenas">Reseñas</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Escribir</span>
          </nav>
          <div className="page-head__grid grid-cols-1">
            <div>
              <h1 className="t-h1" id="review-title">Escribe tu reseña</h1>
              <p className="t-lead">
                Cuéntanos cómo te ha ido con tu auto electrificado. Si agregas fotos, las revisamos antes de
                publicarlas.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--subtle">
        <div className="wrap review-write">
          <div className="card review-form" aria-labelledby="review-title">
            <ReviewForm variant="page" prefill={{ rating, source: "resenas" }} carOptions={cars.filter((c) => c.brand)} titleId="review-done-title" />
          </div>

          <aside className="review-write__side" aria-label="Antes de escribir">
            <h2 className="t-h3">Antes de escribir</h2>
            <ul className="checklist mt-5">
              <li><Icon name="bolt" size="none" /><span>Cuenta la autonomía real que haces, en ciudad y en carretera.</span></li>
              <li><Icon name="ev_station" size="none" /><span>Dónde cargas y cuánto se demora.</span></li>
              <li><Icon name="payments" size="none" /><span>Cuánto gastas al mes frente a tu auto anterior.</span></li>
              <li><Icon name="photo_camera" size="none" /><span>Las fotos son opcionales y se revisan antes de publicarse.</span></li>
            </ul>
            <p className="t-small mt-6 border-t border-line pt-5">
              <Icon name="lock" size="none" className="mr-1 align-[-3px] text-[16px]" />
              Publicamos solo tu nombre y la inicial del apellido. Tu email y tu teléfono nunca se muestran.
            </p>
            <Link href="/resenas" className="link-arrow mt-5">
              Cómo funcionan las reseñas
              <Icon name="arrow_forward" size="none" />
            </Link>
          </aside>
        </div>
      </section>
    </div>
  );
}
