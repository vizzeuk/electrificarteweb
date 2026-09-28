"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ReviewSummaryPanel } from "./ReviewSummary";
import { ReviewFeed } from "./ReviewFeed";
import { summarize } from "@/lib/reviews/summary";
import type { PublicReview } from "@/lib/reviews/queries";

/**
 * /resenas/todas: todas las reseñas aprobadas con filtros por marca y modelo y orden.
 *
 * Filtra en el cliente (el volumen es chico y la página queda estática con ISR). El resumen de
 * la izquierda se recalcula con lo filtrado: si eliges un modelo, ves la nota de ese modelo.
 * Los filtros viven en la URL (?marca=…&modelo=…&orden=nota) para poder compartir el enlace;
 * se leen al montar desde window.location para no obligar a envolver la página en <Suspense>.
 */

type Orden = "recientes" | "nota";

/** Clave de modelo: el slug de la ficha si lo tiene; si no, el nombre escrito a mano. */
const modeloKey = (r: PublicReview) => r.carSlug ?? `m:${(r.carModel ?? "").toLowerCase()}`;
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function AllReviews({ reviews }: { reviews: PublicReview[] }) {
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [orden, setOrden] = useState<Orden>("recientes");
  // true cuando ya se leyeron los filtros de la URL: antes de eso no se escribe en ella.
  const [listo, setListo] = useState(false);

  // Marcas con su cantidad, ordenadas por nombre.
  const marcas = useMemo(() => {
    const map = new Map<string, { label: string; n: number }>();
    for (const r of reviews) {
      if (!r.carBrand) continue;
      const k = norm(r.carBrand);
      const prev = map.get(k);
      map.set(k, { label: prev?.label ?? r.carBrand, n: (prev?.n ?? 0) + 1 });
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [reviews]);

  // Modelos de la marca elegida.
  const modelos = useMemo(() => {
    if (!marca) return [];
    const map = new Map<string, { label: string; n: number }>();
    for (const r of reviews) {
      if (norm(r.carBrand) !== marca || !r.carModel) continue;
      const k = modeloKey(r);
      const prev = map.get(k);
      map.set(k, { label: prev?.label ?? r.carModel, n: (prev?.n ?? 0) + 1 });
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [reviews, marca]);

  // Filtros iniciales desde la URL. Se difiere un frame (regla react-hooks/set-state-in-effect).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const p = new URLSearchParams(window.location.search);
      const mod = p.get("modelo") ?? "";
      // Con solo el modelo (ej. un enlace desde la ficha), la marca se deduce de sus reseñas.
      const deModelo = mod ? reviews.find((r) => modeloKey(r) === mod) : undefined;
      const mar = norm(p.get("marca")) || norm(deModelo?.carBrand);
      if (mar) setMarca(mar);
      if (mod && deModelo) setModelo(mod);
      if (p.get("orden") === "nota") setOrden("nota");
      setListo(true);
    });
    return () => cancelAnimationFrame(id);
  }, [reviews]);

  // Refleja los filtros en la URL sin recargar ni sumar entradas al historial.
  useEffect(() => {
    if (!listo) return;
    const p = new URLSearchParams();
    if (marca) p.set("marca", marcas.find((m) => m.key === marca)?.label ?? marca);
    if (modelo) p.set("modelo", modelo);
    if (orden === "nota") p.set("orden", "nota");
    const qs = p.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", url);
  }, [listo, marca, modelo, orden, marcas]);

  const filtradas = useMemo(() => {
    const list = reviews.filter((r) => (!marca || norm(r.carBrand) === marca) && (!modelo || modeloKey(r) === modelo));
    return orden === "nota"
      ? [...list].sort((a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt))
      : [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [reviews, marca, modelo, orden]);

  const summary = useMemo(() => summarize(filtradas), [filtradas]);
  const hayFiltro = !!(marca || modelo);
  const nombreFiltro = modelo
    ? `${marcas.find((m) => m.key === marca)?.label ?? ""} ${modelos.find((m) => m.key === modelo)?.label ?? ""}`.trim()
    : marcas.find((m) => m.key === marca)?.label;
  // Enlace a la ficha cuando el filtro es un modelo del catálogo.
  const fichaSlug = modelo && !modelo.startsWith("m:") ? modelo : null;

  if (reviews.length === 0) {
    return (
      <div className="card empty px-6">
        <p className="t-h3 text-ink">Todavía no hay reseñas publicadas</p>
        <p className="mt-3">Sé el primero en contar cómo te ha ido con tu auto electrificado.</p>
        <Link href="/resenas/escribir" className="btn btn--primary mt-6">
          Escribir mi reseña
          <Icon name="arrow_forward" size="none" className="arrow" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rv-layout">
      <aside className="rv-layout__side" aria-label="Resumen de las reseñas">
        {summary && (
          <ReviewSummaryPanel summary={summary} className="card">
            {hayFiltro && nombreFiltro && <p className="t-small">Reseñas de {nombreFiltro}</p>}
            {fichaSlug && (
              <Link href={`/auto/${fichaSlug}`} className="link-arrow">
                Ver la ficha del auto
                <Icon name="arrow_forward" size="none" />
              </Link>
            )}
            <Link href="/resenas/escribir" className="link-arrow">
              Escribir mi reseña
              <Icon name="arrow_forward" size="none" />
            </Link>
          </ReviewSummaryPanel>
        )}
      </aside>

      <div className="card rv-layout__list">
        <div className="rv-filters" role="search" aria-label="Filtrar reseñas">
          <div className="field">
            <label className="field__label" htmlFor="rv-f-marca">Marca</label>
            <div className="relative">
              <select
                id="rv-f-marca"
                value={marca}
                onChange={(e) => {
                  setMarca(e.target.value);
                  setModelo("");
                }}
                className="input appearance-none pr-10"
              >
                <option value="">Todas las marcas</option>
                {marcas.map((m) => (
                  <option key={m.key} value={m.key}>{m.label} ({m.n})</option>
                ))}
              </select>
              <Icon name="expand_more" size="none" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
            </div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="rv-f-modelo">Modelo</label>
            <div className="relative">
              <select
                id="rv-f-modelo"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                disabled={!marca}
                className="input appearance-none pr-10"
              >
                <option value="">{marca ? "Todos los modelos" : "Primero la marca"}</option>
                {modelos.map((m) => (
                  <option key={m.key} value={m.key}>{m.label} ({m.n})</option>
                ))}
              </select>
              <Icon name="expand_more" size="none" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
            </div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="rv-f-orden">Ordenar por</label>
            <div className="relative">
              <select id="rv-f-orden" value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className="input appearance-none pr-10">
                <option value="recientes">Más recientes</option>
                <option value="nota">Mejor nota</option>
              </select>
              <Icon name="expand_more" size="none" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
            </div>
          </div>
          <div className="rv-filters__meta" aria-live="polite">
            <span>
              {hayFiltro ? `${filtradas.length} de ${reviews.length} reseñas` : `${reviews.length} ${reviews.length === 1 ? "reseña" : "reseñas"}`}
            </span>
            {hayFiltro && (
              <button
                type="button"
                onClick={() => {
                  setMarca("");
                  setModelo("");
                }}
                className="link"
              >
                Quitar filtros
              </button>
            )}
          </div>
        </div>

        {/* key: al cambiar un filtro, la lista vuelve a mostrar solo la primera página. */}
        <ReviewFeed key={`${marca}|${modelo}|${orden}`} reviews={filtradas} pageSize={10} showCar />
      </div>
    </div>
  );
}
