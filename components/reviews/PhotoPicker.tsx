"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { compressPhoto, type CompressedPhoto } from "@/lib/reviews/compress";
import { REVIEW_MAX_FILE_MB, REVIEW_MAX_PHOTOS } from "@/lib/reviews/config";

/**
 * Selector de fotos del formulario de reseña.
 *
 * Comprime en el browser (2 medidas) y guarda los Blobs en memoria. La SUBIDA real
 * ocurre al enviar el formulario, contra URLs firmadas — así no subimos nada si la
 * persona abandona a mitad de camino (evita basura huérfana en el bucket).
 */

export interface PickedPhoto extends CompressedPhoto {
  id: string;
}

export function PhotoPicker({
  photos,
  onChange,
  disabled,
}: {
  photos: PickedPhoto[];
  onChange: (next: PickedPhoto[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setProcessing(true);
    try {
      const libres = REVIEW_MAX_PHOTOS - photos.length;
      const elegidos = Array.from(files).slice(0, libres);

      // Se filtra ANTES de procesar: decodificar un archivo enorme (o uno que no es
      // imagen) puede colgar el navegador del celular.
      const pesados = elegidos.filter((f) => f.size > REVIEW_MAX_FILE_MB * 1024 * 1024);
      const validos = elegidos.filter((f) => f.size <= REVIEW_MAX_FILE_MB * 1024 * 1024);
      if (pesados.length) {
        setError(
          pesados.length === elegidos.length
            ? `Esa foto pesa más de ${REVIEW_MAX_FILE_MB} MB. Prueba con una más liviana.`
            : `${pesados.length} foto(s) superan los ${REVIEW_MAX_FILE_MB} MB y se omitieron.`,
        );
      }
      if (validos.length === 0) return;

      const nuevos = await Promise.all(
        validos.map(async (f) => ({
          id: crypto.randomUUID(),
          ...(await compressPhoto(f)),
        })),
      );
      onChange([...photos, ...nuevos]);
    } catch {
      setError("No pudimos procesar alguna foto. Intenta con otra.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(id: string) {
    const p = photos.find((x) => x.id === id);
    if (p) URL.revokeObjectURL(p.preview);
    onChange(photos.filter((x) => x.id !== id));
  }

  const lleno = photos.length >= REVIEW_MAX_PHOTOS;

  return (
    <div>
      {photos.length > 0 && (
        <div className="mb-3 grid grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label="Quitar foto"
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <Icon name="close" className="text-[20px] text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || processing || lleno}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.02] py-3.5 text-sm font-semibold text-white/70 transition-colors hover:border-primary/40 hover:text-white disabled:opacity-50"
      >
        {processing ? (
          <>
            <Icon name="progress_activity" className="animate-spin text-[18px]" />
            Procesando fotos...
          </>
        ) : lleno ? (
          `Máximo ${REVIEW_MAX_PHOTOS} fotos`
        ) : (
          <>
            <Icon name="add_circle" className="text-[18px]" />
            Agregar fotos de tu auto
          </>
        )}
      </button>

      <p className="mt-1.5 px-1 text-[11px] text-white/35">
        Opcional, hasta {REVIEW_MAX_PHOTOS} · máx. {REVIEW_MAX_FILE_MB} MB c/u. Se achican en tu dispositivo antes de subirlas.
      </p>
      {error && <p className="mt-1 px-1 text-xs text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
