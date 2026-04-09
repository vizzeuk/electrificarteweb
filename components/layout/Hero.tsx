"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

export interface HeroData {
  badge?: string;
  title?: string;
  titleHighlight?: string;
  subtitle?: string;
  cta1Text?: string;
  cta1Href?: string;
  cta2Text?: string;
  statSavings?: string;
  statCars?: string;
  statDiscount?: string;
  statResponse?: string;
  offerOldPrice?: string;
  offerNewPrice?: string;
  offerBadge?: string;
}

interface HeroProps {
  data?: HeroData;
}

export function Hero({ data }: HeroProps) {
  const badge         = data?.badge         ?? "Marketplace #1 en Chile";
  const title         = data?.title         ?? "Ahorra millones en tu próximo";
  const highlight     = data?.titleHighlight ?? "auto electrificado";
  const subtitle      = data?.subtitle      ?? "Negociamos con nuestra red exclusiva de concesionarios para garantizarte el mejor precio del mercado. Sin letra chica.";
  const cta1Text      = data?.cta1Text      ?? "Solicitar mi oferta";
  const cta1Href      = data?.cta1Href      ?? "/solicitar";
  const cta2Text      = data?.cta2Text      ?? "Cómo funciona";
  const statSavings   = data?.statSavings   ?? "$4.200.000 CLP";
  const statCars      = data?.statCars      ?? "500+";
  const statDiscount  = data?.statDiscount  ?? "27%";
  const statResponse  = data?.statResponse  ?? "24h";
  const offerOld      = data?.offerOldPrice ?? "$29.990";
  const offerNew      = data?.offerNewPrice ?? "$19.990";
  const offerBadge    = data?.offerBadge    ?? "33% dcto Electric Sale";

  return (
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden bg-black"
      aria-label="Bienvenida"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-primary/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <Badge variant="primary" className="mb-6">{badge}</Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-headline font-extrabold text-white leading-[1.05] mb-6">
              {title}{" "}
              <span className="text-primary">{highlight}</span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 mb-10 max-w-xl leading-relaxed">
              {subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={cta1Href}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-all text-lg"
              >
                {cta1Text}
                <Icon name="arrow_forward" size="sm" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-primary/50 text-white font-medium px-8 py-4 rounded-xl transition-all"
              >
                {cta2Text}
                <Icon name="expand_more" size="sm" />
              </a>
            </div>
          </motion.div>

          {/* Right: Stats/Trust card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Icon name="trending_down" className="text-primary" size="sm" />
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-widest">Ahorro promedio</p>
                  <p className="text-white text-2xl font-headline font-bold">{statSavings}</p>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-primary text-2xl font-headline font-bold">{statCars}</p>
                  <p className="text-white/40 text-xs mt-1">Autos vendidos</p>
                </div>
                <div className="text-center">
                  <p className="text-primary text-2xl font-headline font-bold">{statDiscount}</p>
                  <p className="text-white/40 text-xs mt-1">Dcto promedio</p>
                </div>
                <div className="text-center">
                  <p className="text-primary text-2xl font-headline font-bold">{statResponse}</p>
                  <p className="text-white/40 text-xs mt-1">Respuesta</p>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/80 text-sm mb-3 font-medium">Oferta activa ahora:</p>
                <div className="flex justify-between items-baseline">
                  <span className="text-white/40 text-sm line-through">{offerOld}</span>
                  <div className="text-right">
                    <p className="text-primary text-2xl font-headline font-extrabold">{offerNew}</p>
                    <p className="text-amber text-[10px] uppercase tracking-widest font-bold">{offerBadge}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="lg:hidden mt-10 bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 grid grid-cols-3 gap-4"
        >
          <div className="text-center">
            <p className="text-primary text-xl font-headline font-bold">{statCars}</p>
            <p className="text-white/40 text-[10px]">Autos vendidos</p>
          </div>
          <div className="text-center">
            <p className="text-primary text-xl font-headline font-bold">{statDiscount}</p>
            <p className="text-white/40 text-[10px]">Dcto promedio</p>
          </div>
          <div className="text-center">
            <p className="text-primary text-xl font-headline font-bold">{statResponse}</p>
            <p className="text-white/40 text-[10px]">Respuesta</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
