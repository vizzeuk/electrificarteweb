"use client";

import { useState } from "react";
import Link from "next/link";
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

// Ícono de WhatsApp en el color del texto (excepción registrada en la guía de marca).
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const CANALES = [
  {
    href: "mailto:contacto@electrificarte.com",
    label: "Email",
    value: "contacto@electrificarte.com",
    icon: <Icon name="mail" className="text-[20px]" />,
    external: false,
  },
  {
    href: "tel:+56932099250",
    label: "Teléfono",
    value: "+56 9 3209 9250",
    icon: <Icon name="call" className="text-[20px]" />,
    external: false,
  },
  {
    href: "https://wa.me/56932099250",
    label: "WhatsApp",
    value: "Escríbenos directo",
    icon: <WhatsAppIcon />,
    external: true,
  },
];

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
    <div className="page">
      {/* Encabezado claro: texto y canales directos a la izquierda, formulario a la derecha. */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Contacto</span>
          </nav>

          <div className="page-head__grid page-head__grid--top">
            <div>
              <h1 className="t-h1">
                ¿Tienes dudas? <span className="tone">Hablemos.</span>
              </h1>
              <p className="t-lead">Déjanos tu mensaje y te contactamos en 48 a 96 horas.</p>

              <ul className="mt-10 border-t border-line" aria-label="Canales de contacto directo">
                {CANALES.map((c) => (
                  <li key={c.label} className="border-b border-line">
                    <a
                      href={c.href}
                      {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group flex items-center gap-4 py-4"
                    >
                      <span className="flex w-6 flex-none justify-center text-link">{c.icon}</span>
                      <span className="min-w-0">
                        <span className="t-label block">{c.label}</span>
                        <span className="block truncate font-semibold text-ink transition-colors group-hover:text-link">
                          {c.value}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-card border border-line p-6 md:p-8">
              {status === "success" ? (
                <div role="status">
                  <Icon name="check_circle" className="text-[32px] text-link" />
                  <h2 className="t-h3 mt-4">¡Mensaje enviado!</h2>
                  <p className="t-body mt-2">
                    Recibimos tu consulta. Nos pondremos en contacto contigo pronto.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatus("idle")}
                    className="btn btn--secondary mt-6"
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5" noValidate>
                  <div className="field">
                    <label htmlFor="ct-name" className="field__label">Nombre completo</label>
                    <input
                      id="ct-name"
                      {...register("name")}
                      type="text"
                      autoComplete="name"
                      placeholder="Tu nombre"
                      className="input"
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && <p className="field__error">{errors.name.message}</p>}
                  </div>

                  <div className="field">
                    <label htmlFor="ct-email" className="field__label">Email</label>
                    <input
                      id="ct-email"
                      {...register("email")}
                      type="email"
                      autoComplete="email"
                      placeholder="tu@email.com"
                      className="input"
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && <p className="field__error">{errors.email.message}</p>}
                  </div>

                  <div className="field">
                    <label htmlFor="ct-phone" className="field__label">
                      Teléfono <span className="opt">(opcional)</span>
                    </label>
                    <input
                      id="ct-phone"
                      {...register("phone")}
                      type="tel"
                      autoComplete="tel"
                      placeholder="+56 9 1234 5678"
                      className="input"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="ct-message" className="field__label">Mensaje</label>
                    <textarea
                      id="ct-message"
                      {...register("message")}
                      rows={5}
                      placeholder="¿En qué podemos ayudarte?"
                      className="input h-auto min-h-36 resize-y py-3 leading-normal"
                      aria-invalid={!!errors.message}
                    />
                    {errors.message && <p className="field__error">{errors.message.message}</p>}
                  </div>

                  <div className="mt-1 grid gap-4">
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="btn btn--primary btn--lg btn--block"
                    >
                      {status === "loading" ? (
                        <>
                          <Icon name="progress_activity" size="none" className="animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          Enviar mensaje
                          <Icon name="send" size="none" />
                        </>
                      )}
                    </button>

                    {status === "error" && (
                      <p className="field__error" role="alert">
                        Hubo un error al enviar tu mensaje. Por favor intenta de nuevo.
                      </p>
                    )}

                    <p className="t-micro">Tu información es privada y no será compartida con terceros.</p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
