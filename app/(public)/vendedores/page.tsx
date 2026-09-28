import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export const revalidate = 60;

// Página explicativa de la red de vendedores oficiales. Giro sep-2026: la suscripción de
// vendedores está en STANDBY (no funciona todavía), así que todo el copy habla en futuro,
// sin cifras sin respaldo y sin precio (se informará al abrir). La acción es dejar los datos
// en /vendedores/unirme. Antes esto vivía en vendedores.electrificarte.com.

const DESCRIPTION =
  "Estamos preparando una red de vendedores oficiales de autos electrificados: recibe el contacto de personas interesadas en los modelos que vendes. Deja tus datos y te llamamos cuando esté funcionando.";

export const metadata: Metadata = {
  title: "Red de vendedores oficiales, en preparación",
  description: DESCRIPTION,
  alternates: { canonical: "/vendedores" },
  openGraph: {
    title: "Red de vendedores oficiales, en preparación | Electrificarte",
    description: DESCRIPTION,
    url: "/vendedores",
    type: "website",
  },
};

const STEPS = [
  {
    title: "Te sumas a la red",
    description: "Te suscribes con tus datos, tu punto de venta y las marcas que vendes.",
  },
  {
    title: "Recibes contactos",
    description:
      "Te llegan personas que dejaron su interés en Electrificarte por un modelo que tú vendes.",
  },
  {
    title: "Haces tu propuesta",
    description: "Le escribes a la persona por WhatsApp con las condiciones que puedes ofrecerle.",
  },
  {
    title: "Cierras directo",
    description: "La conversación y la venta son entre tú y la persona. Electrificarte no interviene en el trato.",
  },
];

const PARA_QUIEN = [
  "Vendes autos electrificados: eléctricos o híbridos en cualquiera de sus variantes.",
  "Eres vendedor oficial de una o más marcas.",
  "Quieres mover inventario y conversar con personas que ya buscan un modelo.",
  "Atiendes por WhatsApp.",
];

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "¿Ya está funcionando?",
    a: "Todavía no. Estamos juntando a las personas interesadas en comprar y preparando la plataforma. Cuando esté lista, llamamos primero a quienes dejaron sus datos.",
  },
  {
    q: "¿Cuánto va a costar?",
    a: "Será una suscripción mensual. El precio lo informaremos al abrir, antes de que decidas sumarte. Dejar tus datos no tiene costo.",
  },
  {
    q: "¿Cómo se van a repartir los contactos?",
    a: "Estamos definiendo los detalles. Te los contaremos junto con el precio, antes de que te suscribas.",
  },
  {
    q: "¿Qué hacen con mis datos?",
    a: (
      <>
        Los usamos solo para contactarte por la red de vendedores. Más detalle en nuestra{" "}
        <Link href="/privacidad" className="link">
          política de privacidad
        </Link>
        . Si tienes dudas, escríbenos a{" "}
        <a href="mailto:vendedores@electrificarte.com" className="link">
          vendedores@electrificarte.com
        </a>
        .
      </>
    ),
  },
];

export default function VendedoresPage() {
  return (
    <div className="page">
      {/* ── Encabezado claro ── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Vendedores</span>
          </nav>

          <div className="mt-header">
            <h1 className="t-h1">Red de vendedores oficiales</h1>
            <p className="t-lead">
              Estamos preparando un servicio para quienes venden autos electrificados: recibir el contacto de personas
              interesadas en los modelos que vendes. Todavía no está funcionando; deja tus datos y te llamamos
              cuando abra.
            </p>
            <div className="page-head__actions">
              <Link href="/vendedores/unirme" className="btn btn--primary btn--lg">
                Quiero que me llamen
                <Icon name="arrow_forward" size="none" className="arrow" />
              </Link>
              <p className="t-small">Sin costo ni compromiso</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cómo va a funcionar ── */}
      <section className="section section--subtle" aria-labelledby="how-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="how-t">Cómo va a funcionar</h2>
              <p className="t-lead">
                Electrificarte junta a personas que buscan un auto electrificado. Tú les ofreces el tuyo.
              </p>
            </div>
          </div>
          <ol className="steps-row sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="step__n">{String(i + 1).padStart(2, "0")}</span>
                <p className="step__title">{step.title}</p>
                <p className="step__text">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Para quién es y cuánto cuesta ── */}
      <section className="section" aria-labelledby="para-t">
        <div className="wrap">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="t-h2" id="para-t">Para quién es</h2>
              <ul className="checklist mt-8">
                {PARA_QUIEN.map((item) => (
                  <li key={item}>
                    <Icon name="check" size="none" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="t-h2">Cuánto va a costar</h2>
              <p className="t-lead mt-8">
                Será una suscripción mensual. El precio lo informaremos cuando abramos, antes de que decidas
                sumarte.
              </p>
              <p className="mt-4 text-ink-2">Dejar tus datos hoy no tiene costo ni te compromete a nada.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Preguntas frecuentes ── */}
      <section className="section section--subtle" aria-labelledby="faq-t">
        <div className="wrap faq-2">
          <div>
            <h2 className="t-h2" id="faq-t">Preguntas frecuentes</h2>
            <p className="t-lead">Lo que más nos preguntan los vendedores.</p>
          </div>
          <div>
            {FAQS.map((f, i) => (
              <details className="qa" key={f.q} open={i === 0}>
                <summary>
                  {f.q}
                  <Icon name="add" size="none" />
                </summary>
                <p className="qa__a">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cierre claro con hairline arriba (el footer ya es oscuro) ── */}
      <section className="band" aria-labelledby="band-t">
        <div className="wrap band__in">
          <div>
            <h2 className="t-h2" id="band-t">Te llamamos cuando esté funcionando</h2>
            <p>Deja tus datos, tu punto de venta y las marcas que vendes.</p>
          </div>
          <div className="band__actions">
            <Link href="/vendedores/unirme" className="btn btn--primary btn--lg">
              Quiero que me llamen
              <Icon name="arrow_forward" size="none" className="arrow" />
            </Link>
            <a href="mailto:vendedores@electrificarte.com" className="link">
              vendedores@electrificarte.com
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
