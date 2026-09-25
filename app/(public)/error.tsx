"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page">
      <section className="section">
        <div className="wrap">
          <div className="max-w-[40rem]">
            <h1 className="t-h1">Algo salió mal</h1>
            <p className="t-lead mt-6">
              Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
            </p>
            {error.digest && (
              <p className="t-micro mt-3">
                Referencia del error: <span className="num">{error.digest}</span>
              </p>
            )}
            <div className="mt-10 flex flex-wrap gap-3">
              <button type="button" onClick={reset} className="btn btn--primary btn--lg">
                <Icon name="refresh" size="none" />
                Intentar de nuevo
              </button>
              <Link href="/" className="btn btn--secondary btn--lg">
                Ir al inicio
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
