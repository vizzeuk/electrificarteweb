// Ficha tecnica opcional (oct-2026): el PDF oficial del modelo PARA CHILE que el humano
// adjunta en el panel. Vive en la Files API de Anthropic (la misma org de las sesiones) y se
// monta en cada sesion del agente como un archivo de solo lectura.
//
// Reglas (pedido de Matias): la ficha solo completa specs TECNICAS que la fuente web no trae;
// el precio sale de ahi solo como ultimo recurso (sin versiones declaradas y sin precio en la
// web). El re-check semanal sigue leyendo la URL, nunca la ficha. Ver armarEncargo.

/** Vercel corta los request de mas de 4,5 MB antes de llegar al codigo. */
export const FICHA_MAX_BYTES = 4 * 1024 * 1024;
/** Donde la monta la sesion: `mount_path` cae bajo /mnt/session/uploads. */
export const FICHA_MOUNT = "/ficha-tecnica.pdf";
export const FICHA_RUTA = `/mnt/session/uploads${FICHA_MOUNT}`;

import { borrarFichaDeRunner, esFichaRunner, runnerConfigurado, subirFichaARunner } from "./runner";

const API = "https://api.anthropic.com";

export const esFileId = (v: unknown): v is string => typeof v === "string" && /^file_[A-Za-z0-9_-]{6,}$/.test(v);

/** null si sirve; si no, el error para el formulario. */
export function validarPdf(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return "El archivo de la ficha tecnica esta vacio.";
  if (bytes.length > FICHA_MAX_BYTES) {
    return `La ficha tecnica pesa ${(bytes.length / 1024 / 1024).toFixed(1)} MB: el maximo es 4 MB. Sube solo la ficha (no el catalogo completo) o comprimela.`;
  }
  // Los bytes mandan, no la extension: "%PDF-" al inicio.
  const firma = String.fromCharCode(...bytes.subarray(0, 5));
  if (firma !== "%PDF-") return "La ficha tecnica tiene que ser un PDF.";
  return null;
}

function headers(): Record<string, string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Falta ANTHROPIC_API_KEY");
  return { "x-api-key": key, "anthropic-version": "2023-06-01" };
}

/** Sube el PDF a la Files API. Devuelve el `file_id`. */
export async function subirFicha(bytes: Uint8Array, nombre: string): Promise<string> {
  // Con el runner, la ficha vive en la VPS: es donde corre el agente que la lee.
  if (runnerConfigurado()) return subirFichaARunner(bytes);
  const form = new FormData();
  form.append("file", new Blob([bytes as BlobPart], { type: "application/pdf" }), nombre || "ficha-tecnica.pdf");
  const res = await fetch(`${API}/v1/files`, { method: "POST", headers: headers(), body: form, signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Files API → ${res.status}: ${text.slice(0, 300)}`);
  const id = (JSON.parse(text) as { id?: string }).id;
  if (!esFileId(id)) throw new Error(`Files API no devolvio un id: ${text.slice(0, 200)}`);
  return id;
}

/** Best-effort: una ficha huerfana no rompe nada, solo ocupa espacio. */
export async function borrarFicha(fileId: string | null | undefined): Promise<void> {
  if (!esFileId(fileId)) return;
  if (esFichaRunner(fileId)) return borrarFichaDeRunner(fileId);
  try {
    await fetch(`${API}/v1/files/${fileId}`, { method: "DELETE", headers: headers(), signal: AbortSignal.timeout(10_000) });
  } catch {
    // no fatal
  }
}

/** El nombre que se muestra en el panel: sin rutas, acotado. */
export function nombreFicha(v: unknown): string {
  const n = String(v ?? "").split(/[\\/]/).pop()!.trim().slice(0, 120);
  return n || "ficha-tecnica.pdf";
}
