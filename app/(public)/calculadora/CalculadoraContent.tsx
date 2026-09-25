"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import { formatCLP, formatNumber } from "@/lib/utils";
import type { CalcCar, CalcVersion } from "./types";
import { Icon } from "@/components/ui/Icon";
import { ElectricTypeBadge } from "@/components/car/ElectricTypeBadge";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE, OFERTA_STANDBY } from "@/lib/products";

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
  if (type === "BEV")  return car.range > 0 ? `${formatNumber(car.range)} km de autonomía, ${formatNumber(car.batteryCapacity)} kWh` : `${formatNumber(car.batteryCapacity)} kWh`;
  if (type === "PHEV") return car.electricRangeKm ? `${formatNumber(car.electricRangeKm)} km de autonomía eléctrica, ${formatNumber(car.batteryCapacity)} kWh` : `${formatNumber(car.batteryCapacity)} kWh PHEV`;
  return car.fuelConsumption ? `${formatNumber(car.fuelConsumption)} km/L híbrido` : "HEV";
}

// ─── Slider ──────────────────────────────────────────────────────────────────
// Riel de 4 px en Laguna sobre Línea fuerte; el control ocupa 28 px de alto para que sea fácil de tomar.
const RANGE_CLASS = [
  "h-7 w-full cursor-pointer appearance-none bg-transparent bg-center bg-no-repeat disabled:cursor-default",
  "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-canvas [&::-webkit-slider-thumb]:bg-accent",
  "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full",
  "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-canvas [&::-moz-range-thumb]:bg-accent",
  "[&::-moz-range-track]:bg-transparent",
  "disabled:[&::-webkit-slider-thumb]:bg-line-2 disabled:[&::-moz-range-thumb]:bg-line-2",
].join(" ");

function Slider({
  id, label, value, min, max, step, format, onChange, editable = false, disabled = false,
}: {
  id: string; label: string; value: number;
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
    <div className="field">
      <div className="flex min-h-12 items-center justify-between gap-4">
        <label htmlFor={id} className={`field__label ${disabled ? "text-ink-3" : ""}`}>{label}</label>
        {editable ? (
          <div className="relative w-[7.5rem] flex-none">
            <input
              type="text"
              inputMode="numeric"
              value={draft ?? value}
              onChange={e => setDraft(e.target.value)}
              onBlur={e => commitDraft(e.target.value)}
              onKeyDown={e => e.key === "Enter" && commitDraft((e.target as HTMLInputElement).value)}
              aria-label={`${label}, valor exacto`}
              className="input pr-11 text-right font-semibold tabular-nums"
            />
            <span aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3">km</span>
          </div>
        ) : (
          <output htmlFor={id} className={`font-semibold tabular-nums ${disabled ? "text-ink-3" : "text-ink"}`}>
            {format(value)}
          </output>
        )}
      </div>
      <input
        id={id}
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className={RANGE_CLASS}
        style={{
          backgroundImage: `linear-gradient(to right, ${disabled ? "var(--line-2)" : "var(--accent)"} ${pct}%, var(--line-2) ${pct}%)`,
          backgroundSize: "100% 4px",
        }}
      />
      <div className="t-micro flex justify-between">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
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
        className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-[var(--veil-modal)]" />
        <m.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="calc-picker-title"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative flex w-full flex-col overflow-hidden rounded-t-card bg-canvas text-ink shadow-overlay sm:max-w-xl sm:rounded-card"
          style={{ maxHeight: "90dvh" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-none items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6 sm:py-5">
            <div>
              <h2 id="calc-picker-title" className="font-display text-[1.375rem] font-bold leading-tight tracking-[-0.012em]">
                Elige el auto que te interesa
              </h2>
              <p className="t-small mt-1">{cars.length} modelos disponibles</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="btn btn--secondary btn--icon btn--sm flex-none">
              <Icon name="close" size="none" />
            </button>
          </div>

          <div className="flex-none border-b border-line px-5 py-4 sm:px-6">
            <div className="relative">
              <Icon
                name="search"
                size="none"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-ink-3"
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar por marca o modelo…"
                aria-label="Buscar por marca o modelo"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="input pl-11 pr-12"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar búsqueda"
                  className="btn btn--quiet btn--icon btn--sm absolute right-1 top-1/2 -translate-y-1/2"
                >
                  <Icon name="close" size="none" />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-6 py-16 text-center text-ink-2">
                No se encontraron resultados para “{query}”
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {filtered.map(car => {
                  const isSelected = selected?._id === car._id;
                  const price      = car.discountPrice ?? car.basePrice;
                  return (
                    <li key={car._id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => { onSelect(car); onClose(); }}
                        className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors sm:px-6 ${
                          isSelected ? "bg-canvas-2" : "hover:bg-canvas-2"
                        }`}
                      >
                        <span className="relative h-10 w-16 flex-none overflow-hidden rounded-chip bg-canvas-2">
                          {car.imageUrl ? (
                            <Image src={car.imageUrl} alt={car.name} width={64} height={40}
                              className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center">
                              <Icon name="electric_car" className="text-[20px] text-line-2" />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-label font-semibold text-ink-3">{car.brand}</span>
                            <ElectricTypeBadge tag={car.electricTypeTag} onMedia={false} />
                          </span>
                          <span className="mt-0.5 block truncate font-semibold text-ink">{car.name}</span>
                          <span className="block truncate text-label text-ink-2">{carSpecLabel(car)}</span>
                        </span>
                        <span className="flex-none text-right">
                          {isSelected ? (
                            <>
                              <Icon name="check" className="text-[20px] text-link" />
                              <span className="sr-only">Seleccionado</span>
                            </>
                          ) : (
                            <span className="font-semibold tabular-nums text-ink">{formatCLP(price)}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
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

  const activeVersions = useMemo(
    () => selectedCar?.versions?.filter(v => v.name && v.price > 0) ?? [],
    [selectedCar],
  );
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
  // activeVersion faltaba en las dependencias: elegir una versión no recalculaba el ahorro.
  }, [kmPerMonth, gasCostMonth, efectiveRend, selectedCar, activeVersion, topCars, similarCars]);

  const saves = results.savingMonth > 0;
  const ctaTitle = selectedCar
    ? `¿No sabes si el ${selectedCar.name} es para ti?`
    : "¿No sabes cuál te conviene?";

  return (
    <div className="page">
      {pickerOpen && (
        <CarPickerModal
          cars={validCars}
          selected={selectedCar}
          onSelect={handleSelectCar}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* ─── Encabezado, formulario y resultado ─────────────────────── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Calculadora de ahorro</span>
          </nav>

          <div className="mt-[clamp(32px,4vw,48px)]">
            <h1 className="t-h1">¿Cuánto puedes ahorrar con un electrificado?</h1>
            <p className="t-lead">
              Ingresa tu uso mensual y tu consumo actual, elige el auto que te interesa y calcula tu ahorro real.
            </p>
          </div>

          <div className="page-head__grid page-head__grid--top">
            {/* Formulario */}
            <div className="grid gap-8">
              {/* Auto que te interesa */}
              <div className="field">
                <p className="field__label">Auto que te interesa</p>
                {selectedCar ? (
                  <div className="flex items-center gap-3 rounded-control border border-line-2 bg-canvas py-3 pl-3 pr-2">
                    <div className="relative h-10 w-16 flex-none overflow-hidden rounded-chip bg-canvas-2">
                      {selectedCar.imageUrl ? (
                        <Image src={selectedCar.imageUrl} alt={selectedCar.name} width={64} height={40}
                          className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <Icon name="electric_car" className="text-[20px] text-line-2" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-label font-semibold text-ink-3">{selectedCar.brand}</p>
                      <p className="truncate font-semibold text-ink">{selectedCar.name}</p>
                      <p className="truncate text-label text-ink-2">{carSpecLabel(selectedCar)}</p>
                    </div>
                    <button type="button" onClick={() => setPickerOpen(true)} className="btn btn--quiet btn--sm flex-none">
                      Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCar(null)}
                      aria-label="Quitar auto"
                      className="btn btn--secondary btn--icon btn--sm flex-none"
                    >
                      <Icon name="close" size="none" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex w-full items-center gap-3 rounded-control border border-line-2 bg-canvas px-4 py-3 text-left transition-colors hover:border-ink-3"
                  >
                    <Icon name="search" size="none" className="flex-none text-[20px] text-ink-3" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">Seleccionar un auto</span>
                      <span className="t-small block">Elige el modelo que te interesa para un cálculo exacto</span>
                    </span>
                    <Icon name="chevron_right" size="none" className="flex-none text-[20px] text-ink-3" />
                  </button>
                )}
              </div>

              {/* Versión: solo si el auto tiene varias */}
              {selectedCar && activeVersions.length > 1 && (
                <div className="field">
                  <p className="field__label">Versión</p>
                  <div className="flex flex-wrap gap-2">
                    {activeVersions.map((v, i) => {
                      const isActive = selectedVersionIdx === i;
                      const price    = v.discountPrice ?? v.price;
                      return (
                        <button
                          key={v._key}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setSelectedVersionIdx(isActive ? null : i)}
                          className="pill"
                        >
                          {v.name}
                          <span className="n">{formatCLP(price)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedVersionIdx === null && (
                    <p className="t-micro">Selecciona una versión para calcular con sus specs exactas</p>
                  )}
                </div>
              )}

              <Slider
                id="calc-km"
                label="Kilómetros por mes"
                value={kmPerMonth}
                min={50} max={2000} step={50}
                format={v => `${formatNum(v)} km`}
                onChange={setKmPerMonth}
                editable
              />

              {/* Rendimiento actual */}
              <div className="grid gap-3">
                <Slider
                  id="calc-rend"
                  label="Rendimiento de tu auto actual"
                  value={rendimientoKmL}
                  min={5} max={25} step={1}
                  format={v => `${v} km/L`}
                  onChange={setRendimientoKmL}
                  disabled={useDefaultRend}
                />
                <label className="fopt relative w-fit select-none">
                  <input
                    type="checkbox"
                    checked={useDefaultRend}
                    onChange={e => setUseDefaultRend(e.target.checked)}
                  />
                  <span className="box"><Icon name="check" size="none" /></span>
                  <span className="lbl">No sé mi rendimiento, usar estándar de {DEFAULT_RENDIMIENTO} km/L</span>
                </label>
              </div>

              <p className="t-micro">
                * Tarifa eléctrica $200/kWh, bencina $1.600/L, PHEVs asumen carga diaria
                {results.isEstimate && ", promedio de los primeros modelos disponibles"}.
              </p>
            </div>

            {/* Resultado en vivo */}
            <div className="rounded-card border border-line bg-canvas-2 p-6 md:p-8">
              {selectedCar && (
                <div className="mb-5 flex items-center gap-3 border-b border-line pb-5">
                  {selectedCar.brandLogoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedCar.brandLogoUrl}
                      alt={selectedCar.brand}
                      className="h-6 w-auto max-w-[48px] flex-none object-contain opacity-70 grayscale"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{selectedCar.brand} {selectedCar.name}</p>
                    {activeVersion && <p className="t-small truncate">{activeVersion.name}</p>}
                  </div>
                </div>
              )}

              <dl>
                <div>
                  <dt className="t-small">Tu gasto actual en combustible</dt>
                  <dd className="mt-1">
                    <span className="price">{formatCLP(gasCostMonth)}</span>
                    <span className="t-small">/mes</span>
                  </dd>
                  <dd className="t-micro mt-1">
                    {formatNum(kmPerMonth)} km ÷ {efectiveRend} km/L × $1.600/L
                  </dd>
                </div>

                <div className="mt-5 border-t border-line pt-5">
                  <dt className="t-small">
                    {selectedCar
                      ? `Costo estimado con el ${selectedCar.name}`
                      : "Con un auto electrificado pagarías (promedio)"}
                  </dt>
                  <dd className="mt-1">
                    <span className="price">{formatCLP(results.newCarMonth)}</span>
                    <span className="t-small">/mes</span>
                  </dd>
                  {selectedCar && (
                    <dd className="t-micro mt-1">
                      {activeVersion
                        ? carSpecLabel({ ...selectedCar,
                            batteryCapacity: activeVersion.batteryCapacity ?? selectedCar.batteryCapacity,
                            range:           activeVersion.range           ?? selectedCar.range,
                            electricRangeKm: activeVersion.electricRangeKm ?? selectedCar.electricRangeKm,
                            fuelConsumption: activeVersion.fuelConsumption  ?? selectedCar.fuelConsumption,
                          })
                        : carSpecLabel(selectedCar)}
                    </dd>
                  )}
                </div>

                {/* El ahorro es el único dato destacado de la página */}
                <div className="mt-5 border-t border-line pt-5">
                  <dt className="t-label">{saves ? "Tu ahorro estimado" : "Diferencia estimada"}</dt>
                  <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <span className={`price price--lg ${saves ? "text-link" : "text-ink-3"}`}>
                      {saves ? "+" : ""}{formatCLP(Math.abs(results.savingMonth))}
                    </span>
                    <span className="t-small">al mes</span>
                  </dd>
                  {saves && (
                    <dd className="t-small mt-1">{results.savingPct}% menos que en combustible</dd>
                  )}
                </div>
              </dl>

              {results.isEstimate && (
                <p className="t-small mt-5 border-t border-line pt-5">
                  Ahorro promedio calculado con los modelos más accesibles:{" "}
                  <button type="button" onClick={() => setPickerOpen(true)} className="link">
                    elige tu auto para un resultado exacto
                  </button>
                  .
                </p>
              )}
            </div>
          </div>

          {/* Cifras a largo plazo */}
          <div className="kpis">
            <div className="kpi">
              <p className="kpi__num">{formatCLP(Math.max(0, results.savingYear))}</p>
              <p className="kpi__label">Ahorro anual</p>
            </div>
            <div className="kpi">
              <p className="kpi__num">{formatCLP(Math.max(0, results.saving5yr))}</p>
              <p className="kpi__label">Ahorro en 5 años</p>
            </div>
            <div className="kpi">
              <p className="kpi__num">{formatNum(Math.round(Math.max(0, results.co2SavedKgYear)))} kg</p>
              <p className="kpi__label">CO₂ ahorrado por año</p>
            </div>
            <div className="kpi">
              <p className="kpi__num">{formatNum(results.treesEquiv)}</p>
              <p className="kpi__label">Árboles equivalentes por año</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Comparación con tu perfil ──────────────────────────────── */}
      <section className="section" aria-labelledby="calc-list-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="calc-list-t">
                {selectedCar ? "Tu selección y alternativas similares" : "Los modelos más convenientes para ti"}
              </h2>
              <p className="t-lead">
                Costo mensual estimado con tu perfil de conducción ({formatNum(kmPerMonth)} km/mes, {efectiveRend} km/L actual), en eléctricos, híbridos enchufables e híbridos.
              </p>
            </div>
          </div>

          <ol className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {results.comparisonList.map((car, i) => {
              const price      = car.discountPrice ?? car.basePrice;
              const isSelected = selectedCar?._id === car._id;
              const carSaves   = car.savingMonth > 0;
              return (
                <li
                  key={car._id}
                  className={`relative flex items-center gap-3 px-4 py-4 transition-colors sm:gap-5 sm:px-5 ${
                    isSelected ? "bg-canvas-2" : "hover:bg-canvas-2"
                  }`}
                >
                  <span className="hidden w-6 flex-none text-center font-semibold tabular-nums text-ink-3 lg:block">
                    {isSelected ? <Icon name="star" className="text-[18px] text-link" /> : i + 1}
                  </span>

                  <div className="relative h-10 w-16 flex-none overflow-hidden rounded-chip bg-canvas-2 sm:h-[70px] sm:w-28 sm:rounded-control">
                    {car.imageUrl ? (
                      <Image src={car.imageUrl} alt={car.name} width={112} height={70}
                        className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <Icon name="electric_car" className="text-[28px] text-line-2" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-label font-semibold text-ink-3">{car.brand}</p>
                      <ElectricTypeBadge tag={car.electricTypeTag} onMedia={false} />
                      {isSelected && <span className="chip chip--soft">Tu selección</span>}
                    </div>
                    <h3 className="mt-1 text-[1rem] font-semibold leading-tight text-ink sm:font-display sm:text-[1.25rem] sm:font-bold sm:tracking-[-0.01em]">
                      {car.name}
                    </h3>
                    <p className="t-small mt-1 hidden sm:block">{carSpecLabel(car)}</p>
                    {carSaves && (
                      <p className="price-save mt-1 lg:hidden">
                        +{formatCLP(car.savingMonth)}
                        <span className="font-normal text-ink-3">/mes</span>
                      </p>
                    )}
                  </div>

                  {/* Cifras: etiquetas y valores alineados arriba entre columnas */}
                  <div className="hidden flex-none items-start gap-5 text-right sm:flex">
                    <div className="hidden w-32 lg:block">
                      <p className="text-label text-ink-3">Costo mensual</p>
                      <p className="mt-1 font-semibold tabular-nums text-ink">
                        {formatCLP(car.newCarMonth)}
                        <span className="text-label font-normal text-ink-3">/mes</span>
                      </p>
                    </div>
                    <div className="hidden w-32 lg:block">
                      <p className="text-label text-ink-3">Ahorro mensual</p>
                      <p className={`mt-1 font-semibold tabular-nums ${carSaves ? "text-link" : "text-ink-3"}`}>
                        {carSaves ? "+" : ""}{formatCLP(car.savingMonth)}
                      </p>
                      {carSaves && <p className="t-micro">{car.savingPct}% menos</p>}
                    </div>
                    <div className="w-32">
                      <p className="text-label text-ink-3">Desde</p>
                      <p className="mt-1 font-semibold tabular-nums text-ink">{formatCLP(price)}</p>
                    </div>
                  </div>

                  <OfferCta
                    carSlug={car.slug}
                    model={car.name}
                    source="calculadora"
                    className="btn btn--secondary btn--sm relative z-[1] flex-none"
                  >
                    Lo quiero
                  </OfferCta>

                  <Link href={`/auto/${car.slug}`} className="absolute inset-0 z-0" aria-label={`Ver ${car.brand} ${car.name}`} />
                </li>
              );
            })}
          </ol>

          {!selectedCar && (
            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              <button type="button" onClick={() => setPickerOpen(true)} className="btn btn--secondary">
                <Icon name="search" size="none" />
                Buscar mi auto ideal
              </button>
              <p className="t-small">Selecciona el auto que te interesa para ver su ahorro exacto</p>
            </div>
          )}

          {/* ─── CTA final: Asesoría (principal) y waitlist ─────────────── */}
          <div className="soft-block cta-row mt-section">
            <div>
              <h2 className="t-h2">{ctaTitle}</h2>
              <p>
                Te asesoramos por WhatsApp según tu uso, tus kilómetros y tu presupuesto, y comparamos contigo los modelos que calzan.
              </p>
            </div>
            <div className="cta-row__actions">
              <Link href="/asesoria" className="btn btn--primary btn--lg">
                Quiero asesoría por {ASESORIA_PRICE}
                <Icon name="arrow_forward" size="none" className="arrow" />
              </Link>
              <OfferCta
                carSlug={selectedCar?.slug}
                model={selectedCar?.name}
                source="calculadora"
                className="btn btn--secondary btn--lg"
              >
                {OFERTA_STANDBY ? "Únete a la waitlist" : "Quiero mi oferta"}
              </OfferCta>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
