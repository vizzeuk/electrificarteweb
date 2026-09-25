"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatCLP, carStats, cleanSeparators, cn, sentenceCase, DEFAULT_HOT_DEAL_LABEL } from "@/lib/utils";
import { sanityImg } from "@/lib/sanityImage";
import { PlpFilters, LoadMore } from "@/components/filters/PlpFilters";
import { useCarFilters } from "@/hooks/useCarFilters";
import type { FacetCar } from "@/lib/filters/types";
import { CarCard } from "@/components/car/CarCard";
import { electricTypeLabel } from "@/components/car/ElectricTypeBadge";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE, HOT_DEALS_ENABLED } from "@/lib/products";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TipoCarData {
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  electricTypeSlug: string;
  electricTypeLabel: string;
  electricTypeTag: string;
  basePrice: number;
  discountPrice: number;
  range: number;
  maxVersionRange?: number | null;
  power: number;
  battery: number;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  traction: string;
  seats?: number | null;
  euroNcap?: number | null;
  acceleration: number;
  isHotDeal: boolean;
  tagline: string;
  imageUrl?: string;
}

// Adaptador estable raw → FacetCar (contexto: /tipo, oculta el facet "tipo").
function tipoToFacet(c: TipoCarData): FacetCar {
  return {
    slug: c.slug,
    brandSlug: c.brandSlug,
    brandName: c.brand,
    vehicleTypeSlug: "",
    vehicleTypeLabel: "",
    electricTypeTag: c.electricTypeTag,
    electricTypeLabel: c.electricTypeLabel,
    price: c.discountPrice ?? c.basePrice,
    basePrice: c.basePrice,
    discountPrice: c.discountPrice ?? c.basePrice,
    range: Math.max(c.range ?? 0, c.maxVersionRange ?? 0),
    seats: c.seats ?? null,
    euroNcap: c.euroNcap ?? null,
    traction: c.traction ?? "",
    isHotDeal: c.isHotDeal,
    isNew: false,
  };
}

export interface TipoMeta {
  label: string;
  /** Ya no se dibuja (sistema v1). Se conserva por compatibilidad con page.tsx. */
  icon: string;
  heroDesc: string;
}

export interface OtherType {
  slug: string;
  label: string;
  icon: string;
}

export interface AdCarData {
  name: string;
  slug: string;
  imageUrl?: string;
  brand: string;
  basePrice: number;
  discountPrice?: number;
  range?: number;
}

export interface PlpBannerData {
  mobileImageUrl?: string;
  imageUrl: string;
  ctaHref?: string;
  altText?: string;
}

interface TipoPageContentProps {
  slug: string;
  meta: TipoMeta;
  cars: TipoCarData[];
  otherTypes: OtherType[];
  adCar?: AdCarData | null;
  /** Ya no se muestra: la card de publicidad del sistema v1 lleva solo auto y precio. */
  adText?: string;
  plpBanners?: PlpBannerData[];
  hotDealUrgencyLabel?: string | null;
}

// Orden de las tecnologías en las cifras (mismo criterio que el hero del home).
const TECH_ORDER = ["EV", "PHEV", "HEV", "MHEV", "REEV"];

/** Etiqueta de Sanity a mitad de frase: minúscula salvo siglas ("City Car" → "city car"). */
function inlineLabel(label: string): string {
  return sentenceCase(`x ${label}`).slice(2);
}

/** "EV, PHEV y HEV". */
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** URL de Sanity sin parámetros previos: el CDN respeta el primer `w` que encuentra. */
function baseUrl(url?: string | null): string | undefined {
  return url ? url.split("?")[0] : undefined;
}

// ─── Component ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 9;

export default function TipoPageContent({ slug, meta, cars, otherTypes, adCar, plpBanners = [], hotDealUrgencyLabel }: TipoPageContentProps) {
  const urgencyLabel = hotDealUrgencyLabel ?? DEFAULT_HOT_DEAL_LABEL;

  const filters = useCarFilters(cars, { toFacet: tipoToFacet, context: "tipo" });
  const { filtered } = filters;

  // Paginación de 9 que vuelve a la primera página cuando cambian los filtros o el orden
  // (`filtered` es memoizado: cambia de identidad solo cuando cambia el resultado).
  const [page, setPage] = useState({ key: filtered, count: PAGE_SIZE });
  const visibleCount = page.key === filtered ? page.count : PAGE_SIZE;

  // Con HOT_DEALS_ENABLED=false no se muestra la franja promocional, pero esos autos
  // NO desaparecen: pasan al listado normal.
  const hotDeals = HOT_DEALS_ENABLED ? filtered.filter((c) => c.isHotDeal) : [];
  const rest = HOT_DEALS_ENABLED ? filtered.filter((c) => !c.isHotDeal) : filtered;
  const visibleRest = rest.slice(0, visibleCount);

  // Banners de Sanity (slideshow): solo si hay
  const [activeSlide, setActiveSlide] = useState(0);
  const nextSlide = useCallback(() => setActiveSlide((p) => (p + 1) % (plpBanners.length || 1)), [plpBanners.length]);
  useEffect(() => {
    if (plpBanners.length < 2) return;
    const t = setInterval(nextSlide, 5000);
    return () => clearInterval(t);
  }, [nextSlide, plpBanners.length]);

  // ─── Copy y cifras (se calculan del catálogo, nunca a mano) ────────────────
  const label = sentenceCase(meta.label);
  const inline = inlineLabel(meta.label);
  const n = cars.length;

  const cheapest = cars
    .map((c) => ({ eff: c.discountPrice ?? c.basePrice, base: c.basePrice }))
    .filter((p) => p.eff > 0)
    .reduce<{ eff: number; base: number } | null>((min, p) => (!min || p.eff < min.eff ? p : min), null);
  const brandCount = new Set(cars.map((c) => c.brandSlug || c.brand).filter(Boolean)).size;
  const techs = Array.from(new Set(cars.map((c) => electricTypeLabel(c.electricTypeTag)).filter(Boolean) as string[]))
    .sort((a, b) => (TECH_ORDER.indexOf(a) + 1 || 99) - (TECH_ORDER.indexOf(b) + 1 || 99));
  const kpis = [
    n > 0 && { num: String(n), label: n === 1 ? "modelo en el catálogo" : "modelos en el catálogo" },
    cheapest && { num: formatCLP(cheapest.eff), label: cheapest.eff < cheapest.base ? "precio más bajo con descuento" : "precio de lista más bajo" },
    brandCount > 0 && { num: String(brandCount), label: `${brandCount === 1 ? "marca" : "marcas"} con modelos ${inline}` },
    techs.length > 0 && { num: String(techs.length), label: `${techs.length === 1 ? "tecnología" : "tecnologías"}: ${joinList(techs)}` },
  ].filter(Boolean) as { num: string; label: string }[];

  const adHasDiscount = !!adCar?.discountPrice && adCar.discountPrice < adCar.basePrice;
  const others = otherTypes.filter((t) => t.slug !== slug);
  const ctaTitle = n > 1 ? `¿No sabes cuál de los ${n} te conviene?` : n === 1 ? "¿No sabes si te conviene?" : "¿No sabes qué auto te conviene?";

  return (
    <div className="page">
      {/* ─── Encabezado ──────────────────────────────────────────────── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span>Tipo de vehículo</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{label}</span>
          </nav>

          <div className={cn("page-head__grid", !adCar && "grid-cols-1")}>
            <div>
              <h1 className="t-h1">Autos {inline} electrificados en Chile</h1>
              {meta.heroDesc && <p className="t-lead">{meta.heroDesc}</p>}
              <div className="page-head__actions">
                {n > 0 && (
                  <a className="btn btn--primary btn--lg" href={`#catalogo-${slug}`}>
                    {n === 1 ? "Ver el modelo" : `Ver los ${n} modelos`}
                    <Icon name="expand_more" size="none" />
                  </a>
                )}
                <Link className="btn btn--quiet" href="/asesoria">
                  ¿No sabes cuál? Asesoría por {ASESORIA_PRICE}
                </Link>
              </div>
            </div>

            {adCar && (
              <div>
                <div className="ad-card__label">
                  <span className="t-label">Publicidad</span>
                </div>
                <Link href={`/auto/${adCar.slug}`} className="card ad-card">
                  <div className="card__media">
                    {adCar.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sanityImg(baseUrl(adCar.imageUrl), { w: 960 })} alt="" decoding="async" />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <Icon name="electric_car" className="text-[48px] text-line-2" />
                      </span>
                    )}
                  </div>
                  <div className="ad-card__body">
                    <div>
                      <p className="car__brand">{adCar.brand}</p>
                      <p className="car__name">{cleanSeparators(adCar.name)}</p>
                    </div>
                    <div className="ad-card__row">
                      <div>
                        {adHasDiscount ? (
                          <>
                            <p className="price-was">{formatCLP(adCar.basePrice)}</p>
                            <p className="price">{formatCLP(adCar.discountPrice)}</p>
                            <p className="price-save">Ahorras {formatCLP(adCar.basePrice - (adCar.discountPrice ?? adCar.basePrice))}</p>
                          </>
                        ) : (
                          <>
                            <p className="car__price-label">Precio de lista</p>
                            <p className="price">{formatCLP(adCar.basePrice)}</p>
                          </>
                        )}
                      </div>
                      <span className="btn btn--secondary btn--sm">
                        Ver auto
                        <Icon name="arrow_forward" size="none" className="arrow" />
                      </span>
                    </div>
                  </div>
                </Link>
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

      {/* ─── Ofertas destacadas (detrás de HOT_DEALS_ENABLED) ────────── */}
      {hotDeals.length > 0 && (
        <section className="section theme-dark" aria-labelledby="deals-t">
          <div className="wrap">
            <div className="deal__head">
              <div className="deal__eyebrow">
                <h2 className="chip chip--soft" id="deals-t">Ofertas destacadas en {inline}</h2>
                <p className="deal__urgency">{urgencyLabel}</p>
              </div>
            </div>
            <div className="deals2">
              {hotDeals.map((car) => {
                const model = `${car.brand} ${cleanSeparators(car.name)}`;
                const hasDiscount = car.discountPrice > 0 && car.discountPrice < car.basePrice;
                const first = carStats({ battery: car.battery, range: car.range, maxVersionRange: car.maxVersionRange, electricRangeKm: car.electricRangeKm, fuelConsumption: car.fuelConsumption, rendimientoElectrico: car.rendimientoElectrico, electricTypeTag: car.electricTypeTag, power: car.power })[0];
                const specs = [
                  first && `${first.value} de ${first.label.toLowerCase()}`,
                  car.power > 0 && `${car.power} CV`,
                  car.traction && `tracción ${car.traction}`,
                ].filter(Boolean).join(", ");
                return (
                  <article key={car.slug} className="deal-card">
                    <div className="deal-card__media">
                      {car.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sanityImg(baseUrl(car.imageUrl), { w: 800 })} alt="" loading="lazy" decoding="async" />
                      )}
                    </div>
                    <div className="deal-card__body">
                      <div>
                        <p className="deal__brand">{car.brand}</p>
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

      {/* ─── Catálogo ────────────────────────────────────────────────── */}
      <section className="section" id={`catalogo-${slug}`} aria-labelledby="cat-t">
        <div className="wrap">
          {/* Banners de Sanity (solo si hay) */}
          {plpBanners.length > 0 && (
            <div className="mb-section-sm">
              <div className="relative overflow-hidden rounded-card bg-canvas-2">
                {/* Sizer invisible: define la altura del contenedor según la imagen activa */}
                <picture>
                  {plpBanners[activeSlide]?.mobileImageUrl && (
                    <source media="(max-width: 767px)" srcSet={sanityImg(plpBanners[activeSlide].mobileImageUrl, { w: 800 })} />
                  )}
                  <img src={sanityImg(plpBanners[activeSlide]?.imageUrl, { w: 2400 })} alt="" aria-hidden className="invisible h-auto w-full" loading="lazy" decoding="async" />
                </picture>
                {plpBanners.map((b, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 transition-opacity duration-500"
                    style={{ opacity: i === activeSlide ? 1 : 0, pointerEvents: i === activeSlide ? "auto" : "none" }}
                    onClick={plpBanners.length > 1 && !b.ctaHref ? nextSlide : undefined}
                  >
                    {b.ctaHref ? (
                      <Link href={b.ctaHref} className="block h-full w-full">
                        <picture>
                          {b.mobileImageUrl && <source media="(max-width: 767px)" srcSet={sanityImg(b.mobileImageUrl, { w: 800 })} />}
                          <img src={sanityImg(b.imageUrl, { w: 2400 })} alt={b.altText ?? ""} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                        </picture>
                      </Link>
                    ) : (
                      <picture>
                        {b.mobileImageUrl && <source media="(max-width: 767px)" srcSet={sanityImg(b.mobileImageUrl, { w: 800 })} />}
                        <img src={sanityImg(b.imageUrl, { w: 2400 })} alt={b.altText ?? ""} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                      </picture>
                    )}
                  </div>
                ))}
              </div>
              {plpBanners.length > 1 && (
                <div className="mt-3 flex justify-center gap-1">
                  {plpBanners.map((_, i) => (
                    <button key={i} type="button" onClick={() => setActiveSlide(i)} aria-label={`Ver banner ${i + 1} de ${plpBanners.length}`} aria-current={i === activeSlide} className="grid h-6 w-8 place-items-center">
                      <span className={cn("block h-0.5 w-6", i === activeSlide ? "bg-ink" : "bg-line-2")} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="section-head mb-6">
            <div className="section-head__text">
              <h2 className="t-h2" id="cat-t">Todos los modelos {inline}</h2>
            </div>
          </div>

          {n === 0 ? (
            <p className="empty">Estamos cargando el catálogo {inline}. Vuelve pronto.</p>
          ) : (
            <>
              <PlpFilters
                facetGroups={filters.facetGroups}
                active={filters.active}
                sort={filters.sort}
                onToggle={filters.toggle}
                onSortChange={filters.setSort}
                onClearAll={filters.clearAll}
                activeCount={filters.activeCount}
                total={filters.total}
                count={filters.count}
              />

              {filtered.length === 0 ? (
                <p className="empty">
                  No hay autos con estos filtros.{" "}
                  <button type="button" className="clear-all" onClick={filters.clearAll}>Limpiar filtros</button>
                </p>
              ) : (
                <div className="cars-grid">
                  {visibleRest.map((car, i) => (
                    <CarCard
                      key={car.slug}
                      name={cleanSeparators(car.name)}
                      brand={car.brand}
                      slug={car.slug}
                      image={car.imageUrl}
                      batteryCapacity={car.battery}
                      range={car.range}
                      maxVersionRange={car.maxVersionRange}
                      electricRangeKm={car.electricRangeKm}
                      fuelConsumption={car.fuelConsumption}
                      rendimientoElectrico={car.rendimientoElectrico}
                      electricTypeTag={car.electricTypeTag}
                      power={car.power}
                      basePrice={car.basePrice}
                      discountPrice={car.discountPrice}
                      index={i % PAGE_SIZE}
                    />
                  ))}
                </div>
              )}

              {rest.length > PAGE_SIZE && (
                <LoadMore shown={visibleRest.length} total={rest.length} onMore={() => setPage({ key: filtered, count: visibleCount + PAGE_SIZE })} />
              )}
            </>
          )}
        </div>
      </section>

      {/* ─── Otros tipos + los dos caminos ───────────────────────────── */}
      <section className="section section--rule" aria-labelledby={others.length > 0 ? "ot-t" : undefined}>
        <div className="wrap">
          {others.length > 0 && (
            <>
              <div className="section-head">
                <div className="section-head__text">
                  <h2 className="t-h2" id="ot-t">Otros tipos de vehículo</h2>
                </div>
              </div>
              <div className="type-links">
                {others.map((t) => (
                  <Link key={t.slug} href={`/tipo/${t.slug}`} className="type-link">
                    {sentenceCase(t.label)}
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className={cn("soft-block cta-row", others.length > 0 && "mt-section")}>
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
