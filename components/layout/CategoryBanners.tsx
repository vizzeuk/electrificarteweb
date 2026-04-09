"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export interface CategoryBannerData {
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  color?: string;
}

interface CategoryBannersProps {
  banners?: CategoryBannerData[];
}

const DEFAULT_BANNERS: CategoryBannerData[] = [
  { title: "Autos eléctricos desde $15M", subtitle: "Los más accesibles del mercado",    href: "/marcas?sort=price-asc",  icon: "savings",          color: "from-primary/10 to-primary/5" },
  { title: "SUV familiares de 7 asientos", subtitle: "3 corridas, espacio para todos",  href: "/tipo/suv",               icon: "family_restroom",  color: "from-amber/10 to-amber/5" },
];

export function CategoryBanners({ banners }: CategoryBannersProps) {
  const displayBanners = banners && banners.length > 0 ? banners : DEFAULT_BANNERS;

  return (
    <section className="pb-20 md:pb-24" aria-label="Categorías destacadas">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayBanners.map((cat, i) => (
          <motion.div
            key={cat.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
          >
            <Link
              href={cat.href}
              className={`bg-gradient-to-br ${cat.color ?? "from-primary/10 to-primary/5"} rounded-2xl p-8 md:p-10 flex items-center gap-6 group cursor-pointer hover:shadow-lg transition-all duration-300 border border-gray-100 block`}
            >
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Icon name={cat.icon} className="text-primary-deep" size="lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-headline font-bold leading-tight mb-1">{cat.title}</h3>
                <p className="text-text-muted text-sm mb-2">{cat.subtitle}</p>
                <span className="text-primary-deep font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                  Explorar
                  <Icon name="arrow_forward" size="sm" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
