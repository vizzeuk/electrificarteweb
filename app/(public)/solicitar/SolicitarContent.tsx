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
      {/* ── Compact header ────────────────────────────────────────────── */}
      <section className="bg-black pt-24 pb-0 overflow-hidden relative">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          {/* Title block — full width */}
          <div className="pb-8">
            <p className="text-primary text-[10px] uppercase tracking-widest font-bold mb-3">
              Negociación exclusiva
            </p>
            <h1 className="text-3xl sm:text-4xl font-headline font-black text-white leading-tight tracking-tighter mb-5">
              Solicita tu oferta{" "}
              <span className="text-primary">al mejor precio</span>
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {[
                { icon: "schedule", label: "Respuesta en 24 h" },
                { icon: "verified", label: "Garantía de devolución" },
                { icon: "lock",     label: "Sin costos ocultos" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-white/50 text-xs">
                  <span className="material-symbols-outlined text-primary text-[14px]">{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Steps strip — inline, bottom of header */}
          <div className="border-t border-white/10 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: "01", icon: "edit_note",        title: "Completa tu solicitud",      desc: "Cuéntanos qué auto te interesa y tu presupuesto." },
              { n: "02", icon: "payments",          title: "Paga tu asesoría ($19.990)", desc: "Activamos la búsqueda exclusiva al instante por WebPay." },
              { n: "03", icon: "mark_email_read",   title: "Recibe tu oferta en 24h",   desc: "La mejor oferta con bonos y financiamiento incluido." },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex items-start gap-3 relative">
                {i < arr.length - 1 && (
                  <div className="hidden sm:block absolute right-0 top-4 w-px h-full border-r border-white/10" />
                )}
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[14px]">{s.icon}</span>
                </div>
                <div>
                  <p className="text-white/30 text-[9px] font-bold tracking-widest mb-0.5">{s.n}</p>
                  <h3 className="text-white text-sm font-bold leading-snug mb-0.5">{s.title}</h3>
                  <p className="text-white/40 text-xs leading-relaxed">{s.desc}</p>
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
