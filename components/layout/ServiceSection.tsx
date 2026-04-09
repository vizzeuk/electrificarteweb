"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { LeadForm } from "@/components/forms/LeadForm";

export function ServiceSection() {
  return (
    <section className="bg-surface py-24" aria-labelledby="service-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          {/* Service Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 space-y-8"
          >
            <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon name="auto_awesome" size="xl" />
              </div>
              <h3
                id="service-title"
                className="text-2xl font-headline font-bold mb-6 flex items-center gap-3"
              >
                <Icon name="verified_user" className="text-primary" />
                Garantia Electrificarte
              </h3>
              <p className="text-text-muted leading-relaxed text-lg mb-8">
                Te garantizamos la mejor oferta del mercado para el auto
                electrico de tus suenos. Por solo un pago unico de{" "}
                <strong className="text-primary font-bold text-xl">
                  $19.990
                </strong>
                , procesamos tu solicitud a traves de nuestra base de datos
                exclusiva para encontrarte el precio mas competitivo.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-4 rounded-lg">
                  <span className="block text-primary font-bold text-xl">
                    100%
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                    Transparencia
                  </span>
                </div>
                <div className="bg-surface p-4 rounded-lg">
                  <span className="block text-primary font-bold text-xl">
                    24h
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                    Respuesta
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 p-6 bg-primary/5 rounded-xl border border-primary/10">
              <Icon name="savings" className="text-primary" size="lg" />
              <div>
                <h4 className="font-headline font-bold">Ahorro inteligente</h4>
                <p className="text-sm text-text-muted">
                  Nuestros clientes ahorran un promedio del 12% adicional.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-7"
          >
            <LeadForm />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
