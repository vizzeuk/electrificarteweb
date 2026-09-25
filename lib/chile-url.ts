/**
 * ¿Esta URL confirma razonablemente que es del mercado chileno? Usado como red de seguridad en
 * lib/pdp-research/research.ts, lib/price-check/check.ts y el descubrimiento de fuentes, para no
 * aceptar como "fuente oficial de Chile" un sitio regional LatAm genérico ni el sitio de otro
 * país. Rechazó bien, por ejemplo, audi.es para el Q8 e-tron: precios en euros.
 *
 * Cubre los patrones reales vistos en producción: ccTLD .cl (volvocars.com/cl), locale con guión
 * o guion bajo (models.porsche.com/es-CL/..., tesla.com/es_cl/...), y "chile" como palabra en el
 * host o la ruta (porsche.com/.../_chile_/..., soueastchile.cl, riddarachile.cl).
 * Cada uno se agregó tras un falso negativo real que ocultó autos vigentes — ver git log de este
 * archivo antes de volver a angostar el patrón.
 */

/**
 * Importadores chilenos cuyo dominio no dice "cl" en ninguna parte. Es una lista corta y
 * explícita a propósito: ensanchar el patrón de arriba para que los acepte dejaría entrar
 * cualquier sitio de cualquier país, que es justo lo que esta función existe para evitar.
 */
const IMPORTADORES_CHILE = new Set([
  // Cotizador oficial de Jeep Chile; jeep.cl no sirve contenido.
  "jeepcotizador.com",
  "www.jeepcotizador.com",
]);

export function isChileConfirmedUrl(url: string): boolean {
  try {
    if (IMPORTADORES_CHILE.has(new URL(url).hostname.toLowerCase())) return true;
  } catch {
    // URL malformada: se resuelve con el patrón de texto, igual que antes.
  }
  return /(^|[._/-])cl([._/-]|$)/i.test(url) || /chile/i.test(url);
}
