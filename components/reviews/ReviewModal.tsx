"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "./StarRating";
import { REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from "@/lib/reviews/config";
import type { ReviewPrefill } from "./ReviewProvider";

/**
 * Formulario de reseña. Misma línea visual que el popup de waitlist
 * (overlay oscuro, borde white/10, glow cyan) para no salirse del diseño.
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

const INPUT_CLS =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/35 transition-all focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block px-1 text-[11px] font-bold uppercase tracking-wider text-white/50">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefill: ReviewPrefill;
}

export function ReviewModal({ isOpen, onClose, prefill }: ReviewModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [rating, setRating] = useState(0);
  const submitting = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onTouched" });

  const bodyValue = watch("body") ?? "";

  useEffect(() => {
    if (!isOpen) return;
    setStatus("idle");
    const pre = prefill.rating && prefill.rating >= 1 && prefill.rating <= 5 ? prefill.rating : 0;
    setRating(pre);
    submitting.current = false;
    reset({
      rating: pre, firstName: "", lastName: "", email: "", phone: "", body: "",
      carBrand: prefill.carBrand ?? "", carModel: prefill.carModel ?? "",
      carYear: "", carColor: "", carVersion: "",
    });
  }, [isOpen, prefill.carBrand, prefill.carModel, prefill.rating, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  function pickRating(n: number) {
    setRating(n);
    setValue("rating", n, { shouldValidate: true });
  }

  async function onSubmit(data: FormValues) {
    if (submitting.current) return;
    submitting.current = true;
    setStatus("loading");
    try {
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
          carSlug: prefill.carSlug,
          carSanityId: prefill.carSanityId,
          carBrand: data.carBrand || undefined,
          carModel: data.carModel || undefined,
          carYear: Number.isFinite(year) ? year : undefined,
          carColor: data.carColor || undefined,
          carVersion: data.carVersion || undefined,
          source: prefill.source ?? "web",
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      submitting.current = false;
    }
  }

  const autoLabel = [prefill.carBrand, prefill.carModel].filter(Boolean).join(" ");

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          key="review-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-title"
        >
          <m.div
            key="review-modal"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8),0_0_80px_rgba(0,229,229,0.08)]"
          >
            <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-primary/15 blur-[90px]" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 z-10 rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon name="close" className="text-[20px]" />
            </button>

            <div className="relative p-6 sm:p-8">
              {status === "success" ? (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                    <Icon name="check_circle" className="text-[30px] text-primary" />
                  </div>
                  <h2 className="mb-2 font-headline text-2xl font-bold text-white">¡Gracias por tu reseña!</h2>
                  <p className="text-sm leading-relaxed text-white/60">
                    La revisaremos antes de publicarla. Nos ayuda muchísimo a que otros compradores
                    decidan mejor.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 w-full rounded-full bg-white/10 py-3.5 font-headline text-sm font-bold text-white transition-all hover:bg-white/15"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                    Tu experiencia
                  </p>
                  <h2 id="review-title" className="mb-2 font-headline text-2xl font-bold leading-tight text-white">
                    {autoLabel ? `¿Cómo ha sido tu ${autoLabel}?` : "Cuéntanos sobre tu auto"}
                  </h2>
                  <p className="mb-6 text-sm leading-relaxed text-white/60">
                    Tu reseña ayuda a otros compradores a decidir. La revisamos antes de publicarla.
                  </p>

                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                    {/* Estrellas */}
                    <div>
                      <FieldLabel required>Tu calificación</FieldLabel>
                      <div className="flex items-center gap-3 px-1">
                        <StarRating value={rating} onChange={pickRating} size={30} />
                        {rating > 0 && <span className="text-sm font-semibold text-white/60">{rating}/5</span>}
                      </div>
                      <input type="hidden" {...register("rating", { valueAsNumber: true })} />
                      {errors.rating && <p className="mt-1 px-1 text-xs text-red-400">{errors.rating.message}</p>}
                    </div>

                    {/* Reseña */}
                    <div>
                      <FieldLabel required>Tu reseña</FieldLabel>
                      <textarea
                        {...register("body")}
                        rows={4}
                        placeholder="¿Cómo ha sido la experiencia? Autonomía real, carga, manejo, lo bueno y lo malo…"
                        className={`${INPUT_CLS} resize-none`}
                      />
                      <div className="mt-1 flex items-center justify-between px-1">
                        {errors.body ? (
                          <p className="text-xs text-red-400">{errors.body.message}</p>
                        ) : <span />}
                        <span className="text-[11px] text-white/30">{bodyValue.length}/{REVIEW_MAX_CHARS}</span>
                      </div>
                    </div>

                    {/* Datos del auto — se precargan desde la PDP */}
                    {!prefill.carSlug && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FieldLabel>Marca</FieldLabel>
                          <input {...register("carBrand")} placeholder="BYD" className={INPUT_CLS} />
                        </div>
                        <div>
                          <FieldLabel>Modelo</FieldLabel>
                          <input {...register("carModel")} placeholder="Dolphin" className={INPUT_CLS} />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <FieldLabel>Año</FieldLabel>
                        <input {...register("carYear")} inputMode="numeric" maxLength={4} placeholder="2025" className={INPUT_CLS} />
                      </div>
                      <div>
                        <FieldLabel>Color</FieldLabel>
                        <input {...register("carColor")} placeholder="Blanco" className={INPUT_CLS} />
                      </div>
                      <div>
                        <FieldLabel>Versión</FieldLabel>
                        <input {...register("carVersion")} placeholder="GS" className={INPUT_CLS} />
                      </div>
                    </div>

                    {/* Persona */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel required>Nombre</FieldLabel>
                        <input {...register("firstName")} autoComplete="given-name" placeholder="Juan" className={INPUT_CLS} />
                        {errors.firstName && <p className="mt-1 px-1 text-xs text-red-400">{errors.firstName.message}</p>}
                      </div>
                      <div>
                        <FieldLabel required>Apellido</FieldLabel>
                        <input {...register("lastName")} autoComplete="family-name" placeholder="Pérez" className={INPUT_CLS} />
                        {errors.lastName && <p className="mt-1 px-1 text-xs text-red-400">{errors.lastName.message}</p>}
                      </div>
                    </div>
                    <p className="-mt-1 px-1 text-[11px] text-white/35">
                      Publicamos solo tu nombre y la inicial del apellido (ej. &ldquo;Juan P.&rdquo;).
                    </p>

                    <div>
                      <FieldLabel required>Email</FieldLabel>
                      <input {...register("email")} type="email" autoComplete="email" placeholder="juan@ejemplo.com" className={INPUT_CLS} />
                      {errors.email && <p className="mt-1 px-1 text-xs text-red-400">{errors.email.message}</p>}
                    </div>

                    <div>
                      <FieldLabel>WhatsApp <span className="font-normal normal-case tracking-normal text-white/30">(opcional)</span></FieldLabel>
                      <div className="flex">
                        <span className="flex flex-shrink-0 select-none items-center rounded-l-lg border border-r-0 border-white/10 bg-white/10 px-3 text-sm font-semibold text-white/60">+56</span>
                        <input
                          {...register("phone")}
                          type="tel"
                          inputMode="numeric"
                          maxLength={9}
                          placeholder="995760998"
                          onInput={(e) => {
                            let v = e.currentTarget.value.replace(/\D/g, "");
                            if (v.length > 9 && v.startsWith("56")) v = v.slice(2);
                            v = v.slice(0, 9);
                            e.currentTarget.value = v;
                            setValue("phone", v, { shouldValidate: true });
                          }}
                          className={`${INPUT_CLS} rounded-l-none`}
                        />
                      </div>
                      {errors.phone && <p className="mt-1 px-1 text-xs text-red-400">{errors.phone.message}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="!mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-primary py-4 font-headline text-base font-bold text-black shadow-lg transition-all hover:shadow-[0_0_25px_rgba(0,229,229,0.3)] active:scale-[0.98] disabled:opacity-60"
                    >
                      {status === "loading" ? (
                        <>
                          <Icon name="progress_activity" className="animate-spin text-[20px]" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar mi reseña"
                      )}
                    </button>

                    {status === "error" && (
                      <p className="text-center text-sm text-red-400">
                        Hubo un error al enviar tu reseña. Intenta de nuevo.
                      </p>
                    )}

                    <p className="!mt-4 text-center text-[10px] uppercase tracking-wider text-white/35">
                      Al enviar aceptas nuestra{" "}
                      <Link href="/privacidad" className="underline transition-colors hover:text-primary">política de privacidad</Link>.
                    </p>
                  </form>
                </>
              )}
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
