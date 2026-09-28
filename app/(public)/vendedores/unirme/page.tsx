import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { VendorWaitlistForm } from "@/components/forms/VendorWaitlistForm";

export const revalidate = 60;

const DESCRIPTION =
  "¿Vendes autos electrificados? Deja tus datos y te llamamos cuando la red de vendedores oficiales de Electrificarte esté funcionando.";

export const metadata: Metadata = {
  title: "Deja tus datos, vendedores",
  description: DESCRIPTION,
  alternates: { canonical: "/vendedores/unirme" },
  openGraph: {
    title: "Deja tus datos, vendedores | Electrificarte",
    description: DESCRIPTION,
    url: "/vendedores/unirme",
    type: "website",
  },
};

const NEXT = [
  "Guardamos tus datos y las marcas que vendes.",
  "Cuando la red esté funcionando, te llamamos para contarte las condiciones y el precio.",
  "Decides si te sumas. Dejar tus datos no te compromete a nada.",
];

export default function VendedoresUnirmePage() {
  return (
    <div className="page">
      <section className="page-head border-b-0">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <Link href="/vendedores">Vendedores</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Deja tus datos</span>
          </nav>

          <div className="page-head__grid page-head__grid--top">
            <div>
              <h1 className="t-h1">Te llamamos cuando esté funcionando</h1>
              <p className="t-lead">
                La red de vendedores oficiales de Electrificarte todavía no está abierta. Deja tus datos y te
                contactamos apenas lo esté.
              </p>

              <h2 className="t-h3 mt-10">Qué pasa después</h2>
              <ol className="mt-4 border-t border-line">
                {NEXT.map((t, i) => (
                  <li key={t} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 border-b border-line py-4">
                    <span className="step__n">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-ink-2">{t}</span>
                  </li>
                ))}
              </ol>

              <Link href="/vendedores" className="link-arrow mt-8">
                Cómo va a funcionar la red
                <Icon name="arrow_forward" size="none" />
              </Link>
            </div>

            <div className="rounded-card border border-line p-6 md:p-8">
              <VendorWaitlistForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
