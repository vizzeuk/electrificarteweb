import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { client } from "@/lib/sanity/client";
import { allBrandsQuery } from "@/lib/queries/car";
import { getBrandCountry } from "@/lib/utils/brand-country";
import { MarcasGrid } from "./MarcasGrid";
import type { Brand } from "./MarcasGrid";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE } from "@/lib/products";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Marcas eléctricas e híbridas en Chile",
  description:
    "Explora todas las marcas de autos eléctricos e híbridos disponibles en Chile. Compara modelos y consigue el mejor precio con Electrificarte.",
};

export default async function MarcasPage() {
  const brands: Brand[] = await client.fetch(
    allBrandsQuery,
    {},
    { next: { tags: ["brand"], revalidate: 3600 } },
  );

  const totalModels = brands.reduce((s, b) => s + b.carCount, 0);
  const uniqueCountries = new Set(
    brands.map((b) => getBrandCountry(b.slug, b.country)).filter(Boolean),
  ).size;

  // Cifras del encabezado: se calculan del catálogo, nunca se escriben a mano.
  const kpis = [
    { num: String(brands.length), label: "marcas en el catálogo" },
    { num: String(totalModels), label: "modelos electrificados" },
    { num: String(uniqueCountries), label: "países de origen" },
  ].filter((k) => k.num !== "0");

  return (
    <div className="page">
      {/* ─── Encabezado ────────────────────────────────────────────────── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Marcas</span>
          </nav>

          <div className="page-head__grid grid-cols-1">
            <div>
              <h1 className="t-h1">Todas las marcas</h1>
              <p className="t-lead">
                Explora el catálogo completo de marcas eléctricas e híbridas disponibles en Chile y compara sus modelos.
              </p>
            </div>
          </div>

          {kpis.length > 0 && (
            <div className="kpis" style={{ "--kpis": kpis.length } as React.CSSProperties}>
              {kpis.map((k) => (
                <div className="kpi" key={k.label}>
                  <p className="kpi__num">{k.num}</p>
                  <p className="kpi__label">{k.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Buscador y grilla (isla cliente) ──────────────────────────── */}
      <MarcasGrid brands={brands} />

      {/* ─── Los dos caminos ───────────────────────────────────────────── */}
      <section className="section pt-0">
        <div className="wrap">
          <div className="soft-block cta-row">
            <div>
              <h2 className="t-h2">
                {totalModels > 1 ? `¿No sabes cuál de los ${totalModels} modelos te conviene?` : "¿No sabes qué auto te conviene?"}
              </h2>
              <p>Te asesoramos por WhatsApp según tu uso, tus kilómetros y tu presupuesto, y comparamos contigo los modelos que calzan.</p>
            </div>
            <div className="cta-row__actions">
              <Link href="/asesoria" className="btn btn--primary btn--lg">
                Quiero asesoría por {ASESORIA_PRICE}
                <Icon name="arrow_forward" size="none" className="arrow" />
              </Link>
              <OfferCta source="plp" className="btn btn--secondary btn--lg">
                Únete a la waitlist
              </OfferCta>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
