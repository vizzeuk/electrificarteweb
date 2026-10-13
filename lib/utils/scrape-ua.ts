/**
 * User-Agent de navegador para bajar paginas e imagenes de los sitios de las marcas.
 *
 * No usamos uno que diga "bot": Akamai (Jetour, Soueast y otras marcas del grupo
 * Chery) responde 403 a `ElectrificarteBot` y 200 a este, incluso para las fotos.
 * Medido el 13-10-2026: las PDPs de Jetour G700 y Soueast S08 salieron sin
 * ninguna foto por eso.
 */
export const SCRAPE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
