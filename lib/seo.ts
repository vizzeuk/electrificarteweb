import type { Metadata } from "next";

/** Dominio de producción — fuente única de verdad para canonicals, sitemap, OG y schema. */
export const SITE_URL = "https://electrificarte.com";
export const SITE_NAME = "Electrificarte";
export const SITE_LOCALE = "es_CL";

/** Convierte una ruta relativa en URL absoluta. */
export const absoluteUrl = (path = "/") =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Construye la metadata de una página con canonical, OpenGraph y Twitter
 * consistentes. `path` es relativo (ej. "/marcas") — se resuelve contra el
 * `metadataBase` definido en el layout raíz.
 */
export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  images?: string[];
  noIndex?: boolean;
}): Metadata {
  const { title, description, path, images, noIndex } = opts;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: SITE_LOCALE,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images } : {}),
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}
