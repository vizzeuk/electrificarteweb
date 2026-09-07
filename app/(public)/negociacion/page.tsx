import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";

export const revalidate = 60;

// El precio de la Oferta ($19.990) ya no se muestra en esta página: el flujo pagado
// está en standby (ver docs/PIVOT-WAITLIST-PLAN.md). Al reactivarlo, volver a leer
// `offerPrice` desde Sanity (productPricesQuery) como hacía antes.

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Negociación de ofertas — Conseguimos tu mejor precio",
    description:
      "Ya sabes qué auto quieres. Negociamos con nuestra red de vendedores oficiales para conseguirte la mejor oferta. Súmate a la waitlist y te avisamos cuando abramos el acceso.",
    alternates: { canonical: "/negociacion" },
    openGraph: {
      title: "Negociación de ofertas | Electrificarte",
      description:
        "Negociamos con nuestra red de vendedores oficiales para conseguirte el mejor precio de tu auto electrificado. Súmate a la waitlist.",
      url: "/negociacion",
      type: "website",
    },
  };
}

// Giro sep-2026: la Oferta ($19.990) está en standby. Los pasos describen el camino
// de la WAITLIST — sin precio, sin plazos prometidos y sin garantía de devolución.
const STEPS = [
  {
    icon: "search",
    title: "Elige tu modelo",
    description: "Ya sabes qué auto quieres. Dinos el modelo desde el catálogo o el buscador.",
  },
  {
    icon: "person",
    title: "Súmate a la waitlist",
    description: "Déjanos tus datos y quedas registrado como interesado en ese modelo.",
  },
  {
    icon: "handshake",
    title: "Te avisamos",
    description: "Te contactamos cuando abramos el acceso y tengamos novedades para tu modelo.",
  },
  {
    icon: "celebration",
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
    description: "Accedemos a ofertas de inventario y condiciones que no encuentras al público general — la oferta real, no la de vidriera.",
  },
];

const STATS = [
  { value: "$800K–$6M", label: "rango de ahorro de clientes" },
  { value: "+15",       label: "vendedores oficiales en la red" },
  { value: "+500",      label: "personas ya confiaron" },
  { value: "100%",      label: "vendedores verificados" },
];

const INCLUYE = [
  "Búsqueda en nuestra red exclusiva de vendedores oficiales",
  "Negociación de bonos y descuentos por volumen",
  "Opciones de financiamiento pre-aprobadas",
  "Comparativa de precios reales del mercado",
  "Acompañamiento hasta la entrega del vehículo",
  "Acceso prioritario cuando abramos el servicio",
];

export default async function NegociacionPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative bg-black pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="relative max-w-3xl mx-auto px-4 md:px-8">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-8">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/60">Negociación de ofertas</span>
          </nav>
          <p className="text-primary text-[11px] uppercase tracking-widest font-bold mb-4">
            Ya sé qué auto quiero
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-black text-white tracking-tight leading-[1.05] mb-5">
            Conseguimos tu mejor precio
          </h1>
          <p className="text-lg text-white/60 leading-relaxed mb-8 max-w-2xl">
            Ya sabes qué auto quieres. Negociamos con nuestra red de vendedores
            oficiales para conseguirte la mejor oferta del mercado. Súmate a la
            waitlist y te avisamos cuando abramos el acceso.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <OfferCta
              source="negociacion"
              className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3 rounded-xl transition-all text-base shadow-[0_6px_32px_rgba(0,229,229,0.30)] hover:shadow-[0_8px_40px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]"
            >
              Quiero mi oferta
            </OfferCta>
            <span className="text-white/40 text-sm">Sin costo ni compromiso al registrarte</span>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-primary-deep text-[11px] uppercase tracking-widest font-bold mb-2">Sin dar vueltas</p>
            <h2 className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tight">
              Del modelo elegido a tu mejor precio en 4 pasos
            </h2>
            <p className="text-text-muted max-w-xl mx-auto mt-3">
              Tú eliges el auto; nosotros hacemos la pega de negociar por ti con la red de vendedores.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="fade-in-up rounded-2xl border border-gray-100 p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary-deep flex items-center justify-center mb-4">
                  <Icon name={step.icon} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary-deep">Paso {i + 1}</span>
                <h3 className="font-headline font-bold text-lg mt-1 mb-2">{step.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Por qué conseguimos mejores precios ── */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tight mb-4">
              Por qué conseguimos mejores precios
            </h2>
            <p className="text-text-muted max-w-2xl mx-auto leading-relaxed">
              No revendemos autos: negociamos por ti. Al concentrar la demanda de
              cientos de compradores, movemos los precios a tu favor.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-12">
            {RAZONES.map((r) => (
              <div key={r.title} className="rounded-2xl bg-white border border-gray-100 p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary-deep flex items-center justify-center mb-4">
                  <Icon name={r.icon} />
                </div>
                <h3 className="font-headline font-bold text-lg mb-2">{r.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-2xl bg-black px-6 py-8">
            {STATS.map((st) => (
              <div key={st.label} className="text-center">
                <p className="text-primary font-headline font-black text-2xl md:text-3xl leading-none">{st.value}</p>
                <p className="text-white/50 text-xs mt-1.5 leading-snug">{st.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qué incluye ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tight text-center mb-4">
            Qué incluye
          </h2>
          <p className="text-text-muted text-center mb-10">
            Ideal si ya tienes claro qué modelo quieres y buscas el mejor precio posible, sin dar vueltas por tu cuenta.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {INCLUYE.map((item) => (
              <li key={item} className="flex gap-3 rounded-2xl bg-surface border border-gray-100 p-5">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary-deep flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon name="check" size="sm" />
                </span>
                <span className="text-sm text-text-main leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="py-16 md:py-20 bg-black">
        <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tight text-white mb-4">
            Consigue tu mejor precio
          </h2>
          <p className="text-white/50 mb-8">
            Déjanos tus datos y quedas registrado como interesado. Te avisamos cuando abramos el acceso.
          </p>
          <OfferCta
            source="negociacion"
            className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-black font-bold px-6 py-3 rounded-xl transition-all text-base shadow-[0_6px_32px_rgba(0,229,229,0.30)] hover:shadow-[0_8px_40px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]"
          >
            Quiero mi oferta
          </OfferCta>
          <p className="text-white/40 text-sm mt-6">
            ¿Aún no sabes qué auto elegir?{" "}
            <Link href="/asesoria" className="text-primary hover:underline">Empieza con la asesoría →</Link>
          </p>
        </div>
      </section>
    </>
  );
}
