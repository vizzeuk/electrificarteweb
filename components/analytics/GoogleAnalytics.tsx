"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";

// Google Analytics 4.
//
// El ID vive en NEXT_PUBLIC_GA_ID (formato G-XXXXXXXXXX) para poder cambiarlo desde Vercel
// sin tocar código. Si la variable no está, no se carga nada — así los entornos de
// desarrollo y preview no ensucian las métricas de producción.
//
// strategy="afterInteractive" hace que el script cargue DESPUÉS de que la página es usable,
// para que la analítica no compita con el contenido por el ancho de banda del móvil.

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * En el App Router la navegación es del lado del cliente: no hay recarga, así que GA no se
 * entera de los cambios de página. Este hook manda el page_view a mano en cada navegación.
 *
 * Salta la PRIMERA ejecución a propósito: de esa se encarga el `gtag('config', ...)` de
 * abajo. Mandarla también acá la contaría dos veces, y no mandarla en absoluto la perdería
 * (el efecto puede correr antes de que el script de GA termine de cargar).
 *
 * Va dentro de <Suspense> porque useSearchParams obliga a render dinámico en el árbol donde
 * se use, y sin ese límite arrastraría TODAS las páginas a dinámicas — perdiendo el
 * prerenderizado estático que es justamente lo que aguanta el tráfico.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!GA_ID || typeof window.gtag !== "function") return;
    const qs = searchParams.toString();
    window.gtag("event", "page_view", {
      page_path: qs ? `${pathname}?${qs}` : pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          // Este config manda el page_view de la CARGA INICIAL. Las navegaciones
          // posteriores las manda PageViewTracker (ver su comentario).
          gtag('config', '${GA_ID}');
        `}
      </Script>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
