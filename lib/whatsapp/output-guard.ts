// Filtro de salida del asesor de WhatsApp — lo último que toca la respuesta del
// modelo antes de llegarle al cliente.
//
// El prompt ya pide todo esto, pero un prompt se puede desobedecer y esto no:
// es código, determinista, y corre siempre. Puro (sin red) para poder testearlo;
// los slugs publicados los trae el llamador (lib/whatsapp/tools.ts).
//
// Qué hace, en orden:
//   1. Links en markdown → URL pelada (WhatsApp no renderiza [texto](url)).
//   2. Saca la oración entera si:
//        - nombra algo del giro que no existe hoy ($19.990, "negociamos",
//          garantía de devolución, oferta exclusiva…), o
//        - trae un link a otro sitio que no sea electrificarte.com, o
//        - linkea una ficha /auto/<slug> que no existe o no está publicada.
//      Se saca la oración y no solo el link porque el texto alrededor ("te
//      recomiendo el Tesla Model Z:") también es inventado.
//   3. "concesionario(s)" → "vendedor(es) oficial(es)".
//   4. Si no quedó nada útil, una respuesta segura.

/** Lo que no se puede decir mientras la Oferta $19.990 esté en STANDBY. */
const PROHIBIDAS: RegExp[] = [
  /19[.,]?990/,
  /\bpago\s+[úu]nico\b/i,
  /\bnegociamos\b/i,
  /\bnegocia(r|remos)?\s+por\s+ti\b/i,
  /\bnegociaci[óo]n\b[^.\n]{0,40}\b(nuestra|electrificarte|nuestros)\b/i,
  /\b(nuestra|la)\s+red\s+de\s+(vendedores|concesionari)/i,
  /\bgarant[íi]a\s+de\s+devoluci[óo]n\b/i,
  /\bte\s+(devolvemos|reembolsamos)\b/i,
  /\boferta\s+exclusiva\b/i,
  /\bservicio\s+de\s+(negociaci[óo]n|ofertas?)\b/i,
  /\bte\s+consegui(mos|remos)\b[^.\n]{0,40}\b(precio|descuento|oferta)/i,
];

const URL_RE = /\bhttps?:\/\/[^\s<>()\]]+|\bwww\.[^\s<>()\]]+/gi;
const PROPIO_RE = /^(https?:\/\/)?(www\.)?electrificarte\.com(\/|$|\?)/i;
const FICHA_RE = /^(?:https?:\/\/)?(?:www\.)?electrificarte\.com\/auto\/([a-z0-9-]+)\/?$/i;

export const RESPUESTA_SEGURA =
  "Déjame revisar bien esa información antes de recomendarte algo. ¿Me cuentas de nuevo qué buscas: cómo usas el auto, tu presupuesto y dónde cargarías?";

export interface Saneado {
  texto: string;
  /** Qué se tocó, para el log. Vacío = la respuesta salió tal cual. */
  cambios: string[];
}

function sinPuntuacionFinal(u: string): string {
  return u.replace(/[.,;:!?*_]+$/, "");
}

/** Oraciones de una línea, conservando el separador para volver a unirlas igual. */
function oraciones(linea: string): string[] {
  return linea.split(/(?<=[.!?])\s+(?=\S)/);
}

export function sanearParaWhatsApp(texto: string, fichasPublicadas: Set<string>): Saneado {
  const cambios: string[] = [];

  // 1. Markdown → URL pelada
  let t = texto.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label: string, url: string) => {
    cambios.push("link markdown");
    return label.includes(url) ? url : `${label}: ${url}`;
  });

  // 2. Oración por oración
  const motivoDeCorte = (o: string): string | null => {
    const prohibida = PROHIBIDAS.find((re) => re.test(o));
    if (prohibida) return `término del giro (${o.match(prohibida)?.[0]})`;
    for (const cruda of o.match(URL_RE) ?? []) {
      const url = sinPuntuacionFinal(cruda);
      if (!PROPIO_RE.test(url)) return `link externo (${url})`;
      const ficha = url.match(FICHA_RE);
      if (ficha && !fichasPublicadas.has(ficha[1].toLowerCase())) return `ficha inexistente (${ficha[1]})`;
    }
    return null;
  };

  const lineas = t.split("\n").map((linea) => {
    const partes = oraciones(linea);
    const quedan = partes.filter((o) => {
      const motivo = motivoDeCorte(o);
      if (motivo) cambios.push(motivo);
      return !motivo;
    });
    // Si se cortó el contenido de un ítem de lista, no dejar el "1." o el "-" solo.
    if (quedan.length < partes.length && quedan.every((o) => /^\s*(\d+[.)]|[-•*])?\s*$/.test(o))) return "";
    return quedan.join(" ");
  });
  t = lineas.join("\n");

  // 3. Terminología
  t = t.replace(/\b(C|c)oncesionari[oa](s?)\b/g, (_m, c: string, plural: string) => {
    cambios.push("concesionario → vendedor oficial");
    const v = c === "C" ? "Vendedor" : "vendedor";
    return plural ? `${v}es oficiales` : `${v} oficial`;
  });

  // Normaliza las fichas válidas al formato con www, y limpia huecos.
  t = t
    .replace(/\bhttps?:\/\/electrificarte\.com\//gi, "https://www.electrificarte.com/")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // 4. Si el recorte dejó la respuesta vacía o sin sentido
  if (cambios.length && t.replace(/[^\p{L}\p{N}]/gu, "").length < 10) {
    return { texto: RESPUESTA_SEGURA, cambios: [...cambios, "respuesta vaciada → segura"] };
  }
  return { texto: t, cambios };
}

