"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { formatCLP } from "@/lib/utils";

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

/* ─── Mobile card — completamente estático, sin motion, sin fragmentos ─── */
function HotDealMobile({ c, brandDisplay, modelDisplay, bonusAmt, savingsPct }: {
  c: HotDealCarData;
  brandDisplay: string;
  modelDisplay: string;
  bonusAmt: number;
  savingsPct: number;
}) {
  return (
    <div className="px-4 w-full">
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
        {/* Imagen */}
        {c.imageUrl ? (
          <img
            src={c.imageUrl}
            alt={`${brandDisplay} ${modelDisplay}`}
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="w-full h-40 flex items-center justify-center">
            <Icon name="electric_car" className="text-primary/30" size="xl" />
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Badge + título */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="hot">HOT DEAL</Badge>
              <span className="text-white/40 text-xs">Oferta limitada</span>
            </div>
            <p className="text-white font-headline font-black text-base uppercase leading-tight">
              {brandDisplay} {modelDisplay}
            </p>
            <p className="text-white/50 text-xs mt-0.5">
              Bonos de hasta{" "}
              <span className="text-primary font-bold">{formatCLP(bonusAmt)}</span>
            </p>
          </div>

          {/* Precio */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-white/40 text-[10px] line-through">{formatCLP(c.basePrice)}</p>
              <p className="text-primary font-headline font-black text-xl leading-none">{formatCLP(c.discountPrice)}</p>
            </div>
            <p className="text-white/30 text-[10px] text-right leading-snug">
              Ahorra {savingsPct}%<br />bono Electrificarte
            </p>
          </div>

          {/* Specs — solo autonomía + traction/power */}
          <div className="grid grid-cols-2 gap-2">
            {c.range && (
              <div className="bg-white/5 rounded-lg px-3 py-2">
                <p className="text-primary text-sm font-headline font-bold">{c.range} km</p>
                <p className="text-white/40 text-[10px]">Autonomía</p>
              </div>
            )}
            {c.traction ? (
              <div className="bg-white/5 rounded-lg px-3 py-2">
                <p className="text-primary text-sm font-headline font-bold">{c.traction}</p>
                <p className="text-white/40 text-[10px]">Tracción</p>
              </div>
            ) : c.power ? (
              <div className="bg-white/5 rounded-lg px-3 py-2">
                <p className="text-primary text-sm font-headline font-bold">{c.power} CV</p>
                <p className="text-white/40 text-[10px]">Potencia</p>
              </div>
            ) : null}
          </div>

          {/* CTA */}
          <Link
            href={`/solicitar?auto=${c.slug}`}
            className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-dark text-black font-bold py-3 rounded-xl text-sm transition-colors"
          >
            Quiero esta oferta
            <Icon name="arrow_forward" size="sm" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Desktop card — sin whileInView (items off-screen en carrusel nunca disparan IntersectionObserver) ─── */
function HotDealDesktop({ c, brandDisplay, modelDisplay, bonusAmt, savingsPct }: {
  c: HotDealCarData;
  brandDisplay: string;
  modelDisplay: string;
  bonusAmt: number;
  savingsPct: number;
}) {
  return (
    <div className="max-w-7xl mx-auto px-8 py-4">
      <div className="grid grid-cols-2 gap-12 items-center">
        {/* Columna izquierda — copy */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <Badge variant="hot">HOT DEAL</Badge>
            <span className="text-white/50 text-sm">Oferta limitada</span>
          </div>
          <h2 className="text-3xl xl:text-4xl font-headline font-black text-white mb-5 uppercase leading-tight">
            {brandDisplay} {modelDisplay} con bonos de hasta{" "}
            <span className="text-primary">{formatCLP(bonusAmt)}</span>
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-white/40 text-sm">Precio lista</span>
              <span className="text-white/40 line-through text-sm">{formatCLP(c.basePrice)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-white text-sm font-medium">Con bono Electrificarte</span>
              <span className="text-primary text-3xl font-headline font-black">{formatCLP(c.discountPrice)}</span>
            </div>
            <p className="text-white/30 text-xs pt-2 border-t border-white/10">
              Ahorra {savingsPct}% · Incluye bono concesionario + Electrificarte
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/solicitar?auto=${c.slug}`}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_4px_20px_rgba(0,229,229,0.25)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.38)] hover:scale-[1.02] active:scale-[0.99]"
            >
              Quiero esta oferta <Icon name="arrow_forward" size="sm" />
            </Link>
            <Link
              href={`/auto/${c.slug}`}
              className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-6 py-3 rounded-xl transition-all text-sm"
            >
              Ver especificaciones
            </Link>
          </div>
        </div>

        {/* Columna derecha — imagen + specs */}
        <div>
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
            {c.imageUrl ? (
              <img
                src={c.imageUrl}
                alt={`${brandDisplay} ${modelDisplay}`}
                className="w-full aspect-[16/9] object-cover"
              />
            ) : (
              <div className="w-full aspect-[16/9] flex items-center justify-center flex-col gap-3">
                <Icon name="electric_car" className="text-primary/30" size="xl" />
                <p className="text-white/30 text-sm">{brandDisplay} {modelDisplay}</p>
              </div>
            )}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                {c.range       && <div className="bg-white/5 rounded-lg p-3"><p className="text-primary text-base font-headline font-bold">{c.range} km</p><p className="text-white/40 text-xs">Autonomía</p></div>}
                {c.power       && <div className="bg-white/5 rounded-lg p-3"><p className="text-primary text-base font-headline font-bold">{c.power} CV</p><p className="text-white/40 text-xs">Potencia</p></div>}
                {c.traction    && <div className="bg-white/5 rounded-lg p-3"><p className="text-primary text-base font-headline font-bold">{c.traction}</p><p className="text-white/40 text-xs">Tracción</p></div>}
                {c.acceleration && <div className="bg-white/5 rounded-lg p-3"><p className="text-primary text-base font-headline font-bold">{c.acceleration}s</p><p className="text-white/40 text-xs">0-100 km/h</p></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Card wrapper: decide mobile vs desktop ─── */
function HotDealCard({ c }: { c: HotDealCarData }) {
  const brandDisplay = c.brandName ?? c.brand?.name ?? c.name.split(" ")[0];
  const modelDisplay = c.brandName
    ? c.name
    : c.brand
    ? c.name
    : c.name.split(" ").slice(1).join(" ");
  const bonus      = c.hotDealBonusAmount ?? 0;
  const savings    = c.basePrice - c.discountPrice;
  const savingsPct = Math.round((savings / c.basePrice) * 100);
  const bonusAmt   = bonus > 0 ? bonus : savings;

  const shared = { c, brandDisplay, modelDisplay, bonusAmt, savingsPct };

  return (
    <>
      <div className="lg:hidden"><HotDealMobile {...shared} /></div>
      <div className="hidden lg:block"><HotDealDesktop {...shared} /></div>
    </>
  );
}

/* ─── Exported section with carousel ─── */
export function HotDeal({ car, cars }: HotDealProps) {
  const list = cars?.length ? cars : car ? [car] : [FALLBACK];

  const trackRef   = useRef<HTMLDivElement>(null);
  const pausedRef  = useRef(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    function upd() {
      setActiveIdx(Math.round(el!.scrollLeft / el!.clientWidth));
    }
    upd();
    el.addEventListener("scroll", upd, { passive: true });
    return () => el.removeEventListener("scroll", upd);
  }, [list]);

  // Auto-avance cada 4 s — pausa al hover
  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const el = trackRef.current;
      if (!el) return;
      const next = Math.round(el.scrollLeft / el.clientWidth) + 1;
      el.scrollTo({ left: el.clientWidth * (next >= list.length ? 0 : next), behavior: "smooth" });
    }, 7000);
    return () => clearInterval(id);
  }, [list.length]);

  function goTo(i: number) {
    trackRef.current?.scrollTo({ left: (trackRef.current?.clientWidth ?? 0) * i, behavior: "smooth" });
  }

  const dots = list.length > 1 && (
    <div className="flex justify-center gap-2 mt-5">
      {list.map((_, i) => (
        <button
          key={i}
          onClick={() => goTo(i)}
          aria-label={`Ir al hot deal ${i + 1}`}
          style={{
            width: i === activeIdx ? 20 : 6,
            height: 6,
            borderRadius: 9999,
            backgroundColor: i === activeIdx ? "#00E5E5" : "rgba(255,255,255,0.2)",
            transition: "all 0.3s",
          }}
        />
      ))}
    </div>
  );

  return (
    <section
      className="bg-black py-6 sm:py-10 md:py-14"
      aria-label="Hot Deals"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div
        ref={trackRef}
        className="flex overflow-x-auto"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {list.map((c) => (
          <div key={c.slug} style={{ flex: "0 0 100%", scrollSnapAlign: "start" }}>
            <HotDealCard c={c} />
          </div>
        ))}
      </div>

      {/* Dots — mobile y desktop, solo si hay más de 1 */}
      {dots}
    </section>
  );
}
