"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { formatCLP, carStats, cleanSeparators, cn, sentenceCase } from "@/lib/utils";
import { sanityImg } from "@/lib/sanityImage";
import { LoadMore } from "@/components/filters/PlpFilters";
import { CarCard } from "@/components/car/CarCard";
import { electricTypeLabel } from "@/components/car/ElectricTypeBadge";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE, HOT_DEALS_ENABLED } from "@/lib/products";

const PAGE_SIZE = 9;

interface Highlight {
  icon:        string;
  title:       string;
  description: string;
}

interface CarData {
  _id:                  string;
  name:                 string;
  slug:                 string;
  imageUrl?:            string;
  basePrice:            number;
  discountPrice:        number;
  range:                number;
  maxVersionRange?:     number | null;
  batteryCapacity:      number;
  electricRangeKm?:     number | null;
  fuelConsumption?:     number | null;
  rendimientoElectrico?: number | null;
  power:                number;
  isNew:                boolean;
  isHotDeal:            boolean;
  brand?:               { name: string; slug: string; logoUrl?: string };
  vehicleType?:         { label: string; slug: string };
  electricType?:        { tag: string; label: string; slug: string };
}

interface ColData {
  title:         string;
  slug:          string;
  badge?:        string;
  subtitle?:     string;
  description?:  string;
  ctaText?:      string;
  heroImageUrl?: string;
  highlights?:   Highlight[];
}

interface Props {
  col:  ColData;
  cars: CarData[];
}

// Orden de las tecnologías en las cifras (mismo criterio que el hero del home).
const TECH_ORDER = ["EV", "PHEV", "HEV", "MHEV", "REEV"];

/** "EV, PHEV y HEV". */
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export default function ColeccionPageContent({ col, cars }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Con HOT_DEALS_ENABLED=false no se muestra la franja promocional, pero esos autos
  // NO desaparecen: pasan al listado normal.
  const hotDeals    = useMemo(() => (HOT_DEALS_ENABLED ? cars.filter(c => c.isHotDeal) : []), [cars]);
  const rest        = useMemo(() => (HOT_DEALS_ENABLED ? cars.filter(c => !c.isHotDeal) : cars), [cars]);
  const visibleRest = rest.slice(0, visibleCount);

  // Destacados: solo los que vienen de Sanity. Sin datos no hay franja (nada de textos
  // genéricos ni cifras inventadas).
  const highlights = col.highlights ?? [];

  // ─── Copy y cifras (se calculan del catálogo, nunca a mano) ────────────────
  const title = sentenceCase(col.title);
  const n = cars.length;
  const cheapest = cars
    .map((c) => ({ eff: c.discountPrice ?? c.basePrice, base: c.basePrice }))
    .filter((p) => p.eff > 0)
    .reduce<{ eff: number; base: number } | null>((min, p) => (!min || p.eff < min.eff ? p : min), null);
  const brandCount = new Set(cars.map((c) => c.brand?.slug || c.brand?.name).filter(Boolean)).size;
  const techs = Array.from(new Set(cars.map((c) => electricTypeLabel(c.electricType?.tag)).filter(Boolean) as string[]))
    .sort((a, b) => (TECH_ORDER.indexOf(a) + 1 || 99) - (TECH_ORDER.indexOf(b) + 1 || 99));
  const kpis = [
    n > 0 && { num: String(n), label: n === 1 ? "modelo en la colección" : "modelos en la colección" },
    cheapest && { num: formatCLP(cheapest.eff), label: cheapest.eff < cheapest.base ? "precio más bajo con descuento" : "precio de lista más bajo" },
    brandCount > 0 && { num: String(brandCount), label: brandCount === 1 ? "marca en la colección" : "marcas en la colección" },
    techs.length > 0 && { num: String(techs.length), label: `${techs.length === 1 ? "tecnología" : "tecnologías"}: ${joinList(techs)}` },
  ].filter(Boolean) as { num: string; label: string }[];
  const ctaTitle = n > 1 ? `¿No sabes cuál de los ${n} te conviene?` : n === 1 ? "¿No sabes si te conviene?" : "¿No sabes qué auto te conviene?";

  return (
    <div className="page">
      {/* ─── Encabezado ──────────────────────────────────────────────── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span>Colecciones</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>

          <div className={cn("page-head__grid", !col.heroImageUrl && "grid-cols-1")}>
            <div>
              {col.badge && (
                <div className="head-chips">
                  <span className="chip">{sentenceCase(col.badge)}</span>
                </div>
              )}
              <h1 className="t-h1">{title}</h1>
              {col.subtitle && <p className="t-lead">{col.subtitle}</p>}
              {col.description && <p className="page-head__desc">{col.description}</p>}
              <div className="page-head__actions">
                {n > 0 && (
                  <a className="btn btn--primary btn--lg" href={`#catalogo-${col.slug}`}>
                    {n === 1 ? "Ver el modelo" : `Ver los ${n} modelos`}
                    <Icon name="expand_more" size="none" />
                  </a>
                )}
                <Link className="btn btn--quiet" href="/asesoria">
                  ¿No sabes cuál? Asesoría por {ASESORIA_PRICE}
                </Link>
              </div>
            </div>

            {col.heroImageUrl && (
              <div className="aspect-[16/10] overflow-hidden rounded-card bg-canvas-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sanityImg(col.heroImageUrl, { w: 1200 })}
                  alt=""
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            )}
          </div>

          {kpis.length > 0 && (
            <div className="kpis" style={{ "--kpis": kpis.length } as React.CSSProperties}>
              {kpis.map((k) => (
                <div className="kpi" key={k.label}>
                  <p className="kpi__num">{k.num}</p>
                  <p className="kpi__label">{k.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Destacados de la colección (solo si Sanity los trae) ────── */}
      {highlights.length > 0 && (
        <section className="section section--subtle section--tight" aria-label="Destacados de la colección">
          <div className="wrap">
            <div className="how4">
              {highlights.map((h) => (
                <div key={h.title}>
                  <Icon name={h.icon} size="none" />
                  <h3>{h.title}</h3>
                  <p>{h.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Ofertas destacadas (detrás de HOT_DEALS_ENABLED) ────────── */}
      {hotDeals.length > 0 && (
        <section className="section theme-dark" aria-labelledby="deals-t">
          <div className="wrap">
            <div className="deal__head">
              <div className="deal__eyebrow">
                <h2 className="chip chip--soft" id="deals-t">Ofertas destacadas de la colección</h2>
              </div>
            </div>
            <div className="deals2">
              {hotDeals.map((car) => {
                const brandName = car.brand?.name ?? "";
                const model = `${brandName} ${cleanSeparators(car.name)}`.trim();
                const hasDiscount = car.discountPrice > 0 && car.discountPrice < car.basePrice;
                const first = carStats({ battery: car.batteryCapacity, range: car.range, maxVersionRange: car.maxVersionRange, electricRangeKm: car.electricRangeKm, fuelConsumption: car.fuelConsumption, rendimientoElectrico: car.rendimientoElectrico, electricTypeTag: car.electricType?.tag, power: car.power })[0];
                const specs = [
                  first && `${first.value} de ${first.label.toLowerCase()}`,
                  car.power > 0 && `${car.power} CV`,
                ].filter(Boolean).join(", ");
                return (
                  <article key={car._id} className="deal-card">
                    <div className="deal-card__media">
                      {car.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sanityImg(car.imageUrl, { w: 800 })} alt="" loading="lazy" decoding="async" />
                      )}
                    </div>
                    <div className="deal-card__body">
                      <div>
                        <p className="deal__brand">{brandName}</p>
                        <h3 className="deal-card__name">{cleanSeparators(car.name)}</h3>
                      </div>
                      <dl className="deal__prices">
                        {hasDiscount ? (
                          <>
                            <div><dt>Precio de lista</dt><dd className="price-was">{formatCLP(car.basePrice)}</dd></div>
                            <div><dt>Con bonos</dt><dd className="price price--lg">{formatCLP(car.discountPrice)}</dd></div>
                            <div><dt>Ahorras</dt><dd className="save">{formatCLP(car.basePrice - car.discountPrice)}</dd></div>
                          </>
                        ) : (
                          <div><dt>Precio de lista</dt><dd className="price price--lg">{formatCLP(car.basePrice)}</dd></div>
                        )}
                      </dl>
                      {specs && <p className="t-small">{specs}</p>}
                      <div className="deal-card__actions">
                        <OfferCta carSlug={car.slug} model={model} source="plp" className="btn btn--primary">
                          Quiero esta oferta
                        </OfferCta>
                        <Link href={`/auto/${car.slug}`} className="btn btn--secondary">
                          Ver auto
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Catálogo + los dos caminos ──────────────────────────────── */}
      <section className="section" id={`catalogo-${col.slug}`} aria-labelledby="cat-t">
        <div className="wrap">
          <div className="section-head mb-6">
            <div className="section-head__text">
              <h2 className="t-h2" id="cat-t">Todos los modelos</h2>
            </div>
          </div>

          {cars.length === 0 ? (
            <div className="empty">
              <p>Sin autos en esta colección todavía. Estamos actualizando el catálogo. Vuelve pronto.</p>
              <Link href="/" className="btn btn--secondary mt-6">
                Volver al inicio
              </Link>
            </div>
          ) : (
            <>
              <div className="results">
                <p className="results__count">
                  <strong>{rest.length}</strong> {rest.length === 1 ? "auto" : "autos"}
                </p>
              </div>
              <div className="cars-grid">
                {visibleRest.map((car, i) => (
                  <CarCard
                    key={car._id}
                    name={cleanSeparators(car.name)}
                    brand={car.brand?.name ?? ""}
                    brandLogo={car.brand?.logoUrl}
                    slug={car.slug}
                    image={car.imageUrl}
                    category={car.vehicleType?.label ?? car.electricType?.tag}
                    batteryCapacity={car.batteryCapacity}
                    range={car.range}
                    maxVersionRange={car.maxVersionRange}
                    electricRangeKm={car.electricRangeKm}
                    fuelConsumption={car.fuelConsumption}
                    rendimientoElectrico={car.rendimientoElectrico}
                    electricTypeTag={car.electricType?.tag}
                    power={car.power}
                    basePrice={car.basePrice}
                    discountPrice={car.discountPrice}
                    isNew={car.isNew}
                    index={i % PAGE_SIZE}
                  />
                ))}
              </div>
              {rest.length > PAGE_SIZE && (
                <LoadMore shown={visibleRest.length} total={rest.length} onMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
              )}
            </>
          )}

          <div className="soft-block cta-row mt-section">
            <div>
              <h2 className="t-h2">{ctaTitle}</h2>
              <p>Te asesoramos por WhatsApp según tu uso, tus kilómetros y tu presupuesto, y comparamos contigo los modelos que calzan.</p>
            </div>
            <div className="cta-row__actions">
              <Link href="/asesoria" className="btn btn--primary btn--lg">
                Quiero asesoría por {ASESORIA_PRICE}
                <Icon name="arrow_forward" size="none" className="arrow" />
              </Link>
              <OfferCta source="plp" className="btn btn--secondary btn--lg">
                Únete a la waitlist
              </OfferCta>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
