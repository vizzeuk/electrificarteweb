/**
 * Precio publicado (P_publicado) para la subasta inversa.
 *
 * P_publicado = precio de LISTA del modelo publicado en electrificarte.com
 * (Sanity). El vendedor puja por debajo de ese precio (el valor del negocio es
 * "un precio mejor que el de lista/nacional"). No hay stock central nuestro:
 * el precio de referencia sale del catálogo de Sanity, no de un inventario.
 *
 * El `target_model` del lead es texto libre ("BYD Dolphin", "Dolphin GS", etc.),
 * así que se resuelve con un match por tokens contra nombre + marca del catálogo.
 */

import { client } from "@/lib/sanity/client";
import { groq } from "next-sanity";
import { normalize } from "@/lib/auction/geo";

interface CarPriceDoc {
  name: string;
  brand: string | null;
  basePrice: number | null;
  price: number | null;
  discountPrice: number | null;
}

const ALL_CARS_QUERY = groq`*[_type == "car" && hidden != true]{
  name,
  "brand": brand->name,
  basePrice,
  price,
  discountPrice
}`;

export interface PublishedPriceResult {
  precioPublicado: number;
  matched: { name: string; brand: string | null };
  /** 0..1 — qué tan seguro es el match (fracción de tokens del target hallados). */
  confianza: number;
}

/** Precio de lista de un modelo. basePrice → price → discountPrice. */
function listPrice(car: CarPriceDoc): number | null {
  return car.basePrice ?? car.price ?? car.discountPrice ?? null;
}

/** Cuántos tokens del target aparecen en el string del candidato (marca+nombre). */
function matchScore(targetTokens: string[], candidate: string): number {
  if (targetTokens.length === 0) return 0;
  const found = targetTokens.filter((t) => candidate.includes(t)).length;
  return found / targetTokens.length;
}

/** Resuelve el precio publicado desde el catálogo de Sanity para un target_model
 *  de texto libre. Devuelve null si no encuentra un match razonable (>= 50% de
 *  los tokens) o si el modelo no tiene precio cargado. */
export async function getPublishedPrice(
  targetModel: string,
  cars?: CarPriceDoc[],
): Promise<PublishedPriceResult | null> {
  const pool = cars ?? (await client.fetch<CarPriceDoc[]>(ALL_CARS_QUERY));
  const targetTokens = normalize(targetModel).split(/\s+/).filter(Boolean);
  if (targetTokens.length === 0) return null;

  let best: { car: CarPriceDoc; score: number; len: number } | null = null;
  for (const car of pool) {
    const candidate = normalize(`${car.brand ?? ""} ${car.name}`);
    const score = matchScore(targetTokens, candidate);
    if (score === 0) continue;
    // Desempate: a igual fracción de tokens, gana el candidato más ajustado
    // (menos palabras extra) para no confundir "Dolphin" con "Dolphin Mini".
    const len = candidate.length;
    if (!best || score > best.score || (score === best.score && len < best.len)) {
      best = { car, score, len };
    }
  }

  if (!best || best.score < 0.5) return null;
  const precio = listPrice(best.car);
  if (precio == null || precio <= 0) return null;

  return {
    precioPublicado: precio,
    matched: { name: best.car.name, brand: best.car.brand },
    confianza: Number(best.score.toFixed(2)),
  };
}

const BRAND_NAMES_QUERY = groq`*[_type == "brand"]{ "name": name }.name`;

/** Nombres de marca del catálogo (para detectar la marca del target_model en el ruteo). */
export async function getBrandNames(): Promise<string[]> {
  return client.fetch<string[]>(BRAND_NAMES_QUERY);
}
