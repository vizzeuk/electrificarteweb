"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Icon } from "@/components/ui/Icon";

const schema = z.object({
  name:    z.string().min(2,  "Ingresa tu nombre"),
  email:   z.string().email("Ingresa un email válido"),
  phone:   z.string().optional(),
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export default function ContactoPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-black pt-32 pb-20 px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">
            Contacto
          </p>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-white mb-4">
            ¿Tienes dudas?{" "}
            <span className="text-primary">Hablemos.</span>
          </h1>
          <p className="text-white/50 text-lg">
            Déjanos tu mensaje y te contactamos en 48 a 96 horas.
          </p>
        </div>
      </section>

      {/* Datos de contacto directo */}
      <section className="border-b border-gray-100 bg-white py-10 px-4 md:px-8">
        <div className="max-w-3xl mx-auto grid gap-4 sm:grid-cols-3">
          <a
            href="mailto:contacto@electrificarte.com"
            className="group flex items-center gap-3 rounded-2xl border border-gray-100 p-4 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary-deep flex items-center justify-center flex-shrink-0">
              <Icon name="mail" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-widest font-bold text-text-ghost">Email</span>
              <span className="block text-sm font-semibold text-text-main truncate group-hover:text-primary-deep transition-colors">contacto@electrificarte.com</span>
            </span>
          </a>

          <a
            href="tel:+56932099250"
            className="group flex items-center gap-3 rounded-2xl border border-gray-100 p-4 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary-deep flex items-center justify-center flex-shrink-0">
              <Icon name="call" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-widest font-bold text-text-ghost">Teléfono</span>
              <span className="block text-sm font-semibold text-text-main group-hover:text-primary-deep transition-colors">+56 9 3209 9250</span>
            </span>
          </a>

          <a
            href="https://wa.me/56932099250"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-2xl border border-gray-100 p-4 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary-deep flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-widest font-bold text-text-ghost">WhatsApp</span>
              <span className="block text-sm font-semibold text-text-main group-hover:text-primary-deep transition-colors">Escríbenos directo</span>
            </span>
          </a>
        </div>
      </section>

      {/* Form */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">

          {status === "success" ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="check_circle" className="text-primary" size="lg" />
              </div>
              <h2 className="text-2xl font-headline font-bold text-text-main mb-3">
                ¡Mensaje enviado!
              </h2>
              <p className="text-text-muted">
                Recibimos tu consulta. Nos pondremos en contacto contigo pronto.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-8 text-primary font-semibold text-sm hover:underline"
              >
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("name")}
                  type="text"
                  placeholder="Tu nombre"
                  className={`w-full border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                    errors.name ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
                  }`}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="tu@email.com"
                  className={`w-full border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                    errors.email ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
                  }`}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
                )}
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Teléfono <span className="text-text-muted font-normal">(opcional)</span>
                </label>
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Mensaje <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register("message")}
                  rows={5}
                  placeholder="¿En qué podemos ayudarte?"
                  className={`w-full border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-none ${
                    errors.message ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
                  }`}
                />
                {errors.message && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.message.message}</p>
                )}
              </div>

              {status === "error" && (
                <p className="text-red-500 text-sm text-center">
                  Hubo un error al enviar tu mensaje. Por favor intenta de nuevo.
                </p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-black font-bold py-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar mensaje
                    <Icon name="send" size="sm" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-text-muted">
                Tu información es privada y no será compartida con terceros.
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
