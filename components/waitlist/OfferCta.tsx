"use client";

import Link from "next/link";
import { OFERTA_STANDBY } from "@/lib/products";
import { useWaitlist } from "./WaitlistProvider";

/**
 * CTA de "consigue la mejor oferta" — el ÚNICO lugar que decide a dónde va.
 *
 * - `OFERTA_STANDBY = true`  (hoy) → abre el popup de **waitlist**.
 * - `OFERTA_STANDBY = false`       → vuelve al formulario pagado `/solicitar`,
 *                                    conservando `?auto=` y `?nombre=`.
 *
 * Por eso los ~40 CTAs del sitio usan este componente en vez de un <Link> suelto:
 * reactivar la Oferta ($19.990) es cambiar una constante, no re-editar el sitio.
 * Ver `docs/PIVOT-WAITLIST-PLAN.md`.
 *
 * Mantiene el markup interno de cada CTA (se pasa por `children`), así cada sección
 * conserva su diseño propio.
 */

interface OfferCtaProps {
  children: React.ReactNode;
  className?: string;
  /** Modelo de interés: prellena el popup y, si se reactiva, va como `?nombre=`. */
  model?: string;
  /** Slug del auto: si se reactiva la oferta, va como `?auto=`. */
  carSlug?: string;
  /** De dónde se hizo clic (hero, pdp, comparador…), para medir qué convierte. */
  source?: string;
  /** Efecto extra al hacer clic (ej. cerrar el promo modal que contiene el CTA). */
  onClick?: () => void;
  "aria-label"?: string;
}

export function OfferCta({
  children,
  className,
  model,
  carSlug,
  source = "web",
  onClick,
  "aria-label": ariaLabel,
}: OfferCtaProps) {
  const { open } = useWaitlist();

  if (!OFERTA_STANDBY) {
    const params = new URLSearchParams();
    if (carSlug) params.set("auto", carSlug);
    if (model) params.set("nombre", model);
    const qs = params.toString();
    return (
      <Link href={`/solicitar${qs ? `?${qs}` : ""}`} className={className} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        open({ model, source });
      }}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
