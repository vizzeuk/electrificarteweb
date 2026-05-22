import React from "react";
import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { carNamesForFormQuery } from "@/lib/queries/car";
import { SolicitarContent } from "./SolicitarContent";

export const metadata: Metadata = {
  alternates: { canonical: "/solicitar" },
  title: "Solicitar oferta | Asesoria para tu auto electrico",
  description:
    "Completa tu solicitud y recibe en 48 a 96 horas la mejor oferta del mercado para tu auto electrico en Chile. Pago unico de $19.990. Garantia de devolucion.",
  openGraph: {
    title: "Solicitar oferta | Electrificarte",
    description:
      "Recibe la mejor oferta para tu auto electrico en 48 a 96 horas. Pago unico $19.990.",
  },
};

export const revalidate = 3600;

export default async function SolicitarPage() {
  const rawCars = await client.fetch(carNamesForFormQuery).catch(() => []);
  // Por cada auto: la opción "pelada" + una opción por cada versión.
  const carOptions: string[] = rawCars.flatMap(
    (c: { brand: string; label: string; versions?: (string | null)[] }) => {
      const base = c.brand ? `${c.brand} ${c.label}` : c.label;
      const versionOpts = (c.versions ?? [])
        .filter(Boolean)
        .map((v) => `${base} ${v}`);
      return [base, ...versionOpts];
    }
  );

  return <SolicitarContent carOptions={carOptions} />;
}
