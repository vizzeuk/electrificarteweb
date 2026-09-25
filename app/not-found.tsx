import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

// 404 raíz: cubre rutas fuera del route-group (public), que no tienen Navbar
// ni Footer. Es autocontenido — incluye una barra de marca mínima y salidas.
export default function RootNotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="border-b border-line">
        <div className="wrap flex h-18 items-center">
          <Link href="/" className="inline-flex text-ink">
            <Logo className="h-[14px] sm:h-[17px]" />
          </Link>
        </div>
      </header>

      <section className="section flex-1">
        <div className="wrap">
          <div className="max-w-[40rem]">
            <div className="head-chips">
              <span className="chip">Error 404</span>
            </div>
            <h1 className="t-h1">Esta página no existe</h1>
            <p className="t-lead mt-6">
              Es posible que la URL esté incorrecta o que el contenido haya sido movido. Explora el
              catálogo o{" "}
              {/* Este 404 vive FUERA del grupo (public), así que no está envuelto por
                  WaitlistProvider — no puede usar OfferCta. Apunta a la Asesoría, que es
                  el producto principal tras el giro (ver docs/PIVOT-WAITLIST-PLAN.md). */}
              <Link href="/asesoria" className="link">
                conoce la asesoría por WhatsApp
              </Link>
              .
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/" className="btn btn--primary btn--lg">
                Ir al inicio
              </Link>
              <Link href="/marcas" className="btn btn--secondary btn--lg">
                Ver marcas
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
