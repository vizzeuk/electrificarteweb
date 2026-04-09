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
  { icon: "verified_user",    title: "Pago seguro",             description: "Transacciones protegidas con encriptación SSL " },
  { icon: "shield",           title: "Garantía de devolución",  description: "Si no logramos un descuento significativo, te devolvemos el 100%" },
  { icon: "lock",             title: "Datos protegidos",        description: "Tu información personal está protegida bajo la Ley 19.628 de Chile" },
  { icon: "workspace_premium",title: "Concesionarios oficiales",description: "Solo trabajamos con dealers autorizados y verificados" },
];

export function TrustBadges({ badges }: TrustBadgesProps) {
  const displayBadges = badges && badges.length > 0 ? badges : DEFAULT_BADGES;

  return (
    <section className="py-16 border-y border-gray-100" aria-label="Sellos de confianza">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {displayBadges.map((badge, i) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="text-center"
            >
              <div className="w-10 h-10 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center">
                <Icon name={badge.icon} className="text-primary-deep" size="sm" />
              </div>
              <h3 className="font-headline font-bold text-sm mb-1">{badge.title}</h3>
              <p className="text-text-ghost text-xs leading-relaxed">{badge.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
