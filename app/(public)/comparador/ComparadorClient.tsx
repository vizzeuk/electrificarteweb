"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { formatCLP } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Car {
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: string;
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

// ---------------------------------------------------------------------------
// Comparison rows config
// ---------------------------------------------------------------------------
const ROWS: {
  label: string;
  key: keyof Car;
  unit?: string;
  type?: "price" | "text" | "number";
  highlight?: "high" | "low";
}[] = [
  { label: "Precio con descuento", key: "discountPrice",  type: "price" },
  { label: "Precio lista",         key: "basePrice",      type: "price" },
  { label: "Autonomía",            key: "range",          unit: " km",  type: "number", highlight: "high" },
  { label: "Batería",              key: "battery",        unit: " kWh", type: "number", highlight: "high" },
  { label: "Potencia",             key: "power",          unit: " CV",  type: "number", highlight: "high" },
  { label: "0–100 km/h",          key: "acceleration",   unit: " seg", type: "number", highlight: "low"  },
  { label: "V. máxima",           key: "topSpeed",       unit: " km/h",type: "number", highlight: "high" },
  { label: "Carga rápida DC",     key: "chargeTimeDC",   type: "text" },
  { label: "Tipo de carga",       key: "chargeType",     type: "text" },
  { label: "Tracción",            key: "traction",       type: "text" },
  { label: "Categoría",           key: "category",       type: "text" },
  { label: "Maletero",            key: "cargo",          unit: " L",   type: "number", highlight: "high" },
  { label: "Altura libre",        key: "ground",         unit: " mm",  type: "number", highlight: "high" },
  { label: "Garantía",            key: "warranty",       type: "text" },
  { label: "Plazas",              key: "seats",          type: "number" },
];

const SECTIONS = [
  { label: "Precio",          keys: ["discountPrice", "basePrice"] },
  { label: "Rendimiento",     keys: ["range", "battery", "power", "acceleration", "topSpeed"] },
  { label: "Carga eléctrica", keys: ["chargeTimeDC", "chargeType"] },
  { label: "Practicidad",     keys: ["traction", "category", "cargo", "ground", "seats", "warranty"] },
];

const MAX_CARS = 3;
// Label column width — must match between header and body rows
const LABEL_W = "w-[110px] md:w-[200px]";
// Each car column min width
const CAR_COL_W = "min-w-[130px] md:min-w-[0] md:w-auto";

// ---------------------------------------------------------------------------

interface ComparadorClientProps {
  allCars: Car[];
  initialSlug?: string;
}

export default function ComparadorClient({ allCars, initialSlug }: ComparadorClientProps) {
  const [selected, setSelected] = useState<Car[]>(() => {
    if (initialSlug) {
      const found = allCars.find((c) => c.slug === initialSlug);
      return found ? [found] : allCars.slice(0, 2);
    }
    return allCars.slice(0, 2);
  });
  const [pickerSlot, setPickerSlot] = useState<number | null>(initialSlug ? 1 : null);
  const [search, setSearch] = useState("");

  const filteredPicker = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allCars.filter((c) => {
      if (selected.some((s) => s.slug === c.slug)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
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
    const vals = selected.map((c) => Number(c[key])).filter((v) => !isNaN(v));
    if (vals.length === 0) return null;
    return highlight === "high" ? Math.max(...vals) : Math.min(...vals);
  }

  function closePicker() {
    setPickerSlot(null);
    setSearch("");
  }

  return (
    <>
      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="bg-black pt-20 pb-10 md:pt-28 md:pb-20 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-8">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/60">Comparador</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-primary text-[11px] uppercase tracking-widest font-bold mb-4">
                Herramienta gratuita
              </p>
              <h1 className="text-4xl md:text-6xl font-headline font-black text-white tracking-tighter leading-[0.95] mb-4">
                Compara autos{" "}
                <span className="text-primary">eléctricos</span>
              </h1>
              <p className="text-white/50 text-base md:text-lg max-w-md leading-relaxed">
                Elige hasta 3 modelos y analiza sus diferencias clave para tomar la mejor decisión.
              </p>
            </div>

            <div className="hidden md:grid grid-cols-2 gap-4">
              {[
                { icon: "compare",       label: "Hasta 3 autos",     desc: "Compara lado a lado" },
                { icon: "bolt",          label: "Specs completas",    desc: "Precio, autonomía, carga y más" },
                { icon: "star",          label: "Mejor valor",        desc: "El ganador se resalta en teal" },
                { icon: "arrow_forward", label: "Cotiza al instante", desc: "Un click a tu oferta" },
              ].map((t) => (
                <div key={t.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <span className="material-symbols-outlined text-primary text-[20px] mb-2 block">{t.icon}</span>
                  <p className="text-white font-bold text-sm">{t.label}</p>
                  <p className="text-white/40 text-xs mt-0.5">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Car Selector + Table ────────────────────────────────────── */}
      <section className="py-8 md:py-16">
        <div className="max-w-7xl mx-auto">

          {/* ── Mobile: horizontal scroll strip ── Desktop: grid ── */}
          <div className="px-4 md:px-8">

            {/* Desktop car selector (hidden on mobile) */}
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

            {/* Mobile car selector */}
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

          {/* ── Comparison table ── */}
          {selected.length >= 2 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 md:mt-0 md:px-8"
            >
              {/* Scroll hint on mobile */}
              <div className="flex md:hidden items-center gap-1.5 px-4 mb-2 text-text-ghost">
                <span className="material-symbols-outlined text-[14px]">swipe</span>
                <p className="text-[11px]">Desliza para ver todas las columnas</p>
              </div>

              {/* Scrollable table container */}
              <div className="overflow-x-auto -mx-0 rounded-2xl border border-gray-100 shadow-sm bg-white">
                <div style={{ minWidth: `${110 + MAX_CARS * 140}px` }}>
                  {SECTIONS.map((section) => {
                    const sectionRows = ROWS.filter((r) => section.keys.includes(r.key as string));
                    return (
                      <div key={section.label}>
                        {/* Section header */}
                        <div className="flex border-b border-gray-100 bg-surface sticky left-0">
                          <div className={`${LABEL_W} flex-shrink-0 px-4 md:px-6 py-3`}>
                            <p className="text-[10px] md:text-[11px] uppercase tracking-widest font-bold text-primary-deep">
                              {section.label}
                            </p>
                          </div>
                          {/* Empty cells for car columns in section header */}
                          {Array.from({ length: MAX_CARS }).map((_, i) => (
                            <div key={i} className={`flex-1 ${CAR_COL_W} border-l border-gray-100`} />
                          ))}
                        </div>

                        {/* Rows */}
                        {sectionRows.map((row) => (
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

      {/* ─── Car Picker Modal ────────────────────────────────────────── */}
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
              className="bg-white w-full sm:max-w-xl h-[92svh] sm:h-auto sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle (mobile only) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h2 className="font-headline font-bold text-lg">Elige un auto</h2>
                  <p className="text-xs text-text-ghost mt-0.5">
                    {filteredPicker.length} de {allCars.length - selected.length} modelos
                    {search ? ` — "${search}"` : " disponibles"}
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
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Busca por nombre o marca..."
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
              <div className="overflow-y-auto flex-1 p-3 space-y-0.5">
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
                ) : filteredPicker.map((car) => {
                  const pct = Math.round(
                    ((car.basePrice - car.discountPrice) / car.basePrice) * 100
                  );
                  return (
                    <button
                      key={car.slug}
                      onClick={() => addCar(car)}
                      className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-surface active:bg-surface text-left transition-colors group"
                    >
                      <div className="w-11 h-11 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[20px] text-gray-300">electric_car</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-text-ghost uppercase tracking-wide font-semibold leading-none mb-0.5">
                          {car.brand} · {car.category}
                        </p>
                        <p className="font-headline font-bold text-sm group-hover:text-primary-deep transition-colors leading-tight">
                          {car.name}
                        </p>
                        <p className="text-[11px] text-text-ghost mt-0.5">
                          {car.range > 0 ? `${car.range} km` : "—"} · {car.power > 0 ? `${car.power} CV` : "—"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-headline font-black text-sm text-primary-deep">
                          {formatCLP(car.discountPrice)}
                        </p>
                        <p className="text-[10px] text-green-600 font-bold">-{pct}%</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom CTA ─────────────────────────────────────────────── */}
      <section className="py-14 bg-surface border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-3">
            ¿Ya decidiste?
          </p>
          <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tighter mb-4">
            Obtén el mejor precio del mercado
          </h2>
          <p className="text-text-muted mb-8 max-w-lg mx-auto">
            Nuestro equipo negocia por ti con la red de concesionarios para conseguirte
            un descuento promedio del 27%.
          </p>
          <Link
            href="/solicitar"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-black px-10 py-4 rounded-2xl text-base transition-colors"
          >
            Solicitar mi oferta ahora
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
        </div>
      </section>
    </>
  );
}

/* ── Desktop car slot ───────────────────────────────────────────────────── */
function DesktopCarSlot({
  car,
  onRemove,
  onAdd,
}: {
  car: Car | undefined;
  onRemove: () => void;
  onAdd: () => void;
}) {
  if (car) {
    const pct = Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100);
    return (
      <motion.div
        key={car.slug}
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
        <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-[24px] text-gray-300">electric_car</span>
        </div>
        <p className="text-[10px] text-text-ghost uppercase tracking-wide font-semibold">{car.brand}</p>
        <h3 className="font-headline font-black text-base leading-tight">{car.name}</h3>
        <p className="text-[10px] text-text-ghost mt-0.5 mb-3">{car.category}</p>
        <div className="text-xs text-text-ghost line-through">{formatCLP(car.basePrice)}</div>
        <div className="text-lg font-headline font-black text-primary-deep">{formatCLP(car.discountPrice)}</div>
        <span className="text-[10px] text-green-600 font-bold">-{pct}% con Electrificarte</span>
        <Link
          href={`/solicitar?auto=${car.slug}`}
          className="mt-4 block w-full bg-primary hover:bg-primary-dark text-black font-bold text-xs py-2 rounded-xl transition-colors"
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

/* ── Mobile car slot (compact horizontal card) ──────────────────────────── */
function MobileCarSlot({
  car,
  onRemove,
  onAdd,
}: {
  car: Car | undefined;
  onRemove: () => void;
  onAdd: () => void;
}) {
  if (car) {
    const pct = Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100);
    return (
      <motion.div
        key={car.slug}
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
        <div className="w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
          <span className="material-symbols-outlined text-[20px] text-gray-300">electric_car</span>
        </div>
        <p className="text-[9px] text-text-ghost uppercase tracking-wide font-semibold">{car.brand}</p>
        <p className="font-headline font-black text-sm leading-tight mb-1">{car.name}</p>
        <p className="font-headline font-black text-sm text-primary-deep">{formatCLP(car.discountPrice)}</p>
        <p className="text-[9px] text-green-600 font-bold">-{pct}%</p>
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

/* ── Table row ──────────────────────────────────────────────────────────── */
function TableRow({
  row,
  cars,
  getBest,
  labelW,
  carColW,
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
      {/* Sticky label */}
      <div
        className={`${labelW} flex-shrink-0 sticky left-0 bg-white px-4 md:px-6 py-3 md:py-4 flex items-center border-r border-gray-100 z-10`}
      >
        <span className="text-xs md:text-sm text-text-muted font-medium leading-snug">{row.label}</span>
      </div>

      {/* Car value cells */}
      {Array.from({ length: MAX_CARS }).map((_, i) => {
        const car = cars[i];
        if (!car) {
          return (
            <div
              key={`empty-${i}`}
              className={`flex-1 ${carColW} px-3 md:px-4 py-3 md:py-4 border-l border-gray-50 bg-gray-50/30`}
            />
          );
        }

        const raw = car[row.key];
        const numVal = Number(raw);
        const isBest = best !== null && numVal === best;

        let display: string;
        if (row.type === "price") {
          display = formatCLP(numVal);
        } else if (row.unit) {
          display = `${raw}${row.unit}`;
        } else {
          display = raw != null ? String(raw) : "—";
        }

        return (
          <div
            key={car.slug + row.key}
            className={[
              "flex-1",
              carColW,
              "px-3 md:px-4 py-3 md:py-4 flex items-center justify-center text-xs md:text-sm font-semibold border-l border-gray-50",
              isBest ? "text-primary-deep" : "text-text-main",
            ].join(" ")}
          >
            <span
              className={[
                "px-2 py-1 rounded-lg text-center leading-snug",
                isBest ? "bg-primary/10 font-black" : "",
              ].join(" ")}
            >
              {display}
              {isBest && (
                <span className="ml-1 text-[9px] md:text-[10px] text-primary-deep font-black align-middle">★</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
