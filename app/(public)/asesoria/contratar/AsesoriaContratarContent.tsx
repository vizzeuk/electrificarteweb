"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { AsesoriaCheckoutForm } from "@/components/forms/AsesoriaCheckoutForm";
import { ASESORIA_PRICE } from "@/lib/products";

const INCLUYE = [
  "Recomendación personalizada según tu estilo de uso real",
  "Comparación entre modelos eléctricos e híbridos del catálogo",
  "Resolución de dudas técnicas: autonomía, carga y mantención",
  "Atención directa por WhatsApp, a tu ritmo",
];

const PASOS = [
  { title: "Deja tus datos", desc: "Nombre, email y WhatsApp, nada más." },
  { title: `Pagas ${ASESORIA_PRICE}`, desc: "Pago con tarjeta a través de WebPay, respuesta inmediata." },
  { title: "Francisco IA te escribe", desc: "Te contacta por WhatsApp al instante para asesorarte." },
];

const METODOS = ["WebPay", "Tarjeta de crédito", "Tarjeta de débito", "Transferencia"];

export function AsesoriaContratarContent() {
  return (
    <div className="page">
      {/* ── Encabezado claro ── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <Link href="/asesoria">Asesoría</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Contratar</span>
          </nav>

          <h1 className="t-h1 mt-header">Activa tu asesoría IA por WhatsApp</h1>

          <ol className="steps-row mt-header">
            {PASOS.map((s, i) => (
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
            <aside className="lg:col-span-5 lg:sticky lg:top-24" aria-labelledby="resumen-t">
              <div className="soft-block">
                <p className="t-label" id="resumen-t">Asesoría por WhatsApp</p>
                <p className="price-block__amount mt-3">{ASESORIA_PRICE}</p>
                <p className="price-block__per">por 10 días de conversación con Francisco IA</p>

                <h2 className="t-h3 mt-8 mb-5">Qué incluye tu asesoría</h2>
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

            <div className="lg:col-span-7">
              <AsesoriaCheckoutForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
