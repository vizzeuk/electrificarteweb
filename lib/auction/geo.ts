/**
 * Geografía para el scoring de cercanía de la subasta inversa.
 *
 * Deriva la zona de cercanía (local/regional/vecina/distante) entre el lead y
 * el vendedor a partir de región + comuna. La adyacencia de regiones se aproxima
 * con el orden norte→sur de las 16 regiones de Chile (son una cadena lineal):
 * regiones contiguas en ese orden se consideran "vecinas". Es una aproximación
 * suficiente para el tramo de 0.40; se puede refinar después con adyacencias
 * reales (ej. Valparaíso ↔ O'Higgins).
 */

import type { CercaniaZona } from "@/lib/auction/score";

/** Regiones de Chile en orden norte→sur (índice = posición geográfica). */
const REGIONES_ORDEN = [
  "arica",
  "tarapaca",
  "antofagasta",
  "atacama",
  "coquimbo",
  "valparaiso",
  "metropolitana",
  "higgins",
  "maule",
  "nuble",
  "bio",
  "araucania",
  "rios",
  "lagos",
  "aysen",
  "magallanes",
] as const;

/** Palabra clave distintiva por región (para tolerar variantes de escritura
 *  como "Región Metropolitana", "RM", "Bío-Bío", "O'Higgins", etc.). */
const KEYWORDS: Array<[number, string[]]> = [
  [0, ["arica"]],
  [1, ["tarapaca", "iquique"]],
  [2, ["antofagasta"]],
  [3, ["atacama", "copiapo"]],
  [4, ["coquimbo", "serena"]],
  [5, ["valparaiso"]],
  [6, ["metropolitana", "santiago", "rm"]],
  [7, ["higgins", "libertador", "rancagua"]],
  [8, ["maule", "talca"]],
  [9, ["nuble", "chillan"]],
  [10, ["biobio", "bio", "concepcion"]],
  [11, ["araucania", "temuco"]],
  [12, ["rios", "valdivia"]],
  [13, ["lagos", "puerto montt", "montt"]],
  [14, ["aysen", "aisen", "coyhaique"]],
  [15, ["magallanes", "punta arenas"]],
];

/** Quita acentos y baja a minúsculas para comparar strings de forma robusta. */
export function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Mapea un nombre de región (en cualquier variante) a su índice norte→sur.
 *  Devuelve null si no la reconoce. */
export function regionIndex(raw: string | null | undefined): number | null {
  const n = normalize(raw);
  if (!n) return null;
  for (const [idx, keys] of KEYWORDS) {
    if (keys.some((k) => n.includes(k))) return idx;
  }
  return null;
}

export interface CercaniaOpts {
  /** El vendedor ofrece despacho a domicilio 100% bonificado → cuenta como local. */
  deliveryGratis?: boolean;
}

/** Zona de cercanía entre lead y vendedor. */
export function cercaniaZona(
  leadRegion: string | null | undefined,
  leadComuna: string | null | undefined,
  vendorRegion: string | null | undefined,
  vendorComuna: string | null | undefined,
  opts: CercaniaOpts = {},
): CercaniaZona {
  if (opts.deliveryGratis) return "local";

  const ri = regionIndex(leadRegion);
  const rj = regionIndex(vendorRegion);
  if (ri == null || rj == null) return "distante"; // conservador si falta el dato

  if (ri === rj) {
    const leadC = normalize(leadComuna);
    const sameComuna = leadC !== "" && leadC === normalize(vendorComuna);
    return sameComuna ? "local" : "regional";
  }
  if (Math.abs(ri - rj) === 1) return "vecina";
  return "distante";
}

export { REGIONES_ORDEN };
