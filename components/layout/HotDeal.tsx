"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatCLP, formatNumber, DEFAULT_HOT_DEAL_LABEL } from "@/lib/utils";
import { sanityImg } from "@/lib/sanityImage";
import { useInViewport } from "@/lib/useInViewport";
import { OfferCta } from "@/components/waitlist/OfferCta";

export interface HotDealCarData {
  slug: string;
  name: string;
  brandName?: string;
  brand?: { name: string; slug: string };
  basePrice: number;
  discountPrice: number;
  hotDealBonusAmount?: number;
  range?: number;
  power?: number;
  traction?: string;
  acceleration?: number;
  imageUrl?: string;
}

interface HotDealProps {
  car?: HotDealCarData | null;
  cars?: HotDealCarData[] | null;
  urgencyLabel?: string | null;
}

const FALLBACK: HotDealCarData = {
  slug: "mg-marvel-r",
  name: "MG Marvel R",
  basePrice: 40580896,
  discountPrice: 29580896,
  hotDealBonusAmount: 11000000,
  range: 402,
  power: 288,
  traction: "AWD",
  acceleration: 4.9,
};

const AUTO_MS = 7000;

const pad2 = (n: number) => String(n).padStart(2, "0");

/* ─── Una diapositiva: copy y precios a la izquierda, foto y specs a la derecha ─── */
function DealSlide({ c, index, total, active }: {
  c: HotDealCarData;
  index: number;
  total: number;
  active: boolean;
}) {
  const brandDisplay = c.brandName ?? c.brand?.name ?? c.name.split(" ")[0];
  const modelDisplay = c.brandName
    ? c.name
    : c.brand
    ? c.name
    : c.name.split(" ").slice(1).join(" ");
  const model       = `${brandDisplay} ${modelDisplay}`;
  const bonus       = c.hotDealBonusAmount ?? 0;
  const hasDiscount = !!c.discountPrice && c.discountPrice < c.basePrice;

  const sub = hasDiscount
    ? `Ahorras ${formatCLP(c.basePrice - c.discountPrice)} sobre el precio de lista.`
    : bonus > 0
    ? `Bonos de hasta ${formatCLP(bonus)} sobre el precio de lista.`
    : null;

  const specs = [
    c.range        ? { label: "Autonomía",    value: `${formatNumber(c.range)} km` } : null,
    c.power        ? { label: "Potencia",     value: `${c.power} CV` } : null,
    c.traction     ? { label: "Tracción",     value: c.traction } : null,
    c.acceleration ? { label: "0 a 100 km/h", value: `${formatNumber(c.acceleration)} s` } : null,
  ].filter((s): s is { label: string; value: string } => s !== null);

  return (
    <article
      className={`deal__slide${active ? " is-active" : ""}`}
      aria-roledescription="diapositiva"
      aria-label={`${index + 1} de ${total}`}
    >
      <div>
        <p className="deal__brand">{brandDisplay}</p>
        <h3 className="t-h2 deal__title">{modelDisplay}</h3>
        {sub && <p className="deal__sub">{sub}</p>}
        <dl className="deal__prices">
          {hasDiscount ? (
            <>
              <div><dt>Precio de lista</dt><dd className="price-was">{formatCLP(c.basePrice)}</dd></div>
              <div><dt>Con bonos</dt><dd className="price price--lg">{formatCLP(c.discountPrice)}</dd></div>
              {bonus > 0 && (
                <div><dt>Incluye bono Electrificarte</dt><dd className="save">{formatCLP(bonus)}</dd></div>
              )}
            </>
          ) : (
            <>
              <div><dt>Precio de lista</dt><dd className="price price--lg">{formatCLP(c.basePrice)}</dd></div>
              {bonus > 0 && (
                <div><dt>Bonos de hasta</dt><dd className="save">{formatCLP(bonus)}</dd></div>
              )}
            </>
          )}
        </dl>
        <div className="deal__actions">
          <OfferCta carSlug={c.slug} model={model} source="hotdeal" className="btn btn--primary btn--lg">
            Quiero esta oferta
            <Icon name="arrow_forward" size="none" className="arrow" />
          </OfferCta>
          <Link href={`/auto/${c.slug}`} className="btn btn--secondary btn--lg">
            Ver especificaciones
          </Link>
        </div>
      </div>

      <div className="deal__visual">
        <div className="deal__media">
          {c.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sanityImg(c.imageUrl, { w: 1200, h: 750, fit: "crop" })}
              alt={model}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="grid h-full w-full place-items-center">
              <Icon name="electric_car" className="text-[48px] text-ink-3" />
            </span>
          )}
        </div>
        {specs.length > 0 && (
          <dl className="deal__specs">
            {specs.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}

/* ─── Sección: banda oscura con diapositivas que se funden (CSS .deal__slide.is-active) ─── */
export function HotDeal({ car, cars, urgencyLabel }: HotDealProps) {
  const list = cars?.length ? cars : car ? [car] : [FALLBACK];
  const label = urgencyLabel ?? DEFAULT_HOT_DEAL_LABEL;
  const total = list.length;

  const sectionRef = useRef<HTMLElement>(null);
  const pausedRef  = useRef(false);
  const touchRef   = useRef<{ x: number; y: number } | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const inView = useInViewport(sectionRef);

  // Si cambia la lista, que el índice no quede fuera de rango.
  const current = activeIdx < total ? activeIdx : 0;

  // Auto-avance — pausa al hover y cuando la sección está fuera del viewport
  // (gating crítico en mobile: 4 carruseles corriendo intervals en paralelo
  // monopolizan el main thread de iOS Safari).
  useEffect(() => {
    if (total < 2) return;
    if (!inView) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setActiveIdx((i) => (i + 1) % total);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [total, inView]);

  function go(delta: number) {
    setActiveIdx((i) => (((i + delta) % total) + total) % total);
  }

  return (
    <section
      ref={sectionRef}
      className="section theme-dark"
      aria-labelledby="deal-title"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div className="wrap">
        <div className="deal__head">
          <div className="deal__eyebrow">
            <h2 id="deal-title" className="chip chip--soft">Oferta destacada</h2>
            <p className="deal__urgency">{label}</p>
          </div>
          {total > 1 && (
            <div className="deal__pager">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Oferta anterior"
                className="btn btn--secondary btn--icon btn--sm"
              >
                <Icon name="chevron_left" size="none" />
              </button>
              <span className="deal__count">{pad2(current + 1)} / {pad2(total)}</span>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Oferta siguiente"
                className="btn btn--secondary btn--icon btn--sm"
              >
                <Icon name="chevron_right" size="none" />
              </button>
            </div>
          )}
        </div>

        {/* Deslizar con el dedo también cambia de oferta (solo gestos horizontales). */}
        <div
          className="deal__slides"
          onTouchStart={(e) => {
            const t = e.touches[0];
            touchRef.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchEnd={(e) => {
            const start = touchRef.current;
            touchRef.current = null;
            if (!start || total < 2) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
          }}
        >
          {list.map((c, i) => (
            <DealSlide key={c.slug} c={c} index={i} total={total} active={i === current} />
          ))}
        </div>
      </div>
    </section>
  );
}
