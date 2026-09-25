import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";

export const revalidate = 60;

// El precio de la Oferta ($19.990) ya no se muestra en esta página: el flujo pagado
// está en standby (ver docs/PIVOT-WAITLIST-PLAN.md). Al reactivarlo, volver a leer
// `offerPrice` desde Sanity (productPricesQuery) como hacía antes.
//
// Giro sep-2026: además, sin "negociamos por ti" y sin prometer "tu mejor precio" o "la
// mejor oferta" a la persona. La waitlist solo registra interesados.

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Negociación de ofertas",
    description:
      "Ya sabes qué auto quieres. Súmate a la waitlist y te avisamos cuando abramos el acceso para tu modelo.",
    alternates: { canonical: "/negociacion" },
    openGraph: {
      title: "Negociación de ofertas | Electrificarte",
      description:
        "Ya sabes qué auto quieres. Súmate a la waitlist y te avisamos cuando abramos el acceso para tu modelo.",
      url: "/negociacion",
      type: "website",
    },
  };
}

// Giro sep-2026: la Oferta ($19.990) está en standby. Los pasos describen el camino
// de la WAITLIST — sin precio, sin plazos prometidos y sin garantía de devolución.
const STEPS = [
  {
    title: "Elige tu modelo",
    description: "Ya sabes qué auto quieres. Dinos el modelo desde el catálogo o el buscador.",
  },
  {
    title: "Súmate a la waitlist",
    description: "Déjanos tus datos y quedas registrado como interesado en ese modelo.",
  },
  {
    title: "Te avisamos",
    description: "Te contactamos cuando abramos el acceso y tengamos novedades para tu modelo.",
  },
  {
    title: "Estrena tu auto",
    description: "Coordinas con el vendedor oficial los últimos detalles y retiras tu vehículo nuevo.",
  },
];

const RAZONES = [
  {
    icon: "hub",
    title: "Red exclusiva",
    description: "Trabajamos con vendedores oficiales y distribuidores certificados en todo Chile, no con avisos sueltos.",
  },
  {
    icon: "trending_down",
    title: "Poder de volumen",
    description: "Al agrupar múltiples solicitudes de compra negociamos descuentos por volumen y bonos que no están publicados.",
  },
  {
    icon: "verified",
    title: "La oferta real",
    description: "Accedemos a ofertas de inventario y condiciones que no encuentras al público general: la oferta real, no la de vidriera.",
  },
];

const STATS = [
  { value: "$800 mil a $6 millones", label: "rango de ahorro de clientes" },
  { value: "+15",                    label: "vendedores oficiales en la red" },
  { value: "+500",                   label: "personas ya confiaron" },
  { value: "100%",                   label: "vendedores verificados" },
];

const INCLUYE = [
  "Búsqueda en nuestra red exclusiva de vendedores oficiales",
  "Negociación de bonos y descuentos por volumen",
  "Opciones de financiamiento preaprobadas",
  "Comparativa de precios reales del mercado",
  "Acompañamiento hasta la entrega del vehículo",
  "Acceso prioritario cuando abramos el servicio",
];

export default async function NegociacionPage() {
  return (
    <div className="page">
      {/* ── Encabezado claro ── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Negociación de ofertas</span>
          </nav>

          <div className="mt-header">
            <h1 className="t-h1">Negociación de ofertas</h1>
            <p className="t-lead">
              Ya sabes qué auto quieres. Súmate a la waitlist y te avisamos cuando abramos el acceso para tu
              modelo.
            </p>
            <div className="page-head__actions">
              <OfferCta source="negociacion" className="btn btn--primary btn--lg">
                Únete a la waitlist
              </OfferCta>
              <p className="t-small">Sin costo ni compromiso al registrarte</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="section" aria-labelledby="how-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="how-t">Del modelo elegido a tu auto en cuatro pasos</h2>
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

      {/* ── Por qué conseguimos mejores precios ── */}
      <section className="section section--subtle" aria-labelledby="why-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="why-t">Por qué conseguimos mejores precios</h2>
              <p className="t-lead">
                No revendemos autos. Al concentrar la demanda de cientos de compradores, movemos los precios a
                tu favor.
              </p>
            </div>
          </div>
          <div className="trust lg:grid-cols-3">
            {RAZONES.map((r) => (
              <div className="trust__item" key={r.title}>
                <Icon name={r.icon} size="none" />
                <h3 className="trust__title">{r.title}</h3>
                <p className="trust__text">{r.description}</p>
              </div>
            ))}
          </div>
          <div className="kpis">
            {STATS.map((st) => (
              <div className="kpi" key={st.label}>
                <p className="kpi__num">{st.value}</p>
                <p className="kpi__label">{st.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qué incluye ── */}
      <section className="section" aria-labelledby="incluye-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="incluye-t">Qué incluye</h2>
              <p className="t-lead">
                Ideal si ya tienes claro qué modelo quieres y buscas el mejor precio posible, sin dar vueltas por
                tu cuenta.
              </p>
            </div>
          </div>
          <ul className="checklist md:grid-cols-2 md:gap-x-12">
            {INCLUYE.map((item) => (
              <li key={item}>
                <Icon name="check" size="none" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Cierre: el bloque Glaciar con la llamada principal, sobre fondo claro ── */}
      <section className="section section--rule" aria-labelledby="cta-t">
        <div className="wrap">
          <div className="soft-block cta-row">
            <div>
              <h2 className="t-h2" id="cta-t">¿Ya sabes qué auto quieres?</h2>
              <p>Déjanos tus datos y quedas registrado como interesado. Te avisamos cuando abramos el acceso.</p>
            </div>
            <div className="cta-row__actions">
              <OfferCta source="negociacion" className="btn btn--primary btn--lg">
                Únete a la waitlist
              </OfferCta>
              <Link href="/asesoria" className="btn btn--secondary btn--lg">
                Empieza con la asesoría
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
