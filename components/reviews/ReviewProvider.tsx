"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ReviewModal } from "./ReviewModal";

/**
 * Popup del formulario de RESEÑAS, global. Ver `docs/REVIEWS-UGC-PLAN.md`.
 *
 * Se monta UNA vez en `app/(public)/layout.tsx`. Cualquier CTA lo abre con:
 *   const { open } = useReview();
 *   open({ carSlug: "byd-dolphin", carBrand: "BYD", carModel: "Dolphin", source: "pdp" })
 *
 * Desde una PDP se precargan los datos del auto, así la persona no los tipea.
 */

export interface ReviewPrefill {
  carSlug?: string;
  carSanityId?: string;
  carBrand?: string;
  carModel?: string;
  /** Calificación pre-elegida (ej. la persona tocó 4 estrellas en la PDP). */
  rating?: number;
  /** De dónde se abrió (pdp, home, resenas…), para medir qué convierte. */
  source?: string;
}

interface ReviewContextValue {
  open: (prefill?: ReviewPrefill) => void;
  close: () => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function useReview(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReview debe usarse dentro de <ReviewProvider>");
  return ctx;
}

export function ReviewProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<ReviewPrefill>({});

  const open = useCallback((next?: ReviewPrefill) => {
    setPrefill(next ?? {});
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  // Deep-link `?resena=1` (opcional `&auto=slug`) para los canales que solo pueden
  // mandar una URL: WhatsApp, correos post-venta. Se lee de window.location para no
  // obligar a envolver el sitio en <Suspense> (requisito de useSearchParams).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("resena") !== "1") return;
    // Se difiere un frame: setState síncrono dentro del efecto encadena renders
    // (regla react-hooks/set-state-in-effect).
    const id = requestAnimationFrame(() => {
      setPrefill({ carSlug: params.get("auto") ?? undefined, source: params.get("source") ?? "link" });
      setIsOpen(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <ReviewContext.Provider value={value}>
      {children}
      <ReviewModal isOpen={isOpen} onClose={close} prefill={prefill} />
    </ReviewContext.Provider>
  );
}
