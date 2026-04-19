"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { formatCLP } from "@/lib/utils";

export interface HotDealCarData {
  slug: string;
  name: string;
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

export function HotDeal({ car }: HotDealProps) {
  const c = car ?? FALLBACK;
  const brandName   = c.brand?.name ?? c.name.split(" ")[0];
  const modelName   = c.brand ? c.name : c.name.split(" ").slice(1).join(" ");
  const bonus       = c.hotDealBonusAmount ?? 0;
  const savings     = c.basePrice - c.discountPrice;
  const savingsPct  = Math.round((savings / c.basePrice) * 100);

  return (
    <section className="bg-black py-16 md:py-24 overflow-hidden" aria-labelledby="hotdeal-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Badge variant="hot">HOT DEAL</Badge>
              <span className="text-white/50 text-sm">Oferta limitada</span>
            </div>

            <h2
              id="hotdeal-title"
              className="text-3xl sm:text-4xl md:text-5xl font-headline font-black text-white mb-6 uppercase leading-tight"
            >
              {brandName} {modelName} con bonos de hasta{" "}
              <span className="text-primary">{formatCLP(bonus > 0 ? bonus : savings)}</span>
            </h2>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-white/40 text-sm">Precio lista</span>
                <span className="text-white/40 line-through">{formatCLP(c.basePrice)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-white text-sm font-medium">Con bono Electrificarte</span>
                <span className="text-primary text-3xl font-headline font-black">{formatCLP(c.discountPrice)}</span>
              </div>
              <p className="text-white/30 text-xs pt-2 border-t border-white/10">
                Ahorra {savingsPct}% · Incluye bono concesionario + Electrificarte
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/solicitar?auto=${c.slug}`}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,229,229,0.25)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.38)] hover:scale-[1.02] active:scale-[0.99]"
              >
                Quiero esta oferta
                <Icon name="arrow_forward" size="sm" />
              </Link>
              <Link
                href={`/auto/${c.slug}`}
                className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-8 py-4 rounded-xl transition-all"
              >
                Ver especificaciones
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-8 md:p-12">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
              <div className="text-center space-y-6">
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt={`${brandName} ${modelName}`} className="w-full max-h-48 object-contain mx-auto" />
                ) : (
                  <Icon name="electric_car" className="text-primary/30" size="xl" />
                )}
                <div className="grid grid-cols-2 gap-4">
                  {c.range && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-primary text-xl font-headline font-bold">{c.range} km</p>
                      <p className="text-white/40 text-xs">Autonomía</p>
                    </div>
                  )}
                  {c.power && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-primary text-xl font-headline font-bold">{c.power} CV</p>
                      <p className="text-white/40 text-xs">Potencia</p>
                    </div>
                  )}
                  {c.traction && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-primary text-xl font-headline font-bold">{c.traction}</p>
                      <p className="text-white/40 text-xs">Tracción</p>
                    </div>
                  )}
                  {c.acceleration && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-primary text-xl font-headline font-bold">{c.acceleration}s</p>
                      <p className="text-white/40 text-xs">0-100 km/h</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
