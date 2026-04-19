"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

const features = [
  {
    icon: "search_insights",
    title: "Precios que el público no ve",
    description:
      "Accedemos a inventarios y bonos que los concesionarios no publican. Solo disponibles a través de nuestra red exclusiva.",
  },
  {
    icon: "bolt",
    title: "Oferta en 24 horas, garantizado",
    description:
      "Desde que activas el servicio, tienes tu mejor opción del mercado en menos de 24 horas.",
  },
  {
    icon: "handshake",
    title: "Tú no negocies. Nosotros lo hacemos.",
    description:
      "Eliminamos la incomodidad de negociar con un vendedor. El ahorro llega directamente a tu bolsillo.",
  },
];

export function Features() {
  return (
    <section className="py-24" aria-label="Beneficios del servicio">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid md:grid-cols-3 gap-12">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center mb-6">
                <Icon name={f.icon} className="text-primary-deep" />
              </div>
              <h3 className="text-xl font-headline font-bold">{f.title}</h3>
              <p className="text-text-muted leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
