"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatCLP, cleanSeparators, cn, sentenceCase, DEFAULT_HOT_DEAL_LABEL } from "@/lib/utils";
import { sanityImg } from "@/lib/sanityImage";
import { PlpFilters, LoadMore } from "@/components/filters/PlpFilters";
import { useCarFilters } from "@/hooks/useCarFilters";
import type { FacetCar } from "@/lib/filters/types";
import { CarCard } from "@/components/car/CarCard";
import { electricTypeLabel } from "@/components/car/ElectricTypeBadge";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE, HOT_DEALS_ENABLED } from "@/lib/products";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface BrandCarData {
  name: string;
  slug: string;
  basePrice: number;
  discountPrice: number;
  range: number;
  /** Potencia formateada ("150 CV"). La numérica para la card va en `powerCv`. */
  power: string;
  traction: string;
  seats?: number | null;
  euroNcap?: number | null;
  category: string;
  tipoSlug: string;
  vehicleTypeLabel?: string;
  electricType: string;
  electricTypeTag?: string;
  electricTypeLabel?: string;
  isHotDeal: boolean;
  isTopSeller?: boolean;
  imageUrl?: string;
  batteryCapacity?: number | null;
  powerCv?: number | null;
  maxVersionRange?: number | null;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  specs: { battery: string; charge0to80: string; topSpeed: string };
}

// Adaptador estable raw → FacetCar (contexto: /marcas, oculta el facet "marca").
function brandToFacet(c: BrandCarData): FacetCar {
  return {
    slug: c.slug,
    brandSlug: "",
    brandName: "",
    vehicleTypeSlug: c.tipoSlug,
    vehicleTypeLabel: c.vehicleTypeLabel || c.category,
    electricTypeTag: c.electricTypeTag ?? "",
    electricTypeLabel: c.electricTypeLabel ?? "",
    price: c.discountPrice ?? c.basePrice,
    basePrice: c.basePrice,
    discountPrice: c.discountPrice ?? c.basePrice,
    range: c.range ?? 0,
    seats: c.seats ?? null,
    euroNcap: c.euroNcap ?? null,
    traction: c.traction ?? "",
    isHotDeal: c.isHotDeal,
    isNew: false,
  };
}

interface VideoData {
  id: string;
  title: string;
  duration: string;
  views: string;
  channel: string;
  thumbnail: null;
  videoUrl?: string | null;
}

interface HotDealData {
  carName: string;
  carSlug: string;
  basePrice: number;
  discountPrice: number;
  bonus: number;
  range: number;
  power: string;
  traction: string;
  acceleration: string;
  imageUrl?: string;
}

export interface PlpBannerData {
  imageUrl: string;
  mobileImageUrl?: string;
  ctaHref?: string;
  altText?: string;
}

export interface BrandData {
  name: string;
  country: string;
  foundedYear: string;
  description: string;
  heroTagline?: string;
  logoLetter: string;
  /** Ya no se usa: el sistema v1 no tiene un color por marca. */
  logoColor: string;
  logoUrl?: string;
  /** Ya no se usa: el sistema v1 no tiene un color por marca. */
  accentColor: string;
  stats: { label: string; value: string }[];
  heroFeaturedCar?: { name: string; slug: string; basePrice: number; discountPrice: number; imageUrl?: string } | null;
  cars: BrandCarData[];
  hotDeals: HotDealData[];
  videos: VideoData[];
  plpBanners?: PlpBannerData[];
}

// Orden de las tecnologías en las cifras (mismo criterio que el hero del home).
const TECH_ORDER = ["EV", "PHEV", "HEV", "MHEV", "REEV"];

/** "EV, PHEV y HEV". */
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** URL de Sanity sin parámetros previos: el CDN respeta el primer `w` que encuentra. */
function baseUrl(url?: string | null): string | undefined {
  return url ? url.split("?")[0] : undefined;
}

/** Etiqueta de Sanity a mitad de frase: minúscula salvo siglas ("City Car" → "city car"). */
function inlineLabel(label: string): string {
  return sentenceCase(`x ${label}`).slice(2);
}

/** Sin guion largo como separador (regla de copy): se reemplaza por coma. */
function noDash(text?: string | null): string {
  return (text ?? "").replace(/\s*—\s*/g, ", ").trim();
}

// ─── Component ────────────────────────────────────────────────────────────────
interface BrandPageContentProps {
  slug: string;
  brand: BrandData;
  hotDealUrgencyLabel?: string | null;
}

const PAGE_SIZE = 9;

export default function BrandPageContent({ slug, brand, hotDealUrgencyLabel }: BrandPageContentProps) {
  const urgencyLabel = hotDealUrgencyLabel ?? DEFAULT_HOT_DEAL_LABEL;

  const filters = useCarFilters(brand.cars, { toFacet: brandToFacet, context: "marca" });
  const { filtered } = filters;

  // Paginación de 9 que vuelve a la primera página cuando cambian los filtros o el orden
  // (`filtered` es memoizado: cambia de identidad solo cuando cambia el resultado).
  const [page, setPage] = useState({ key: filtered, count: PAGE_SIZE });
  const visibleCount = page.key === filtered ? page.count : PAGE_SIZE;
  const visibleCars = filtered.slice(0, visibleCount);

  // Con HOT_DEALS_ENABLED=false no se arma la franja promocional de la marca.
  const hotDeals = HOT_DEALS_ENABLED ? brand.hotDeals : [];

  // Auto destacado del encabezado: Sanity (heroFeaturedCar) > hot deal > top seller > primero con foto
  const featuredCarForHero = useMemo(() => {
    if (brand.heroFeaturedCar) {
      const fc = brand.heroFeaturedCar;
      return { name: fc.name, slug: fc.slug, imageUrl: fc.imageUrl, discountPrice: fc.discountPrice, basePrice: fc.basePrice, isHotDeal: false, isSponsored: true };
    }
    if (brand.hotDeals.length > 0) {
      const hd = brand.hotDeals[0];
      return { name: hd.carName, slug: hd.carSlug, imageUrl: hd.imageUrl, discountPrice: hd.discountPrice, basePrice: hd.basePrice, isHotDeal: true, isSponsored: false };
    }
    const topSeller = brand.cars.find((c) => c.isTopSeller && c.imageUrl);
    const withImg   = topSeller ?? brand.cars.find((c) => c.imageUrl);
    if (withImg) return { name: withImg.name, slug: withImg.slug, imageUrl: withImg.imageUrl, discountPrice: withImg.discountPrice, basePrice: withImg.basePrice, isHotDeal: false, isSponsored: false };
    return null;
  }, [brand.heroFeaturedCar, brand.hotDeals, brand.cars]);

  const plpBanners = brand.plpBanners ?? [];
  const [activeSlide, setActiveSlide] = useState(0);
  const nextSlide = useCallback(() => setActiveSlide((p) => (p + 1) % (plpBanners.length || 1)), [plpBanners.length]);
  useEffect(() => {
    if (plpBanners.length < 2) return;
    const t = setInterval(nextSlide, 5000);
    return () => clearInterval(t);
  }, [nextSlide, plpBanners.length]);

  // ─── Copy y cifras (se calculan del catálogo, nunca a mano) ────────────────
  const cars = brand.cars;
  const n = cars.length;
  const cheapest = cars
    .map((c) => ({ eff: c.discountPrice ?? c.basePrice, base: c.basePrice }))
    .filter((p) => p.eff > 0)
    .reduce<{ eff: number; base: number } | null>((min, p) => (!min || p.eff < min.eff ? p : min), null);
  const techs = Array.from(new Set(cars.map((c) => electricTypeLabel(c.electricTypeTag)).filter(Boolean) as string[]))
    .sort((a, b) => (TECH_ORDER.indexOf(a) + 1 || 99) - (TECH_ORDER.indexOf(b) + 1 || 99));
  const bodyTypes = Array.from(new Set(cars.map((c) => c.vehicleTypeLabel ?? "").filter(Boolean).map(inlineLabel)));
  const kpis = [
    n > 0 && { num: String(n), label: n === 1 ? "modelo en el catálogo" : "modelos en el catálogo" },
    cheapest && { num: formatCLP(cheapest.eff), label: cheapest.eff < cheapest.base ? "precio más bajo con descuento" : "precio de lista más bajo" },
    techs.length > 0 && { num: String(techs.length), label: `${techs.length === 1 ? "tecnología" : "tecnologías"}: ${joinList(techs)}` },
    bodyTypes.length > 0 && { num: String(bodyTypes.length), label: `${bodyTypes.length === 1 ? "tipo de vehículo" : "tipos de vehículo"}: ${joinList(bodyTypes)}` },
  ].filter(Boolean) as { num: string; label: string }[];

  const featured = featuredCarForHero;
  const featuredHasDiscount = !!featured && featured.discountPrice < featured.basePrice;
  const tagline = noDash(brand.heroTagline);
  const stats = brand.stats.slice(0, 4);
  const hasVideos = brand.videos.length > 0;
  const ctaTitle = n > 1 ? `¿No sabes cuál de los ${n} te conviene?` : n === 1 ? "¿No sabes si te conviene?" : "¿No sabes qué auto te conviene?";

  return (
    <div className="page">
      {/* ─── Encabezado ──────────────────────────────────────────────── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <Link href="/marcas">Marcas</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{brand.name}</span>
          </nav>

          <div className={cn("page-head__grid", !featured && "grid-cols-1")}>
            <div>
              {(brand.logoUrl || brand.country) && (
                <div className="head-chips items-center">
                  {brand.logoUrl && (
                    // Logos de marca en gris: excepción registrada en la guía de marca.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sanityImg(brand.logoUrl, { w: 320, q: 90 })}
                      alt={`Logo ${brand.name}`}
                      className="mr-2 h-9 w-auto max-w-36 object-contain opacity-70 grayscale"
                      decoding="async"
                    />
                  )}
                  {brand.country && <span className="chip">{brand.country}</span>}
                </div>
              )}
              <h1 className="t-h1">{brand.name}</h1>
              {tagline && <p className="t-lead">{tagline}</p>}
              {brand.description && <p className="page-head__desc">{brand.description}</p>}
              <div className="page-head__actions">
                {n > 0 && (
                  <a className="btn btn--primary btn--lg" href={`#autos-${slug}`}>
                    {n === 1 ? "Ver el modelo" : `Ver los ${n} modelos`}
                    <Icon name="expand_more" size="none" />
                  </a>
                )}
                <Link className="btn btn--quiet" href="/asesoria">
                  ¿No sabes cuál? Asesoría por {ASESORIA_PRICE}
                </Link>
              </div>
            </div>

            {featured && (
              <div>
                {/* "Publicidad" solo cuando el auto lo eligió Sanity (heroFeaturedCar). */}
                {featured.isSponsored && (
                  <div className="ad-card__label">
                    <span className="t-label">Publicidad</span>
                  </div>
                )}
                <Link href={`/auto/${featured.slug}`} className="card ad-card">
                  <div className="card__media">
                    {featured.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sanityImg(baseUrl(featured.imageUrl), { w: 960 })} alt="" fetchPriority="high" decoding="async" />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <Icon name="electric_car" className="text-[48px] text-line-2" />
                      </span>
                    )}
                    {HOT_DEALS_ENABLED && featured.isHotDeal && <span className="chip chip--soft">Oferta</span>}
                  </div>
                  <div className="ad-card__body">
                    <div>
                      <p className="car__brand">{brand.name}</p>
                      <p className="car__name">{cleanSeparators(featured.name)}</p>
                    </div>
                    <div className="ad-card__row">
                      <div>
                        {featuredHasDiscount ? (
                          <>
                            <p className="price-was">{formatCLP(featured.basePrice)}</p>
                            <p className="price">{formatCLP(featured.discountPrice)}</p>
                            <p className="price-save">Ahorras {formatCLP(featured.basePrice - featured.discountPrice)}</p>
                          </>
                        ) : (
                          <>
                            <p className="car__price-label">Precio de lista</p>
                            <p className="price">{formatCLP(featured.basePrice)}</p>
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
                <h2 className="chip chip--soft" id="deals-t">Ofertas destacadas de {brand.name}</h2>
                <p className="deal__urgency">{urgencyLabel}</p>
              </div>
            </div>
            <div className="deals2">
              {hotDeals.map((deal) => {
                const model = `${brand.name} ${cleanSeparators(deal.carName)}`;
                const hasDiscount = deal.discountPrice > 0 && deal.discountPrice < deal.basePrice;
                const specs = [
                  deal.range > 0 && `${deal.range} km de autonomía`,
                  deal.power,
                  deal.traction && deal.traction !== "–" && `tracción ${deal.traction}`,
                ].filter(Boolean).join(", ");
                return (
                  <article key={deal.carSlug} className="deal-card">
                    <div className="deal-card__media">
                      {deal.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sanityImg(baseUrl(deal.imageUrl), { w: 800 })} alt="" loading="lazy" decoding="async" />
                      )}
                    </div>
                    <div className="deal-card__body">
                      <div>
                        <p className="deal__brand">{brand.name}</p>
                        <h3 className="deal-card__name">{cleanSeparators(deal.carName)}</h3>
                      </div>
                      <dl className="deal__prices">
                        {hasDiscount ? (
                          <>
                            <div><dt>Precio de lista</dt><dd className="price-was">{formatCLP(deal.basePrice)}</dd></div>
                            <div><dt>Con bonos</dt><dd className="price price--lg">{formatCLP(deal.discountPrice)}</dd></div>
                            <div><dt>Ahorras</dt><dd className="save">{formatCLP(deal.basePrice - deal.discountPrice)}</dd></div>
                          </>
                        ) : (
                          <>
                            <div><dt>Precio de lista</dt><dd className="price price--lg">{formatCLP(deal.basePrice)}</dd></div>
                            {deal.bonus > 0 && <div><dt>Bonos de hasta</dt><dd className="save">{formatCLP(deal.bonus)}</dd></div>}
                          </>
                        )}
                      </dl>
                      {specs && <p className="t-small">{specs}</p>}
                      <div className="deal-card__actions">
                        <OfferCta carSlug={deal.carSlug} model={model} source="plp" className="btn btn--primary">
                          Quiero esta oferta
                        </OfferCta>
                        <Link href={`/auto/${deal.carSlug}`} className="btn btn--secondary">
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
      <section className="section" id={`autos-${slug}`} aria-labelledby="cat-t">
        <div className="wrap">
          {/* Banners de Sanity (solo si hay) */}
          {plpBanners.length > 0 && (
            <div className="mb-section-sm">
              <div className="relative overflow-hidden rounded-card bg-canvas-2">
                {/* Sizer invisible: usa la versión móvil cuando existe, así el alto calza en teléfonos. */}
                <picture>
                  {plpBanners[activeSlide]?.mobileImageUrl && (
                    <source media="(max-width: 767px)" srcSet={sanityImg(plpBanners[activeSlide].mobileImageUrl, { w: 800 })} />
                  )}
                  <img src={sanityImg(plpBanners[activeSlide]?.imageUrl, { w: 2400 })} alt="" aria-hidden className="invisible h-auto w-full" loading="lazy" decoding="async" />
                </picture>
                {plpBanners.map((b, i) => (
                  <div key={i} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: i === activeSlide ? 1 : 0, pointerEvents: i === activeSlide ? "auto" : "none" }} onClick={plpBanners.length > 1 && !b.ctaHref ? nextSlide : undefined}>
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
              <h2 className="t-h2" id="cat-t">Todos los modelos {brand.name}</h2>
            </div>
          </div>

          {n === 0 ? (
            <p className="empty">Estamos cargando el catálogo {brand.name}. Vuelve pronto.</p>
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
                  {visibleCars.map((car, i) => (
                    <CarCard
                      key={car.slug}
                      name={cleanSeparators(car.name)}
                      brand={brand.name}
                      slug={car.slug}
                      image={car.imageUrl}
                      batteryCapacity={car.batteryCapacity}
                      range={car.range}
                      maxVersionRange={car.maxVersionRange}
                      electricRangeKm={car.electricRangeKm}
                      fuelConsumption={car.fuelConsumption}
                      rendimientoElectrico={car.rendimientoElectrico}
                      electricTypeTag={car.electricTypeTag}
                      power={car.powerCv}
                      basePrice={car.basePrice}
                      discountPrice={car.discountPrice}
                      index={i % PAGE_SIZE}
                    />
                  ))}
                </div>
              )}

              {filtered.length > PAGE_SIZE && (
                <LoadMore shown={visibleCars.length} total={filtered.length} onMore={() => setPage({ key: filtered, count: visibleCount + PAGE_SIZE })} />
              )}
            </>
          )}
        </div>
      </section>

      {/* ─── Videos (solo si la marca tiene en Sanity) ───────────────── */}
      {hasVideos && (
        <section className="section section--subtle" aria-labelledby="videos-t">
          <div className="wrap">
            <div className="section-head">
              <div className="section-head__text">
                <h2 className="t-h2" id="videos-t">Videos y contenido</h2>
              </div>
            </div>
            <div className="grid gap-grid sm:grid-cols-2 lg:grid-cols-3">
              {brand.videos.map((video) => {
                const body = (
                  <>
                    <span className="relative grid aspect-video place-items-center border-b border-line">
                      <Icon name="play_circle" className="text-[48px] text-ink-3" />
                      {video.duration && <span className="chip absolute right-3 bottom-3">{video.duration}</span>}
                    </span>
                    <span className="flex flex-col gap-1 p-5">
                      <span className="t-h4 line-clamp-2">{video.title}</span>
                      {(video.channel || video.views) && (
                        <span className="t-small">{[video.channel, video.views && `${video.views} vistas`].filter(Boolean).join(", ")}</span>
                      )}
                    </span>
                  </>
                );
                return video.videoUrl ? (
                  <a key={video.id} href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="card flex flex-col">
                    {body}
                  </a>
                ) : (
                  <div key={video.id} className="card flex flex-col">
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── La marca en cifras (stats de Sanity) + los dos caminos ─── */}
      <section className={cn("section", !hasVideos && "section--rule")} aria-labelledby={stats.length > 0 ? "cifras-t" : undefined}>
        <div className="wrap">
          {stats.length > 0 && (
            <>
              <div className="section-head">
                <div className="section-head__text">
                  <h2 className="t-h2" id="cifras-t">{brand.name} en cifras</h2>
                </div>
              </div>
              <div className="kpis mt-0" style={{ "--kpis": stats.length } as React.CSSProperties}>
                {stats.map((s) => (
                  <div className="kpi" key={s.label}>
                    <p className="kpi__num">{cleanSeparators(s.value)}</p>
                    <p className="kpi__label">{s.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={cn("soft-block cta-row", stats.length > 0 && "mt-section")}>
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
