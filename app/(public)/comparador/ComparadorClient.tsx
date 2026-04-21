"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { formatCLP } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Car {
  id: string;
  slug: string;
  name: string;
  versionName?: string;
  showVersionBadge?: boolean;
  brand: string;
  brandSlug: string;
  category: string;
  imageUrl?: string;
  basePrice: number;
  discountPrice: number;
  range: number;
  battery: number;
  power: number;
  traction: string;
  topSpeed: number;
  acceleration: number;
  chargeTimeDC: string;
  chargeTimeAC: string;
  chargeType: string;
  seats: number;
  cargo: number;
  ground: number;
  warranty: string;
  isHotDeal: boolean;
  highlight?: string;
}

// ─── Display helpers ──────────────────────────────────────────────────────────
function carDisplayName(car: Car) {
  // If this car has 2+ versions, show version name as primary label
  if (car.showVersionBadge && car.versionName) return car.versionName;
  // Single-version car: show car name (version name is same or redundant)
  return car.name;
}

// ─── Comparison config ────────────────────────────────────────────────────────
const ROWS: {
  label: string;
  key: keyof Car;
  unit?: string;
  type?: "price" | "text" | "number";
  highlight?: "high" | "low";
}[] = [
  { label: "Precio con descuento", key: "discountPrice", type: "price" },
  { label: "Precio lista",         key: "basePrice",     type: "price" },
  { label: "Autonomía",            key: "range",         unit: " km",   type: "number", highlight: "high" },
  { label: "Batería",              key: "battery",       unit: " kWh",  type: "number", highlight: "high" },
  { label: "Potencia",             key: "power",         unit: " CV",   type: "number", highlight: "high" },
  { label: "0–100 km/h",          key: "acceleration",  unit: " seg",  type: "number", highlight: "low"  },
  { label: "V. máxima",           key: "topSpeed",      unit: " km/h", type: "number", highlight: "high" },
  { label: "Carga rápida DC",     key: "chargeTimeDC",  type: "text" },
  { label: "Tipo de carga",       key: "chargeType",    type: "text" },
  { label: "Tracción",            key: "traction",      type: "text" },
  { label: "Categoría",           key: "category",      type: "text" },
  { label: "Maletero",            key: "cargo",         unit: " L",    type: "number", highlight: "high" },
  { label: "Altura libre",        key: "ground",        unit: " mm",   type: "number", highlight: "high" },
  { label: "Garantía",            key: "warranty",      type: "text" },
  { label: "Plazas",              key: "seats",         type: "number" },
];

const SECTIONS = [
  { label: "Precio",          keys: ["discountPrice", "basePrice"] },
  { label: "Rendimiento",     keys: ["range", "battery", "power", "acceleration", "topSpeed"] },
  { label: "Carga eléctrica", keys: ["chargeTimeDC", "chargeType"] },
  { label: "Practicidad",     keys: ["traction", "category", "cargo", "ground", "seats", "warranty"] },
];

const MAX_CARS = 3;
const LABEL_W   = "w-[110px] md:w-[200px]";
const CAR_COL_W = "min-w-[130px] md:min-w-[0] md:w-auto";

// ─── Car image component ──────────────────────────────────────────────────────
function CarImage({ url, name, size = "md" }: { url?: string; name: string; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "w-11 h-11", md: "w-14 h-14", lg: "w-full h-full" }[size];
  if (url) {
    return (
      <div className={`${dims} overflow-hidden flex-shrink-0`}>
        <Image src={url} alt={name} width={size === "lg" ? 300 : 56} height={size === "lg" ? 200 : 56}
          className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className={`${dims} bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
      <span className="material-symbols-outlined text-gray-300" style={{ fontSize: size === "sm" ? 20 : size === "md" ? 24 : 40 }}>
        electric_car
      </span>
    </div>
  );
}

// ─── Hero info panel (right side) ────────────────────────────────────────────
function HeroInfo() {
  const features = [
    {
      icon: "difference",
      title: "Versiones específicas",
      desc: "Compara trims exactos, no solo el modelo base. Elige la variante que realmente te interesa.",
    },
    {
      icon: "sell",
      title: "Precio Electrificarte incluido",
      desc: "Ves el precio lista y el precio negociado por nosotros, lado a lado, para cada auto.",
    },
    {
      icon: "emoji_events",
      title: "Ganador resaltado",
      desc: "El mejor valor en cada spec se marca automáticamente. Sin hojas de cálculo.",
    },
    {
      icon: "receipt_long",
      title: "Comparación completa",
      desc: "Autonomía, carga, potencia, tracción, maletero y garantía. Todo en una sola tabla.",
    },
  ];

  return (
    <div className="hidden md:block">
      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-3">
        {features.map(f => (
          <div key={f.title} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(0,229,229,0.12)" }}>
              <span className="material-symbols-outlined text-[18px] text-primary">{f.icon}</span>
            </div>
            <p className="text-white font-bold text-sm leading-snug">{f.title}</p>
            <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface ComparadorClientProps {
  allCars: Car[];
  initialId?: string;
}

export default function ComparadorClient({ allCars, initialId }: ComparadorClientProps) {
  const [selected, setSelected] = useState<Car[]>(() => {
    if (initialId) {
      const found = allCars.find(c => c.id === initialId);
      return found ? [found] : allCars.slice(0, 2);
    }
    return allCars.slice(0, 2);
  });
  const [pickerSlot, setPickerSlot] = useState<number | null>(initialId ? 1 : null);
  const [search, setSearch]         = useState("");

  const filteredPicker = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allCars.filter(c => {
      if (selected.some(s => s.id === c.id)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        (c.versionName ?? "").toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [allCars, selected, search]);

  function addCar(car: Car) {
    if (pickerSlot === null) return;
    const next = [...selected];
    next[pickerSlot] = car;
    setSelected(next);
    setPickerSlot(null);
    setSearch("");
  }

  function removeCar(idx: number) {
    setSelected(selected.filter((_, i) => i !== idx));
  }

  function getBest(key: keyof Car, highlight?: "high" | "low") {
    if (!highlight) return null;
    const vals = selected.map(c => Number(c[key])).filter(v => !isNaN(v) && v > 0);
    if (vals.length < 2) return null;
    return highlight === "high" ? Math.max(...vals) : Math.min(...vals);
  }

  function closePicker() {
    setPickerSlot(null);
    setSearch("");
  }

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-black pt-20 pb-10 md:pt-28 md:pb-20 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full blur-[120px] opacity-10 pointer-events-none bg-primary" />

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-8">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/60">Comparador</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full mb-5">
                <span className="material-symbols-outlined text-primary text-[14px]">compare</span>
                <span className="text-white/60 text-xs font-semibold">Herramienta gratuita</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-headline font-black text-white tracking-tighter leading-[0.92] mb-4">
                Compara autos<br /><span className="text-primary">eléctricos.</span>
              </h1>
              <p className="text-white/50 text-base leading-relaxed max-w-md mb-8">
                Elige hasta 3 modelos — incluyendo versiones específicas — y analiza sus diferencias en precio, autonomía, carga y más.
              </p>

              <div className="flex flex-wrap gap-4">
                {[
                  { icon: "bolt",    text: "Specs reales por versión" },
                  { icon: "star",    text: "El mejor valor resaltado" },
                  { icon: "receipt", text: "Precio negociado Electrificarte" },
                ].map(f => (
                  <div key={f.text} className="flex items-center gap-2 text-white/40 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {f.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right – info panel */}
            <HeroInfo />
          </div>
        </div>
      </section>

      {/* ─── Car selector + table ─────────────────────────────────────── */}
      <section className="py-8 md:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="px-4 md:px-8">
            {/* Desktop slots */}
            <div
              className="hidden md:grid gap-4 mb-8"
              style={{ gridTemplateColumns: `200px repeat(${MAX_CARS}, 1fr)` }}
            >
              <div />
              {Array.from({ length: MAX_CARS }).map((_, i) => (
                <DesktopCarSlot
                  key={i}
                  car={selected[i]}
                  onRemove={() => removeCar(i)}
                  onAdd={() => setPickerSlot(i)}
                />
              ))}
            </div>

            {/* Mobile slots */}
            <div className="flex md:hidden gap-3 overflow-x-auto pb-3 -mx-4 px-4 hide-scrollbar">
              {Array.from({ length: MAX_CARS }).map((_, i) => (
                <MobileCarSlot
                  key={i}
                  car={selected[i]}
                  onRemove={() => removeCar(i)}
                  onAdd={() => setPickerSlot(i)}
                />
              ))}
            </div>
          </div>

          {/* Comparison table */}
          {selected.length >= 2 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 md:mt-0 md:px-8"
            >
              <div className="flex md:hidden items-center gap-1.5 px-4 mb-2 text-text-ghost">
                <span className="material-symbols-outlined text-[14px]">swipe</span>
                <p className="text-[11px]">Desliza para ver todas las columnas</p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
                <div style={{ minWidth: `${110 + MAX_CARS * 140}px` }}>
                  {SECTIONS.map(section => {
                    const sectionRows = ROWS.filter(r => section.keys.includes(r.key as string));
                    return (
                      <div key={section.label}>
                        <div className="flex border-b border-gray-100 bg-surface sticky left-0">
                          <div className={`${LABEL_W} flex-shrink-0 px-4 md:px-6 py-3`}>
                            <p className="text-[10px] md:text-[11px] uppercase tracking-widest font-bold text-primary-deep">
                              {section.label}
                            </p>
                          </div>
                          {Array.from({ length: MAX_CARS }).map((_, i) => (
                            <div key={i} className={`flex-1 ${CAR_COL_W} border-l border-gray-100`} />
                          ))}
                        </div>
                        {sectionRows.map(row => (
                          <TableRow
                            key={row.key}
                            row={row}
                            cars={selected}
                            getBest={getBest}
                            labelW={LABEL_W}
                            carColW={CAR_COL_W}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-10 text-text-ghost px-4 md:px-8">
              <span className="material-symbols-outlined text-[40px] mb-2 block text-gray-200">compare</span>
              <p className="font-medium text-sm">Agrega al menos 2 autos para ver la comparación</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Picker modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {pickerSlot !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
            onClick={closePicker}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-white w-full sm:max-w-xl h-[92svh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h2 className="font-headline font-bold text-lg">Elige un auto</h2>
                  <p className="text-xs text-text-ghost mt-0.5">
                    {filteredPicker.length} versiones disponibles
                    {search ? ` — "${search}"` : ""}
                  </p>
                </div>
                <button
                  onClick={closePicker}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-ghost pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Busca por nombre, marca o versión…"
                    autoFocus
                    className="w-full pl-9 pr-9 py-3 bg-surface rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-ghost hover:text-text-main transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1 min-h-0 p-3 space-y-0.5">
                {filteredPicker.length === 0 ? (
                  <div className="py-16 text-center">
                    <span className="material-symbols-outlined text-[36px] text-gray-200 block mb-2">search_off</span>
                    <p className="text-sm text-text-ghost font-medium">Sin resultados para &ldquo;{search}&rdquo;</p>
                    <button
                      onClick={() => setSearch("")}
                      className="mt-3 text-xs text-primary-deep font-semibold hover:text-primary transition-colors"
                    >
                      Limpiar búsqueda
                    </button>
                  </div>
                ) : filteredPicker.map(car => {
                  const pct = car.basePrice > 0
                    ? Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100)
                    : 0;
                  const displayName = carDisplayName(car);
                  return (
                    <button
                      key={car.id}
                      onClick={() => addCar(car)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface active:bg-surface text-left transition-colors group"
                    >
                      {/* Image */}
                      <div className="w-14 h-11 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                        {car.imageUrl ? (
                          <Image src={car.imageUrl} alt={car.name} width={56} height={44}
                            className="w-full h-full object-contain" />
                        ) : (
                          <span className="material-symbols-outlined text-[22px] text-gray-300">electric_car</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-text-ghost uppercase tracking-wide font-semibold leading-none mb-0.5">
                          {car.brand} · {car.category}
                        </p>
                        <p className="font-headline font-bold text-sm group-hover:text-primary-deep transition-colors leading-tight truncate">
                          {displayName}
                        </p>
                        <p className="text-[11px] text-text-ghost mt-0.5">
                          {car.range > 0 ? `${car.range} km` : "—"} · {car.power > 0 ? `${car.power} CV` : "—"}
                          {car.battery > 0 ? ` · ${car.battery} kWh` : ""}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-headline font-black text-sm text-primary-deep">
                          {formatCLP(car.discountPrice)}
                        </p>
                        {pct > 0 && <p className="text-[10px] text-green-600 font-bold">-{pct}%</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-14 bg-surface border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-black rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-primary text-xs uppercase tracking-widest font-bold mb-2">¿Ya decidiste?</p>
              <h2 className="text-white font-headline font-black text-2xl md:text-3xl tracking-tight">
                {selected.length > 0
                  ? `Consigue el mejor precio en el ${carDisplayName(selected[0])}`
                  : "Obtén el mejor precio del mercado"}
              </h2>
              <p className="text-white/50 text-sm mt-1">
                Negociamos por ti con nuestra red exclusiva de concesionarios en Chile.
              </p>
            </div>
            <Link
              href={selected.length > 0 ? `/solicitar?auto=${selected[0].slug}` : "/solicitar"}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-black px-8 py-4 rounded-xl transition-all text-sm whitespace-nowrap shadow-[0_4px_20px_rgba(0,229,229,0.30)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]"
            >
              Solicitar oferta ahora
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Desktop car slot ─────────────────────────────────────────────────────────
function DesktopCarSlot({ car, onRemove, onAdd }: { car: Car | undefined; onRemove: () => void; onAdd: () => void }) {
  if (car) {
    const pct = car.basePrice > 0
      ? Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100)
      : 0;
    return (
      <motion.div
        key={car.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm"
      >
        {car.isHotDeal && (
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber text-black text-[9px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full whitespace-nowrap">
            HOT DEAL
          </span>
        )}
        <button
          onClick={onRemove}
          className="absolute top-3 right-3 w-6 h-6 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center text-text-ghost transition-colors"
          aria-label="Quitar"
        >
          <span className="material-symbols-outlined text-[14px]">close</span>
        </button>

        {/* Car image */}
        <div className="mx-auto w-28 h-20 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center mb-3">
          {car.imageUrl ? (
            <Image src={car.imageUrl} alt={car.name} width={112} height={80}
              className="w-full h-full object-contain" />
          ) : (
            <span className="material-symbols-outlined text-[40px] text-gray-200">electric_car</span>
          )}
        </div>

        <p className="text-[10px] text-text-ghost uppercase tracking-wide font-semibold">{car.brand}</p>
        <h3 className="font-headline font-black text-sm leading-tight mt-0.5">{carDisplayName(car)}</h3>
        {/* Always reserve this line for height consistency — shows model name for versioned cars */}
        <p className="text-[10px] text-text-ghost mt-0.5">
          {car.showVersionBadge && car.versionName ? car.name : "\u00A0"}
        </p>
        <p className="text-[10px] text-text-ghost mb-3">{car.category}</p>

        <div className="text-xs text-text-ghost line-through">{formatCLP(car.basePrice)}</div>
        <div className="text-lg font-headline font-black text-primary-deep">{formatCLP(car.discountPrice)}</div>
        {pct > 0 && <span className="text-[10px] text-green-600 font-bold">-{pct}% con Electrificarte</span>}

        <Link
          href={`/solicitar?auto=${car.slug}`}
          className="mt-4 block w-full bg-primary hover:bg-primary-dark text-black font-bold text-xs py-2 rounded-xl transition-colors shadow-[0_2px_10px_rgba(0,229,229,0.20)] hover:shadow-[0_4px_16px_rgba(0,229,229,0.35)]"
        >
          Solicitar oferta
        </Link>
      </motion.div>
    );
  }
  return (
    <button
      onClick={onAdd}
      className="border-2 border-dashed border-gray-200 hover:border-primary/40 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-text-ghost hover:text-primary-deep transition-colors group min-h-[200px]"
    >
      <span className="material-symbols-outlined text-[32px] group-hover:scale-110 transition-transform">add_circle</span>
      <span className="text-xs font-semibold">Agregar auto</span>
    </button>
  );
}

// ─── Mobile car slot ──────────────────────────────────────────────────────────
function MobileCarSlot({ car, onRemove, onAdd }: { car: Car | undefined; onRemove: () => void; onAdd: () => void }) {
  if (car) {
    const pct = car.basePrice > 0
      ? Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100)
      : 0;
    return (
      <motion.div
        key={car.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white border border-gray-100 rounded-2xl p-4 flex-shrink-0 w-[160px] shadow-sm text-center"
      >
        {car.isHotDeal && (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber text-black text-[8px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap">
            HOT DEAL
          </span>
        )}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-5 h-5 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center text-text-ghost transition-colors"
          aria-label="Quitar"
        >
          <span className="material-symbols-outlined text-[12px]">close</span>
        </button>

        <div className="mx-auto w-20 h-14 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center mb-2">
          {car.imageUrl ? (
            <Image src={car.imageUrl} alt={car.name} width={80} height={56}
              className="w-full h-full object-contain" />
          ) : (
            <span className="material-symbols-outlined text-[28px] text-gray-200">electric_car</span>
          )}
        </div>

        <p className="text-[9px] text-text-ghost uppercase tracking-wide font-semibold">{car.brand}</p>
        <p className="font-headline font-black text-xs leading-tight mb-1">{carDisplayName(car)}</p>
        <p className="font-headline font-black text-sm text-primary-deep">{formatCLP(car.discountPrice)}</p>
        {pct > 0 && <p className="text-[9px] text-green-600 font-bold">-{pct}%</p>}
        <Link
          href={`/solicitar?auto=${car.slug}`}
          className="mt-2.5 block w-full bg-primary text-black font-bold text-[10px] py-1.5 rounded-lg transition-colors"
        >
          Solicitar
        </Link>
      </motion.div>
    );
  }
  return (
    <button
      onClick={onAdd}
      className="border-2 border-dashed border-gray-200 hover:border-primary/40 rounded-2xl flex-shrink-0 w-[140px] min-h-[160px] flex flex-col items-center justify-center gap-2 text-text-ghost hover:text-primary-deep transition-colors"
    >
      <span className="material-symbols-outlined text-[28px]">add_circle</span>
      <span className="text-[11px] font-semibold">Agregar auto</span>
    </button>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────
function TableRow({
  row, cars, getBest, labelW, carColW,
}: {
  row: { label: string; key: keyof Car; unit?: string; type?: string; highlight?: "high" | "low" };
  cars: Car[];
  getBest: (key: keyof Car, highlight?: "high" | "low") => number | null;
  labelW: string;
  carColW: string;
}) {
  const best = getBest(row.key, row.highlight);
  return (
    <div className="flex border-b border-gray-50 last:border-b-0 hover:bg-surface/50 transition-colors">
      <div className={`${labelW} flex-shrink-0 sticky left-0 bg-white px-4 md:px-6 py-3 md:py-4 flex items-center border-r border-gray-100 z-10`}>
        <span className="text-xs md:text-sm text-text-muted font-medium leading-snug">{row.label}</span>
      </div>
      {Array.from({ length: MAX_CARS }).map((_, i) => {
        const car = cars[i];
        if (!car) {
          return <div key={`empty-${i}`} className={`flex-1 ${carColW} px-3 md:px-4 py-3 md:py-4 border-l border-gray-50 bg-gray-50/30`} />;
        }
        const raw    = car[row.key];
        const numVal = Number(raw);
        const isBest = best !== null && numVal === best;
        let display: string;
        if (row.type === "price")  display = formatCLP(numVal);
        else if (row.unit)         display = `${raw}${row.unit}`;
        else                       display = raw != null && raw !== 0 && raw !== "—" ? String(raw) : "—";
        return (
          <div
            key={car.id + row.key}
            className={[
              "flex-1", carColW,
              "px-3 md:px-4 py-3 md:py-4 flex items-center justify-center text-xs md:text-sm font-semibold border-l border-gray-50",
              isBest ? "text-primary-deep" : "text-text-main",
            ].join(" ")}
          >
            <span className={["px-2 py-1 rounded-lg text-center leading-snug", isBest ? "bg-primary/10 font-black" : ""].join(" ")}>
              {display}
              {isBest && <span className="ml-1 text-[9px] md:text-[10px] text-primary-deep font-black align-middle">★</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
