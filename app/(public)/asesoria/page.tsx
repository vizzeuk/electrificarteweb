import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { groq } from "next-sanity";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { client } from "@/lib/sanity/client";
import { productPricesQuery } from "@/lib/queries/pages";
import { ASESORIA_PRICE } from "@/lib/products";
import { carStats, classifyElectric, formatCLP } from "@/lib/utils";

export const revalidate = 60;

// Precio de display editable desde Sanity (Configuración del Sitio → Precios).
// Fallback a la constante de lib/products.ts si Sanity no lo trae.
async function getAdvisoryPrice(): Promise<string> {
  const prices = await client
    .fetch(productPricesQuery, {}, { next: { tags: ["siteSettings"] } })
    .catch(() => null);
  return prices?.advisoryPrice ?? ASESORIA_PRICE;
}

// El ejemplo de conversación del encabezado cita tres autos reales del catálogo, con el
// precio y la autonomía que tienen hoy en Sanity (nunca escritos a mano). Un auto sale de
// la lista si se oculta, deja de ser 100% eléctrico o supera el tope que dice la persona
// en el ejemplo; con menos de dos, la lista no se muestra.
const EXAMPLE_SLUGS = ["byd-yuan-plus", "hyundai-kona-electrico", "volvo-ex30"];
const EXAMPLE_BUDGET = 35_000_000; // "Mi tope es $35 millones"
const COUNT_WORD: Record<number, string> = { 2: "dos", 3: "tres" };

const asesoriaCatalogQuery = groq`{
  "cars": *[_type == "car" && hidden != true && slug.current in $slugs] {
    "slug": slug.current,
    name,
    "brand": brand->name,
    basePrice,
    discountPrice,
    range,
    "maxVersionRange": math::max(versions[defined(range) && range > 0].range),
    "tag": electricType->tag
  },
  "models": count(*[_type == "car" && hidden != true])
}`;

interface ExampleCarRaw {
  slug: string;
  name: string;
  brand?: string | null;
  basePrice?: number | null;
  discountPrice?: number | null;
  range?: number | null;
  maxVersionRange?: number | null;
  tag?: string | null;
}

interface ExampleCar {
  slug: string;
  title: string;
  detail: string;
}

async function getCatalog(): Promise<{ cars: ExampleCar[]; models: number }> {
  const data = await client
    .fetch<{ cars?: ExampleCarRaw[]; models?: number } | null>(
      asesoriaCatalogQuery,
      { slugs: EXAMPLE_SLUGS },
      { next: { tags: ["car"] } },
    )
    .catch(() => null);

  const cars = (data?.cars ?? [])
    .filter((c) => classifyElectric({ electricTypeTag: c.tag }) === "EV")
    .map((c) => {
      const base = c.basePrice ?? 0;
      const price = c.discountPrice && c.discountPrice < base ? c.discountPrice : base;
      const autonomy = carStats({ range: c.range, maxVersionRange: c.maxVersionRange, electricTypeTag: c.tag })
        .find((s) => s.label === "Autonomía")?.value;
      return { ...c, price, autonomy };
    })
    .filter((c) => c.price > 0 && c.price <= EXAMPLE_BUDGET && !!c.autonomy)
    .sort((a, b) => EXAMPLE_SLUGS.indexOf(a.slug) - EXAMPLE_SLUGS.indexOf(b.slug))
    .map((c) => ({
      slug: c.slug,
      title: [c.brand, c.name].filter(Boolean).join(" "),
      detail: `${formatCLP(c.price)}, ${c.autonomy} de autonomía`,
    }));

  return { cars: cars.length >= 2 ? cars : [], models: data?.models ?? 0 };
}

export async function generateMetadata(): Promise<Metadata> {
  const price = await getAdvisoryPrice();
  return {
    title: "Asesoría IA por WhatsApp",
    description:
      `Por ${price}, Francisco IA analiza tu uso y presupuesto por WhatsApp y te lleva al auto eléctrico ideal. Sin presión, es una conversación, no una venta.`,
    alternates: { canonical: "/asesoria" },
    openGraph: {
      title: "Asesoría IA por WhatsApp | Electrificarte",
      description:
        `¿No sabes qué auto eléctrico elegir? Te ayudamos a decidir por WhatsApp desde ${price}.`,
      url: "/asesoria",
      type: "website",
    },
  };
}

const buildSteps = (price: string) => [
  {
    title: "Contratas y te escribimos",
    description: `Pagas ${price} y Francisco IA te contacta por WhatsApp al instante. Sin apps, sin descargas.`,
  },
  {
    title: "Analizamos tu caso",
    description: "Revisa tu uso diario, tu kilometraje, tu presupuesto y tus necesidades reales para filtrar el catálogo por ti.",
  },
  {
    title: "Llegas a tu auto ideal",
    description: "Terminas con claridad sobre qué modelo comprar y por qué. Es una conversación, no una venta.",
  },
];

const INCLUYE = [
  "10 días de acceso a la asesoría para resolver todas tus dudas",
  "Recomendación personalizada según tu estilo de uso real",
  "Comparación entre modelos eléctricos e híbridos del catálogo",
  "Resolución de dudas técnicas: autonomía, carga y mantención",
  "Atención directa por WhatsApp, a tu ritmo",
];

const FAQS = [
  {
    q: "¿Qué es Francisco IA?",
    a: "Es un asesor con inteligencia artificial que conoce a fondo todos los autos del catálogo de Electrificarte. Conversa contigo por WhatsApp, compara marcas y versiones sin sesgo y te explica el porqué de cada recomendación.",
  },
  {
    q: "¿Cuánto dura la asesoría?",
    a: "10 días desde que se confirma tu pago. En ese plazo puedes escribir todas las veces que necesites.",
  },
  {
    q: "¿Cómo pago?",
    a: "Con tarjeta a través de WebPay, en un formulario de Electrificarte. Apenas se confirma el pago, Francisco IA te escribe por WhatsApp.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. Todo pasa en WhatsApp, sin apps ni descargas.",
  },
  {
    q: "¿Me van a vender un auto?",
    a: "No. La asesoría es una conversación para que decidas con claridad, no una venta. La decisión siempre es tuya.",
  },
  {
    q: "¿Y si ya sé qué auto quiero?",
    a: "Entonces no necesitas asesoría: súmate a la waitlist y te avisamos cuando abramos el acceso para tu modelo.",
  },
];

const CHECKOUT_HREF = "/asesoria/contratar";

export default async function AsesoriaPage() {
  const [price, catalog] = await Promise.all([getAdvisoryPrice(), getCatalog()]);
  const STEPS = buildSteps(price);
  const exampleCars = catalog.cars;

  const kpis = [
    { num: price, label: "por 10 días de asesoría" },
    { num: "WhatsApp", label: "sin apps ni descargas" },
    { num: "Al instante", label: "te escribimos apenas se confirma tu pago" },
    ...(catalog.models > 0
      ? [{ num: `${catalog.models} modelos`, label: "del catálogo que conoce Francisco IA" }]
      : []),
  ];

  return (
    <div className="page">
      {/* ── Encabezado claro: título, bajada y ejemplo de conversación ── */}
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Asesoría</span>
          </nav>

          <div className="page-head__grid">
            <div>
              <h1 className="t-h1">Asesoría por WhatsApp</h1>
              <p className="t-lead">
                Francisco IA conoce todos los autos del catálogo. Analiza tu uso, tus kilómetros y tu
                presupuesto, y te ayuda a decidir con datos reales.{" "}
                <span className="tone">Es una conversación, no una venta.</span>
              </p>
              <div className="page-head__actions">
                <Link href={CHECKOUT_HREF} className="btn btn--primary btn--lg">
                  Quiero asesoría por {price}
                  <Icon name="arrow_forward" size="none" className="arrow" />
                </Link>
                <a href="#como-funciona" className="btn btn--quiet">
                  Cómo funciona
                  <Icon name="expand_more" size="none" />
                </a>
              </div>
            </div>

            <figure className="chat" aria-label="Ejemplo de conversación con Francisco IA">
              <div className="chat__head">
                <span className="chat__avatar" aria-hidden="true">F</span>
                <div>
                  <p className="chat__name">Francisco IA</p>
                  <p className="chat__sub">Asesor de Electrificarte en WhatsApp</p>
                </div>
              </div>
              <div className="chat__body">
                <p className="msg">
                  Hola, soy Francisco IA. Para recomendarte bien, cuéntame: ¿cuántos kilómetros haces en un
                  día normal y dónde podrías cargar?
                </p>
                <p className="msg msg--me">
                  Unos 60 km al día. Vivo en casa, así que puedo cargar de noche. Mi tope es $35 millones.
                </p>
                <div className="msg">
                  Con 60 km diarios y carga en casa, un 100% eléctrico te calza bien.
                  {exampleCars.length > 0 && (
                    <>
                      {" "}En tu presupuesto te propongo comparar estos {COUNT_WORD[exampleCars.length]}:
                      <ul>
                        {exampleCars.map((car) => (
                          <li key={car.slug}>
                            <strong>{car.title}</strong>
                            <span>{car.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
              <figcaption className="chat__note">
                Ejemplo de conversación.
                {exampleCars.length > 0 && " Modelos, precios y autonomías salen del catálogo actual."}
              </figcaption>
            </figure>
          </div>

          <div className="kpis" style={{ "--kpis": kpis.length } as CSSProperties}>
            {kpis.map((k) => (
              <div className="kpi" key={k.label}>
                <p className="kpi__num">{k.num}</p>
                <p className="kpi__label">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="section" id="como-funciona" aria-labelledby="how-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="how-t">De la duda a tu auto ideal en tres pasos</h2>
              <p className="t-lead">Sin formularios eternos ni jerga técnica: una conversación por WhatsApp.</p>
            </div>
          </div>
          <ol className="steps-row">
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

      {/* ── Precio y qué incluye: el bloque Glaciar de la página ── */}
      <section className="section section--rule" aria-labelledby="price-t">
        <div className="wrap">
          <div className="soft-block price-block">
            <div>
              <p className="t-label">Asesoría por WhatsApp</p>
              <p className="price-block__amount mt-3">{price}</p>
              <p className="price-block__per">por 10 días de conversación con Francisco IA</p>
              <Link href={CHECKOUT_HREF} className="btn btn--primary btn--lg">
                Quiero asesoría
                <Icon name="arrow_forward" size="none" className="arrow" />
              </Link>
              <p className="t-micro">Pago con tarjeta a través de WebPay.</p>
            </div>
            <div>
              <h2 className="t-h3" id="price-t">Qué incluye</h2>
              <ul className="checklist">
                {INCLUYE.map((item) => (
                  <li key={item}>
                    <Icon name="check" size="none" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── ¿Es para ti? ── */}
      <section className="section section--subtle" aria-labelledby="fit-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="fit-t">¿Es para ti?</h2>
              <p className="t-lead">
                Ideal si estás entrando al mundo electrificado y todavía no tienes claro qué modelo te conviene.
              </p>
            </div>
          </div>
          <div className="fit">
            <div className="fit__col">
              <h3 className="t-h3">Te sirve si</h3>
              <ul>
                <li>
                  <Icon name="check" size="none" />
                  <span>
                    Dudas entre un <strong>100% eléctrico, un híbrido o un enchufable</strong> y no sabes cuál
                    calza con tu rutina.
                  </span>
                </li>
                <li>
                  <Icon name="check" size="none" />
                  <span>
                    Quieres comparar modelos y versiones <strong>con datos</strong>, sin la presión de un vendedor.
                  </span>
                </li>
                <li>
                  <Icon name="check" size="none" />
                  <span>
                    Tienes dudas de <strong>autonomía, carga o mantención</strong> que quieres resolver antes de
                    comprar.
                  </span>
                </li>
              </ul>
            </div>
            <div className="fit__col fit__col--no">
              <h3 className="t-h3">Quizás no la necesitas si</h3>
              <ul>
                <li>
                  <Icon name="arrow_forward" size="none" />
                  <span>
                    <strong>Ya sabes qué modelo quieres.</strong> Súmate a la waitlist y te avisamos cuando abramos
                    el acceso para ese modelo.
                  </span>
                </li>
                <li>
                  <Icon name="arrow_forward" size="none" />
                  <span>
                    <strong>Solo quieres ver specs lado a lado.</strong> El{" "}
                    <Link href="/comparador" className="link">comparador</Link> del sitio te muestra hasta tres
                    modelos juntos.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Preguntas frecuentes ── */}
      <section className="section" aria-labelledby="faq-t">
        <div className="wrap faq-2">
          <div>
            <h2 className="t-h2" id="faq-t">Preguntas frecuentes</h2>
            <p className="t-lead">Lo que más nos preguntan antes de contratar.</p>
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

      {/* ── Cierre claro, con hairline arriba (el footer ya es oscuro) ── */}
      <section className="band section--rule" aria-labelledby="band-t">
        <div className="wrap band__in">
          <div>
            <h2 className="t-h2" id="band-t">Empieza hoy tu asesoría</h2>
            <p>Pagas {price} y hablas con Francisco IA por WhatsApp en minutos.</p>
          </div>
          <div className="band__actions">
            <Link href={CHECKOUT_HREF} className="btn btn--primary btn--lg">
              Quiero asesoría por {price}
              <Icon name="arrow_forward" size="none" className="arrow" />
            </Link>
            <OfferCta source="asesoria" className="link cursor-pointer">
              ¿Ya sabes qué auto quieres? Únete a la waitlist
            </OfferCta>
          </div>
        </div>
      </section>
    </div>
  );
}
