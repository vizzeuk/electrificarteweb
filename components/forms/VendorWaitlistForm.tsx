"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Icon } from "@/components/ui/Icon";
import { REGIONES, comunasDeRegion } from "@/lib/regiones-chile";

/**
 * Waitlist de vendedores (`/vendedores/unirme`). La red de vendedores está en standby:
 * quien vende autos electrificados deja sus datos y lo llamamos cuando esté funcionando.
 * POST a `/api/waitlist-vendedores`, que reenvía a n8n. Teléfono con el mismo patrón que
 * la waitlist de compradores (`components/waitlist/WaitlistModal.tsx`).
 */

const schema = z.object({
  firstName: z.string().trim().min(2, "Ingresa tu nombre"),
  lastName: z.string().trim().min(2, "Ingresa tu apellido"),
  email: z.string().trim().email("Ingresa un email válido"),
  phone: z.string().regex(/^9\d{8}$/, "Ingresa los 9 dígitos (ej: 912345678)"),
  puntoVenta: z.string().trim().min(2, "Cuéntanos dónde vendes"),
  marcas: z.string().trim().min(2, "Indica al menos una marca"),
  region: z.string().optional(),
  comuna: z.string().optional(),
  mensaje: z.string().max(1000, "Máximo 1.000 caracteres").optional(),
});

type FormValues = z.infer<typeof schema>;

function Chevron() {
  return (
    <Icon
      name="expand_more"
      size="none"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
    />
  );
}

export function VendorWaitlistForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const submitting = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { region: "", comuna: "" },
  });

  const region = watch("region");
  const comunas = comunasDeRegion(region);

  async function onSubmit(data: FormValues) {
    if (submitting.current) return;
    submitting.current = true;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist-vendedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim(),
          phone: `+56 ${data.phone}`,
          puntoVenta: data.puntoVenta.trim(),
          marcas: data.marcas,
          region: data.region?.trim() || null,
          comuna: data.comuna?.trim() || null,
          mensaje: data.mensaje?.trim() || null,
          source: "vendedores-unirme",
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    } finally {
      submitting.current = false;
    }
  }

  if (status === "success") {
    return (
      <div role="status">
        <Icon name="check_circle" className="text-[32px] text-link" />
        <h2 className="t-h3 mt-4">Listo, ya tenemos tus datos</h2>
        <p className="t-body mt-2 text-ink-2">
          Te llamaremos cuando la red de vendedores oficiales esté funcionando. Si quieres contarnos algo más,
          escríbenos a{" "}
          <a href="mailto:vendedores@electrificarte.com" className="link">
            vendedores@electrificarte.com
          </a>
          .
        </p>
        <Link href="/vendedores" className="btn btn--secondary mt-6">
          Volver a cómo va a funcionar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5" aria-label="Deja tus datos como vendedor">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="vw-first" className="field__label">Nombre</label>
          <input id="vw-first" {...register("firstName")} type="text" autoComplete="given-name" placeholder="Juan" className="input" aria-invalid={!!errors.firstName} />
          {errors.firstName && <p className="field__error">{errors.firstName.message}</p>}
        </div>
        <div className="field">
          <label htmlFor="vw-last" className="field__label">Apellido</label>
          <input id="vw-last" {...register("lastName")} type="text" autoComplete="family-name" placeholder="Pérez" className="input" aria-invalid={!!errors.lastName} />
          {errors.lastName && <p className="field__error">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="vw-email" className="field__label">Email</label>
        <input id="vw-email" {...register("email")} type="email" autoComplete="email" placeholder="juan@ejemplo.com" className="input" aria-invalid={!!errors.email} />
        {errors.email && <p className="field__error">{errors.email.message}</p>}
      </div>

      <div className="field">
        <label htmlFor="vw-phone" className="field__label">Número de WhatsApp</label>
        <div className="input-group">
          <span className="input-group__prefix">+56</span>
          <input
            id="vw-phone"
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
        <label htmlFor="vw-pv" className="field__label">Punto de venta</label>
        <input id="vw-pv" {...register("puntoVenta")} type="text" autoComplete="organization" placeholder="Ej: sucursal Vitacura" className="input" aria-invalid={!!errors.puntoVenta} />
        {errors.puntoVenta && <p className="field__error">{errors.puntoVenta.message}</p>}
      </div>

      <div className="field">
        <label htmlFor="vw-marcas" className="field__label">Marcas que vendes</label>
        <input id="vw-marcas" {...register("marcas")} type="text" placeholder="Ej: BYD, MG, Chery" className="input" aria-invalid={!!errors.marcas} aria-describedby="vw-marcas-help" />
        <p id="vw-marcas-help" className="t-micro">Sepáralas con comas.</p>
        {errors.marcas && <p className="field__error">{errors.marcas.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="vw-region" className="field__label">
            Región <span className="opt">(opcional)</span>
          </label>
          <div className="relative">
            <select
              id="vw-region"
              {...register("region", { onChange: () => setValue("comuna", "") })}
              className={`input cursor-pointer appearance-none pr-10 ${!region ? "text-ink-3" : ""}`}
            >
              <option value="">Elige una región</option>
              {REGIONES.map((r) => (
                <option key={r.region} value={r.region}>
                  {r.region}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>
        <div className="field">
          <label htmlFor="vw-comuna" className="field__label">
            Comuna <span className="opt">(opcional)</span>
          </label>
          <div className="relative">
            <select
              id="vw-comuna"
              {...register("comuna")}
              disabled={!region}
              className={`input appearance-none pr-10 ${!watch("comuna") ? "text-ink-3" : ""} ${!region ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              <option value="">{region ? "Elige una comuna" : "Primero la región"}</option>
              {comunas.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="vw-msg" className="field__label">
          Mensaje <span className="opt">(opcional)</span>
        </label>
        <textarea
          id="vw-msg"
          {...register("mensaje")}
          rows={4}
          placeholder="¿Algo que quieras contarnos?"
          className="input h-auto min-h-28 resize-y py-3 leading-normal"
          aria-invalid={!!errors.mensaje}
        />
        {errors.mensaje && <p className="field__error">{errors.mensaje.message}</p>}
      </div>

      <div className="mt-1 grid gap-4">
        <button type="submit" disabled={status === "loading"} className="btn btn--primary btn--lg btn--block">
          {status === "loading" ? (
            <>
              <Icon name="progress_activity" size="none" className="animate-spin" />
              Enviando…
            </>
          ) : (
            "Quiero que me llamen"
          )}
        </button>

        {status === "error" && (
          <p className="field__error" role="alert">
            No pudimos guardar tus datos. Intenta de nuevo en unos minutos.
          </p>
        )}

        <p className="t-micro">
          Al enviar aceptas nuestra{" "}
          <Link href="/privacidad" className="link">
            política de privacidad
          </Link>
          . No adquieres ningún compromiso.
        </p>
      </div>
    </form>
  );
}
