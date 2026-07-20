import React from "react";
import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { carNamesForFormQuery } from "@/lib/queries/car";
import { SolicitarContent } from "./SolicitarContent";

export const metadata: Metadata = {
  alternates: { canonical: "/solicitar" },
  title: "Solicitar oferta | Consigue tu mejor precio",
  description:
    "Completa tu solicitud y recibe en 48 a 96 horas la mejor oferta del mercado para tu auto electrificado en Chile. Pago único de $19.990. Garantía de devolución.",
  openGraph: {
    title: "Solicitar oferta | Electrificarte",
    description:
      "Recibe la mejor oferta para tu auto electrificado en 48 a 96 horas. Pago único $19.990.",
  },
};

export const revalidate = 3600;

export default async function SolicitarPage() {
  const [rawCars, homePage] = await Promise.all([
    client.fetch(carNamesForFormQuery, {}, { next: { tags: ["car"], revalidate: 3600 } }).catch(() => []),
    client.fetch<{ formServicePrice?: string } | null>(`*[_type == "homePage"][0]{ formServicePrice }`, {}, { next: { tags: ["homePage"], revalidate: 3600 } }).catch(() => null),
  ]);

  const carOptions: string[] = rawCars.flatMap(
    (c: { brand: string; label: string; versions?: (string | null)[] }) => {
      const base = c.brand ? `${c.brand} ${c.label}` : c.label;
      const versionOpts = (c.versions ?? [])
        .filter(Boolean)
        .map((v) => `${base} ${v}`);
      return [base, ...versionOpts];
    }
  );

  return <SolicitarContent carOptions={carOptions} servicePrice={homePage?.formServicePrice} />;
}
