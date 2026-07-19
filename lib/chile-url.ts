/**
 * ¿Esta URL confirma razonablemente que es del mercado chileno? Usado como red de seguridad en
 * lib/pdp-research/research.ts y lib/price-check/check.ts para no aceptar como "fuente oficial de
 * Chile" un sitio regional LatAm genérico.
 *
 * Cubre los patrones reales vistos en producción: ccTLD .cl (volvocars.com/cl), locale con guión
 * (models.porsche.com/es-CL/...), y "chile" como palabra en la ruta (porsche.com/.../_chile_/...).
 * Cada uno se agregó tras un falso negativo real que ocultó autos vigentes — ver git log de este
 * archivo antes de volver a angostar el patrón.
 */
export function isChileConfirmedUrl(url: string): boolean {
  return /(^|[./-])cl([/_-]|$)/i.test(url) || /chile/i.test(url);
}
