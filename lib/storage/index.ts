/**
 * Capa de almacenamiento de medios. Ver docs/REVIEWS-UGC-PLAN.md §4c.
 *
 * ⚠️ ESTE ES EL ÚNICO ARCHIVO QUE SABE QUÉ PROVEEDOR USAMOS.
 *
 * El endpoint, el formulario y el dashboard hablan solo con esta interfaz. Migrar a
 * Cloudflare R2 = escribir `lib/storage/r2.ts` y cambiar la línea de abajo — nada más.
 * En la BD guardamos RUTAS, no URLs, justamente para que esto sea posible.
 *
 * Gatillo para migrar: egress > ~200 GB/mes o storage > ~80 GB.
 */

import { supabaseStorage } from "./supabase";

export interface SignedUpload {
  /** URL a la que el browser hace PUT directo (nunca pasa por Vercel: límite 4,5 MB). */
  url: string;
  /** Token/headers que la subida necesita, según el proveedor. */
  token?: string;
}

export interface StorageAdapter {
  /** Bucket donde cae lo que sube el usuario, ANTES de moderar. Privado. */
  readonly pendingBucket: string;
  /** Bucket de lo aprobado. Público (el CDN necesita cachear para que el egress sea barato). */
  readonly publicBucket: string;

  signedUploadUrl(key: string): Promise<SignedUpload>;
  /** URL pública de un objeto ya aprobado. */
  publicUrl(key: string): string;
  /** Mueve de pendiente a público al aprobar (copia + borra el original). */
  promote(key: string): Promise<void>;
  remove(bucket: string, keys: string[]): Promise<void>;
}

export const storage: StorageAdapter = supabaseStorage;
