"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { compressPhoto, type CompressedPhoto } from "@/lib/reviews/compress";
import { REVIEW_MAX_FILE_MB, REVIEW_MAX_PHOTOS } from "@/lib/reviews/config";

/**
 * Selector de fotos del formulario de reseña.
 *
 * Comprime en el browser (2 medidas) y guarda los Blobs en memoria. La SUBIDA real
 * ocurre al enviar el formulario, contra URLs firmadas: así no subimos nada si la
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
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-control border border-line bg-canvas-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="h-full w-full object-cover" />
              {/* Botón macizo en la esquina, siempre visible (en móvil no hay hover). */}
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label="Quitar foto"
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-chip border border-line-2 bg-canvas text-ink transition-colors hover:border-ink"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || processing || lleno}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-control border border-dashed border-line-2 bg-canvas text-[0.9375rem] font-semibold text-ink transition-colors hover:border-ink disabled:cursor-default disabled:border-line disabled:text-ink-3"
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
            <Icon name="add_photo_alternate" className="text-[18px]" />
            Agregar fotos de tu auto
          </>
        )}
      </button>

      <p className="t-micro mt-1.5">
        Hasta {REVIEW_MAX_PHOTOS} fotos de máx. {REVIEW_MAX_FILE_MB} MB cada una. Se achican en tu dispositivo antes de subirlas.
      </p>
      {error && <p className="field__error mt-1">{error}</p>}

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
