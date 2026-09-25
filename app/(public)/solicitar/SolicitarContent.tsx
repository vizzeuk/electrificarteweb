"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { LeadForm } from "@/components/forms/LeadForm";
import { Icon } from "@/components/ui/Icon";
import { TrustBadges } from "@/components/layout/TrustBadges";

// 🟡 STANDBY (giro sep-2026): esta vista solo se muestra si OFERTA_STANDBY = false (hoy la
// página devuelve 404). El copy es el del flujo pagado a propósito: al reactivarlo hay que
// revisarlo con Francisco (docs/PIVOT-WAITLIST-PLAN.md, "Cómo reactivar la oferta").

interface SolicitarContentProps {
  carOptions: string[];
  servicePrice?: string;
}

const INCLUYE = [
  "Búsqueda en red exclusiva de vendedores oficiales",
  "Negociación de bonos y descuentos",
  "Opciones de financiamiento preaprobadas",
  "Comparativa de precios del mercado",
  "Acompañamiento hasta la entrega",
  "Garantía de devolución si no hay ahorro",
];

const METODOS = ["WebPay", "Tarjeta de crédito", "Tarjeta de débito", "Transferencia"];

function SolicitarInner({ carOptions, servicePrice = "$19.990" }: SolicitarContentProps) {
  const searchParams = useSearchParams();
  const autoSlug   = searchParams.get("auto")    || undefined;
  const autoNombre = searchParams.get("nombre")  || undefined;

  const pasos = [
    { title: "Completa tu solicitud",       desc: "Cuéntanos qué auto te interesa y tu presupuesto." },
    { title: "Activa tu búsqueda",          desc: `Un pago único de ${servicePrice} por WebPay activa la búsqueda exclusiva.` },
    { title: "Recibe tu oferta en 48 a 96 h", desc: "La mejor oferta con bonos y financiamiento incluido." },
  ];

  return (
    <div className="page">
      {/* ── Encabezado claro ── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Solicitar oferta</span>
          </nav>

          <h1 className="t-h1 mt-header max-w-[20ch]">
            Conseguimos el mejor precio <span className="tone">o te devolvemos el dinero</span>
          </h1>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Respuesta en 48 a 96 h", "Garantía de devolución", "Sin costos ocultos"].map((label) => (
              <span key={label} className="chip">{label}</span>
            ))}
          </div>

          <ol className="steps-row mt-header">
            {pasos.map((s, i) => (
              <li key={s.title}>
                <span className="step__n">{String(i + 1).padStart(2, "0")}</span>
                <p className="step__title">{s.title}</p>
                <p className="step__text">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Resumen (bloque Glaciar) + formulario ── */}
      <section className="section">
        <div className="wrap">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-16">
            <aside className="lg:col-span-4 lg:sticky lg:top-24" aria-labelledby="solicitud-t">
              <div className="soft-block">
                <p className="t-label">Precio del servicio</p>
                <p className="price-was mt-3">$29.990</p>
                <p className="price-block__amount mt-1">{servicePrice}</p>
                <p className="price-block__per">Pago único</p>
                <p className="t-micro mt-2">33% dcto por Electric Sale</p>

                <h2 className="t-h3 mt-8 mb-5" id="solicitud-t">Qué incluye tu solicitud</h2>
                <ul className="checklist">
                  {INCLUYE.map((item) => (
                    <li key={item}>
                      <Icon name="check" size="none" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <p className="t-label mt-8 mb-3">Métodos de pago</p>
                <div className="flex flex-wrap gap-2">
                  {METODOS.map((method) => (
                    <span key={method} className="chip">{method}</span>
                  ))}
                </div>
              </div>
            </aside>

            <div className="lg:col-span-8">
              <LeadForm carOptions={carOptions} carSlug={autoSlug} carName={autoNombre} />
            </div>
          </div>
        </div>
      </section>

      <TrustBadges />
    </div>
  );
}

export function SolicitarContent({ carOptions, servicePrice }: SolicitarContentProps) {
  return (
    <Suspense
      fallback={
        <div className="page flex min-h-screen items-center justify-center">
          <p className="t-body">Cargando...</p>
        </div>
      }
    >
      <SolicitarInner carOptions={carOptions} servicePrice={servicePrice} />
    </Suspense>
  );
}
