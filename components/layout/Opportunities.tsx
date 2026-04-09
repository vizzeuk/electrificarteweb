"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatCLP } from "@/lib/utils";

export interface OpportunityCarData {
  _id?: string;
  name: string;
  slug: string;
  brand?: { name: string } | string;
  category?: { name: string } | string;
  imageUrl?: string;
  basePrice: number;
  discountPrice?: number;
  range: number;
  isHotDeal?: boolean;
}

interface OpportunitiesProps {
  title?: string;
  cars?: OpportunityCarData[];
}

const FALLBACK: OpportunityCarData[] = [
  { name: "MG Marvel R",   slug: "mg-marvel-r",   brand: "MG",      category: "SUV",          basePrice: 40500000, discountPrice: 29390000, range: 402 },
  { name: "JAC E30X",      slug: "jac-e30x",       brand: "JAC",     category: "City Car",     basePrice: 22990000, discountPrice: 19590000, range: 322 },
  { name: "BYD Yuan Plus", slug: "byd-yuan-plus",  brand: "BYD",     category: "SUV Compacto", basePrice: 32500000, discountPrice: 22890000, range: 410 },
  { name: "Tesla Model 3", slug: "tesla-model-3",  brand: "Tesla",   category: "Sedán",        basePrice: 48590000, discountPrice: 39990000, range: 513 },
];

export function Opportunities({ title = "Oportunidades del momento", cars }: OpportunitiesProps) {
  const displayCars = cars && cars.length > 0 ? cars : FALLBACK;

  return (
    <section className="py-20 md:py-24" aria-labelledby="opportunities-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-2">Ofertas activas</p>
          <h2 id="opportunities-title" className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tighter mb-4">
            {title}
          </h2>
          <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayCars.map((deal, i) => {
            const brandName    = deal.brand ? (typeof deal.brand === "string" ? deal.brand : deal.brand.name) : "";
            const categoryName = deal.category ? (typeof deal.category === "string" ? deal.category : deal.category.name) : "";
            return (
              <motion.article
                key={deal._id ?? deal.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group border border-gray-100 bg-white rounded-xl p-5 flex flex-col hover:border-primary/40 hover:shadow-md transition-all duration-300"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-4 flex flex-col items-center justify-center overflow-hidden">
                  {deal.imageUrl ? (
                    <img src={deal.imageUrl} alt={deal.name} className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <Icon name="electric_car" className="text-gray-200 mb-2" size="xl" />
                      <span className="text-[10px] uppercase tracking-widest text-text-ghost font-bold">{categoryName}</span>
                    </>
                  )}
                </div>

                <h3 className="font-headline font-bold text-center mb-1">{brandName} {deal.name}</h3>
                <p className="text-xs text-text-ghost text-center mb-4">{deal.range} km autonomía</p>

                <div className="space-y-1.5 mb-5 px-1">
                  <div className="flex justify-between text-xs text-text-ghost">
                    <span>Precio lista</span>
                    <span className="line-through">{formatCLP(deal.basePrice)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold">Con descuento</span>
                    <span className="text-lg font-headline font-black text-primary-deep">
                      {formatCLP(deal.discountPrice ?? deal.basePrice)}
                    </span>
                  </div>
                </div>

                <div className="mt-auto flex gap-2">
                  <Link
                    href={`/auto/${deal.slug}`}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark font-bold text-sm rounded-lg text-center transition-colors text-black"
                  >
                    Ver detalle
                  </Link>
                  <Link
                    href="/comparador"
                    title="Comparar"
                    className="px-3 border border-gray-200 hover:border-primary/40 text-text-muted hover:text-primary-deep rounded-lg flex items-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">compare</span>
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
