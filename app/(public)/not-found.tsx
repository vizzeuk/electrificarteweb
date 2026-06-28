import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página no encontrada | Electrificarte",
};

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center gap-8 px-4 text-center bg-white">
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
    </main>
  );
}
