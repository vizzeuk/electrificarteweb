"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { WaitlistPrefill } from "./WaitlistProvider";

/**
 * Modal de la waitlist, sistema de diseño v1: card clara con radio 12 y sombra de
 * overlay sobre el velo de modal. Sin glow ni orbes. Campos de 48 px con foco sólido.
 */

const schema = z.object({
  firstName: z.string().min(2, "Ingresa tu nombre"),
  lastName: z.string().min(2, "Ingresa tu apellido"),
  email: z.string().email("Ingresa un email válido"),
  phone: z.string().regex(/^9\d{8}$/, "Ingresa los 9 dígitos (ej: 995760998)"),
  model: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="field__label">
      {children}
    </label>
  );
}

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefill: WaitlistPrefill;
}

export function WaitlistModal({ isOpen, onClose, prefill }: WaitlistModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const submitting = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onTouched" });

  // Al abrir: limpia el estado anterior y precarga el modelo si vino de una PDP/card.
  useEffect(() => {
    if (!isOpen) return;
    setStatus("idle");
    submitting.current = false;
    reset({ firstName: "", lastName: "", email: "", phone: "", model: prefill.model ?? "" });
  }, [isOpen, prefill.model, reset]);

  // Cerrar con Escape + bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  async function onSubmit(data: FormValues) {
    if (submitting.current) return;
    submitting.current = true;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: `+56 ${data.phone}`,
          model: data.model?.trim() || undefined,
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

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          key="waitlist-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
          style={{ background: "var(--veil-modal)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="waitlist-title"
        >
          <m.div
            key="waitlist-modal"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative my-auto w-full max-w-[500px] rounded-card bg-papel text-tinta shadow-overlay"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="btn btn--secondary btn--icon btn--sm absolute right-3 top-3 z-10"
            >
              <Icon name="close" size="none" />
            </button>

            <div className="p-6 sm:p-8">
              {status === "success" ? (
                <div>
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-control bg-glaciar text-laguna">
                    <Icon name="check" className="text-[24px]" />
                  </div>
                  <h2 className="font-display text-[1.75rem] font-bold leading-[1.08] tracking-[-0.02em]">Ya estás en la lista</h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-grafito">
                    Registramos tus datos. Te contactaremos cuando tengamos novedades. Mientras tanto,
                    puedes seguir explorando el catálogo.
                  </p>
                  <button type="button" onClick={onClose} className="btn btn--secondary btn--lg btn--block mt-6">
                    Seguir explorando
                  </button>
                </div>
              ) : (
                <>
                  <h2 id="waitlist-title" className="pr-10 font-display text-[1.75rem] font-bold leading-[1.08] tracking-[-0.02em]">
                    Únete a la waitlist de electrificarte.com
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-grafito">
                    Déjanos tus datos y te contactamos cuando abramos el acceso y tengamos novedades
                    para tu modelo.
                  </p>

                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="field">
                        <FieldLabel htmlFor="wl-first">Nombre</FieldLabel>
                        <input id="wl-first" {...register("firstName")} type="text" autoComplete="given-name" placeholder="Juan" className="input" aria-invalid={!!errors.firstName} />
                        {errors.firstName && <p className="field__error">{errors.firstName.message}</p>}
                      </div>
                      <div className="field">
                        <FieldLabel htmlFor="wl-last">Apellido</FieldLabel>
                        <input id="wl-last" {...register("lastName")} type="text" autoComplete="family-name" placeholder="Pérez" className="input" aria-invalid={!!errors.lastName} />
                        {errors.lastName && <p className="field__error">{errors.lastName.message}</p>}
                      </div>
                    </div>

                    <div className="field">
                      <FieldLabel htmlFor="wl-email">Email</FieldLabel>
                      <input id="wl-email" {...register("email")} type="email" autoComplete="email" placeholder="juan@ejemplo.com" className="input" aria-invalid={!!errors.email} />
                      {errors.email && <p className="field__error">{errors.email.message}</p>}
                    </div>

                    <div className="field">
                      <FieldLabel htmlFor="wl-phone">Número de WhatsApp</FieldLabel>
                      <div className="input-group">
                        <span className="input-group__prefix">+56</span>
                        <input
                          id="wl-phone"
                          {...register("phone")}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="912345678"
                          maxLength={9}
                          aria-invalid={!!errors.phone}
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

                    <div className="field">
                      <FieldLabel htmlFor="wl-model">
                        Modelo de interés <span className="font-medium text-piedra">(opcional)</span>
                      </FieldLabel>
                      <input id="wl-model" {...register("model")} type="text" placeholder="Ej: BYD Dolphin" className="input" />
                    </div>

                    <button type="submit" disabled={status === "loading"} className="btn btn--primary btn--lg btn--block">
                      {status === "loading" ? (
                        <>
                          <Icon name="progress_activity" size="none" className="animate-spin" />
                          Enviando…
                        </>
                      ) : (
                        "Unirme a la waitlist"
                      )}
                    </button>

                    {status === "error" && (
                      <p className="field__error">Hubo un error al registrarte. Intenta de nuevo.</p>
                    )}

                    <p className="t-micro">
                      Al registrarte aceptas nuestra{" "}
                      <Link href="/privacidad" className="link">
                        política de privacidad
                      </Link>
                      . No adquieres ningún compromiso.
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
