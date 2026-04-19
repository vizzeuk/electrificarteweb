"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { formatCLP } from "@/lib/utils";
import type { HotDealCarData } from "@/components/layout/HotDeal";

const STORAGE_KEY = "electrificarte_promo_seen";

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

interface PromoPopupProps {
  car?: HotDealCarData | null;
}

export function PromoPopup({ car }: PromoPopupProps) {
  const [open, setOpen] = useState(false);

  const c         = car ?? FALLBACK;
  const brandName = c.brand?.name ?? c.name.split(" ")[0];
  const modelName = c.brand ? c.name : c.name.split(" ").slice(1).join(" ");
  const savings   = c.basePrice - c.discountPrice;
  const pct       = Math.round((savings / c.basePrice) * 100);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const onScroll = () => {
      const ratio = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (ratio >= 0.8) {
        setOpen(true);
        window.removeEventListener("scroll", onScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => {
    setOpen(false);
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="promo-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-title"
        >
          <motion.div
            key="promo-modal"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8),0_0_80px_rgba(0,229,229,0.08)]"
          >
            {/* Grid decorativo */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            {/* Glow cyan */}
            <div aria-hidden className="pointer-events-none absolute -top-20 -left-16 h-72 w-72 rounded-full bg-primary/15 blur-[90px]" />

            {/* Botón cerrar */}
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:text-white/80"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="relative z-[2] px-8 pt-9 pb-7">
              {/* Badge */}
              <div className="mb-5 flex items-center gap-2.5">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-amber px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-black">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
                  HOT DEAL
                </div>
                <span className="text-white/40 text-xs">Oferta limitada</span>
              </div>

              {/* Nombre del auto */}
              <h2
                id="promo-title"
                className="font-headline text-2xl font-black text-white leading-tight uppercase mb-1"
              >
                {brandName}{" "}
                <span className="text-primary">{modelName}</span>
              </h2>
              <p className="text-white/50 text-sm mb-5">
                Mejor precio negociado disponible ahora
              </p>

              {/* Tarjeta de precio */}
              <div className="mb-5 rounded-xl border border-white/10 bg-white/5 px-5 py-4 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-white/40 text-xs">Precio lista</span>
                  <span className="text-white/40 text-sm line-through">{formatCLP(c.basePrice)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-white text-sm font-medium">Con bono Electrificarte</span>
                  <span className="text-primary font-headline text-2xl font-black">{formatCLP(c.discountPrice)}</span>
                </div>
                <p className="text-white/30 text-xs pt-2 border-t border-white/10">
                  Ahorra {pct}% · {formatCLP(savings)} menos que el precio de lista
                </p>
              </div>

              {/* Specs */}
              {(c.range || c.power) && (
                <div className="mb-5 grid grid-cols-2 gap-2">
                  {c.range && (
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-primary font-headline font-bold">{c.range} km</p>
                      <p className="text-white/40 text-xs">Autonomía</p>
                    </div>
                  )}
                  {c.power && (
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-primary font-headline font-bold">{c.power} CV</p>
                      <p className="text-white/40 text-xs">Potencia</p>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              <Link
                href={`/solicitar?auto=${c.slug}`}
                onClick={close}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-black shadow-[0_4px_20px_rgba(0,229,229,0.22)] transition-all hover:bg-primary-dark hover:scale-[1.02] active:scale-[0.99]"
              >
                Quiero esta oferta
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>

              <button
                type="button"
                onClick={close}
                className="mt-3 block w-full text-center text-xs text-white/30 transition-colors hover:text-white/50"
              >
                No gracias, seguir viendo
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
