import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "¡Asesoría confirmada!",
  description: "Tu asesoría está confirmada. Te contactaremos pronto por WhatsApp.",
  robots: { index: false, follow: false },
};

const pasos = [
  "En los próximos minutos recibirás un mensaje de WhatsApp de nuestro equipo.",
  "El asesor revisará tus necesidades y te presentará las mejores opciones.",
  "Sin presión: es una conversación personalizada, no una venta.",
];

export default function AsesoriaGraciasPage() {
  return (
    <div className="page">
      <section className="section">
        <div className="wrap">
          <div className="max-w-[40rem]">
            <div className="head-chips">
              <span className="chip chip--soft">Asesoría confirmada</span>
            </div>
            <h1 className="t-h1">¡Tu asesoría está confirmada!</h1>
            <p className="t-lead mt-6">
              Recibimos tu pago. Un experto de Electrificarte te contactará directamente por WhatsApp
              para guiarte en la elección del auto ideal según tu presupuesto y necesidades reales.
            </p>

            <h2 className="t-h4 mt-10">Qué sigue ahora</h2>
            <ol className="mt-4 border-b border-line">
              {pasos.map((paso, i) => (
                <li key={paso} className="step">
                  <span className="step__n">{String(i + 1).padStart(2, "0")}</span>
                  <p className="t-body">{paso}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/" className="btn btn--primary btn--lg">
                Volver al inicio
              </Link>
              <Link href="/marcas" className="btn btn--secondary btn--lg">
                Explorar el catálogo
              </Link>
            </div>

            <p className="t-small mt-10 border-t border-line pt-6">
              ¿Problemas con tu compra? Escríbenos a{" "}
              <a
                href="mailto:contacto@electrificarte.com?subject=Problema%20con%20mi%20compra"
                className="link"
              >
                contacto@electrificarte.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
