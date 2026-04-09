"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

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
  phone:          z.string().min(8, "Ingresa un teléfono válido"),
  rut:            z.string().refine(validateRut, "RUT inválido"),
  comuna:         z.string().min(2, "Ingresa tu comuna"),
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
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5 px-1">
      {children}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

// ─── Input base class ─────────────────────────────────────────────────────────
const INPUT_CLS = "w-full bg-gray-100 rounded-lg py-3 px-4 text-sm text-text-main placeholder-text-ghost focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

// ─── Radio pill group ─────────────────────────────────────────────────────────
function RadioPills<T extends string>({
  options,
  value,
  onChange,
  cols = 2,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "py-2.5 px-3 rounded-xl text-sm font-semibold text-center border transition-all duration-150",
              active
                ? "bg-primary/10 border-primary/40 text-primary-deep"
                : "bg-gray-100 border-gray-100 text-text-muted hover:border-gray-300",
            ].join(" ")}
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
          className={[INPUT_CLS, error ? "ring-2 ring-red-300" : ""].join(" ")}
        />
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-text-ghost pointer-events-none">
          {open ? "expand_less" : "search"}
        </span>
      </div>

      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(opt)}
                  className={[
                    "w-full text-left px-4 py-2.5 text-sm hover:bg-surface transition-colors",
                    value === opt ? "bg-primary/5 text-primary-deep font-semibold" : "text-text-main",
                  ].join(" ")}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-red-500 text-xs mt-1 px-1">{error}</p>}
    </div>
  );
}

// ─── Photo uploader ───────────────────────────────────────────────────────────
function PhotoUploader({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const toBase64 = (file: File): Promise<string> =>
      new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
    const newB64 = await Promise.all(Array.from(files).map(toBase64));
    onChange([...photos, ...newB64].slice(0, 10)); // max 10
  }

  function remove(idx: number) {
    onChange(photos.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {/* Grid preview */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
              <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={[
          "w-full border-2 border-dashed rounded-xl py-5 flex flex-col items-center gap-1.5 transition-colors",
          photos.length < 4
            ? "border-amber/50 bg-amber/5 hover:bg-amber/10"
            : "border-gray-200 bg-gray-50 hover:bg-gray-100",
        ].join(" ")}
      >
        <span className="material-symbols-outlined text-[28px] text-text-ghost">add_photo_alternate</span>
        <span className="text-sm font-semibold text-text-muted">
          {photos.length === 0 ? "Sube fotos de tu auto" : "Agregar más fotos"}
        </span>
        <span className={["text-[10px] font-bold uppercase tracking-wide", photos.length < 4 ? "text-amber-600" : "text-text-ghost"].join(" ")}>
          {photos.length < 4
            ? `Mínimo 4 fotos · ${photos.length} de 4`
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
function SectionHeading({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-gray-100">
      <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-primary-deep text-[16px]">{icon}</span>
      </div>
      <h3 className="font-headline font-bold text-base">{title}</h3>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface LeadFormProps {
  carOptions?: string[];
  carSlug?: string;
}

export function LeadForm({ carOptions = [], carSlug }: LeadFormProps) {
  const [status, setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [photos, setPhotos]   = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tradeIn: undefined, paymentMethod: undefined },
  });

  const tradeIn = watch("tradeIn");

  async function onSubmit(data: FormValues) {
    // Validate photos if trade-in
    if (data.tradeIn === "si" && photos.length < 4) {
      setPhotoError("Sube al menos 4 fotos de tu auto");
      return;
    }
    setPhotoError("");
    setStatus("loading");

    try {
      const payload = {
        ...data,
        carSlug,
        tradeInPhotos: data.tradeIn === "si" ? photos : [],
        source: "electrificarte-web",
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      setStatus("success");
      reset();
      setPhotos([]);
    } catch {
      setStatus("error");
    }
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-10 text-center"
      >
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="check_circle" className="text-primary-dark" size="lg" />
        </div>
        <h3 className="text-2xl font-headline font-bold mb-2">¡Solicitud enviada!</h3>
        <p className="text-text-muted">
          Nuestro equipo te contactará en menos de 24 horas con la mejor oferta.
        </p>
      </motion.div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-headline font-bold text-text-main mb-1">
          Completa tu solicitud
        </h2>
        <p className="text-text-muted text-sm">
          Toda la información se mantiene privada y solo se usa para preparar tu oferta.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">

        {/* ── 1. Datos personales ──────────────────────────────────────── */}
        <div>
          <SectionHeading icon="person" title="Datos personales" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <FieldLabel required>Nombre completo</FieldLabel>
              <input {...register("fullName")} type="text" placeholder="Juan Pérez" className={INPUT_CLS} />
              {errors.fullName && <p className="text-red-500 text-xs mt-1 px-1">{errors.fullName.message}</p>}
            </div>

            <div>
              <FieldLabel required>Email</FieldLabel>
              <input {...register("email")} type="email" placeholder="juan@ejemplo.com" className={INPUT_CLS} />
              {errors.email && <p className="text-red-500 text-xs mt-1 px-1">{errors.email.message}</p>}
            </div>

            <div>
              <FieldLabel required>Número de teléfono</FieldLabel>
              <input {...register("phone")} type="tel" placeholder="+56 9 1234 5678" className={INPUT_CLS} />
              {errors.phone && <p className="text-red-500 text-xs mt-1 px-1">{errors.phone.message}</p>}
            </div>

            <div>
              <FieldLabel required>RUT (sin puntos ni guión)</FieldLabel>
              <input {...register("rut")} type="text" placeholder="Ej: 12345678K" className={INPUT_CLS} />
              {errors.rut && <p className="text-red-500 text-xs mt-1 px-1">{errors.rut.message}</p>}
            </div>

            <div className="md:col-span-2">
              <FieldLabel required>Comuna</FieldLabel>
              <input {...register("comuna")} type="text" placeholder="Ej: Las Condes" className={INPUT_CLS} />
              {errors.comuna && <p className="text-red-500 text-xs mt-1 px-1">{errors.comuna.message}</p>}
            </div>

          </div>
        </div>

        {/* ── 2. Auto que buscas ───────────────────────────────────────── */}
        <div>
          <SectionHeading icon="electric_car" title="Auto que buscas" />
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
          <SectionHeading icon="payments" title="¿Cómo te gustaría pagar tu próximo vehículo?" />
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
              />
            )}
          />
          {errors.paymentMethod && <p className="text-red-500 text-xs mt-2 px-1">{errors.paymentMethod.message}</p>}
        </div>

        {/* ── 4. Parte de pago ─────────────────────────────────────────── */}
        <div>
          <SectionHeading icon="directions_car" title="¿Quieres dar un auto en parte de pago?" />
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
          {errors.tradeIn && <p className="text-red-500 text-xs mt-2 px-1">{errors.tradeIn.message}</p>}
        </div>

        {/* ── 5. Datos del auto a entregar ─────────────────────────────── */}
        <AnimatePresence>
          {tradeIn === "si" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="bg-surface rounded-2xl p-6 border border-gray-100 space-y-6">
                <SectionHeading icon="sell" title="Datos de tu auto actual" />

                {/* Marca, modelo, año */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <FieldLabel>Marca</FieldLabel>
                    <input {...register("tradeInBrand")} type="text" placeholder="Ej: Toyota" className={INPUT_CLS} />
                  </div>
                  <div>
                    <FieldLabel>Modelo</FieldLabel>
                    <input {...register("tradeInModel")} type="text" placeholder="Ej: Corolla" className={INPUT_CLS} />
                  </div>
                  <div>
                    <FieldLabel>Año</FieldLabel>
                    <input {...register("tradeInYear")} type="text" placeholder="Ej: 2020" className={INPUT_CLS} />
                  </div>
                </div>

                {/* Dueños */}
                <div>
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
                <div>
                  <FieldLabel>Kilometraje</FieldLabel>
                  <input {...register("tradeInKm")} type="text" placeholder="Ej: 45000" className={INPUT_CLS} />
                </div>

                {/* Mantenciones */}
                <div>
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
                <div>
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

                {/* Patente */}
                <div>
                  <FieldLabel>Patente del vehículo</FieldLabel>
                  <input
                    {...register("tradeInPlate")}
                    type="text"
                    placeholder="Ej: ABCD12"
                    className={INPUT_CLS}
                    style={{ textTransform: "uppercase" }}
                  />
                </div>

                {/* Fotos */}
                <div>
                  <FieldLabel>Fotos del auto (mínimo 4)</FieldLabel>
                  <PhotoUploader photos={photos} onChange={setPhotos} />
                  {photoError && <p className="text-red-500 text-xs mt-1 px-1">{photoError}</p>}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Submit ───────────────────────────────────────────────────── */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-primary-container text-black font-headline font-bold py-5 rounded-full text-lg shadow-lg hover:shadow-[0_0_25px_rgba(0,229,209,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {status === "loading" ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                Enviando...
              </>
            ) : (
              <>
                Solicitar mejor oferta
                <Icon name="arrow_forward" />
              </>
            )}
          </button>

          {status === "error" && (
            <p className="text-center text-red-500 text-sm mt-3">
              Hubo un error al enviar. Intenta de nuevo.
            </p>
          )}

          <p className="text-center text-[10px] text-text-muted mt-4 uppercase tracking-wider">
            Al hacer clic, aceptas nuestros términos de servicio y política de privacidad.
          </p>
        </div>

      </form>
    </div>
  );
}
