import type { Metadata } from "next";
import Link from "next/link";
import { groq } from "next-sanity";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { client } from "@/lib/sanity/client";
import { productPricesQuery } from "@/lib/queries/pages";
import { ASESORIA_PRICE } from "@/lib/products";

export const revalidate = 60;

// Giro sep-2026 (docs/PIVOT-WAITLIST-PLAN.md): sin "negociamos por ti" ni promesas de
// "el mejor precio". La Asesoría es el producto principal y la waitlist solo registra
// interesados.
export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "Te ayudamos a elegir y comprar tu auto electrificado en Chile. Conectamos a compradores con nuestra red de vendedores oficiales, sin vueltas ni presión de venta.",
  alternates: { canonical: "/nosotros" },
  openGraph: {
    title: "Quiénes somos | Electrificarte",
    description:
      "Te ayudamos a elegir y comprar tu auto electrificado en Chile, con una red de vendedores oficiales.",
    url: "/nosotros",
    type: "website",
  },
};

const VALORES = [
  {
    icon: "bolt",
    title: "100% electrificados",
    description:
      "Solo autos con batería: eléctricos e híbridos en todas sus variantes (BEV, PHEV, HEV, MHEV, REEV). Te ayudamos a dar el salto, sea cual sea tu ritmo.",
  },
  {
    icon: "handshake",
    title: "Estamos de tu lado",
    description:
      "No revendemos autos ni cobramos comisión sobre la venta. Trabajamos para el comprador.",
  },
  {
    icon: "shield",
    title: "Sin compromiso",
    description:
      "Sumarte a la waitlist no tiene costo: solo dejas tus datos y quedas registrado como interesado. Tú decides si avanzas cuando te contactemos.",
  },
];

// Las marcas se cuentan en Sanity (nunca a mano). Las otras tres cifras son datos del
// negocio que no están en el catálogo.
const brandCountQuery = groq`count(*[_type == "brand"])`;

export default async function NosotrosPage() {
  const [prices, brandCount] = await Promise.all([
    client.fetch(productPricesQuery, {}, { next: { tags: ["siteSettings"] } }).catch(() => null),
    client.fetch<number>(brandCountQuery, {}, { next: { tags: ["brand"] } }).catch(() => 0),
  ]);
  const price: string = prices?.advisoryPrice ?? ASESORIA_PRICE;

  const stats = [
    { value: "+500", label: "compras ya negociadas en Chile" },
    ...(brandCount > 0 ? [{ value: String(brandCount), label: "marcas en el catálogo" }] : []),
    { value: "+15", label: "vendedores oficiales en la red" },
    { value: "100%", label: "vendedores verificados" },
  ];

  return (
    <div className="page">
      {/* ── Encabezado claro ── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Quiénes somos</span>
          </nav>

          <div className="mt-header">
            <h1 className="t-h1 max-w-[20ch]">
              Compramos mejor, <span className="tone">para que estrenes electrificado</span>
            </h1>
            <p className="t-lead">
              Te ayudamos a elegir y comprar tu auto electrificado en Chile. Ponemos de tu lado el poder de
              negociación que un comprador solo no tiene: concentramos la demanda y trabajamos con una red de
              vendedores oficiales.
            </p>
            <div className="page-head__actions">
              <Link href="/asesoria" className="btn btn--primary btn--lg">
                Quiero asesoría por {price}
                <Icon name="arrow_forward" size="none" className="arrow" />
              </Link>
              <OfferCta source="nosotros" className="btn btn--secondary btn--lg">
                Únete a la waitlist
              </OfferCta>
              <Link href="/marcas" className="btn btn--quiet">
                Explorar el catálogo
              </Link>
            </div>
          </div>

          <div className="kpis" style={{ "--kpis": stats.length } as React.CSSProperties}>
            {stats.map((st) => (
              <div className="kpi" key={st.label}>
                <p className="kpi__num">{st.value}</p>
                <p className="kpi__label">{st.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Misión ── */}
      <section className="section" aria-labelledby="mision-t">
        <div className="wrap grid gap-6 lg:grid-cols-12 lg:gap-16">
          <h2 className="t-h2 lg:col-span-5" id="mision-t">Que la movilidad eléctrica sea para todos</h2>
          <p className="t-lead lg:col-span-7">
            Comprar un auto electrificado debería ser transparente y justo. Pero los precios de lista, la falta
            de información y la presión de venta lo hacen difícil. Nacimos para cambiar eso: acompañarte a
            elegir con claridad.
          </p>
        </div>
      </section>

      {/* ── Cómo trabajamos ── */}
      <section className="section section--subtle" aria-labelledby="valores-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="valores-t">Cómo trabajamos</h2>
            </div>
          </div>
          <div className="trust lg:grid-cols-3">
            {VALORES.map((v) => (
              <div className="trust__item" key={v.title}>
                <Icon name={v.icon} size="none" />
                <h3 className="trust__title">{v.title}</h3>
                <p className="trust__text">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dos caminos: el bloque Glaciar de la página es el de la Asesoría ── */}
      <section className="section" aria-labelledby="caminos-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="caminos-t">Dos formas de llegar a tu auto</h2>
              <p className="t-lead">No importa dónde estés hoy en tu decisión: tenemos un camino para ti.</p>
            </div>
          </div>
          <div className="paths">
            <div className="path path--primary">
              <div className="path__label">
                <span className="t-label">Asesoría IA</span>
                <span className="chip chip--solid">{price}</span>
              </div>
              <h3 className="path__title">Aún no sé qué auto quiero</h3>
              <p className="path__text">
                Francisco, nuestro asesor con inteligencia artificial, analiza tu uso, presupuesto y necesidades
                por WhatsApp y te ayuda a decidir. Es una conversación, no una venta.
              </p>
              <div className="path__cta">
                <Link href="/asesoria" className="btn btn--primary btn--lg">
                  Conocer la asesoría
                  <Icon name="arrow_forward" size="none" className="arrow" />
                </Link>
              </div>
            </div>
            <div className="path path--secondary">
              <div className="path__label">
                <span className="t-label">Waitlist de ofertas</span>
              </div>
              <h3 className="path__title">Ya sé qué auto quiero</h3>
              <p className="path__text">
                Elige tu modelo y déjanos tus datos. Te avisamos cuando abramos el acceso.
              </p>
              <div className="path__cta">
                <OfferCta source="nosotros" className="btn btn--secondary btn--lg">
                  Únete a la waitlist
                </OfferCta>
                <Link href="/negociacion" className="btn btn--quiet">
                  Cómo negociamos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cierre claro, con hairline arriba ── */}
      <section className="band section--rule" aria-labelledby="band-t">
        <div className="wrap band__in">
          <div>
            <h2 className="t-h2" id="band-t">¿Listo para estrenar?</h2>
            <p>
              Ya sea que necesites ayuda para decidir o que ya sepas qué quieres, estamos para ayudarte.
            </p>
          </div>
          <div className="band__actions">
            <OfferCta source="nosotros" className="btn btn--primary btn--lg">
              Únete a la waitlist
            </OfferCta>
            <Link href="/contacto" className="link">
              Hablar con el equipo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
