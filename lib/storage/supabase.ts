import { getSupabase } from "@/lib/whatsapp/subscription";
import type { SignedUpload, StorageAdapter } from "./index";

/**
 * Implementación sobre Supabase Storage.
 *
 * Dos buckets a propósito (ver docs/REVIEWS-UGC-PLAN.md §4b): lo que sube el usuario
 * cae en uno PRIVADO, y recién al aprobar se mueve al PÚBLICO. Así lo no moderado
 * no es alcanzable por URL directa — clave en contenido generado por usuarios.
 */

const PENDING = process.env.SUPABASE_REVIEW_BUCKET_PENDING ?? "review-media-pendiente";
const PUBLIC = process.env.SUPABASE_REVIEW_BUCKET_PUBLIC ?? "review-media";

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase no configurado");
  return sb;
}

export const supabaseStorage: StorageAdapter = {
  pendingBucket: PENDING,
  publicBucket: PUBLIC,

  async signedUploadUrl(key: string): Promise<SignedUpload> {
    const { data, error } = await client().storage.from(PENDING).createSignedUploadUrl(key);
    if (error || !data) throw new Error(error?.message ?? "no se pudo firmar la subida");
    return { url: data.signedUrl, token: data.token };
  },

  publicUrl(key: string): string {
    return client().storage.from(PUBLIC).getPublicUrl(key).data.publicUrl;
  },

  async promote(key: string): Promise<void> {
    const sb = client();
    const { data, error } = await sb.storage.from(PENDING).download(key);
    if (error || !data) throw new Error(error?.message ?? "no se pudo leer el archivo pendiente");
    const { error: upErr } = await sb.storage.from(PUBLIC).upload(key, data, {
      contentType: "image/jpeg",
      upsert: true, // idempotente: re-aprobar no falla
    });
    if (upErr) throw new Error(upErr.message);
    await sb.storage.from(PENDING).remove([key]); // best-effort
  },

  async remove(bucket: string, keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await client().storage.from(bucket).remove(keys);
  },
};
