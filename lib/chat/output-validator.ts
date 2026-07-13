const MAX_OUTPUT_LENGTH = 1_400;
const MAX_EMOJIS = 4; // tope de seguridad anti-spam (el prompt pide ~2)

const PRICE_DISCLAIMER =
  "\n\n*Los precios son referenciales. Verifica el valor actualizado en cada ficha del auto.*";

/**
 * Parsea un precio en formato es-CL (ej: "25.000.000") a número.
 * Los puntos son separadores de miles en Chile.
 */
function parseCLPAmount(raw: string): number {
  return parseInt(raw.replace(/\./g, ""), 10);
}

/** Precios grandes en CLP mencionados en el texto (> 1M para ignorar cifras chicas). */
function mentionedCLPPrices(text: string): number[] {
  return [...text.matchAll(/\$([\d.]+(?:,\d+)?)\s*CLP/g)]
    .map((m) => parseCLPAmount(m[1]))
    .filter((n) => !isNaN(n) && n > 1_000_000);
}

/** Recorta emojis excedentes para evitar respuestas saturadas. */
function capEmojis(text: string, max: number): string {
  let count = 0;
  return text.replace(/\p{Extended_Pictographic}/gu, (e) => (++count > max ? "" : e));
}

/**
 * Valida y sanitiza la respuesta del modelo antes de enviarla al usuario.
 *
 * 1. Elimina links /auto/[slug] que no existan en el contexto cargado de Sanity.
 * 2. Agrega aviso si detecta precios que no coinciden con ningún valor real (±10%).
 * 3. Trunca en el último párrafo completo si el texto supera MAX_OUTPUT_LENGTH.
 */
export function validateOutput(
  text: string,
  validSlugs: Set<string>,
  validPrices: number[],
): string {
  let result = text;

  // 1. Remover links a slugs inválidos
  result = result.replace(
    /\[([^\]]+)\]\(\/auto\/([^)\s]+)\)/g,
    (match, label, slug) => (validSlugs.has(slug) ? match : label),
  );

  // 2. Verificar precios mencionados.
  const mentioned = mentionedCLPPrices(result);
  if (mentioned.length > 0) {
    const hasSuspicious =
      validPrices.length === 0
        ? // Caso más peligroso: el modelo citó un precio en CLP sin haber
          // consultado ninguna tool. No hay contra qué validar → advertir.
          true
        : mentioned.some(
            (p) => !validPrices.some((vp) => Math.abs(p - vp) / vp <= 0.1),
          );

    if (hasSuspicious && !result.includes(PRICE_DISCLAIMER.trim())) {
      result += PRICE_DISCLAIMER;
    }
  }

  // 3. Truncar si es demasiado largo
  if (result.length > MAX_OUTPUT_LENGTH) {
    const truncated = result.slice(0, MAX_OUTPUT_LENGTH);
    const lastPara = truncated.lastIndexOf("\n\n");
    result = (lastPara > 600 ? truncated.slice(0, lastPara) : truncated).trim();
  }

  // 4. Tope de emojis (formato WhatsApp)
  result = capEmojis(result, MAX_EMOJIS);

  return result;
}
