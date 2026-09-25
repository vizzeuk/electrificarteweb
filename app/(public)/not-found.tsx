import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { OfferCta } from "@/components/waitlist/OfferCta";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

// 404 dentro del grupo (public): se muestra cuando una página llama a notFound() (una ficha
// que no existe, /solicitar mientras dura el standby, etc.), con Navbar y Footer.
export default function NotFound() {
  return (
    <div className="page">
      <section className="section">
        <div className="wrap">
          <div className="max-w-[40rem]">
            <div className="head-chips">
              <span className="chip">Error 404</span>
            </div>
            <h1 className="t-h1">Esta página no existe</h1>
            <p className="t-lead mt-6">
              Es posible que la URL esté incorrecta o que el contenido haya sido movido. Explora el
              catálogo o{" "}
              <OfferCta source="404" className="link cursor-pointer">
                súmate a la waitlist
              </OfferCta>
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
    </div>
  );
}
