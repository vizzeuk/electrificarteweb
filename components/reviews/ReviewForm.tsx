"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "./StarRating";
import { PhotoPicker, type PickedPhoto } from "./PhotoPicker";
import { REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from "@/lib/reviews/config";
import type { ReviewPrefill } from "./ReviewProvider";

/**
 * Formulario de reseña: UN solo componente para los dos lugares donde se escribe una reseña.
 *   - variant "modal": dentro del popup de la ficha de cada auto (ReviewModal). Rápido, con el
 *     auto ya puesto.
 *   - variant "page":  en /resenas/escribir, a la que se llega desde el home pasando por /resenas.
 *     Pide marca y modelo.
 * Ambos mandan exactamente lo mismo a /api/reviews → mismo webhook de n8n, mismos correos y
 * misma moderación. Campos .field/.input del sistema v1.
 */

const schema = z.object({
  rating: z.number().int().min(1, "Elige una calificación").max(5),
  firstName: z.string().min(2, "Ingresa tu nombre"),
  lastName: z.string().min(2, "Ingresa tu apellido"),
  email: z.string().email("Ingresa un email válido"),
  phone: z.string().regex(/^9\d{8}$/, "Ingresa los 9 dígitos").or(z.literal("")).optional(),
  body: z.string().min(REVIEW_MIN_CHARS, `Cuéntanos al menos ${REVIEW_MIN_CHARS} caracteres`).max(REVIEW_MAX_CHARS),
  carBrand: z.string().optional(),
  carModel: z.string().optional(),
  carYear: z.string().optional(),
  carColor: z.string().optional(),
  carVersion: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

/**
 * Sube las fotos directo al bucket con URLs firmadas y devuelve las RUTAS (no URLs)
 * para guardarlas en la BD. Nunca pasan por /api/*: Vercel corta el body en 4,5 MB.
 * Si algo falla devuelve [] : preferimos publicar la reseña sin fotos antes que perderla.
 */
async function uploadPhotos(photos: PickedPhoto[]): Promise<string[]> {
  if (photos.length === 0) return [];
  try {
    const res = await fetch("/api/reviews/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: photos.length }),
    });
    if (!res.ok) return [];
    const { slots } = (await res.json()) as {
      slots: { cardKey: string; fullKey: string; card: { url: string }; full: { url: string } }[];
    };

    const keys: string[] = [];
    await Promise.all(
      photos.map(async (p, i) => {
        const slot = slots[i];
        if (!slot) return;
        const put = (url: string, blob: Blob) =>
          fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
        const [a, b] = await Promise.all([put(slot.card.url, p.card), put(slot.full.url, p.full)]);
        if (a.ok && b.ok) keys.push(slot.cardKey, slot.fullKey);
      }),
    );
    return keys;
  } catch {
    return [];
  }
}

/** Auto del catálogo para elegir en /resenas/escribir (así la reseña queda en su ficha). */
export interface ReviewCarOption {
  slug: string;
  brand: string;
  name: string;
}

const OTRO = "__otro__";

interface ReviewFormProps {
  prefill: ReviewPrefill;
  /** Catálogo para los selectores de marca y modelo. Sin esto (popup), marca y modelo son texto. */
  carOptions?: ReviewCarOption[];
  variant: "modal" | "page";
  /** Se reinicia el formulario cada vez que pasa a true (el popup, al abrirse). */
  active?: boolean;
  /** id del título, para aria-labelledby del diálogo. */
  titleId?: string;
  onClose?: () => void;
}

export function ReviewForm({ prefill, carOptions, variant, active = true, titleId = "review-title", onClose }: ReviewFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [rating, setRating] = useState(0);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  // true = se envió sin fotos y quedó publicada; false = trae fotos y queda en revisión.
  const [published, setPublished] = useState(false);
  const submitting = useRef(false);
  // Selectores del catálogo (solo cuando no viene un auto fijo y hay catálogo).
  const pickFromCatalog = !prefill.carSlug && !!carOptions?.length;
  const [pickedBrand, setPickedBrand] = useState("");
  const [pickedSlug, setPickedSlug] = useState("");
  const brands = [...new Set((carOptions ?? []).map((c) => c.brand))];
  const models = (carOptions ?? []).filter((c) => c.brand === pickedBrand);
  const freeBrand = pickedBrand === OTRO;
  const freeModel = freeBrand || pickedSlug === OTRO;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onTouched" });

  const bodyValue = watch("body") ?? "";

  useEffect(() => {
    if (!active) return;
    setStatus("idle");
    const pre = prefill.rating && prefill.rating >= 1 && prefill.rating <= 5 ? prefill.rating : 0;
    setRating(pre);
    setPhotos([]);
    setPickedBrand("");
    setPickedSlug("");
    submitting.current = false;
    reset({
      rating: pre, firstName: "", lastName: "", email: "", phone: "", body: "",
      carBrand: prefill.carBrand ?? "", carModel: prefill.carModel ?? "",
      carYear: "", carColor: "", carVersion: "",
    });
  }, [active, prefill.carBrand, prefill.carModel, prefill.rating, reset]);

  function pickRating(n: number) {
    setRating(n);
    setValue("rating", n, { shouldValidate: true });
  }

  function chooseBrand(brand: string) {
    setPickedBrand(brand);
    setPickedSlug("");
    setValue("carBrand", brand === OTRO ? "" : brand);
    setValue("carModel", "");
  }

  function chooseModel(slug: string) {
    setPickedSlug(slug);
    const car = carOptions?.find((c) => c.slug === slug);
    setValue("carModel", car ? car.name : "", { shouldValidate: !!car });
  }

  async function onSubmit(data: FormValues) {
    if (submitting.current) return;
    // Sin auto fijo, la reseña necesita marca y modelo: sin eso no hay ficha donde mostrarla.
    if (!prefill.carSlug && (!data.carBrand?.trim() || !data.carModel?.trim())) {
      setError("carModel", { message: "Indica la marca y el modelo de tu auto" });
      return;
    }
    submitting.current = true;
    setStatus("loading");
    try {
      // Las fotos se suben ACÁ (no al elegirlas): si la persona abandona el formulario
      // no dejamos archivos huérfanos en el bucket.
      const photoKeys = await uploadPhotos(photos);

      const year = data.carYear ? Number(data.carYear) : undefined;
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone ? `+56 ${data.phone}` : undefined,
          rating: data.rating,
          body: data.body,
          carSlug: prefill.carSlug ?? (pickedSlug && pickedSlug !== OTRO ? pickedSlug : undefined),
          carSanityId: prefill.carSanityId,
          carBrand: data.carBrand || undefined,
          carModel: data.carModel || undefined,
          carYear: Number.isFinite(year) ? year : undefined,
          carColor: data.carColor || undefined,
          carVersion: data.carVersion || undefined,
          photos: photoKeys,
          source: prefill.source ?? "web",
        }),
      });
      if (!res.ok) throw new Error();
      setPublished(photoKeys.length === 0);
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      submitting.current = false;
    }
  }

  const autoLabel = [prefill.carBrand, prefill.carModel].filter(Boolean).join(" ");
  const loading = status === "loading";

  return (
    <>
      {status === "success" ? (
        <div className="modal__done">
          <div className="done-mark">
            <Icon name="check" className="text-[24px]" />
          </div>
          <h2 id={titleId} className={variant === "modal" ? "modal__title text-balance" : "t-h3"}>¡Gracias por tu reseña!</h2>
          <p className={variant === "modal" ? "modal__text" : "t-body mt-3"}>
            {published
              ? "Ya está publicada en la ficha del auto. Nos ayuda muchísimo a que otros compradores decidan mejor."
              : "Como trae fotos, la revisamos antes de publicarla. Nos ayuda muchísimo a que otros compradores decidan mejor."}
          </p>
          {variant === "modal" ? (
            <button type="button" onClick={onClose} className="btn btn--secondary btn--lg btn--block mt-6">
              Cerrar
            </button>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/marcas" className="btn btn--primary btn--lg">Ver el catálogo</Link>
              <Link href="/" className="btn btn--secondary btn--lg">Volver al inicio</Link>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* En la página, el título y la bajada los pone /resenas/escribir. */}
          {variant === "modal" && (
            <>
              <h2 id={titleId} className="modal__title text-balance">
                {autoLabel ? `¿Cómo ha sido tu ${autoLabel}?` : "Cuéntanos sobre tu auto"}
              </h2>
              <p className="modal__text">
                Tu reseña ayuda a otros compradores a decidir. Si agregas fotos, las revisamos antes de
                publicarla.
              </p>
            </>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Estrellas */}
            <div className="field">
              <span className="field__label">Tu calificación</span>
              <div className="flex items-center gap-3">
                <StarRating value={rating} onChange={pickRating} size={28} />
                {rating > 0 && <span className="t-small">{rating} de 5</span>}
              </div>
              <input type="hidden" {...register("rating", { valueAsNumber: true })} />
              {errors.rating && <p className="field__error">{errors.rating.message}</p>}
            </div>

            {/* Reseña */}
            <div className="field">
              <label className="field__label" htmlFor="rv-body">Tu reseña</label>
              <textarea
                id="rv-body"
                {...register("body")}
                rows={4}
                placeholder="¿Cómo ha sido la experiencia? Autonomía real, carga, manejo, lo bueno y lo malo…"
                aria-invalid={errors.body ? true : undefined}
                className="input h-auto min-h-[120px] resize-none py-3 leading-[1.5]"
              />
              <div className="flex items-start justify-between gap-3">
                {errors.body ? <p className="field__error">{errors.body.message}</p> : <span />}
                <span className="t-micro num flex-none">{bodyValue.length}/{REVIEW_MAX_CHARS}</span>
              </div>
            </div>

            {/* Fotos */}
            <div className="field">
              <span className="field__label">
                Fotos de tu auto <span className="opt">(opcional)</span>
              </span>
              <PhotoPicker photos={photos} onChange={setPhotos} disabled={loading} />
            </div>

            {/* Datos del auto: se precargan desde la PDP */}
            {pickFromCatalog && (
          <div className="row2">
            <div className="field">
              <label className="field__label" htmlFor="rv-brand-pick">Marca</label>
              <div className="relative">
                <select id="rv-brand-pick" value={pickedBrand} onChange={(e) => chooseBrand(e.target.value)} className="input appearance-none pr-10">
                  <option value="">Elige la marca</option>
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                  <option value={OTRO}>Otra marca</option>
                </select>
                <Icon name="expand_more" size="none" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
              </div>
            </div>
            {!freeBrand && (
              <div className="field">
                <label className="field__label" htmlFor="rv-model-pick">Modelo</label>
                <div className="relative">
                  <select id="rv-model-pick" value={pickedSlug} onChange={(e) => chooseModel(e.target.value)} disabled={!pickedBrand} aria-invalid={errors.carModel ? true : undefined} className="input appearance-none pr-10">
                    <option value="">{pickedBrand ? "Elige el modelo" : "Primero la marca"}</option>
                    {models.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    {pickedBrand && <option value={OTRO}>Otro modelo</option>}
                  </select>
                  <Icon name="expand_more" size="none" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
                </div>
              </div>
            )}
          </div>
        )}
        {(!prefill.carSlug && (!pickFromCatalog || freeModel)) && (
          <div className="row2">
            {(!pickFromCatalog || freeBrand) && (
              <div className="field">
                <label className="field__label" htmlFor="rv-brand">{pickFromCatalog ? "¿Qué marca?" : "Marca"}</label>
                <input id="rv-brand" {...register("carBrand")} placeholder="BYD" className="input" />
              </div>
            )}
            <div className="field">
              <label className="field__label" htmlFor="rv-model">{pickFromCatalog ? "¿Qué modelo?" : "Modelo"}</label>
              <input id="rv-model" {...register("carModel")} placeholder="Dolphin" aria-invalid={errors.carModel ? true : undefined} className="input" />
            </div>
          </div>
        )}
        {errors.carModel && <p className="field__error -mt-2">{errors.carModel.message}</p>}
        <div className="grid grid-cols-3 gap-3">
              <div className="field">
                <label className="field__label" htmlFor="rv-year">Año</label>
                <input id="rv-year" {...register("carYear")} inputMode="numeric" maxLength={4} placeholder="2025" className="input" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="rv-color">Color</label>
                <input id="rv-color" {...register("carColor")} placeholder="Blanco" className="input" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="rv-version">Versión</label>
                <input id="rv-version" {...register("carVersion")} placeholder="GS" className="input" />
              </div>
            </div>

            {/* Persona */}
            <div className="row2">
              <div className="field">
                <label className="field__label" htmlFor="rv-first">Nombre</label>
                <input
                  id="rv-first"
                  {...register("firstName")}
                  autoComplete="given-name"
                  placeholder="Juan"
                  aria-invalid={errors.firstName ? true : undefined}
                  className="input"
                />
                {errors.firstName && <p className="field__error">{errors.firstName.message}</p>}
              </div>
              <div className="field">
                <label className="field__label" htmlFor="rv-last">Apellido</label>
                <input
                  id="rv-last"
                  {...register("lastName")}
                  autoComplete="family-name"
                  placeholder="Pérez"
                  aria-invalid={errors.lastName ? true : undefined}
                  className="input"
                />
                {errors.lastName && <p className="field__error">{errors.lastName.message}</p>}
              </div>
            </div>
            <p className="t-micro -mt-2">
              Publicamos solo tu nombre y la inicial del apellido (ej. &ldquo;Juan P.&rdquo;).
            </p>

            <div className="field">
              <label className="field__label" htmlFor="rv-email">Email</label>
              <input
                id="rv-email"
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="juan@ejemplo.com"
                aria-invalid={errors.email ? true : undefined}
                className="input"
              />
              {errors.email && <p className="field__error">{errors.email.message}</p>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="rv-phone">
                WhatsApp <span className="opt">(opcional)</span>
              </label>
              <div className="input-group">
                <span className="input-group__prefix">+56</span>
                <input
                  id="rv-phone"
                  {...register("phone")}
                  type="tel"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="995760998"
                  aria-invalid={errors.phone ? true : undefined}
                  onInput={(e) => {
                    let v = e.currentTarget.value.replace(/\D/g, "");
                    if (v.length > 9 && v.startsWith("56")) v = v.slice(2);
                    v = v.slice(0, 9);
                    e.currentTarget.value = v;
                    setValue("phone", v, { shouldValidate: true });
                  }}
                  className="input"
                />
              </div>
              {errors.phone && <p className="field__error">{errors.phone.message}</p>}
            </div>

            <button
              type="submit"
              aria-busy={loading || undefined}
              className={`btn btn--primary btn--lg btn--block mt-2${loading ? " pointer-events-none" : ""}`}
            >
              {loading ? (
                <>
                  <Icon name="progress_activity" size="none" className="animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar mi reseña"
              )}
            </button>

            {status === "error" && (
              <p className="field__error text-center" role="alert">
                Hubo un error al enviar tu reseña. Intenta de nuevo.
              </p>
            )}

            <p className="t-micro">
              Al enviar aceptas nuestra{" "}
              <Link href="/privacidad" className="link">política de privacidad</Link>.
            </p>
          </form>
        </>
      )}
    </>
  );
}
