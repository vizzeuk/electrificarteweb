/**
 * Caché en disco de las lecturas de fuente.
 *
 * Existe por un error concreto y caro: iterando el matcher de versiones se
 * releyeron las mismas páginas en vivo una y otra vez, y esas re-corridas —que
 * eran depuración, no trabajo— se llevaron cerca de la mitad de un gasto de
 * US$19 en la API. Con la lectura guardada, ajustar la lógica y volver a correr
 * cuesta cero.
 *
 * Solo para scripts de mantenimiento. El re-check en producción NO debe usarla:
 * ahí el punto es justamente leer la página de nuevo cada semana.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { SourceReport } from "./types";

const DIR = ".context/cache-fuentes";

export interface Cacheado {
  report: SourceReport;
  via: string;
  text?: string;
  leidoEn: string;
}

function ruta(url: string, modelo: string): string {
  const h = createHash("sha1").update(`${url}|${modelo}`).digest("hex").slice(0, 16);
  return `${DIR}/${h}.json`;
}

/** `maxHoras` acota cuánto vale una lectura vieja; por defecto una semana. */
export function leerCache(url: string, modelo: string, maxHoras = 168): Cacheado | null {
  const p = ruta(url, modelo);
  if (!existsSync(p)) return null;
  try {
    const c = JSON.parse(readFileSync(p, "utf8")) as Cacheado;
    const horas = (Date.now() - new Date(c.leidoEn).getTime()) / 3_600_000;
    return horas <= maxHoras ? c : null;
  } catch {
    return null;
  }
}

export function guardarCache(url: string, modelo: string, c: Omit<Cacheado, "leidoEn">): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(ruta(url, modelo), JSON.stringify({ ...c, leidoEn: new Date().toISOString() }, null, 1));
}
