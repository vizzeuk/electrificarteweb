"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { HeroVideoPlayer } from "@/components/layout/HeroVideoPlayer";

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
  videoUrl?: string;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function HeroVideo({ url }: { url: string }) {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=1&rel=0&modestbranding=1`}
        title="Video Electrificarte"
        allow="autoplay; encrypted-media"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    );
  }
  return (
    <video
      src={url}
      autoPlay
      muted
      loop
      playsInline
      controls
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

interface HeroProps {
  data?: HeroData;
}

export function Hero({ data }: HeroProps) {
  const badge         = data?.badge         ?? "Más de 500 compras negociadas en Chile";
  const title         = data?.title         ?? "Paga menos por tu próximo";
  const highlight     = data?.titleHighlight ?? "auto eléctrico";
  const subtitle      = data?.subtitle      ?? "Negociamos con nuestra red de concesionarios y te traemos la mejor oferta del mercado en 24 horas. Si no ahorras, te devolvemos el dinero.";
  const cta1Text      = data?.cta1Text      ?? "Ver autos disponibles";
  const cta1Href      = data?.cta1Href      ?? "/marcas";
  const cta2Text      = data?.cta2Text      ?? "Cómo funciona";
  const statSavings   = data?.statSavings   ?? "$4.200.000 CLP";
  const statCars      = data?.statCars      ?? "500+";
  const statDiscount  = data?.statDiscount  ?? "27%";
  const statResponse  = data?.statResponse  ?? "24h";
  const offerOld      = data?.offerOldPrice ?? "$29.990";
  const offerNew      = data?.offerNewPrice ?? "$19.990";
  const offerBadge    = data?.offerBadge    ?? "33% dcto Electric Sale";
  const videoUrl      = data?.videoUrl;

  return (
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden bg-black pt-16 md:pt-20"
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-24 lg:py-32 w-full">
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
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-all text-lg shadow-[0_6px_32px_rgba(0,229,229,0.30)] hover:shadow-[0_8px_40px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]"
              >
                {cta1Text}
                <Icon name="arrow_forward" size="sm" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/50 hover:bg-white/5 text-white font-medium px-8 py-4 rounded-xl transition-all"
              >
                {cta2Text}
                <Icon name="expand_more" size="sm" />
              </a>
            </div>
          </motion.div>

          {/* Right: Sanity video > animated demo */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full"
          >
            <div className="relative w-full aspect-[16/9] lg:scale-[1.12] lg:origin-right rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_48px_rgba(0,229,229,0.12)] bg-black">
              {videoUrl ? (
                <HeroVideo url={videoUrl} />
              ) : (
                <HeroVideoPlayer />
              )}
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
