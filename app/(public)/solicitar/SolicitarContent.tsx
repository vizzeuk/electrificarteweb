"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { LeadForm } from "@/components/forms/LeadForm";
import { Icon } from "@/components/ui/Icon";
import { TrustBadges } from "@/components/layout/TrustBadges";

interface SolicitarContentProps {
  carOptions: string[];
}

function SolicitarInner({ carOptions }: SolicitarContentProps) {
  const searchParams = useSearchParams();
  const autoSlug = searchParams.get("auto") || undefined;

  return (
    <>
      {/* Hero */}
      <section className="bg-black pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-10">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/60">Solicitar oferta</span>
          </nav>
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <p className="text-primary text-[11px] uppercase tracking-widest font-bold mb-5">
                Negociacion exclusiva
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-black text-white leading-[1.05] tracking-tighter mb-6">
                Busca tu auto eléctrico{" "}
                <span className="text-primary">al mejor precio</span>
              </h1>
              <p className="text-white/60 text-lg leading-relaxed max-w-md">
                Ahorramos por ti. Conectamos con una red exclusiva de
                concesionarios para garantizarte el valor más bajo del mercado.
              </p>
              <div className="flex flex-wrap gap-4 mt-8">
                {["Respuesta en 24 horas", "Garantía de devolución", "Sin costos ocultos"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-white/50 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
              </div>
              <div className="relative z-10 w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <span className="material-symbols-outlined text-[96px] text-white/80">electric_car</span>
                    <span className="absolute -bottom-1 -right-2 w-9 h-9 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40">
                      <span className="material-symbols-outlined text-black text-[18px]">bolt</span>
                    </span>
                  </div>
                </div>
                <div className="mb-5">
                  <div className="flex justify-between text-xs text-white/40 mb-1.5">
                    <span>Cargando oferta</span>
                    <span className="text-primary font-bold">27% ahorro</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-gradient-to-r from-primary/80 to-primary rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-primary font-headline font-black text-xl">+200</p>
                    <p className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">Ofertas activas</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-primary font-headline font-black text-xl">24h</p>
                    <p className="text-white/40 text-[10px] uppercase tracking-wide mt-0.5">Respuesta garantizada</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-12 bg-surface border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: "1", title: "Completa tu solicitud",    desc: "Cuentanos que auto te interesa y tu presupuesto aproximado." },
              { n: "2", title: "Paga tu asesoria ($19.990)", desc: "Pago seguro por WebPay. Activamos la busqueda exclusiva inmediatamente." },
              { n: "3", title: "Recibe tu oferta en 24h",  desc: "Te enviamos la mejor oferta con bonos y financiamiento incluido." },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-deep font-headline font-bold text-sm">{s.n}</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-sm mb-1">{s.title}</h3>
                  <p className="text-text-muted text-xs leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form + Sidebar */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28 lg:self-start">
              <div className="bg-surface rounded-2xl p-6 border border-gray-100">
                <h3 className="font-headline font-bold mb-4 flex items-center gap-2">
                  <Icon name="verified" className="text-primary" size="sm" />
                  Que incluye tu asesoria
                </h3>
                <ul className="space-y-3">
                  {[
                    "Busqueda en red exclusiva de concesionarios",
                    "Negociacion de bonos y descuentos",
                    "Opciones de financiamiento pre-aprobadas",
                    "Comparativa de precios del mercado",
                    "Acompanamiento hasta la entrega",
                    "Garantia de devolucion si no hay ahorro",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Icon name="check_circle" className="text-primary flex-shrink-0 mt-0.5" size="sm" />
                      <span className="text-sm text-text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-text-muted text-sm">Precio del servicio</span>
                  <span className="text-text-ghost text-sm line-through">$29.990</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-headline font-bold">Pago unico</span>
                  <span className="text-3xl font-headline font-black text-primary-deep">$19.990</span>
                </div>
                <p className="text-[10px] text-text-ghost mt-2 uppercase tracking-wide">33% dcto por Electric Sale</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-headline font-bold text-sm mb-3">Metodos de pago</h3>
                <div className="flex flex-wrap gap-2">
                  {["WebPay", "Tarjeta credito", "Tarjeta debito", "Transferencia"].map((method) => (
                    <span key={method} className="text-xs bg-gray-100 px-3 py-1.5 rounded-full text-text-muted font-medium">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-8">
              <LeadForm carOptions={carOptions} carSlug={autoSlug} />
            </div>
          </div>
        </div>
      </section>

      <TrustBadges />
    </>
  );
}

export function SolicitarContent({ carOptions }: SolicitarContentProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-text-muted">Cargando...</p></div>}>
      <SolicitarInner carOptions={carOptions} />
    </Suspense>
  );
}
