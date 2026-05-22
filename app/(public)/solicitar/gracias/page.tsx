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

export default async function GraciasPage() {
  // Gate: solo quien pasó por el checkout (y por tanto pagó) tiene la cookie
  // firmada. Sin cookie válida → 404. No es accesible para cualquiera.
  const store = await cookies();
  const orderId = verifyOrderToken(store.get("ec_order")?.value);
  if (!orderId) notFound();

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-24 bg-surface">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-8 md:p-12 text-center">
        <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-7">
          <span className="material-symbols-outlined text-primary-deep text-[44px]">verified</span>
        </div>
        <p className="text-[11px] uppercase tracking-widest text-primary-deep font-bold mb-3">
          Pago confirmado
        </p>
        <h1 className="font-headline font-black text-3xl md:text-4xl tracking-tight uppercase leading-tight">
          ¡Gracias por confiar en Electrificarte!
        </h1>
        <p className="text-text-muted mt-4 leading-relaxed">
          Tu solicitud quedó activa. Nuestro equipo ya está negociando con la red de
          concesionarios para conseguirte el mejor precio de Chile.
        </p>

        <div className="mt-7 rounded-2xl bg-surface border border-gray-100 p-5 text-left">
          <p className="font-bold text-sm mb-3">Qué sigue ahora</p>
          <ul className="space-y-2.5 text-sm text-text-muted">
            <li className="flex gap-2.5">
              <span className="material-symbols-outlined text-primary-deep text-[18px]">schedule</span>
              En 48 a 96 horas te enviamos la mejor oferta.
            </li>
            <li className="flex gap-2.5">
              <span className="material-symbols-outlined text-primary-deep text-[18px]">mail</span>
              Revisá tu email y WhatsApp — ahí te contactamos.
            </li>
            <li className="flex gap-2.5">
              <span className="material-symbols-outlined text-primary-deep text-[18px]">support_agent</span>
              Cualquier duda, escribinos desde la página de contacto.
            </li>
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
