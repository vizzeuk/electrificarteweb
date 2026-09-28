"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "./StarRating";
import { ReviewLightbox, type LightboxPhoto } from "./ReviewLightbox";
import { REVIEW_CATEGORIES, fechaResena, formatNota } from "@/lib/reviews/categories";
import type { PublicReview } from "@/lib/reviews/queries";

/**
 * Lista de reseñas estilo Google: una debajo de la otra, separadas por hairlines, cada una con
 * autor, fecha, nota, las 4 categorías, el texto, lo bueno y lo que mejoraría, y las fotos en
 * miniaturas grandes que abren un visor.
 *
 * Por qué lista y no carrusel: una reseña se LEE (texto largo, pros y contras) y las fotos
 * necesitan espacio para lucir. El carrusel anterior cortaba el texto y dejaba las fotos en 72 px.
 *
 * Es cliente (visor y "ver más"), así que NO puede importar `storage`: las URLs de las fotos
 * llegan ya resueltas desde el servidor en `photoUrls` / `photoFullUrls`.
 */

/** El texto se corta a 5 líneas; "Leer más" aparece solo si de verdad quedó cortado. */
function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const nombreAuto = (r: PublicReview) => [r.carBrand, r.carModel].filter(Boolean).join(" ");

function ReviewItem({
  review: r,
  showCar,
  onOpenPhoto,
}: {
  review: PublicReview;
  showCar?: boolean;
  onOpenPhoto: (index: number) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [largo, setLargo] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Mide si el texto recortado desborda (depende del ancho: se re-mide al cambiar de tamaño).
  useEffect(() => {
    const el = textRef.current;
    if (!el || abierto) return;
    const medir = () => setLargo(el.scrollHeight > el.clientHeight + 1);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [abierto, r.body]);
  const auto = nombreAuto(r);
  const detalle = [r.carVersion, r.carYear, r.carColor].filter(Boolean).join(", ");
  const cats = REVIEW_CATEGORIES.filter((c) => r.categorias[c.key] !== null);

  return (
    <article className="rv">
      <header className="rv__head">
        <span aria-hidden className="avatar rv__avatar">{iniciales(r.autor)}</span>
        <div className="min-w-0">
          <p className="person__name">{r.autor}</p>
          {(detalle || (showCar && auto)) && (
            <p className="rv__car">
              {showCar && auto && (r.carSlug ? <Link href={`/auto/${r.carSlug}`} className="link">{auto}</Link> : auto)}
              {showCar && auto && detalle ? ", " : null}
              {detalle}
            </p>
          )}
        </div>
      </header>

      <div className="rv__meta">
        <StarRating value={r.rating} size={16} />
        <span className="rv__nota num">{formatNota(r.rating)}</span>
        <span className="rv__date">{fechaResena(r.createdAt)}</span>
      </div>

      {cats.length > 0 && (
        <dl className="rv__cats">
          {cats.map((c) => (
            <div key={c.key}>
              <dt>{c.label}</dt>
              <dd className="num">{r.categorias[c.key]}</dd>
            </div>
          ))}
        </dl>
      )}

      <p ref={textRef} className={abierto ? "rv__text" : "rv__text line-clamp-5"}>{r.body}</p>
      {(largo || abierto) && (
        <button type="button" onClick={() => setAbierto((v) => !v)} className="link rv__more" aria-expanded={abierto}>
          {abierto ? "Leer menos" : "Leer más"}
        </button>
      )}

      {(r.pros || r.contras) && (
        <div className="rv__pc">
          {r.pros && (
            <div>
              <p className="rv__pc-t">
                <Icon name="thumb_up" size="none" />
                Lo bueno
              </p>
              <p>{r.pros}</p>
            </div>
          )}
          {r.contras && (
            <div>
              <p className="rv__pc-t">
                <Icon name="thumb_down" size="none" />
                Lo que mejoraría
              </p>
              <p>{r.contras}</p>
            </div>
          )}
        </div>
      )}

      {r.photoUrls.length > 0 && (
        <ul className="rv__photos" aria-label={`Fotos de ${r.autor}`}>
          {r.photoUrls.map((url, i) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => onOpenPhoto(i)}
                aria-label={`Ver foto ${i + 1} de ${r.photoUrls.length} en grande`}
                className="rv__photo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function ReviewFeed({
  reviews,
  pageSize = 5,
  showCar = false,
}: {
  reviews: PublicReview[];
  /** Cuántas se muestran de entrada; el resto con "Ver más reseñas". */
  pageSize?: number;
  /** En la página de todas: muestra el auto de cada reseña con enlace a su ficha. */
  showCar?: boolean;
}) {
  const [visibles, setVisibles] = useState(pageSize);
  const [visor, setVisor] = useState<{ review: PublicReview; index: number } | null>(null);

  if (reviews.length === 0) return null;

  const fotos: LightboxPhoto[] = visor
    ? visor.review.photoFullUrls.map((src, i) => ({
        src,
        thumb: visor.review.photoUrls[i],
        alt: `Foto ${i + 1} de ${visor.review.autor}${nombreAuto(visor.review) ? `, ${nombreAuto(visor.review)}` : ""}`,
      }))
    : [];
  const resto = reviews.length - visibles;

  return (
    <>
      <div className="rv-list">
        {reviews.slice(0, visibles).map((r) => (
          <ReviewItem key={r.id} review={r} showCar={showCar} onOpenPhoto={(index) => setVisor({ review: r, index })} />
        ))}
      </div>

      {resto > 0 && (
        <div className="rv-list__more">
          <button type="button" onClick={() => setVisibles((v) => v + pageSize)} className="btn btn--secondary">
            Ver más reseñas
            <span className="t-small num">({resto})</span>
          </button>
        </div>
      )}

      <ReviewLightbox
        photos={fotos}
        index={visor?.index ?? null}
        onIndexChange={(index) => setVisor((v) => (v ? { ...v, index } : v))}
        onClose={() => setVisor(null)}
        caption={visor ? [visor.review.autor, nombreAuto(visor.review)].filter(Boolean).join(", ") : undefined}
      />
    </>
  );
}
