import React from "react";
import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { carNamesForFormQuery } from "@/lib/queries/car";
import { SolicitarContent } from "./SolicitarContent";

export const metadata: Metadata = {
  title: "Solicitar oferta | Asesoria para tu auto electrico",
  description:
    "Completa tu solicitud y recibe en 24 horas la mejor oferta del mercado para tu auto electrico en Chile. Pago unico de $19.990. Garantia de devolucion.",
  openGraph: {
    title: "Solicitar oferta | Electrificarte",
    description:
      "Recibe la mejor oferta para tu auto electrico en 24 horas. Pago unico $19.990.",
  },
};

export const revalidate = 3600;

export default async function SolicitarPage() {
  const rawCars = await client.fetch(carNamesForFormQuery).catch(() => []);
  const carOptions: string[] = rawCars.map(
    (c: { brand: string; label: string }) =>
      c.brand ? `${c.brand} ${c.label}` : c.label
  );

  return <SolicitarContent carOptions={carOptions} />;
}
