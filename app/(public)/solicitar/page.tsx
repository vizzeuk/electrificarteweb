import React from "react";
import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { carNamesForFormQuery } from "@/lib/queries/car";
import { SolicitarContent } from "./SolicitarContent";

// 🟡 STANDBY (giro sep-2026): esta página existe pero está OCULTA — ningún CTA del
// sitio lleva acá, no está en el sitemap y se marca noindex. El formulario y todo el
// flujo pagado quedan intactos para reactivarlos apagando OFERTA_STANDBY.
// Ver docs/PIVOT-WAITLIST-PLAN.md.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Solicitar oferta | Electrificarte",
  description: "Formulario de solicitud de oferta.",
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
