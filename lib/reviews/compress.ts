/**
 * Compresión de fotos EN EL BROWSER (client-only). Ver docs/REVIEWS-UGC-PLAN.md §4b.
 *
 * Genera las DOS medidas acá y no en el servidor. Eso:
 *  - evita por completo el medidor de transformaciones de Supabase ($5/1.000 origen),
 *  - evita meter `sharp` y procesamiento de imágenes en una función de Vercel,
 *  - deja la subida como un simple PUT al bucket.
 *
 * Bonus de privacidad: redibujar en un <canvas> **elimina el EXIF**, incluidas las
 * coordenadas GPS que traen las fotos de celular (dato personal bajo Ley 19.628/21.719).
 * Por eso SIEMPRE se sube el resultado del canvas, nunca el archivo original.
 */

export const CARD_W = 480;   // grillas (PDP, home) — ~45 KB
export const FULL_W = 1280;  // lightbox — ~250 KB

export interface CompressedPhoto {
  card: Blob;
  full: Blob;
  /** Object URL para la previsualización en el formulario. */
  preview: string;
}

async function toBlob(bitmap: ImageBitmap, maxW: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxW / bitmap.width); // solo achica, nunca agranda
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob falló"))), "image/jpeg", quality),
  );
}

/**
 * `imageOrientation: "from-image"` aplica la rotación EXIF: sin eso las fotos
 * verticales de celular salen acostadas.
 */
export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const [card, full] = await Promise.all([
      toBlob(bitmap, CARD_W, 0.72),
      toBlob(bitmap, FULL_W, 0.7),
    ]);
    return { card, full, preview: URL.createObjectURL(card) };
  } finally {
    bitmap.close();
  }
}
