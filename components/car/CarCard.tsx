"use client";

import { m } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { formatCLP, calculateDiscount, carStats } from "@/lib/utils";
import { sanityImg } from "@/lib/sanityImage";

interface CarCardProps {
  name: string;
  brand: string;
  brandLogo?: string;
  slug: string;
  image?: string;
  category?: string;
  batteryCapacity?: number | null;
  range?: number | null;
  maxVersionRange?: number | null;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
  rendimientoElectrico?: number | null;
  electricTypeTag?: string | null;
  power?: number | null;
  basePrice: number;
  discountPrice?: number;
  isNew?: boolean;
  index?: number;
  compact?: boolean;
  noAnimate?: boolean;
}

export function CarCard({
  name,
  brand,
  brandLogo,
  slug,
  image,
  category,
  batteryCapacity,
  range,
  maxVersionRange,
  electricRangeKm,
  fuelConsumption,
  rendimientoElectrico,
  electricTypeTag,
  power,
  basePrice,
  discountPrice,
  isNew,
  index = 0,
  compact = false,
  noAnimate = false,
}: CarCardProps) {
  const hasDiscount = discountPrice && discountPrice < basePrice;
  const discountPct = hasDiscount ? calculateDiscount(basePrice, discountPrice) : 0;

  const stats = compact ? (() => {
    const tag = (electricTypeTag ?? "").toUpperCase();
    const isPHEV = tag === "PHEV" || tag === "REEV";
    const isHEV  = tag === "HEV"  || tag === "MHEV";
    const isBEV  = !isPHEV && !isHEV;
    type S = { label: string; value: string };
    const out: S[] = [];
    if (isBEV) {
      const rv = (maxVersionRange && maxVersionRange > (range ?? 0)) ? maxVersionRange : range;
      if (rv) out.push({ label: "Autonomía", value: `${rv} km` });
    } else if (isPHEV) {
      if (electricRangeKm) out.push({ label: "Autonomía e-", value: `${electricRangeKm} km` });
    } else {
      if (fuelConsumption) out.push({ label: "Rendimiento", value: `${fuelConsumption} km/L` });
    }
    if ((batteryCapacity ?? 0) >= 1) out.push({ label: "Batería", value: `${batteryCapacity} kWh` });
    return out;
  })() : carStats({ battery: batteryCapacity, range, maxVersionRange, electricRangeKm, fuelConsumption, rendimientoElectrico, electricTypeTag, power });

  const animProps = noAnimate
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-50px" },
        transition: { duration: 0.4, delay: index * 0.1 },
      };

  return (
    <m.article
      {...animProps}
      className="group border border-border bg-white rounded-2xl overflow-hidden flex flex-col hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <Link href={`/auto/${slug}`} aria-label={`Ver ${brand} ${name}`}>
        <div className="aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-50 relative overflow-hidden">
          {image ? (
            <img
              src={sanityImg(image, { w: 480, q: 75 })}
              alt={`${brand} ${name} - Auto electrico disponible en Chile`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon name="electric_car" className="text-gray-200" size="xl" />
            </div>
          )}
          {category && (
            <Badge variant="new" className="absolute top-3 left-3">
              {category}
            </Badge>
          )}
          {isNew && (
            <Badge variant="primary" className="absolute top-3 right-3">
              NUEVO
            </Badge>
          )}
          {hasDiscount && (
            <Badge
              variant="hot"
              className="absolute bottom-3 right-3"
            >
              -{discountPct}%
            </Badge>
          )}
        </div>
      </Link>

      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg font-headline leading-tight">
              {name}
            </h3>
            <p className="text-text-muted text-sm">{brand}</p>
          </div>
          {brandLogo ? (
            <img
              src={sanityImg(brandLogo, { w: 112, q: 85 })}
              alt={brand}
              className="h-7 w-auto max-w-[56px] object-contain opacity-60"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <Icon name="electric_car" className="text-gray-200" size="sm" />
          )}
        </div>

        <div className="py-3 border-y border-gray-100 min-h-[72px] flex flex-col justify-center space-y-2">
          {stats.map(s => (
            <div key={s.label} className="flex justify-between items-center">
              <span className="text-[11px] uppercase tracking-wide text-text-muted font-semibold">{s.label}</span>
              <span className="text-sm font-medium">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Pricing block */}
        <div className="mt-4">
          {hasDiscount ? (
            <div>
              <p className="text-xs text-text-ghost line-through">
                {formatCLP(basePrice)}
              </p>
              <p className="text-xl font-headline font-bold text-primary-deep">
                {formatCLP(discountPrice)}
              </p>
            </div>
          ) : (
            <p className="text-xl font-headline font-bold">
              {formatCLP(basePrice)}
            </p>
          )}
          <p className="text-[10px] text-text-ghost mt-1">
            *Precio referencial. Consulta por financiamiento.
          </p>
        </div>
      </div>

      <div className="p-5 pt-0 flex gap-2">
        <Link
          href={`/auto/${slug}`}
          className="flex-1 bg-primary hover:bg-primary-dark text-black py-3 rounded-lg font-bold text-sm text-center transition-colors"
        >
          Ver detalle
        </Link>
        <Link
          href={`/comparador?add=${slug}`}
          title="Comparar"
          className="px-3 border border-gray-200 hover:border-primary/40 text-text-muted hover:text-primary-deep rounded-lg flex items-center transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">compare</span>
        </Link>
      </div>
    </m.article>
  );
}
