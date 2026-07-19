import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

// 404 raíz: cubre rutas fuera del route-group (public), que no tienen Navbar
// ni Footer. Es autocontenido — incluye una barra de marca mínima y salidas.
export default function RootNotFound() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center">
          <Link
            href="/"
            className="font-headline font-black tracking-tight text-text-main text-lg"
          >
            ELECTRIFICARTE<span className="text-primary-deep">.COM</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 text-center py-16">
        <div className="relative">
          <p className="text-[120px] md:text-[160px] font-headline font-black text-gray-100 leading-none select-none">
            404
          </p>
          <span className="material-symbols-outlined absolute inset-0 m-auto w-fit h-fit text-[56px] text-primary">
            electric_car
          </span>
        </div>

        <div className="max-w-md">
          <h1 className="font-headline font-black text-2xl md:text-3xl text-text-main mb-3">
            Esta página no existe
          </h1>
          <p className="text-text-muted text-base">
            Es posible que la URL esté incorrecta o que el contenido haya sido movido.
            Explora el catálogo o solicita una oferta directamente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Ir al inicio
          </Link>
          <Link
            href="/marcas"
            className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-primary/50 text-text-main font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            Ver marcas
          </Link>
          <Link
            href="/solicitar"
            className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-primary/50 text-text-main font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            Solicitar oferta
          </Link>
        </div>
      </div>
    </main>
  );
}
