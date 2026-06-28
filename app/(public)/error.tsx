"use client";

import React from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center gap-8 px-4 text-center bg-white">
      <span className="material-symbols-outlined text-[64px] text-amber-400">
        error
      </span>

      <div className="max-w-md">
        <h1 className="font-headline font-black text-2xl md:text-3xl text-text-main mb-3">
          Algo salió mal
        </h1>
        <p className="text-text-muted text-base mb-1">
          Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
        </p>
        {error.digest && (
          <p className="text-xs text-text-ghost font-mono mt-2">ref: {error.digest}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-3.5 rounded-xl transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-primary/50 text-text-main font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-[18px]">home</span>
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
