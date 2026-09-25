// Adaptación de un aviso multilínea al formato que acepta una plantilla de Meta.
//
// Un archivo de route.ts de Next solo puede exportar handlers, así que esto vive
// acá — y de paso se puede testear.

/**
 * Meta corta el cuerpo de una plantilla en 1.024 caracteres **incluido** el
 * texto fijo de la plantilla, así que el parámetro va bastante más corto que el
 * texto libre.
 */
export const MAX_TEMPLATE_PARAM = 850;

/**
 * Un parámetro de plantilla **no puede tener saltos de línea, tabs ni más de 4
 * espacios seguidos**. Meta lo rechaza en el envío (`Parameter format does not
 * match`), no en la revisión de la plantilla — así que el error aparece recién
 * en producción, cuando el aviso ya se perdió.
 *
 * Los avisos de estos flujos son multilínea, así que por la vía de la plantilla
 * se aplanan a una sola línea con separadores. Se pierde el formato, no el
 * contenido: el link a Studio y los pendientes siguen ahí. Dentro de la ventana
 * de 24 h el texto libre va tal cual, con sus saltos y sus emojis.
 */
export function aplanarParaPlantilla(texto: string): string {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" · ")
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .slice(0, MAX_TEMPLATE_PARAM);
}
