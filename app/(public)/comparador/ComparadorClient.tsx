"use client";

import React, { useState, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { formatCLP, formatNumber, sentenceCase } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { ElectricTypeBadge } from "@/components/car/ElectricTypeBadge";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE, HOT_DEALS_ENABLED, OFERTA_STANDBY } from "@/lib/products";

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
  /** Sigla del tipo eléctrico (EV, PHEV, HEV...) para el chip sobre la foto. */
  electricTypeTag?: string;
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
interface Row {
  label: string;
  key: keyof Car;
  unit?: string;
  type?: "price" | "text" | "number";
  highlight?: "high" | "low";
}

// Etiquetas completas, las mismas de la ficha técnica de la PDP.
const ROWS: Row[] = [
  { label: "Precio con descuento",  key: "discountPrice", type: "price" },
  { label: "Precio de lista",       key: "basePrice",     type: "price" },
  { label: "Autonomía",             key: "range",         unit: " km",   type: "number", highlight: "high" },
  { label: "Batería",               key: "battery",       unit: " kWh",  type: "number", highlight: "high" },
  { label: "Potencia",              key: "power",         unit: " CV",   type: "number", highlight: "high" },
  { label: "0 a 100 km/h",          key: "acceleration",  unit: " s",    type: "number", highlight: "low"  },
  { label: "Velocidad máxima",      key: "topSpeed",      unit: " km/h", type: "number", highlight: "high" },
  { label: "Carga rápida DC",       key: "chargeTimeDC",  type: "text" },
  { label: "Tipo de carga",         key: "chargeType",    type: "text" },
  { label: "Tracción",              key: "traction",      type: "text" },
  { label: "Categoría",             key: "category",      type: "text" },
  { label: "Maletero",              key: "cargo",         unit: " L",    type: "number", highlight: "high" },
  { label: "Altura libre al suelo", key: "ground",        unit: " mm",   type: "number", highlight: "high" },
  { label: "Plazas",                key: "seats",         type: "number" },
];

const SECTIONS = [
  { label: "Precio",          keys: ["discountPrice", "basePrice"] },
  { label: "Rendimiento",     keys: ["range", "battery", "power", "acceleration", "topSpeed"] },
  { label: "Carga eléctrica", keys: ["chargeTimeDC", "chargeType"] },
  { label: "Practicidad",     keys: ["traction", "category", "cargo", "ground", "seats"] },
];

const MAX_CARS = 3;

// Celdas de la tabla. En móvil la columna de etiquetas queda fija al deslizar.
const CELL = "px-3 py-3 text-[0.875rem] leading-snug md:px-5 md:py-3.5 md:text-[0.9375rem]";
const STICKY = "sticky left-0 z-[1]";

// Valores que en Sanity significan "sin dato": nunca se muestra un 0 o un N/D inventado.
const MISSING_TEXT = new Set(["", "—", "-", "N/D", "N/A", "ND", "NA"]);
const TRACTION_LABEL: Record<string, string> = {
  FWD: "Delantera (FWD)",
  RWD: "Trasera (RWD)",
  AWD: "Total (AWD)",
  "4WD": "Total (4WD)",
};

/** Coma decimal en textos de Sanity ("0.5h" → "0,5h"). */
function decimalComma(text: string) {
  return text.replace(/(\d)\.(\d)/g, "$1,$2");
}

/** Texto de una celda, o null si el auto no tiene ese dato. */
function cellText(car: Car, row: Row): string | null {
  const raw = car[row.key];
  if (row.type === "price" || row.type === "number") {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return row.type === "price" ? formatCLP(n) : `${formatNumber(n)}${row.unit ?? ""}`;
  }
  const text = String(raw ?? "").trim();
  if (MISSING_TEXT.has(text.toUpperCase())) return null;
  if (row.key === "traction") return TRACTION_LABEL[text.toUpperCase()] ?? text;
  if (row.key === "category") return sentenceCase(text);
  return decimalComma(text);
}

// ─── Car image component ──────────────────────────────────────────────────────
function CarImage({ url, name, className = "" }: { url?: string; name: string; className?: string }) {
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={480}
        height={300}
        sizes="(min-width: 768px) 320px, 140px"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    <span className="flex h-full w-full items-center justify-center">
      <Icon name="electric_car" className="text-[32px] text-line-2" />
    </span>
  );
}

// ─── Encabezado: qué hace la herramienta (solo desktop, como antes) ──────────
function HeroInfo() {
  const features = [
    {
      icon: "difference",
      title: "Versiones específicas",
      desc: "Compara trims exactos, no solo el modelo base. Elige la variante que realmente te interesa.",
    },
    {
      icon: "sell",
      title: "Precio de lista y con descuento",
      desc: "Ves el precio de lista y el precio con descuento, lado a lado, para cada auto.",
    },
    {
      // "emoji_events" no existe en el build de Material Symbols que servimos:
      // se renderizaba como texto literal. Ver scripts/subset-icon-font.ts.
      icon: "trophy",
      title: "Ganador resaltado",
      desc: "El mejor valor en cada spec se marca automáticamente. Sin hojas de cálculo.",
    },
    {
      icon: "receipt_long",
      title: "Comparación completa",
      desc: "Autonomía, carga, potencia, tracción, maletero y más. Todo en una sola tabla.",
    },
  ];

  return (
    <ul className="hidden border-t border-line md:block">
      {features.map((f) => (
        <li key={f.title} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 border-b border-line py-4">
          <Icon name={f.icon} size="none" className="mt-0.5 text-[20px] text-link" />
          <div>
            <p className="font-semibold text-ink">{f.title}</p>
            <p className="t-small mt-1">{f.desc}</p>
          </div>
        </li>
      ))}
    </ul>
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

  // CTA final: el primer auto elegido prellena el popup de waitlist.
  const lead = selected[0];
  const leadModel = lead ? `${lead.brand} ${carDisplayName(lead)}` : undefined;
  const ctaTitle =
    selected.length >= 2
      ? `¿No sabes cuál de los ${selected.length} te conviene?`
      : lead
        ? `¿No sabes si el ${lead.name} es para ti?`
        : "¿No sabes cuál te conviene?";

  return (
    <div className="page">
      {/* ─── Encabezado ──────────────────────────────────────────────── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Comparador</span>
          </nav>

          <div className="page-head__grid">
            <div>
              <h1 className="t-h1">Compara autos electrificados</h1>
              <p className="t-lead">
                Elige hasta 3 modelos, incluso versiones específicas, y analiza sus diferencias en precio, autonomía, carga y más.
              </p>
            </div>
            <HeroInfo />
          </div>
        </div>
      </section>

      {/* ─── Autos elegidos + tabla ──────────────────────────────────── */}
      <section className="section pt-section-sm" aria-label="Comparación de autos">
        <div className="wrap">
          {selected.length >= 2 && (
            <p className="t-micro mb-3 flex items-center gap-1.5 md:hidden">
              <Icon name="swipe" size="none" className="text-[16px]" />
              Desliza para ver todas las columnas
            </p>
          )}

          <div className="vtable-wrap">
            <table className="vtable min-w-[480px] table-fixed border-separate border-spacing-0 md:min-w-0">
              <caption className="sr-only">Comparación lado a lado de hasta {MAX_CARS} autos</caption>
              <colgroup>
                <col className="w-[104px] md:w-[22%]" />
                {Array.from({ length: MAX_CARS }).map((_, i) => <col key={i} />)}
              </colgroup>

              <thead>
                <tr>
                  <th scope="col" className={`${STICKY} bg-surface`}>
                    <span className="sr-only">Especificación</span>
                  </th>
                  {Array.from({ length: MAX_CARS }).map((_, i) => (
                    <th key={i} scope="col" className="h-px px-3 py-4 align-top md:px-5 md:py-5">
                      <CarSlot
                        car={selected[i]}
                        onRemove={() => removeCar(i)}
                        onAdd={() => setPickerSlot(i)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>

              {selected.length >= 2 ? (
                SECTIONS.map((section, si) => {
                  const sectionRows = ROWS.filter(r => section.keys.includes(r.key as string));
                  // Cada grupo es su propio <tbody>; la línea de arriba separa los grupos.
                  const groupLine = si > 0 ? "border-t border-line" : "";
                  return (
                    <tbody key={section.label}>
                      <tr>
                        <th scope="rowgroup" className={`${STICKY} ${CELL} ${groupLine} bg-canvas-2 font-semibold text-ink`}>
                          {section.label}
                        </th>
                        <td colSpan={MAX_CARS} className={`${groupLine} bg-canvas-2`} />
                      </tr>
                      {sectionRows.map(row => (
                        <TableRow key={row.key} row={row} cars={selected} getBest={getBest} />
                      ))}
                    </tbody>
                  );
                })
              ) : (
                <tbody>
                  <tr>
                    <td colSpan={MAX_CARS + 1} className="px-5 py-12 text-center">
                      <Icon name="compare_arrows" size="none" className="text-[32px] text-ink-3" />
                      <p className="mt-2 text-ink-2">Agrega al menos 2 autos para ver la comparación</p>
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>

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
                carSlug={lead?.slug}
                model={leadModel}
                source="comparador"
                className="btn btn--secondary btn--lg"
              >
                {OFERTA_STANDBY ? "Únete a la waitlist" : "Quiero mi oferta"}
              </OfferCta>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Picker modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {pickerSlot !== null && (
          <m.div
            key="picker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-[var(--veil-modal)] sm:items-center sm:p-4"
            onClick={closePicker}
          >
            <m.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="picker-title"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="flex h-[92svh] w-full flex-col overflow-hidden rounded-t-card bg-canvas text-ink shadow-overlay sm:h-auto sm:max-h-[85vh] sm:max-w-xl sm:rounded-card"
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Escape") closePicker(); }}
            >
              {/* Header */}
              <div className="flex flex-none items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6 sm:py-5">
                <div>
                  <h2 id="picker-title" className="font-display text-[1.375rem] font-bold leading-tight tracking-[-0.012em]">
                    Elige un auto
                  </h2>
                  <p className="t-small mt-1">
                    {filteredPicker.length} versiones disponibles
                    {search ? ` para “${search}”` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePicker}
                  aria-label="Cerrar"
                  className="btn btn--secondary btn--icon btn--sm flex-none"
                >
                  <Icon name="close" size="none" />
                </button>
              </div>

              {/* Search */}
              <div className="flex-none border-b border-line px-5 py-4 sm:px-6">
                <div className="relative">
                  <Icon
                    name="search"
                    size="none"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-ink-3"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Busca por nombre, marca o versión…"
                    aria-label="Buscar auto"
                    autoFocus
                    className="input pl-11 pr-12"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Limpiar búsqueda"
                      className="btn btn--quiet btn--icon btn--sm absolute right-1 top-1/2 -translate-y-1/2"
                    >
                      <Icon name="close" size="none" />
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredPicker.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <p className="text-ink-2">Sin resultados para “{search}”</p>
                    <button type="button" onClick={() => setSearch("")} className="link mt-3 text-[0.9375rem]">
                      Limpiar búsqueda
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {filteredPicker.map(car => {
                      const pct = car.basePrice > 0
                        ? Math.round(((car.basePrice - car.discountPrice) / car.basePrice) * 100)
                        : 0;
                      const displayName = carDisplayName(car);
                      const specs = [
                        car.range > 0 ? `${formatNumber(car.range)} km` : null,
                        car.power > 0 ? `${formatNumber(car.power)} CV` : null,
                        car.battery > 0 ? `${formatNumber(car.battery)} kWh` : null,
                      ].filter(Boolean).join(", ");
                      return (
                        <li key={car.id}>
                          <button
                            type="button"
                            onClick={() => addCar(car)}
                            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-canvas-2 sm:px-6"
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
                              <span className="block truncate text-label text-ink-3">
                                {[car.brand, sentenceCase(car.category)].filter(Boolean).join(", ")}
                              </span>
                              <span className="block truncate font-semibold text-ink">{displayName}</span>
                              {specs && <span className="block truncate text-label text-ink-2">{specs}</span>}
                            </span>

                            <span className="flex-none text-right">
                              <span className="block font-semibold tabular-nums text-ink">
                                {formatCLP(car.discountPrice)}
                              </span>
                              {pct > 0 && <span className="price-save block">-{pct}%</span>}
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
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Car slot (cabecera de cada columna) ──────────────────────────────────────
function CarSlot({ car, onRemove, onAdd }: { car: Car | undefined; onRemove: () => void; onAdd: () => void }) {
  if (!car) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex h-full min-h-[150px] w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-2 px-3 text-ink-2 transition-colors hover:border-ink hover:text-ink md:min-h-[240px]"
      >
        <Icon name="add" size="none" className="text-[24px]" />
        <span className="text-[0.875rem] font-semibold">Agregar auto</span>
      </button>
    );
  }

  const name = carDisplayName(car);
  return (
    <div className="flex h-full flex-col gap-3 text-left font-normal">
      <div className="relative aspect-[16/10] overflow-hidden rounded-control bg-canvas-2">
        <CarImage url={car.imageUrl} name={car.name} />
        <span className="absolute left-1.5 top-1.5 flex gap-1 md:left-2 md:top-2">
          <ElectricTypeBadge tag={car.electricTypeTag} />
          {HOT_DEALS_ENABLED && car.isHotDeal && <span className="chip chip--soft">Oferta destacada</span>}
        </span>
        {/* Botón sobre la foto: colores fijos (Papel/Tinta), como la navegación de la galería de la PDP. */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${car.brand} ${name}`}
          title="Quitar"
          className="btn btn--icon absolute right-1.5 top-1.5 border-papel bg-papel text-tinta [--h:28px] hover:border-tinta md:right-2 md:top-2 md:[--h:32px]"
        >
          <Icon name="close" size="none" />
        </button>
      </div>

      <div className="min-w-0">
        <p className="car__brand">{car.brand}</p>
        <p className="mt-0.5 break-words text-[1rem] font-semibold leading-tight text-ink md:font-display md:text-[1.25rem] md:font-bold md:tracking-[-0.01em]">
          {name}
        </p>
        {car.showVersionBadge && car.versionName && <p className="t-micro mt-1">{car.name}</p>}
      </div>

      <OfferCta
        carSlug={car.slug}
        model={`${car.brand} ${name}`}
        source="comparador"
        className="btn btn--secondary btn--sm btn--block mt-auto"
      >
        <span className="md:hidden">Solicitar</span>
        <span className="hidden md:inline">Quiero mi oferta</span>
      </OfferCta>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────
function TableRow({
  row, cars, getBest,
}: {
  row: Row;
  cars: Car[];
  getBest: (key: keyof Car, highlight?: "high" | "low") => number | null;
}) {
  const best = getBest(row.key, row.highlight);
  return (
    <tr>
      <th scope="row" className={`${STICKY} ${CELL} bg-surface`}>
        {row.label}
      </th>
      {Array.from({ length: MAX_CARS }).map((_, i) => {
        const car = cars[i];
        if (!car) return <td key={`empty-${i}`} className={CELL} />;
        const text   = cellText(car, row);
        // El mejor valor de la fila es el único dato destacado: Laguna y peso 600.
        const isBest = best !== null && Number(car[row.key]) === best;
        return (
          <td key={car.id + row.key} className={`${CELL} ${isBest ? "font-semibold text-link" : "text-ink"}`}>
            {text ?? <span className="text-ink-3">Sin dato</span>}
            {isBest && <span className="sr-only"> (mejor valor)</span>}
          </td>
        );
      })}
    </tr>
  );
}
