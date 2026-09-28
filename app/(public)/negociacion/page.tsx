import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE } from "@/lib/products";

export const revalidate = 60;

// Página explicativa del servicio de negociación con vendedores oficiales, que se abrirá
// pronto (giro sep-2026, ver docs/PIVOT-WAITLIST-PLAN.md). Mientras dure el standby:
// - NO se muestra el precio del servicio ($19.990): se dice que se informará al abrir.
// - Sin "negociamos por ti", sin prometer descuentos, plazos ni devoluciones.
// - La única acción es sumarse a la waitlist (OfferCta abre el popup).
// Al reactivar la Oferta, esta página se vuelve a escribir con el flujo pagado.

const TITLE = "Negociación con vendedores oficiales";
const DESCRIPTION =
  "Pronto abriremos un servicio para buscar, dentro de nuestra red de vendedores oficiales, un precio mejor que el de lista para el auto electrificado que elegiste. Únete a la waitlist.";

export const metadata: Metadata = {
  title: `${TITLE}, próximamente`,
  description: DESCRIPTION,
  alternates: { canonical: "/negociacion" },
  openGraph: {
    title: `${TITLE}, próximamente | Electrificarte`,
    description: DESCRIPTION,
    url: "/negociacion",
    type: "website",
  },
};

const STEPS = [
  {
    title: "Eliges tu modelo",
    description: "Buscas en el catálogo el auto electrificado que quieres y nos dices cuál es.",
  },
  {
    title: "Consultamos a la red",
    description:
      "Le preguntamos a los vendedores oficiales de nuestra red si pueden mejorar el precio de lista de ese modelo.",
  },
  {
    title: "Recibes la propuesta",
    description:
      "Si un vendedor oficial mejora el precio, te llega su propuesta por WhatsApp y conversas directo con él.",
  },
  {
    title: "Tú decides",
    description:
      "Ves el auto, haces la prueba de manejo y compras solo si te conviene. La compra la cierras con el vendedor.",
  },
];

const HOY = [
  {
    icon: "groups",
    title: "Únete a la waitlist",
    text: "Deja tus datos y el modelo que te interesa. Te avisamos apenas abra el servicio para que seas de los primeros en usarlo.",
  },
  {
    icon: "compare_arrows",
    title: "Compara y calcula",
    text: "Revisa fichas, compara hasta tres modelos lado a lado y calcula cuánto ahorras frente a la bencina.",
  },
  {
    icon: "chat",
    title: "Resuelve tus dudas",
    text: `Si todavía no sabes qué auto elegir, te asesoramos por WhatsApp por ${ASESORIA_PRICE}.`,
  },
];

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "¿Cuándo abre el servicio?",
    a: "Todavía no tenemos fecha. Estamos armando la red de vendedores oficiales y juntando a las personas interesadas. Cuando esté listo, avisamos primero a quienes estén en la waitlist.",
  },
  {
    q: "¿Cuánto va a costar?",
    a: "El precio del servicio lo informaremos al abrir. Unirte a la waitlist no tiene costo y no te compromete a contratar nada.",
  },
  {
    q: "¿Me aseguran un descuento?",
    a: "No. Vamos a buscar un precio mejor que el de lista entre los vendedores oficiales de la red, pero el resultado depende del modelo, del stock y de cada vendedor. Te contaremos todas las condiciones antes de que decidas.",
  },
  {
    q: "¿A quién le compro el auto?",
    a: "Al vendedor oficial, directamente. Electrificarte te pone en contacto; la compra, el financiamiento y la entrega los acuerdas con él.",
  },
  {
    q: "¿Qué datos piden en la waitlist?",
    a: (
      <>
        Nombre, apellido, email, WhatsApp y, si quieres, el modelo que te interesa. Los usamos para avisarte cuando
        abra el servicio. Más detalle en nuestra{" "}
        <Link href="/privacidad" className="link">
          política de privacidad
        </Link>
        .
      </>
    ),
  },
  {
    q: "¿Y si todavía no sé qué auto quiero?",
    a: (
      <>
        Parte por el{" "}
        <Link href="/marcas" className="link">
          catálogo
        </Link>{" "}
        y el{" "}
        <Link href="/comparador" className="link">
          comparador
        </Link>
        . Si prefieres que alguien te guíe, la{" "}
        <Link href="/asesoria" className="link">
          asesoría por WhatsApp
        </Link>{" "}
        te ayuda a decidir según tu uso, tus kilómetros y tu presupuesto.
      </>
    ),
  },
];

export default function NegociacionPage() {
  return (
    <div className="page">
      {/* ── Encabezado claro ── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Negociación</span>
          </nav>

          <div className="mt-header">
            <span className="chip">Próximamente</span>
            <h1 className="t-h1 mt-5">{TITLE}</h1>
            <p className="t-lead">
              Estamos preparando un servicio para quienes ya saben qué auto quieren: buscar, dentro de nuestra red de
              vendedores oficiales, un precio mejor que el de lista para ese modelo. Todavía no está abierto.
            </p>
            <div className="page-head__actions">
              <OfferCta source="negociacion" className="btn btn--primary btn--lg">
                Únete a la waitlist
              </OfferCta>
              <p className="t-small">Sin costo ni compromiso</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cómo va a funcionar ── */}
      <section className="section" aria-labelledby="how-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="how-t">Cómo va a funcionar</h2>
              <p className="t-lead">
                Electrificarte no vende autos: te conecta con vendedores oficiales que quieren mover su inventario.
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

      {/* ── Qué hacer hoy ── */}
      <section className="section section--subtle" aria-labelledby="hoy-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="hoy-t">Qué puedes hacer hoy</h2>
              <p className="t-lead">Mientras abrimos el servicio, el resto del sitio ya funciona.</p>
            </div>
          </div>
          <div className="trust lg:grid-cols-3">
            {HOY.map((r) => (
              <div className="trust__item" key={r.title}>
                <Icon name={r.icon} size="none" />
                <h3 className="trust__title">{r.title}</h3>
                <p className="trust__text">{r.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            <Link href="/marcas" className="link-arrow">
              Ver el catálogo
              <Icon name="arrow_forward" size="none" />
            </Link>
            <Link href="/comparador" className="link-arrow">
              Ir al comparador
              <Icon name="arrow_forward" size="none" />
            </Link>
            <Link href="/calculadora" className="link-arrow">
              Calcular mi ahorro
              <Icon name="arrow_forward" size="none" />
            </Link>
            <Link href="/asesoria" className="link-arrow">
              Conocer la asesoría
              <Icon name="arrow_forward" size="none" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Preguntas frecuentes ── */}
      <section className="section" aria-labelledby="faq-t">
        <div className="wrap faq-2">
          <div>
            <h2 className="t-h2" id="faq-t">Preguntas frecuentes</h2>
            <p className="t-lead">Lo que más nos preguntan sobre el servicio.</p>
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
      <section className="band section--rule" aria-labelledby="band-t">
        <div className="wrap band__in">
          <div>
            <h2 className="t-h2" id="band-t">Sé de los primeros en usarlo</h2>
            <p>Únete a la waitlist y te avisamos cuando abramos la negociación con vendedores oficiales.</p>
          </div>
          <div className="band__actions">
            <OfferCta source="negociacion" className="btn btn--primary btn--lg">
              Únete a la waitlist
              <Icon name="arrow_forward" size="none" className="arrow" />
            </OfferCta>
            <Link href="/asesoria" className="link">
              ¿Aún no eliges? Asesoría por {ASESORIA_PRICE}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
