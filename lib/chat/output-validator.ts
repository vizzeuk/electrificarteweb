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

/**
 * Precios grandes en CLP mencionados en el texto (> 1M para ignorar cifras chicas).
 * Con o sin "CLP": el prompt pide "$22.990.000 CLP" pero el modelo a veces
 * escribe solo "$22.990.000", y así un precio inventado pasaba sin aviso.
 */
function mentionedCLPPrices(text: string): number[] {
  return [...text.matchAll(/\$\s?(\d{1,3}(?:\.\d{3}){2,})(?:,\d+)?/g)]
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

/**
 * Giro sep-2026: el servicio de negociación NO existe todavía. El chatbot de la web puede
 * nombrarlo como algo que abrirá pronto, pero nunca como algo que ya funciona. El prompt lo
 * pide; esto lo hace cumplir. Saca la oración entera (no solo la frase), igual que el filtro
 * del asesor de WhatsApp (lib/whatsapp/output-guard.ts, que es más estricto: allá no se nombra).
 */
const NEGOCIACION_COMO_ACTUAL: RegExp[] = [
  /19[.,]?990/,
  /\bpago\s+[úu]nico\b/i,
  /\bnegociamos\b/i,
  /\b(estamos|seguimos)\s+negociando\b/i,
  /\bnegocia(r|remos)?\s+por\s+ti\b/i,
  /\bprecios?\s+negociados?\b/i,
  /\bgarant[íi]a\s+de\s+devoluci[óo]n\b/i,
  /\bte\s+(devolvemos|reembolsamos)\b/i,
  /\boferta\s+exclusiva\b/i,
  /\bte\s+consegui(mos|remos)\b[^.\n]{0,40}\b(precio|descuento|oferta)/i,
];

export function quitarNegociacionComoActual(text: string): string {
  const lineas: string[] = [];
  for (const linea of text.split("\n")) {
    const oraciones = linea.split(/(?<=[.!?])\s+(?=\S)/);
    const quedan = oraciones.filter((o) => !NEGOCIACION_COMO_ACTUAL.some((re) => re.test(o)));
    if (quedan.length < oraciones.length && quedan.join("").trim() === "") continue; // línea borrada entera
    const nueva = quedan.join(" ");
    if (/^\s*(?:[-*]|\d+\.)\s*$/.test(nueva)) continue; // quedó solo la viñeta
    lineas.push(nueva);
  }
  return lineas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
