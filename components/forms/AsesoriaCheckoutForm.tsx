"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { m } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

const schema = z.object({
  fullName: z.string().min(2, "Ingresa tu nombre completo"),
  email:    z.string().email("Ingresa un email válido"),
  phone:    z.string().regex(/^9\d{8}$/, "Ingresa los 9 dígitos (ej: 995760998)"),
});

type FormValues = z.infer<typeof schema>;

const INPUT_CLS = "w-full bg-gray-100 rounded-lg py-3 px-4 text-sm text-text-main placeholder-text-ghost focus:outline-none focus:ring-2 focus:ring-amber/30 transition-all";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5 px-1">
      {children}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

export function AsesoriaCheckoutForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

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
    } catch {
      setStatus("error");
    }
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-6 md:p-10 space-y-8"
    >
      <div>
        <h2 className="text-2xl md:text-3xl font-headline font-bold text-text-main mb-1">
          Contrata tu asesoría
        </h2>
        <p className="text-text-muted text-sm">
          Con estos datos activamos tu pago y Francisco IA te escribe por WhatsApp al instante.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <FieldLabel required>Nombre completo</FieldLabel>
          <input {...register("fullName")} type="text" autoComplete="name" placeholder="Juan Pérez" className={INPUT_CLS} />
          {errors.fullName && <p className="text-red-500 text-xs mt-1 px-1">{errors.fullName.message}</p>}
        </div>

        <div>
          <FieldLabel required>Email</FieldLabel>
          <input {...register("email")} type="email" autoComplete="email" placeholder="juan@ejemplo.com" className={INPUT_CLS} />
          {errors.email && <p className="text-red-500 text-xs mt-1 px-1">{errors.email.message}</p>}
        </div>

        <div>
          <FieldLabel required>Número de WhatsApp</FieldLabel>
          <div className="flex">
            <span className="flex-shrink-0 flex items-center bg-gray-200 text-text-muted text-sm font-semibold px-3 rounded-l-lg border-r border-gray-300 select-none">
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
          {errors.phone && <p className="text-red-500 text-xs mt-1 px-1">{errors.phone.message}</p>}
          <p className="text-[11px] text-text-ghost mt-1.5 px-1">
            Francisco IA te escribirá a este mismo número por WhatsApp.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-amber hover:bg-amber-dark text-black font-headline font-bold py-5 rounded-full text-lg shadow-lg hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {status === "loading" ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                Procesando...
              </>
            ) : (
              <>
                Pagar $4.990 y activar mi asesoría
                <Icon name="arrow_forward" size="sm" />
              </>
            )}
          </button>

          {status === "error" && (
            <p className="text-center text-red-500 text-sm mt-3">
              Hubo un error al procesar tu pago. Intenta de nuevo.
            </p>
          )}

          <p className="text-center text-[10px] text-text-muted mt-4 uppercase tracking-wider">
            Al hacer clic, aceptas nuestros términos de servicio y política de privacidad.
          </p>
        </div>
      </form>
    </m.div>
  );
}
