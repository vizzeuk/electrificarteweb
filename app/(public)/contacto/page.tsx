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
            Déjanos tu mensaje y te contactamos en menos de 24 horas.
          </p>
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
