"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { formatCLP, calculateDiscount } from "@/lib/utils";

interface CarCardProps {
  name: string;
  brand: string;
  slug: string;
  image?: string;
  category?: string;
  batteryCapacity: number;
  range: number;
  basePrice: number;
  discountPrice?: number;
  isNew?: boolean;
  index?: number;
}

export function CarCard({
  name,
  brand,
  slug,
  image,
  category,
  batteryCapacity,
  range,
  basePrice,
  discountPrice,
  isNew,
  index = 0,
}: CarCardProps) {
  const hasDiscount = discountPrice && discountPrice < basePrice;
  const discountPct = hasDiscount ? calculateDiscount(basePrice, discountPrice) : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group border border-border bg-white rounded-2xl overflow-hidden flex flex-col hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <Link href={`/auto/${slug}`} aria-label={`Ver ${brand} ${name}`}>
        <div className="aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-50 relative overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={`${brand} ${name} - Auto electrico disponible en Chile`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
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
          <Icon name="electric_car" className="text-gray-200" size="sm" />
        </div>

        <div className="space-y-2 py-3 border-y border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-[11px] uppercase tracking-wide text-text-muted font-semibold">
              Bateria
            </span>
            <span className="text-sm font-medium">{batteryCapacity} kWh</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] uppercase tracking-wide text-text-muted font-semibold">
              Autonomia
            </span>
            <span className="text-sm font-medium">{range} km</span>
          </div>
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
    </motion.article>
  );
}
