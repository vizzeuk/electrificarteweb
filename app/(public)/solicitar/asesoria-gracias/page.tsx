import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "¡Asesoría confirmada! | Electrificarte",
  description: "Tu asesoría está confirmada. Te contactaremos pronto por WhatsApp.",
  robots: { index: false, follow: false },
};

const IconCheck = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const pasos = [
  "En los próximos minutos recibirás un mensaje de WhatsApp de nuestro equipo.",
  "El asesor revisará tus necesidades y te presentará las mejores opciones.",
  "Sin presión: es una conversación personalizada, no una venta.",
];

export default function AsesoriaGraciasPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-24 bg-surface">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-8 md:p-12 text-center">
        <div className="w-20 h-20 bg-primary/15 text-primary-deep rounded-full flex items-center justify-center mx-auto mb-7">
          <IconCheck className="w-10 h-10" />
        </div>
        <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-3">
          Asesoría confirmada
        </p>
        <h1 className="font-headline font-black text-3xl md:text-4xl tracking-tight uppercase leading-tight">
          ¡Tu asesoría está confirmada!
        </h1>
        <p className="text-text-muted mt-4 leading-relaxed">
          Recibimos tu pago. Un experto de Electrificarte te contactará directamente por WhatsApp
          para guiarte en la elección del auto ideal según tu presupuesto y necesidades reales.
        </p>

        <div className="mt-7 rounded-2xl bg-surface border border-gray-100 p-5 text-left">
          <p className="font-bold text-sm mb-3">Qué sigue ahora</p>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {pasos.map((paso) => (
              <li key={paso} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary-deep flex items-center justify-center flex-shrink-0 mt-0.5">
                  <IconCheck className="w-3 h-3" />
                </span>
                {paso}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-7 py-3 rounded-xl transition-colors"
        >
          Volver al inicio
        </Link>

        <div className="mt-8 pt-6 border-t border-gray-100 text-sm text-text-muted">
          <p>
            ¿Problemas con tu compra? Escríbenos a{" "}
            <a
              href="mailto:contacto@electrificarte.com?subject=Problema%20con%20mi%20compra"
              className="text-primary-deep font-bold hover:underline"
            >
              contacto@electrificarte.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
