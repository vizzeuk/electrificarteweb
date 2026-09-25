"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { REGIONES, comunasDeRegion } from "@/lib/regiones-chile";

// ─── RUT validator ────────────────────────────────────────────────────────────
function validateRut(raw: string): boolean {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1);
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (sum % 11);
  const expected = r === 11 ? "0" : r === 10 ? "K" : String(r);
  return dv === expected;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  fullName:       z.string().min(2, "Ingresa tu nombre completo"),
  email:          z.string().email("Ingresa un email válido"),
  phone:          z.string().regex(/^9\d{8}$/, "Ingresa los 9 dígitos (ej: 995760998)"),
  rut:            z.string().refine(validateRut, "RUT inválido"),
  region:         z.string().min(1, "Selecciona tu región"),
  comuna:         z.string().min(1, "Selecciona tu comuna"),
  carSearch:      z.string().min(1, "Selecciona el auto que buscas"),
  paymentMethod:  z.enum(["contado", "credito-convencional", "credito-inteligente", "no-seguro"], {
    error: "Selecciona una forma de pago",
  }),
  tradeIn:        z.enum(["si", "no"], { error: "Indica si tienes un auto en parte de pago" }),
  // Trade-in fields (optional, validated conditionally in onSubmit)
  tradeInBrand:       z.string().optional(),
  tradeInModel:       z.string().optional(),
  tradeInYear:        z.string().optional(),
  tradeInOwners:      z.enum(["unico", "2", "3-mas"]).optional(),
  tradeInKm:          z.string().optional(),
  tradeInMaintenance: z.enum(["todas-marca", "no-todas"]).optional(),
  tradeInDebt:        z.enum(["si", "no"]).optional(),
  tradeInPlate:       z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Field label ─────────────────────────────────────────────────────────────
// Sistema v1: campos .field > .field__label + .input (app/styles/brand.css). Sin
// asteriscos: lo opcional se marca con "(opcional)", lo demás es obligatorio.
function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="field__label">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="field__error">{message}</p> : null;
}

// Chevron para los <select> (estilizados con appearance-none).
function ChevronDown() {
  return (
    <svg
      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-3"
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// ─── Radio pill group ─────────────────────────────────────────────────────────
const COL_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};
const SM_COL_CLASS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

function RadioPills<T extends string>({
  options,
  value,
  onChange,
  cols = 2,
  mobileCols,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
  cols?: number;
  mobileCols?: number;
}) {
  const mc = mobileCols ?? cols;
  const colsClass = `${COL_CLASS[mc] ?? "grid-cols-2"} ${SM_COL_CLASS[cols] ?? "sm:grid-cols-2"}`;
  return (
    <div className={`grid gap-2 ${colsClass}`}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className="pill h-auto min-h-12 justify-center whitespace-normal py-2 text-center"
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Searchable car dropdown ──────────────────────────────────────────────────
function CarCombobox({
  options,
  value,
  onChange,
  error,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [query, setQuery]   = useState(value);
  const [open, setOpen]     = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);

  // Sync display text when external setValue() changes the field value
  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  const filtered = query.length === 0
    ? options.slice(0, 40)
    : options.filter((o) => o.toLowerCase().includes(query.toLowerCase())).slice(0, 40);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(opt: string) {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(""); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Busca por marca o modelo..."
          aria-label="Auto que buscas"
          aria-invalid={!!error}
          className="input pr-10"
        />
        <Icon name={open ? "expand_less" : "search"} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-ink-3" />
      </div>

      <AnimatePresence>
        {open && filtered.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-card border border-line bg-canvas shadow-overlay"
          >
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(opt)}
                  className={[
                    "w-full px-4 py-2.5 text-left text-[0.9375rem] transition-colors hover:bg-canvas-2",
                    value === opt ? "font-semibold text-link" : "text-ink",
                  ].join(" ")}
                >
                  {opt}
                </button>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {error && <p className="field__error mt-1.5">{error}</p>}
    </div>
  );
}

// ─── Photo uploader ───────────────────────────────────────────────────────────
// Downscales to max 1280px wide and re-encodes as JPEG q0.7 before base64.
// A 6 MB phone photo lands around ~200-300 KB — without this a 10-photo
// trade-in could push a 60-100 MB payload through the webhook and break
// the submit. createImageBitmap with imageOrientation:"from-image" applies
// EXIF rotation so portrait shots don't come out sideways. If anything
// fails it falls back to the raw file so the user never loses a photo.
async function compressImage(file: File): Promise<string> {
  const MAX_W = 1280;
  const QUALITY = 0.7;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale  = Math.min(1, MAX_W / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", QUALITY);
  } catch {
    return new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload  = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }
}

function PhotoUploader({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setProcessing(true);
    try {
      const compressed = await Promise.all(Array.from(files).map(compressImage));
      onChange([...photos, ...compressed].slice(0, 10)); // max 10
    } finally {
      setProcessing(false);
    }
  }

  function remove(idx: number) {
    onChange(photos.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {/* Grid preview */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.map((src, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-control bg-canvas-2">
              <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
              {/* Botón macizo sobre la foto (siempre visible: en móvil no hay hover). */}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Quitar foto ${i + 1}`}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 cursor-pointer place-items-center rounded-control bg-papel text-tinta transition-colors hover:bg-niebla"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={processing}
        className={[
          "flex w-full flex-col items-center gap-1.5 rounded-card border border-dashed border-line-2 py-5 transition-colors",
          processing ? "cursor-wait text-ink-3" : "cursor-pointer hover:border-ink",
        ].join(" ")}
      >
        <Icon name={processing ? "hourglass_top" : "add_photo_alternate"} className="text-[28px] text-ink-3" />
        <span className="text-[0.9375rem] font-semibold text-ink">
          {processing
            ? "Procesando fotos…"
            : photos.length === 0 ? "Sube fotos de tu auto" : "Agregar más fotos"}
        </span>
        <span className="t-micro">
          {photos.length < 4
            ? `Mínimo 4 fotos: ${photos.length} de 4`
            : `${photos.length} foto${photos.length !== 1 ? "s" : ""} agregada${photos.length !== 1 ? "s" : ""}`}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
// Subtítulo de bloque (Switzer 600) con hairline. Sin ícono en cuadrado de color.
function SectionHeading({ title }: { title: string }) {
  return <h3 className="t-h4 mb-5 border-b border-line pb-3">{title}</h3>;
}

// ─── Main component ───────────────────────────────────────────────────────────
interface LeadFormProps {
  carOptions?: string[];
  carSlug?: string;
  carName?: string;
}

export function LeadForm({ carOptions = [], carSlug, carName }: LeadFormProps) {
  const [status, setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [photos, setPhotos]   = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");
  // Guard SÍNCRONO contra doble envío. `status` no alcanza: setState es asíncrono, así que
  // un doble-tap rápido (habitual en móvil) puede entrar dos veces a onSubmit antes de que
  // React deshabilite el botón — y cada entrada crea un cobro nuevo en Reveniu.
  const submitting = useRef(false);

  // Match carName against available options at mount time (synchronous — carOptions is from server)
  const initialCarSearch = carName
    ? (carOptions.find(o => o.toLowerCase() === carName.toLowerCase()) ?? "")
    : "";

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { tradeIn: undefined, paymentMethod: undefined, carSearch: initialCarSearch },
  });

  const tradeIn = watch("tradeIn");
  const selectedRegion = watch("region");

  async function onSubmit(data: FormValues) {
    if (submitting.current) return;
    // Validate photos if trade-in
    if (data.tradeIn === "si" && photos.length < 4) {
      setPhotoError("Sube al menos 4 fotos de tu auto");
      return;
    }
    submitting.current = true;
    setPhotoError("");
    setStatus("loading");

    try {
      const payload = {
        ...data,
        phone: `+56 ${data.phone}`,
        carSlug,
        tradeInPhotos: data.tradeIn === "si" ? photos : [],
        source: "electrificarte-web",
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      const { completionUrl, securityToken } = await res.json();

      // Redirección POST a la pasarela de Reveniu (requiere TBK_TOKEN por POST).
      // El navegador navega a Reveniu — el estado queda en "loading".
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

  // ── Success state ────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="rounded-card border border-line p-6 md:p-10" role="status">
        <Icon name="check_circle" className="text-[32px] text-link" />
        <h3 className="t-h3 mt-4">¡Solicitud enviada!</h3>
        <p className="t-body mt-2">
          Nuestro equipo te contactará en 48 a 96 horas con la mejor oferta.
        </p>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-card border border-line p-6 md:p-10">
      <h2 className="t-h3">Completa tu solicitud</h2>
      <p className="t-body mt-2">
        Toda la información se mantiene privada y solo se usa para preparar tu oferta.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 grid gap-10">

        {/* ── 1. Datos personales ──────────────────────────────────────── */}
        <div>
          <SectionHeading title="Datos personales" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div className="field">
              <FieldLabel htmlFor="lf-name">Nombre completo</FieldLabel>
              <input id="lf-name" {...register("fullName")} type="text" autoComplete="name" placeholder="Juan Pérez" className="input" aria-invalid={!!errors.fullName} />
              <FieldError message={errors.fullName?.message} />
            </div>

            <div className="field">
              <FieldLabel htmlFor="lf-email">Email</FieldLabel>
              <input id="lf-email" {...register("email")} type="email" autoComplete="email" placeholder="juan@ejemplo.com" className="input" aria-invalid={!!errors.email} />
              <FieldError message={errors.email?.message} />
            </div>

            <div className="field">
              <FieldLabel htmlFor="lf-phone">Número de teléfono</FieldLabel>
              <div className="input-group">
                <span className="input-group__prefix select-none">+56</span>
                <input
                  id="lf-phone"
                  {...register("phone")}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="995760998"
                  maxLength={9}
                  aria-invalid={!!errors.phone}
                  onInput={(e) => {
                    // RHF's onChange already fired with the raw value — override via setValue
                    let v = e.currentTarget.value.replace(/\D/g, "");
                    if (v.length > 9 && v.startsWith("56")) v = v.slice(2);
                    v = v.slice(0, 9);
                    e.currentTarget.value = v;
                    setValue("phone", v, { shouldValidate: true });
                  }}
                  className="input"
                />
              </div>
              <FieldError message={errors.phone?.message} />
            </div>

            <div className="field">
              <FieldLabel htmlFor="lf-rut">RUT (sin puntos ni guion)</FieldLabel>
              <input id="lf-rut" {...register("rut")} type="text" placeholder="Ej: 12345678K" className="input" aria-invalid={!!errors.rut} />
              <FieldError message={errors.rut?.message} />
            </div>

            <div className="field">
              <FieldLabel htmlFor="lf-region">Región</FieldLabel>
              <div className="relative">
                <select
                  id="lf-region"
                  {...register("region", {
                    // Si cambia la región, limpiamos la comuna porque la
                    // anterior probablemente ya no pertenece a la nueva región.
                    onChange: () => setValue("comuna", ""),
                  })}
                  aria-invalid={!!errors.region}
                  className={`input cursor-pointer appearance-none pr-10 ${!watch("region") ? "text-ink-3" : ""}`}
                  defaultValue=""
                >
                  <option value="" disabled>Selecciona tu región</option>
                  {REGIONES.map((r) => (
                    <option key={r.region} value={r.region} className="text-ink">
                      {r.region}
                    </option>
                  ))}
                </select>
                <ChevronDown />
              </div>
              <FieldError message={errors.region?.message} />
            </div>

            <div className="field">
              <FieldLabel htmlFor="lf-comuna">Comuna</FieldLabel>
              <div className="relative">
                <select
                  id="lf-comuna"
                  {...register("comuna")}
                  disabled={!selectedRegion}
                  aria-invalid={!!errors.comuna}
                  className={`input appearance-none pr-10 ${!watch("comuna") ? "text-ink-3" : ""} ${!selectedRegion ? "cursor-not-allowed border-line" : "cursor-pointer"}`}
                  defaultValue=""
                >
                  <option value="" disabled>
                    {selectedRegion ? "Selecciona tu comuna" : "Primero elige la región"}
                  </option>
                  {comunasDeRegion(selectedRegion).map((c) => (
                    <option key={c} value={c} className="text-ink">{c}</option>
                  ))}
                </select>
                <ChevronDown />
              </div>
              <FieldError message={errors.comuna?.message} />
            </div>

          </div>
        </div>

        {/* ── 2. Auto que buscas ───────────────────────────────────────── */}
        <div>
          <SectionHeading title="Auto que buscas" />
          <Controller
            control={control}
            name="carSearch"
            render={({ field }) => (
              <CarCombobox
                options={carOptions}
                value={field.value ?? ""}
                onChange={field.onChange}
                error={errors.carSearch?.message}
              />
            )}
          />
        </div>

        {/* ── 3. Forma de pago ─────────────────────────────────────────── */}
        <div>
          <SectionHeading title="¿Cómo te gustaría pagar tu próximo vehículo?" />
          <Controller
            control={control}
            name="paymentMethod"
            render={({ field }) => (
              <RadioPills
                options={[
                  { value: "contado",              label: "Al contado" },
                  { value: "credito-convencional", label: "Crédito convencional" },
                  { value: "credito-inteligente",  label: "Crédito inteligente" },
                  { value: "no-seguro",            label: "No estoy seguro" },
                ]}
                value={field.value}
                onChange={field.onChange}
                cols={2}
                mobileCols={1}
              />
            )}
          />
          {errors.paymentMethod && <p className="field__error mt-2">{errors.paymentMethod.message}</p>}
        </div>

        {/* ── 4. Parte de pago ─────────────────────────────────────────── */}
        <div>
          <SectionHeading title="¿Quieres dar un auto en parte de pago?" />
          <Controller
            control={control}
            name="tradeIn"
            render={({ field }) => (
              <RadioPills
                options={[
                  { value: "si", label: "Sí" },
                  { value: "no", label: "No" },
                ]}
                value={field.value}
                onChange={field.onChange}
                cols={2}
              />
            )}
          />
          {errors.tradeIn && <p className="field__error mt-2">{errors.tradeIn.message}</p>}
        </div>

        {/* ── 5. Datos del auto a entregar ─────────────────────────────── */}
        {/* Abrir y cerrar el panel es la única animación que queda (Framer Motion). */}
        <AnimatePresence>
          {tradeIn === "si" && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div>
                <SectionHeading title="Datos de tu auto actual" />
                <div className="grid gap-6">

                  {/* Marca, modelo, año */}
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <div className="field">
                      <FieldLabel htmlFor="lf-ti-brand">Marca</FieldLabel>
                      <input id="lf-ti-brand" {...register("tradeInBrand")} type="text" placeholder="Ej: Toyota" className="input" />
                    </div>
                    <div className="field">
                      <FieldLabel htmlFor="lf-ti-model">Modelo</FieldLabel>
                      <input id="lf-ti-model" {...register("tradeInModel")} type="text" placeholder="Ej: Corolla" className="input" />
                    </div>
                    <div className="field">
                      <FieldLabel htmlFor="lf-ti-year">Año</FieldLabel>
                      <input id="lf-ti-year" {...register("tradeInYear")} type="text" placeholder="Ej: 2020" className="input" />
                    </div>
                  </div>

                  {/* Dueños */}
                  <div className="field">
                    <FieldLabel>Cantidad de dueños</FieldLabel>
                    <Controller
                      control={control}
                      name="tradeInOwners"
                      render={({ field }) => (
                        <RadioPills
                          options={[
                            { value: "unico",  label: "Único dueño" },
                            { value: "2",      label: "2 dueños" },
                            { value: "3-mas",  label: "3 o más" },
                          ]}
                          value={field.value}
                          onChange={field.onChange}
                          cols={3}
                        />
                      )}
                    />
                  </div>

                  {/* Kilometraje */}
                  <div className="field">
                    <FieldLabel htmlFor="lf-ti-km">Kilometraje</FieldLabel>
                    <input id="lf-ti-km" {...register("tradeInKm")} type="text" placeholder="Ej: 45000" className="input" />
                  </div>

                  {/* Mantenciones */}
                  <div className="field">
                    <FieldLabel>Mantenciones</FieldLabel>
                    <Controller
                      control={control}
                      name="tradeInMaintenance"
                      render={({ field }) => (
                        <RadioPills
                          options={[
                            { value: "todas-marca", label: "Todas en taller de marca" },
                            { value: "no-todas",    label: "No todas" },
                          ]}
                          value={field.value}
                          onChange={field.onChange}
                          cols={2}
                        />
                      )}
                    />
                  </div>

                  {/* Deuda */}
                  <div className="field">
                    <FieldLabel>¿Tiene deuda pendiente?</FieldLabel>
                    <Controller
                      control={control}
                      name="tradeInDebt"
                      render={({ field }) => (
                        <RadioPills
                          options={[
                            { value: "si", label: "Sí" },
                            { value: "no", label: "No" },
                          ]}
                          value={field.value}
                          onChange={field.onChange}
                          cols={2}
                        />
                      )}
                    />
                  </div>

                  {/* Patente: se muestra en mayúsculas porque así se escriben las patentes. */}
                  <div className="field">
                    <FieldLabel htmlFor="lf-ti-plate">Patente del vehículo</FieldLabel>
                    <input
                      id="lf-ti-plate"
                      {...register("tradeInPlate")}
                      type="text"
                      placeholder="Ej: ABCD12"
                      className="input placeholder:normal-case"
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>

                  {/* Fotos */}
                  <div className="field">
                    <FieldLabel>Fotos del auto (mínimo 4)</FieldLabel>
                    <PhotoUploader photos={photos} onChange={setPhotos} />
                    <FieldError message={photoError || undefined} />
                  </div>

                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* ── Submit ───────────────────────────────────────────────────── */}
        <div className="grid gap-4">
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
                Solicitar mejor oferta
              </>
            )}
          </button>

          {status === "error" && (
            <p className="field__error" role="alert">
              Hubo un error al enviar. Intenta de nuevo.
            </p>
          )}

          <p className="t-micro">
            Al hacer clic, aceptas nuestros{" "}
            <Link href="/terminos" className="link">términos de servicio</Link>{" "}
            y{" "}
            <Link href="/privacidad" className="link">política de privacidad</Link>.
          </p>
        </div>

      </form>
    </div>
  );
}
