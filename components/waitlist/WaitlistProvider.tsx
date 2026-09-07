"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { WaitlistModal } from "./WaitlistModal";

/**
 * Popup de WAITLIST global (giro sep-2026 — ver `docs/PIVOT-WAITLIST-PLAN.md`).
 *
 * Se monta UNA vez en `app/(public)/layout.tsx`. Cualquier CTA lo abre con:
 *   const { open } = useWaitlist();
 *   <button onClick={() => open({ model: "BYD Dolphin", source: "pdp" })}>…</button>
 *
 * Centralizarlo así es lo que permite que reactivar la Oferta ($19.990) sea cambiar
 * `OFERTA_STANDBY` en `lib/products.ts` y no re-editar los ~40 CTAs del sitio.
 */

export interface WaitlistPrefill {
  /** Modelo de interés prellenado (ej. desde una PDP o una card de auto). */
  model?: string;
  /** De dónde se abrió, para medir qué convierte (hero, pdp, comparador…). */
  source?: string;
}

interface WaitlistContextValue {
  open: (prefill?: WaitlistPrefill) => void;
  close: () => void;
}

const WaitlistContext = createContext<WaitlistContextValue | null>(null);

export function useWaitlist(): WaitlistContextValue {
  const ctx = useContext(WaitlistContext);
  if (!ctx) throw new Error("useWaitlist debe usarse dentro de <WaitlistProvider>");
  return ctx;
}

export function WaitlistProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<WaitlistPrefill>({});

  const open = useCallback((next?: WaitlistPrefill) => {
    setPrefill(next ?? {});
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <WaitlistContext.Provider value={value}>
      {children}
      <WaitlistModal isOpen={isOpen} onClose={close} prefill={prefill} />
    </WaitlistContext.Provider>
  );
}
