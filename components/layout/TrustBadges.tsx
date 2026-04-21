"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

export interface TrustBadgeData {
  icon: string;
  title: string;
  description: string;
}

interface TrustBadgesProps {
  badges?: TrustBadgeData[];
}

const DEFAULT_BADGES: TrustBadgeData[] = [
  { icon: "verified_user",     title: "Pago seguro",              description: "Tu pago está protegido. Usamos WebPay y encriptación bancaria." },
  { icon: "shield",            title: "Garantía de devolución",   description: "Si no logramos un descuento significativo, te devolvemos el 100%." },
  { icon: "lock",              title: "Datos protegidos",         description: "Tu información personal está protegida bajo la Ley 19.628 de Chile." },
  { icon: "workspace_premium", title: "Concesionarios oficiales", description: "Solo trabajamos con dealers autorizados y verificados en Chile." },
];

export function TrustBadges({ badges }: TrustBadgesProps) {
  const displayBadges = badges && badges.length > 0 ? badges : DEFAULT_BADGES;

  return (
    <section className="bg-gray-50 py-16 px-4 md:px-8" aria-label="Sellos de confianza">
      <div className="max-w-7xl mx-auto">

        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-deep mb-2">
            Tu tranquilidad, primero
          </p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-text-main">
            Compras con total confianza
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayBadges.map((badge, i) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-start gap-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mt-0.5">
                <Icon name={badge.icon} className="text-primary-deep" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-text-main text-base mb-1">
                  {badge.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {badge.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
