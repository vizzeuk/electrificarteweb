import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifyOrderToken } from "@/lib/order-token";

export const metadata: Metadata = {
  title: "¡Gracias por tu solicitud! | Electrificarte",
  description: "Tu solicitud quedó activa. Pronto recibirás la mejor oferta.",
  robots: { index: false, follow: false },
};

// Íconos en SVG inline — no dependen de la fuente Material Symbols, así
// renderizan al instante incluso en la primera pintura tras volver del pago.
const IconCheck = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default async function GraciasPage() {
  // Gate: solo quien pasó por el checkout (y por tanto pagó) tiene la cookie
  // firmada. Sin cookie válida → 404. No es accesible para cualquiera.
  const store = await cookies();
  const orderId = verifyOrderToken(store.get("ec_order")?.value);
  if (!orderId) notFound();

  const isAdvisory = store.get("ec_order_type")?.value === "advisory";

  const content = isAdvisory
    ? {
        badge:       "Asesoría confirmada",
        heading:     "¡Tu asesoría está confirmada!",
        body:        "Recibimos tu pago. Un experto de Electrificarte te contactará directamente por WhatsApp para guiarte en la elección del auto ideal según tu presupuesto y necesidades.",
        pasos: [
          "En los próximos minutos recibirás un mensaje de WhatsApp de nuestro equipo.",
          "El asesor revisará tus necesidades y te presentará las mejores opciones.",
          "Sin presión: es una conversación personalizada, no una venta.",
        ],
      }
    : {
        badge:       "Pago confirmado",
        heading:     "¡Gracias por confiar en Electrificarte!",
        body:        "Tu solicitud quedó activa. Nuestro equipo ya está negociando con la red de concesionarios para conseguirte el mejor precio de Chile.",
        pasos: [
          "En 48 a 96 horas te enviamos la mejor oferta.",
          "Revisá tu email y WhatsApp — ahí te contactamos.",
          "Cualquier duda, escribinos desde la página de contacto.",
        ],
      };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-24 bg-surface">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-8 md:p-12 text-center">
        <div className="w-20 h-20 bg-primary/15 text-primary-deep rounded-full flex items-center justify-center mx-auto mb-7">
          <IconCheck className="w-10 h-10" />
        </div>
        <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-3">
          {content.badge}
        </p>
        <h1 className="font-headline font-black text-3xl md:text-4xl tracking-tight uppercase leading-tight">
          {content.heading}
        </h1>
        <p className="text-text-muted mt-4 leading-relaxed">
          {content.body}
        </p>

        <div className="mt-7 rounded-2xl bg-surface border border-gray-100 p-5 text-left">
          <p className="font-bold text-sm mb-3">Qué sigue ahora</p>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {content.pasos.map((paso) => (
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
      </div>
    </main>
  );
}
