"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { formatCLP, DEFAULT_HOT_DEAL_LABEL } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import type { HotDealCarData } from "@/components/layout/HotDeal";
import { OfferCta } from "@/components/waitlist/OfferCta";

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
  urgencyLabel?: string | null;
}

export function PromoPopup({ car, urgencyLabel }: PromoPopupProps) {
  const [open, setOpen] = useState(false);

  const c     = car ?? FALLBACK;
  const label = urgencyLabel ?? DEFAULT_HOT_DEAL_LABEL;
  const brandName = c.brand?.name ?? c.name.split(" ")[0];
  const modelName = c.brand ? c.name : c.name.split(" ").slice(1).join(" ");
  const savings   = c.basePrice - c.discountPrice;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const onScroll = () => {
      const ratio = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (ratio >= 0.55) {
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
        <m.div
          key="promo-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={close}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          style={{ background: "var(--veil-modal)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-title"
        >
          <m.div
            key="promo-modal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-card bg-papel text-tinta shadow-overlay"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="btn btn--secondary btn--icon btn--sm absolute right-3 top-3 z-10 !bg-papel"
            >
              <Icon name="close" size="none" />
            </button>

            {c.imageUrl && (
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-niebla">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl} alt={`${brandName} ${modelName}`} className="h-full w-full object-cover" />
                <span className="chip chip--soft absolute left-4 top-4">Oferta destacada</span>
              </div>
            )}

            <div className="p-6 sm:p-8">
              <p className="t-label">{label}</p>
              <h2 id="promo-title" className="mt-2 font-display text-[1.75rem] font-bold leading-[1.08] tracking-[-0.02em]">
                {brandName} {modelName}
              </h2>

              <dl className="deal__prices !mt-5">
                <div>
                  <dt>Precio de lista</dt>
                  <dd className="price-was">{formatCLP(c.basePrice)}</dd>
                </div>
                <div>
                  <dt>Con bonos</dt>
                  <dd className="price price--lg">{formatCLP(c.discountPrice)}</dd>
                </div>
                <div>
                  <dt>Ahorras</dt>
                  <dd className="save">{formatCLP(savings)}</dd>
                </div>
              </dl>

              {(c.range || c.power) && (
                <p className="mt-4 text-small text-grafito">
                  {[c.range ? `${c.range} km de autonomía` : null, c.power ? `${c.power} CV` : null].filter(Boolean).join(", ")}
                </p>
              )}

              {/* CTA — `onClick` cierra este promo antes de abrir el popup de waitlist. */}
              <OfferCta
                carSlug={c.slug}
                model={`${brandName} ${modelName}`}
                source="promopopup"
                onClick={close}
                className="btn btn--primary btn--lg btn--block mt-6"
              >
                Quiero esta oferta
              </OfferCta>

              <button type="button" onClick={close} className="btn btn--quiet btn--block mt-2">
                No gracias, seguir viendo
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
