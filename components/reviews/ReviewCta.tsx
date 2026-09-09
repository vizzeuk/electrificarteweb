"use client";

import { useReview, type ReviewPrefill } from "./ReviewProvider";

/**
 * Botón que abre el popup de reseña. Se le pasa el markup por `children` para
 * que cada sección conserve su propio diseño.
 */
export function ReviewCta({
  children,
  className,
  ...prefill
}: ReviewPrefill & { children: React.ReactNode; className?: string }) {
  const { open } = useReview();
  return (
    <button type="button" onClick={() => open(prefill)} className={className}>
      {children}
    </button>
  );
}
