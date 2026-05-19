"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import { formatCLP } from "@/lib/utils";
import type { CalcCar, CalcVersion } from "./types";

// ─── Constantes Chile ────────────────────────────────────────────────────────
const ELECTRICITY_CLP_KWH  = 200;   // CLP/kWh tarifa residencial promedio
const BENCINA_CLP_L        = 1600;  // CLP/L, ~95 octane promedio Chile
const PHEV_ICE_KM_L        = 15;    // km/L modo combustión típico PHEV
const CO2_GAS_KG_L         = 2.31;  // kg CO₂ por litro de bencina
const CO2_EV_KG_KM         = 0.050; // kg CO₂/km (factor red eléctrica Chile)
const TREES_PER_TON_CO2    = 45;
const DEFAULT_RENDIMIENTO  = 10;    // km/L estándar si usuario no sabe

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatNum(n: number) {
  return n.toLocaleString("es-CL");
}

function getCarType(tag: string) {
  const t = (tag ?? "").toUpperCase();
  if (t === "PHEV" || t === "REEV") return "PHEV";
  if (t === "HEV"  || t === "MHEV") return "HEV";
  return "BEV";
}

interface ResolvedSpecs {
  electricTypeTag: string;
  batteryCapacity: number;
  range: number;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
}

function resolveSpecs(car: CalcCar, ver: CalcVersion | null): ResolvedSpecs {
  return {
    electricTypeTag: car.electricTypeTag,
    batteryCapacity: ver?.batteryCapacity ?? car.batteryCapacity,
    range:           ver?.range          ?? car.range,
    electricRangeKm: ver?.electricRangeKm ?? car.electricRangeKm,
    fuelConsumption: ver?.fuelConsumption  ?? car.fuelConsumption,
  };
}

function calcCarMonthlyCost(car: CalcCar, kmPerMonth: number, ver: CalcVersion | null = null): number {
  const specs = resolveSpecs(car, ver);
  const type  = getCarType(specs.electricTypeTag);

  if (type === "BEV") {
    if (specs.batteryCapacity > 0 && specs.range > 0)
      return Math.round(kmPerMonth * (specs.batteryCapacity / specs.range) * ELECTRICITY_CLP_KWH);
    return 0;
  }

  if (type === "PHEV") {
    const eRange = specs.electricRangeKm ?? 0;
    if (eRange > 0) {
      const elecKmMonth = Math.min(kmPerMonth, eRange * 30);
      const fuelKmMonth = Math.max(0, kmPerMonth - eRange * 30);
      const kWhPerKm    = specs.batteryCapacity > 0 ? specs.batteryCapacity / eRange : 0.20;
      return Math.round(elecKmMonth * kWhPerKm * ELECTRICITY_CLP_KWH + (fuelKmMonth / PHEV_ICE_KM_L) * BENCINA_CLP_L);
    }
    if (specs.batteryCapacity > 0 && specs.range > 0)
      return Math.round(kmPerMonth * (specs.batteryCapacity / specs.range) * ELECTRICITY_CLP_KWH);
    return 0;
  }

  // HEV / MHEV
  const kmL = (specs.fuelConsumption && specs.fuelConsumption <= 20) ? specs.fuelConsumption : 15;
  return Math.round((kmPerMonth / kmL) * BENCINA_CLP_L);
}

function carSpecLabel(car: CalcCar): string {
  const type = getCarType(car.electricTypeTag);
  if (type === "BEV")  return car.range > 0 ? `${car.range} km autonomía · ${car.batteryCapacity} kWh` : `${car.batteryCapacity} kWh`;
  if (type === "PHEV") return car.electricRangeKm ? `${car.electricRangeKm} km eléctrico · ${car.batteryCapacity} kWh` : `${car.batteryCapacity} kWh PHEV`;
  return car.fuelConsumption ? `${car.fuelConsumption} km/L híbrido` : "HEV";
}

function carTypeBadge(tag: string) {
  const type = getCarType(tag);
  if (type === "PHEV") return { label: "PHEV", color: "text-blue-600 bg-blue-50" };
  if (type === "HEV")  return { label: "HEV",  color: "text-green-700 bg-green-50" };
  return { label: "EV", color: "text-primary-deep bg-primary/10" };
}

// ─── Slider ──────────────────────────────────────────────────────────────────
function Slider({
  label, icon, value, min, max, step, format, onChange, editable = false, disabled = false,
}: {
  label: string; icon: string; value: number;
  min: number; max: number; step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  editable?: boolean;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const pct = ((value - min) / (max - min)) * 100;

  function commitDraft(raw: string) {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    onChange(isNaN(n) ? value : Math.min(max, Math.max(min, n)));
    setDraft(null);
  }

  return (
    <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
          <span className="text-white/80 text-sm font-semibold">{label}</span>
        </div>
        {editable ? (
          <div className="flex items-baseline gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={draft ?? value}
              onChange={e => setDraft(e.target.value)}
              onBlur={e => commitDraft(e.target.value)}
              onKeyDown={e => e.key === "Enter" && commitDraft((e.target as HTMLInputElement).value)}
              className="font-headline font-black text-white text-lg bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 focus:border-primary focus:bg-white/15 outline-none text-right transition-colors"
              style={{ width: "6ch" }}
            />
            <span className="text-white/50 text-sm">km</span>
          </div>
        ) : (
          <span className="font-headline font-black text-white text-lg">{format(value)}</span>
        )}
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #00E5E5 ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-white/30 text-[11px] mt-1.5">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, highlight = false, delay = 0,
}: {
  icon: string; label: string; value: string; sub?: string;
  highlight?: boolean; delay?: number;
}) {
  return (
    <m.div
      key={value}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={[
        "rounded-2xl p-6 flex flex-col gap-1",
        highlight
          ? "bg-primary/10 border border-primary/30"
          : "bg-white border border-gray-100 shadow-sm",
      ].join(" ")}
    >
      <div className={["w-10 h-10 rounded-xl flex items-center justify-center mb-2",
        highlight ? "bg-primary/20" : "bg-gray-50"].join(" ")}>
        <span className={["material-symbols-outlined text-[22px]",
          highlight ? "text-primary" : "text-primary-deep"].join(" ")}>{icon}</span>
      </div>
      <p className={["text-xs font-bold uppercase tracking-widest",
        highlight ? "text-primary/70" : "text-text-ghost"].join(" ")}>{label}</p>
      <p className={["font-headline font-black text-2xl leading-tight",
        highlight ? "text-primary" : "text-text-main"].join(" ")}>{value}</p>
      {sub && <p className="text-text-ghost text-xs mt-0.5">{sub}</p>}
    </m.div>
  );
}

// ─── Car Picker Modal ─────────────────────────────────────────────────────────
function CarPickerModal({
  cars, selected, onSelect, onClose,
}: {
  cars: CalcCar[];
  selected: CalcCar | null;
  onSelect: (car: CalcCar) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter(c => `${c.brand} ${c.name}`.toLowerCase().includes(q));
  }, [cars, query]);

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <m.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: "90dvh" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="font-headline font-black text-lg text-text-main">Elige el auto que te interesa</h2>
              <p className="text-text-ghost text-xs mt-0.5">{cars.length} modelos disponibles</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[18px] text-text-muted">close</span>
            </button>
          </div>

          <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="material-symbols-outlined text-[18px] text-text-ghost">search</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar por marca o modelo…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-text-main placeholder-text-ghost outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")}>
                  <span className="material-symbols-outlined text-[16px] text-text-ghost hover:text-text-main">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-4">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-[48px] text-gray-200">search_off</span>
                <p className="text-text-muted text-sm mt-3">No se encontraron resultados para "{query}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map(car => {
                  const isSelected = selected?._id === car._id;
                  const price      = car.discountPrice ?? car.basePrice;
                  const badge      = carTypeBadge(car.electricTypeTag);
                  return (
                    <button
                      key={car._id}
                      onClick={() => { onSelect(car); onClose(); }}
                      className={[
                        "flex items-center gap-3 rounded-xl p-3 text-left border transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-[0_0_0_2px_rgba(0,229,229,0.3)]"
                          : "border-gray-100 hover:border-primary/40 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <div className="flex-shrink-0 w-16 h-12 bg-gray-100 rounded-lg overflow-hidden">
                        {car.imageUrl ? (
                          <Image src={car.imageUrl} alt={car.name} width={64} height={48}
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-[24px] text-gray-300">electric_car</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-[11px] font-bold text-text-ghost uppercase tracking-wide truncate">{car.brand}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                        </div>
                        <p className="font-headline font-bold text-sm text-text-main leading-tight truncate">{car.name}</p>
                        <p className="text-[11px] text-text-ghost mt-0.5 truncate">{carSpecLabel(car)}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-black">check</span>
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-text-main">{formatCLP(price)}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props { cars: CalcCar[] }

export default function CalculadoraContent({ cars }: Props) {
  const [kmPerMonth,        setKmPerMonth]        = useState(500);
  const [rendimientoKmL,    setRendimientoKmL]    = useState(DEFAULT_RENDIMIENTO);
  const [useDefaultRend,    setUseDefaultRend]    = useState(false);
  const [selectedCar,       setSelectedCar]       = useState<CalcCar | null>(null);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number | null>(null);
  const [pickerOpen,        setPickerOpen]        = useState(false);

  const efectiveRend = useDefaultRend ? DEFAULT_RENDIMIENTO : rendimientoKmL;

  const validCars = useMemo(() =>
    cars.filter(c => {
      const type = getCarType(c.electricTypeTag);
      if (type === "PHEV") return (c.electricRangeKm ?? 0) > 0;
      if (type === "HEV")  return (c.fuelConsumption ?? 0) > 0 && (c.fuelConsumption ?? 0) <= 20;
      return c.range > 0 && c.batteryCapacity > 0;
    }),
  [cars]);

  const similarCars = useMemo(() => {
    if (!selectedCar) return validCars.slice(0, 5);
    const refPrice = selectedCar.discountPrice ?? selectedCar.basePrice;
    return validCars
      .filter(c => c._id !== selectedCar._id)
      .map(c => {
        let score = 0;
        if (c.vehicleTypeSlug && c.vehicleTypeSlug === selectedCar.vehicleTypeSlug) score += 40;
        const cPrice    = c.discountPrice ?? c.basePrice;
        const priceDiff = Math.abs(cPrice - refPrice) / Math.max(refPrice, 1);
        score += Math.max(0, 30 - Math.round(priceDiff * 100));
        if (c.electricTypeTag && c.electricTypeTag === selectedCar.electricTypeTag) score += 20;
        return { car: c, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ car }) => car);
  }, [validCars, selectedCar]);

  const topCars = useMemo(() =>
    selectedCar ? similarCars : validCars.slice(0, 5),
  [selectedCar, similarCars, validCars]);

  const handleSelectCar = useCallback((car: CalcCar) => {
    setSelectedCar(car);
    setSelectedVersionIdx(null);
  }, []);

  const activeVersions = selectedCar?.versions?.filter(v => v.name && v.price > 0) ?? [];
  const activeVersion  = activeVersions.length > 0 && selectedVersionIdx !== null
    ? activeVersions[selectedVersionIdx] ?? null
    : null;

  const gasCostMonth = Math.round((kmPerMonth / efectiveRend) * BENCINA_CLP_L);

  const results = useMemo(() => {
    const currentCO2PerKm    = (1 / efectiveRend) * CO2_GAS_KG_L;
    const co2SavedKgYear     = kmPerMonth * 12 * (currentCO2PerKm - CO2_EV_KG_KM);
    const treesEquiv         = Math.round(Math.max(0, co2SavedKgYear) / 1000 * TREES_PER_TON_CO2);

    let newCarMonth: number;
    let isEstimate: boolean;

    if (selectedCar) {
      newCarMonth = calcCarMonthlyCost(selectedCar, kmPerMonth, activeVersion);
      isEstimate  = false;
    } else {
      const avgCost = topCars.length > 0
        ? Math.round(topCars.reduce((s, c) => s + calcCarMonthlyCost(c, kmPerMonth), 0) / topCars.length)
        : 0;
      newCarMonth = avgCost;
      isEstimate  = true;
    }

    const savingMonth  = gasCostMonth - newCarMonth;
    const savingYear   = savingMonth * 12;
    const saving5yr    = savingYear * 5;
    const savingPct    = gasCostMonth > 0 ? Math.round((savingMonth / gasCostMonth) * 100) : 0;

    const enriched = (list: CalcCar[]) => list.map(car => {
      const cm = calcCarMonthlyCost(car, kmPerMonth);
      return {
        ...car,
        newCarMonth: cm,
        savingMonth: gasCostMonth - cm,
        savingPct:   gasCostMonth > 0 ? Math.round(((gasCostMonth - cm) / gasCostMonth) * 100) : 0,
      };
    });

    const selectedEntry = selectedCar ? {
      ...selectedCar,
      basePrice:     activeVersion?.price ?? selectedCar.basePrice,
      discountPrice: activeVersion?.discountPrice ?? activeVersion?.price ?? selectedCar.discountPrice,
      newCarMonth, savingMonth, savingPct,
    } : null;
    const comparisonList = selectedEntry
      ? [selectedEntry, ...enriched(similarCars)]
      : enriched(topCars);

    return { newCarMonth, savingMonth, savingYear, saving5yr, savingPct,
             co2SavedKgYear, treesEquiv, comparisonList, isEstimate };
  }, [kmPerMonth, gasCostMonth, efectiveRend, selectedCar, topCars, similarCars]);

  return (
    <>
      {pickerOpen && (
        <CarPickerModal
          cars={validCars}
          selected={selectedCar}
          onSelect={handleSelectCar}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-black pt-20 pb-16 md:pt-28 md:pb-20 overflow-hidden relative">
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
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-10">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/60">Calculadora de ahorro</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left – inputs */}
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full mb-5">
                <span className="material-symbols-outlined text-primary text-[14px]">calculate</span>
                <span className="text-white/60 text-xs font-semibold">Calculadora gratuita</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-headline font-black text-white tracking-tighter leading-[0.92] mb-4">
                ¿Cuánto puedes<br /><span className="text-primary">ahorrar con un electrico?</span>
              </h1>
              <p className="text-white/60 text-base leading-relaxed max-w-md mb-8">
                Ingresa tu uso mensual y tu consumo actual, elige el auto que te interesa y calcula tu ahorro real.
              </p>

              {/* Car picker trigger */}
              <div className="mb-8">
                <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Auto que te interesa</p>
                {selectedCar ? (
                  <div className="flex items-center gap-3 bg-white/5 border border-primary/30 rounded-xl px-4 py-3">
                    <div className="flex-shrink-0 w-14 h-10 bg-white/5 rounded-lg overflow-hidden">
                      {selectedCar.imageUrl ? (
                        <Image src={selectedCar.imageUrl} alt={selectedCar.name} width={56} height={40}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[20px] text-white/20">electric_car</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-[11px] font-bold uppercase tracking-wide">{selectedCar.brand}</p>
                      <p className="text-white font-headline font-bold text-sm leading-tight truncate">{selectedCar.name}</p>
                      <p className="text-primary/70 text-[11px]">{carSpecLabel(selectedCar)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setPickerOpen(true)} className="text-white/50 hover:text-white text-[11px] font-semibold transition-colors">
                        Cambiar
                      </button>
                      <button
                        onClick={() => setSelectedCar(null)}
                        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px] text-white/50">close</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="w-full flex items-center gap-3 border border-dashed border-white/20 hover:border-primary/50 hover:bg-white/[0.03] rounded-xl px-4 py-3.5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[20px] text-white/30 group-hover:text-primary transition-colors">search</span>
                    </div>
                    <div className="text-left">
                      <p className="text-white/60 text-sm font-semibold group-hover:text-white transition-colors">Seleccionar un auto</p>
                      <p className="text-white/30 text-xs">Elige el modelo que te interesa para un cálculo exacto</p>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-white/20 ml-auto group-hover:text-primary/60 transition-colors">arrow_forward_ios</span>
                  </button>
                )}
              </div>

              {/* Version selector — only shows when car has multiple versions */}
              {selectedCar && activeVersions.length > 1 && (
                <div className="mb-2">
                  <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Versión</p>
                  <div className="flex flex-wrap gap-2">
                    {activeVersions.map((v, i) => {
                      const isActive = selectedVersionIdx === i;
                      const price    = v.discountPrice ?? v.price;
                      return (
                        <button
                          key={v._key}
                          onClick={() => setSelectedVersionIdx(isActive ? null : i)}
                          className="flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all duration-200"
                          style={isActive
                            ? { borderColor: "#00E5E5", backgroundColor: "rgba(0,229,229,0.10)" }
                            : { borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.03)" }}
                        >
                          <span className="text-[11px] font-bold leading-tight" style={{ color: isActive ? "#00E5E5" : "rgba(255,255,255,0.75)" }}>
                            {v.name}
                          </span>
                          <span className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {formatCLP(price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedVersionIdx === null && (
                    <p className="text-white/25 text-[11px] mt-1.5">Selecciona una versión para calcular con sus specs exactas</p>
                  )}
                </div>
              )}

              <div className="space-y-8">
                <Slider
                  label="Kilómetros por mes"
                  icon="route"
                  value={kmPerMonth}
                  min={50} max={2000} step={50}
                  format={v => `${formatNum(v)} km`}
                  onChange={setKmPerMonth}
                  editable
                />

                {/* Rendimiento actual */}
                <div>
                  <Slider
                    label="Rendimiento de tu auto actual"
                    icon="local_gas_station"
                    value={rendimientoKmL}
                    min={5} max={25} step={1}
                    format={v => `${v} km/L`}
                    onChange={setRendimientoKmL}
                    disabled={useDefaultRend}
                  />
                  <label className="flex items-center gap-2 mt-3 cursor-pointer group w-fit select-none">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={useDefaultRend}
                      onChange={e => setUseDefaultRend(e.target.checked)}
                    />
                    <div
                      className="relative w-4 h-4 rounded flex-shrink-0 border transition-colors"
                      style={{
                        backgroundColor: useDefaultRend ? "#00E5E5" : "transparent",
                        borderColor: useDefaultRend ? "#00E5E5" : "rgba(255,255,255,0.25)",
                      }}
                    >
                      {useDefaultRend && (
                        <span className="material-symbols-outlined text-black absolute inset-0 flex items-center justify-center leading-none" style={{ fontSize: 11 }}>check</span>
                      )}
                    </div>
                    <span className="text-white/40 text-xs group-hover:text-white/60 transition-colors">
                      No sé mi rendimiento — usar estándar de {DEFAULT_RENDIMIENTO} km/L
                    </span>
                  </label>
                </div>
              </div>

              <p className="text-white/20 text-xs mt-6">
                * Tarifa eléctrica $200/kWh · Bencina $1.600/L · PHEVs asumen carga diaria
                {results.isEstimate && " · Promedio de los primeros modelos disponibles"}
              </p>
            </div>

            {/* Right – live summary */}
            <div className="relative">
              <div className="rounded-2xl p-8 space-y-6" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
                {selectedCar && (
                  <div className="pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                    <div className="flex items-center gap-2">
                      {selectedCar.brandLogoUrl ? (
                        <img src={selectedCar.brandLogoUrl} alt={selectedCar.brand}
                          className="h-5 w-auto max-w-[40px] object-contain opacity-70 flex-shrink-0" loading="lazy" decoding="async" />
                      ) : (
                        <span className="material-symbols-outlined text-primary text-[16px] flex-shrink-0">electric_car</span>
                      )}
                      <p className="text-primary text-sm font-bold truncate">{selectedCar.brand} {selectedCar.name}</p>
                    </div>
                    {activeVersion && (
                      <p className="text-white/40 text-[11px] mt-1 ml-0.5">{activeVersion.name}</p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-1">Tu gasto actual en combustible</p>
                  <p className="text-white font-headline font-black text-3xl">
                    {formatCLP(gasCostMonth)}
                    <span className="text-white/40 text-base font-normal">/mes</span>
                  </p>
                  <p className="text-white/25 text-xs mt-0.5">
                    {formatNum(kmPerMonth)} km ÷ {efectiveRend} km/L × $1.600/L
                  </p>
                </div>

                <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.10)" }} />

                <div>
                  <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-1">
                    {selectedCar
                      ? `Costo estimado con el ${selectedCar.name}`
                      : "Con un auto electrificado pagarías (promedio)"}
                  </p>
                  <p className="text-primary font-headline font-black text-3xl">
                    {formatCLP(results.newCarMonth)}
                    <span className="text-primary/60 text-base font-normal">/mes</span>
                  </p>
                  {selectedCar && (
                    <p className="text-white/30 text-xs mt-1">
                      {activeVersion
                        ? carSpecLabel({ ...selectedCar,
                            batteryCapacity: activeVersion.batteryCapacity ?? selectedCar.batteryCapacity,
                            range:           activeVersion.range           ?? selectedCar.range,
                            electricRangeKm: activeVersion.electricRangeKm ?? selectedCar.electricRangeKm,
                            fuelConsumption: activeVersion.fuelConsumption  ?? selectedCar.fuelConsumption,
                          })
                        : carSpecLabel(selectedCar)}
                    </p>
                  )}
                </div>

                <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.10)" }} />

                <div
                  className="rounded-xl p-5"
                  style={results.savingMonth > 0
                    ? { backgroundColor: "rgba(0,229,229,0.10)", border: "1px solid rgba(0,229,229,0.20)" }
                    : { backgroundColor: "rgba(255,255,255,0.05)" }}
                >
                  <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">
                    {results.savingMonth > 0 ? "Tu ahorro estimado" : "Diferencia estimada"}
                  </p>
                  <div className="flex items-baseline gap-3">
                    <p className={["font-headline font-black text-4xl", results.savingMonth > 0 ? "text-primary" : "text-white/60"].join(" ")}>
                      {results.savingMonth > 0 ? "+" : ""}{formatCLP(Math.abs(results.savingMonth))}
                    </p>
                    <p className="text-white/40 text-sm">al mes</p>
                  </div>
                  {results.savingMonth > 0 && (
                    <>
                      <p className="text-primary/70 text-sm mt-1 font-semibold">
                        {formatCLP(results.savingYear)} al año · {formatCLP(results.saving5yr)} en 5 años
                      </p>
                      <p className="text-primary/50 text-xs mt-0.5">{results.savingPct}% menos que en combustible</p>
                    </>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20 bg-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ────────────────────────────────────────────────────── */}
      <section className="py-12 bg-surface border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {results.isEstimate && (
            <p className="text-center text-text-ghost text-xs mb-4">
              Ahorro promedio calculado con los modelos más accesibles —{" "}
              <button onClick={() => setPickerOpen(true)} className="text-primary-deep font-semibold underline underline-offset-2">
                elige tu auto para un resultado exacto
              </button>
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="savings"        label="Ahorro mensual"  value={formatCLP(Math.max(0, results.savingMonth))}  highlight={results.savingMonth > 0} delay={0} />
            <StatCard icon="calendar_month" label="Ahorro anual"    value={formatCLP(Math.max(0, results.savingYear))}  delay={0.07} />
            <StatCard icon="eco"            label="CO₂ ahorrado"    value={`${formatNum(Math.round(Math.max(0, results.co2SavedKgYear)))} kg`} sub="por año" delay={0.14} />
            <StatCard icon="forest"         label="Árboles equiv."  value={`${formatNum(results.treesEquiv)}`} sub="por año" delay={0.21} />
          </div>
        </div>
      </section>

      {/* ─── Comparison list ──────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-deep mb-2">
              Tu perfil: {formatNum(kmPerMonth)} km/mes · {efectiveRend} km/L actual
            </p>
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-text-main">
              {selectedCar ? "Tu selección y alternativas similares" : "Los modelos más convenientes para ti"}
            </h2>
            <p className="text-text-muted text-sm mt-1">
              Costo mensual estimado con tu perfil de conducción · eléctrico, híbrido enchufable e híbrido
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {results.comparisonList.map((car, i) => {
              const price      = car.discountPrice ?? car.basePrice;
              const isSelected = selectedCar?._id === car._id;
              const badge      = carTypeBadge(car.electricTypeTag);
              return (
                <m.div
                  key={car._id}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className={[
                    "group relative flex flex-row items-center gap-3 sm:gap-5 rounded-2xl p-4 sm:p-5 transition-all duration-300",
                    isSelected
                      ? "border-2 border-primary bg-primary/[0.03] shadow-[0_0_0_4px_rgba(0,229,229,0.08)]"
                      : "border border-gray-100 bg-white hover:border-primary/30 hover:shadow-md",
                  ].join(" ")}
                >
                  <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full items-center justify-center"
                    style={{ background: isSelected ? "rgba(0,229,229,0.15)" : "#f9fafb" }}>
                    {isSelected ? (
                      <span className="material-symbols-outlined text-[16px] text-primary">star</span>
                    ) : (
                      <span className="font-headline font-black text-sm text-text-ghost">{i + 1}</span>
                    )}
                  </div>

                  <div className="flex-shrink-0 w-16 h-12 sm:w-28 sm:h-20 bg-gray-50 rounded-xl overflow-hidden">
                    {car.imageUrl ? (
                      <Image src={car.imageUrl} alt={car.name} width={112} height={80}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[28px] sm:text-[36px] text-gray-200">electric_car</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-text-ghost text-xs font-semibold">{car.brand}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                    </div>
                    <h3 className="font-headline font-bold text-text-main text-sm sm:text-base leading-tight">{car.name}</h3>
                    <p className="text-text-ghost text-xs mt-0.5 hidden sm:block">{carSpecLabel(car)}</p>
                    {car.savingMonth > 0 && (
                      <p className="sm:hidden font-headline font-black text-sm text-primary-deep mt-0.5">
                        +{formatCLP(car.savingMonth)}<span className="text-text-ghost font-normal text-[11px]">/mes</span>
                      </p>
                    )}
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 mt-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[11px]">check_circle</span>
                        Tu selección
                      </span>
                    )}
                  </div>

                  <div className="hidden sm:block text-center flex-shrink-0">
                    <p className="text-text-ghost text-xs uppercase tracking-wide font-bold">Costo mensual</p>
                    <p className="font-headline font-black text-lg text-text-main">
                      {formatCLP(car.newCarMonth)}<span className="text-text-ghost text-xs font-normal">/mes</span>
                    </p>
                  </div>

                  <div className={["hidden sm:block text-center flex-shrink-0 px-4 py-2 rounded-xl",
                    car.savingMonth > 0 ? "bg-primary/10" : "bg-gray-50"].join(" ")}>
                    <p className="text-text-ghost text-xs uppercase tracking-wide font-bold">Ahorro mensual</p>
                    <p className={["font-headline font-black text-lg",
                      car.savingMonth > 0 ? "text-primary-deep" : "text-text-ghost"].join(" ")}>
                      {car.savingMonth > 0 ? "+" : ""}{formatCLP(car.savingMonth)}
                    </p>
                    {car.savingMonth > 0 && (
                      <p className="text-primary-deep/70 text-[11px] font-bold">{car.savingPct}% menos</p>
                    )}
                  </div>

                  <div className="text-right sm:text-center flex-shrink-0">
                    <p className="hidden sm:block text-text-ghost text-xs mb-0.5">Desde</p>
                    <p className="hidden sm:block font-headline font-bold text-text-main text-base">{formatCLP(price)}</p>
                    <Link
                      href={`/solicitar?auto=${car.slug}`}
                      className="relative z-[1] mt-0 sm:mt-2 inline-flex items-center gap-1 bg-primary hover:bg-primary-dark text-black font-bold text-xs px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all shadow-[0_2px_12px_rgba(0,229,229,0.25)] hover:shadow-[0_4px_18px_rgba(0,229,229,0.40)] hover:scale-[1.02]"
                    >
                      Lo quiero
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>

                  <Link href={`/auto/${car.slug}`} className="absolute inset-0 rounded-2xl z-0" aria-label={`Ver ${car.brand} ${car.name}`} />
                </m.div>
              );
            })}
          </div>

          {!selectedCar && (
            <div className="mt-10 text-center">
              <button
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-2 border border-primary/30 hover:border-primary text-primary-deep hover:text-primary font-semibold px-6 py-3 rounded-xl transition-all text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                Buscar mi auto ideal
              </button>
              <p className="text-text-ghost text-xs mt-2">Selecciona el auto que te interesa para ver su ahorro exacto</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="py-14 bg-surface border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-black rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-primary text-xs uppercase tracking-widest font-bold mb-2">¿Convencido?</p>
              <h2 className="text-white font-headline font-black text-2xl md:text-3xl tracking-tight">
                {selectedCar
                  ? `Consigue el mejor precio en el ${selectedCar.name}`
                  : "Solicita tu oferta y empieza a ahorrar"}
              </h2>
              <p className="text-white/50 text-sm mt-1">
                Negociamos por ti con nuestra red exclusiva de vendedores en Chile.
              </p>
            </div>
            <Link
              href={selectedCar ? `/solicitar?auto=${selectedCar.slug}` : "/solicitar"}
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
