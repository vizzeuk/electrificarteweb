"use client";

import { useCallback, useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Visor de fotos de una reseña. Se abre al tocar una miniatura.
 *
 * Carga la versión grande (`-full.jpg`, 1280 px) recién acá: la grilla solo sirve miniaturas.
 * Flechas en pantalla y del teclado, Escape y clic fuera para cerrar, deslizar en el celular.
 * Sistema v1: velo del modal (única transparencia permitida), marco Tinta con `.theme-dark`
 * para que los controles se inviertan solos y sombra de overlay porque flota.
 */

export interface LightboxPhoto {
  src: string;
  /** Miniatura: se muestra mientras carga la grande. */
  thumb?: string;
  alt: string;
}

interface ReviewLightboxProps {
  photos: LightboxPhoto[];
  /** Índice abierto, o null si está cerrado. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Pie: quién la subió y de qué auto. */
  caption?: string;
}

export function ReviewLightbox({ photos, index, onIndexChange, onClose, caption }: ReviewLightboxProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const open = index !== null && photos.length > 0;
  const total = photos.length;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (index === null || total < 2) return;
      onIndexChange((index + dir + total) % total);
    },
    [index, total, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, go]);

  // Foco: entra al visor al abrir y vuelve a la miniatura que lo abrió al cerrar.
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => cardRef.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(id);
      trigger?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open || index === null) return null;
  const photo = photos[index] ?? photos[0];

  return (
    <div className="modal is-open lightbox" onClick={onClose}>
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Foto ${index + 1} de ${total}`}
        className="lightbox__card theme-dark outline-none"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start === null || end === undefined || Math.abs(end - start) < 40) return;
          go(end < start ? 1 : -1);
        }}
      >
        <div className="lightbox__stage">
          {/* key: al cambiar de foto se desmonta la anterior y no queda pegada mientras carga. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            className="lightbox__img"
            style={photo.thumb ? { backgroundImage: `url(${photo.thumb})` } : undefined}
            decoding="async"
          />
          {total > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Foto anterior" className="btn btn--secondary btn--icon lightbox__nav lightbox__nav--prev">
                <Icon name="chevron_left" size="none" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Foto siguiente" className="btn btn--secondary btn--icon lightbox__nav lightbox__nav--next">
                <Icon name="chevron_right" size="none" />
              </button>
            </>
          )}
        </div>
        <div className="lightbox__bar">
          <p className="lightbox__caption">{caption}</p>
          <span className="lightbox__count num">{index + 1} de {total}</span>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="btn btn--secondary btn--icon btn--sm">
            <Icon name="close" size="none" />
          </button>
        </div>
      </div>
    </div>
  );
}
