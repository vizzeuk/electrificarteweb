"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ASESORIA_PRICE } from "@/lib/products";

const schema = z.object({
  fullName: z.string().min(2, "Ingresa tu nombre completo"),
  email:    z.string().email("Ingresa un email válido"),
  phone:    z.string().regex(/^9\d{8}$/, "Ingresa los 9 dígitos (ej: 995760998)"),
});

type FormValues = z.infer<typeof schema>;

export function AsesoriaCheckoutForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  // Guard SÍNCRONO contra doble envío. `status` no alcanza: setState es asíncrono, así que
  // un doble-tap rápido (habitual en móvil) puede entrar dos veces a onSubmit antes de que
  // React deshabilite el botón — y cada entrada crea un cobro nuevo en Reveniu.
  const submitting = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  async function onSubmit(data: FormValues) {
    if (submitting.current) return;
    submitting.current = true;
    setStatus("loading");
    try {
      const payload = {
        fullName: data.fullName,
        email:    data.email,
        phone:    `+56 ${data.phone}`,
        type:     "advisory",
        source:   "electrificarte-web",
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      const { completionUrl, securityToken } = await res.json();

      // Redirección POST a la pasarela (requiere TBK_TOKEN por POST), mismo
      // patrón que el formulario de la Oferta Exclusiva ($19.990).
      const form = document.createElement("form");
      form.method = "POST";
      form.action = completionUrl;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "TBK_TOKEN";
      input.value = securityToken;
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      // No se libera el guard: el navegador ya está navegando a la pasarela. Liberarlo acá
      // permitiría un segundo cobro si el submit tarda en navegar.
    } catch {
      submitting.current = false; // falló antes de navegar — puede reintentar
      setStatus("error");
    }
  }

  return (
    <div className="rounded-card border border-line p-6 md:p-10">
      <h2 className="t-h3">Contrata tu asesoría</h2>
      <p className="t-body mt-2">
        Con estos datos activamos tu pago y Francisco IA te escribe por WhatsApp al instante.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 grid gap-5">
        <div className="field">
          <label htmlFor="ac-name" className="field__label">Nombre completo</label>
          <input
            id="ac-name"
            {...register("fullName")}
            type="text"
            autoComplete="name"
            placeholder="Juan Pérez"
            className="input"
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && <p className="field__error">{errors.fullName.message}</p>}
        </div>

        <div className="field">
          <label htmlFor="ac-email" className="field__label">Email</label>
          <input
            id="ac-email"
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="juan@ejemplo.com"
            className="input"
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="field__error">{errors.email.message}</p>}
        </div>

        <div className="field">
          <label htmlFor="ac-phone" className="field__label">Número de WhatsApp</label>
          <div className="input-group">
            <span className="input-group__prefix select-none">+56</span>
            <input
              id="ac-phone"
              {...register("phone")}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="995760998"
              maxLength={9}
              aria-invalid={!!errors.phone}
              aria-describedby="ac-phone-hint"
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
          <p id="ac-phone-hint" className="t-micro">
            Francisco IA te escribirá a este mismo número por WhatsApp.
          </p>
        </div>

        <div className="mt-3 grid gap-4">
          <button type="submit" disabled={status === "loading"} className="btn btn--primary btn--lg btn--block">
            {status === "loading" ? (
              <>
                <Icon name="progress_activity" size="none" className="animate-spin" />
                Procesando...
              </>
            ) : (
              <>Pagar {ASESORIA_PRICE} y activar mi asesoría</>
            )}
          </button>

          {status === "error" && (
            <p className="field__error" role="alert">
              Hubo un error al procesar tu pago. Intenta de nuevo.
            </p>
          )}

          <p className="t-micro">
            Al hacer clic, aceptas nuestros{" "}
            <Link href="/terminos" className="link">términos de servicio</Link> y{" "}
            <Link href="/privacidad" className="link">política de privacidad</Link>.
          </p>
        </div>
      </form>
    </div>
  );
}
