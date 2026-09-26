"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { ReviewForm } from "./ReviewForm";
import type { ReviewPrefill } from "./ReviewProvider";

/**
 * Popup de reseña (ficha de cada auto y deep-link ?resena=1). Solo la cáscara: velo Tinta,
 * card Papel con sombra de overlay, Escape y foco. El formulario es ReviewForm, el mismo que
 * usa la página /resenas/escribir.
 */

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefill: ReviewPrefill;
}

export function ReviewModal({ isOpen, onClose, prefill }: ReviewModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  // Foco: entra al diálogo al abrir y vuelve al botón que lo abrió al cerrar.
  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => cardRef.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(id);
      trigger?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          key="review-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          // transition-none: la animación la lleva Framer; así no se suma la transición CSS de .modal.
          className="modal is-open transition-none"
        >
          <m.div
            key="review-modal"
            ref={cardRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            initial={{ y: 8 }}
            animate={{ y: 0 }}
            exit={{ y: 8 }}
            transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="modal__card outline-none transition-none"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="btn btn--secondary btn--icon btn--sm modal__close"
            >
              <Icon name="close" size="none" />
            </button>

            <ReviewForm prefill={prefill} variant="modal" active={isOpen} titleId="review-title" onClose={onClose} />
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
