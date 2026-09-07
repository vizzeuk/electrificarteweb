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
 * Modal de la waitlist. Cáscara y línea visual tomadas de `PromoPopup.tsx`
 * (overlay oscuro, borde white/10, glow cyan) para no salirse del diseño.
 */

const schema = z.object({
  fullName: z.string().min(2, "Ingresa tu nombre completo"),
  email: z.string().email("Ingresa un email válido"),
  phone: z.string().regex(/^9\d{8}$/, "Ingresa los 9 dígitos (ej: 995760998)"),
  model: z.string().optional(),
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
    reset({ fullName: "", email: "", phone: "", model: prefill.model ?? "" });
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
          fullName: data.fullName,
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-6"
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
            className="relative my-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8),0_0_80px_rgba(0,229,229,0.08)]"
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
                  <h2 className="mb-2 font-headline text-2xl font-bold text-white">Ya estás en la lista</h2>
                  <p className="text-sm leading-relaxed text-white/60">
                    Te avisaremos apenas tengamos la mejor oferta para tu auto. Mientras tanto, puedes
                    seguir explorando el catálogo.
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
                    Waitlist
                  </p>
                  <h2 id="waitlist-title" className="mb-2 font-headline text-2xl font-bold leading-tight text-white">
                    Únete a la waitlist de electrificarte.com
                  </h2>
                  <p className="mb-6 text-sm leading-relaxed text-white/60">
                    Y consigue la mejor oferta en autos electrificados. Te avisamos apenas la tengamos.
                  </p>

                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                    <div>
                      <FieldLabel required>Nombre completo</FieldLabel>
                      <input {...register("fullName")} type="text" autoComplete="name" placeholder="Juan Pérez" className={INPUT_CLS} />
                      {errors.fullName && <p className="mt-1 px-1 text-xs text-red-400">{errors.fullName.message}</p>}
                    </div>

                    <div>
                      <FieldLabel required>Email</FieldLabel>
                      <input {...register("email")} type="email" autoComplete="email" placeholder="juan@ejemplo.com" className={INPUT_CLS} />
                      {errors.email && <p className="mt-1 px-1 text-xs text-red-400">{errors.email.message}</p>}
                    </div>

                    <div>
                      <FieldLabel required>Número de WhatsApp</FieldLabel>
                      <div className="flex">
                        <span className="flex flex-shrink-0 select-none items-center rounded-l-lg border border-r-0 border-white/10 bg-white/10 px-3 text-sm font-semibold text-white/60">
                          +56
                        </span>
                        <input
                          {...register("phone")}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="995760998"
                          maxLength={9}
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

                    <div>
                      <FieldLabel>Auto que te interesa <span className="font-normal normal-case tracking-normal text-white/30">(opcional)</span></FieldLabel>
                      <input {...register("model")} type="text" placeholder="Ej: BYD Dolphin" className={INPUT_CLS} />
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
                        "Unirme a la waitlist"
                      )}
                    </button>

                    {status === "error" && (
                      <p className="text-center text-sm text-red-400">
                        Hubo un error al registrarte. Intenta de nuevo.
                      </p>
                    )}

                    <p className="!mt-4 text-center text-[10px] uppercase tracking-wider text-white/35">
                      Al unirte aceptas nuestra{" "}
                      <Link href="/privacidad" className="underline transition-colors hover:text-primary">
                        política de privacidad
                      </Link>
                      .
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
