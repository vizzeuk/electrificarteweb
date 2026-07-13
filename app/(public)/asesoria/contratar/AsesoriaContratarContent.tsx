"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { AsesoriaCheckoutForm } from "@/components/forms/AsesoriaCheckoutForm";
import { ASESORIA_PRICE } from "@/lib/products";

const INCLUYE = [
  "Recomendación personalizada según tu estilo de uso real",
  "Comparación entre modelos eléctricos e híbridos del catálogo",
  "Resolución de dudas técnicas (autonomía, carga, mantención)",
  "Atención directa por WhatsApp, a tu ritmo",
];

export function AsesoriaContratarContent() {
  return (
    <>
      {/* ── Compact header ────────────────────────────────────────────── */}
      <section className="bg-black pt-24 pb-0 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-amber/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-8">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/asesoria" className="hover:text-white/60 transition-colors">Asesoría</Link>
            <span>/</span>
            <span className="text-white/60">Contratar</span>
          </nav>

          <div className="pb-7">
            <p className="text-amber text-[10px] uppercase tracking-widest font-bold mb-3">
              Último paso
            </p>
            <h1 className="text-3xl sm:text-4xl font-headline font-black text-white leading-tight tracking-tighter mb-5">
              Activa tu <span className="text-amber">Asesoría IA</span> por WhatsApp
            </h1>
          </div>

          <div className="border-t border-white/10 py-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: "01", icon: "edit_note",      title: "Deja tus datos",          desc: "Nombre, email y WhatsApp — nada más." },
              { n: "02", icon: "payments",         title: "Pagas $4.990",           desc: "Pago único por WebPay, respuesta inmediata." },
              { n: "03", icon: "forum",            title: "Francisco IA te escribe", desc: "Te contacta por WhatsApp al instante para asesorarte." },
            ].map((s) => (
              <div
                key={s.n}
                className="flex items-start gap-3 rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 hover:bg-white/[0.06] hover:border-amber/25 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber text-[16px]">{s.icon}</span>
                </div>
                <div className="min-w-0">
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
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 lg:items-start">
            {/* Sidebar */}
            <div className="lg:col-span-5">
              <div className="space-y-6 lg:sticky lg:top-28">
                <div className="bg-surface rounded-2xl p-6 border border-gray-100">
                  <h3 className="font-headline font-bold mb-4 flex items-center gap-2">
                    <Icon name="verified" className="text-amber-dark" size="sm" />
                    Qué incluye tu asesoría
                  </h3>
                  <ul className="space-y-3">
                    {INCLUYE.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Icon name="check_circle" className="text-amber-dark flex-shrink-0 mt-0.5" size="sm" />
                        <span className="text-sm text-text-muted">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber/5 rounded-2xl p-6 border border-amber/10">
                  <div className="flex items-baseline justify-between">
                    <span className="font-headline font-bold">Pago único</span>
                    <span className="text-3xl font-headline font-black text-amber-dark">{ASESORIA_PRICE}</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="font-headline font-bold text-sm mb-3">Métodos de pago</h3>
                  <div className="flex flex-wrap gap-2">
                    {["WebPay", "Tarjeta crédito", "Tarjeta débito", "Transferencia"].map((method) => (
                      <span key={method} className="text-xs bg-gray-100 px-3 py-1.5 rounded-full text-text-muted font-medium">
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-7">
              <AsesoriaCheckoutForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
