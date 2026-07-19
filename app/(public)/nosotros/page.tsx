import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "Electrificarte es el marketplace de autos electrificados de Chile. Conectamos a compradores con nuestra red de vendedores oficiales para conseguir el mejor precio del mercado, sin vueltas ni presión de venta.",
  alternates: { canonical: "/nosotros" },
  openGraph: {
    title: "Quiénes somos | Electrificarte",
    description:
      "El marketplace de autos electrificados de Chile. Negociamos por ti con nuestra red de vendedores oficiales para que ahorres de verdad.",
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
      "No revendemos autos ni cobramos comisión sobre la venta. Trabajamos para el comprador: nuestra única misión es conseguirte el mejor precio posible.",
  },
  {
    icon: "shield",
    title: "Sin riesgo",
    description:
      "Si no logramos un descuento significativo sobre lo que encuentras por tu cuenta, te devolvemos el 100% de lo que pagaste. Así de simple.",
  },
];

const STATS = [
  { value: "+500", label: "compras ya negociadas en Chile" },
  { value: "53+", label: "marcas en el catálogo" },
  { value: "48-96h", label: "para recibir tu oferta" },
  { value: "100%", label: "garantía de devolución" },
];

const CAMINOS = [
  {
    tag: "Aún no sé qué auto quiero",
    tagClass: "text-amber",
    title: "Asesoría IA · $4.990",
    description:
      "Francisco, nuestro asesor con inteligencia artificial, analiza tu uso, presupuesto y necesidades por WhatsApp y te ayuda a decidir. Es una conversación, no una venta.",
    href: "/asesoria",
    cta: "Conocer la asesoría",
  },
  {
    tag: "Ya sé qué auto quiero",
    tagClass: "text-primary",
    title: "Oferta Exclusiva · $19.990",
    description:
      "Elige tu modelo y activamos la búsqueda con nuestra red de vendedores oficiales. Comparamos precios, bonos y financiamiento, y te traemos la mejor oferta del mercado.",
    href: "/negociacion",
    cta: "Cómo conseguimos el precio",
  },
];

export default function NosotrosPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative bg-black pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="relative max-w-3xl mx-auto px-4 md:px-8">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-8">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/60">Quiénes somos</span>
          </nav>
          <p className="text-primary text-[11px] uppercase tracking-widest font-bold mb-4">
            Quiénes somos
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-black text-white tracking-tight leading-[1.05] mb-5">
            Compramos mejor,<br />
            <span className="text-primary">para que estrenes eléctrico</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed mb-8 max-w-2xl">
            Electrificarte es el marketplace de autos electrificados de Chile.
            Ponemos de tu lado el poder de negociación que un comprador solo no
            tiene: concentramos la demanda y negociamos por ti con una red de
            vendedores oficiales para que consigas el mejor precio del mercado.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              href="/solicitar"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-all text-lg shadow-[0_6px_32px_rgba(0,229,229,0.30)] hover:shadow-[0_8px_40px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]"
            >
              Conseguir mi oferta
              <Icon name="arrow_forward" size="sm" />
            </Link>
            <Link href="/marcas" className="text-white/50 hover:text-white transition-colors text-sm">
              Explorar el catálogo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Misión ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <p className="text-primary-deep text-[11px] uppercase tracking-widest font-bold mb-4">
            Nuestra misión
          </p>
          <h2 className="text-2xl md:text-3xl font-headline font-black tracking-tight mb-6">
            Que la movilidad eléctrica sea para todos
          </h2>
          <p className="text-text-muted leading-relaxed text-lg">
            Comprar un auto electrificado debería ser transparente y justo. Pero
            los precios de lista, la falta de información y la presión de venta lo
            hacen difícil. Nacimos para cambiar eso: acompañarte a elegir con
            claridad y negociar en tu nombre, para que el ahorro que conseguimos
            valga mucho más de lo que pagas por el servicio.
          </p>
        </div>
      </section>

      {/* ── Valores ── */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tight text-center mb-12">
            Cómo trabajamos
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {VALORES.map((v) => (
              <div key={v.title} className="rounded-2xl bg-white border border-gray-100 p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary-deep flex items-center justify-center mb-4">
                  <Icon name={v.icon} />
                </div>
                <h3 className="font-headline font-bold text-lg mb-2">{v.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dos caminos ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tight mb-4">
              Dos formas de llegar a tu auto
            </h2>
            <p className="text-text-muted max-w-2xl mx-auto leading-relaxed">
              No importa dónde estés hoy en tu decisión: tenemos un camino para ti.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {CAMINOS.map((c) => (
              <div key={c.title} className="rounded-2xl border border-gray-100 p-7 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all flex flex-col">
                <p className={`text-[11px] uppercase tracking-widest font-bold mb-2 ${c.tagClass}`}>{c.tag}</p>
                <h3 className="font-headline font-bold text-xl mb-3">{c.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-6 flex-1">{c.description}</p>
                <Link href={c.href} className="inline-flex items-center gap-2 text-primary-deep font-bold text-sm hover:gap-3 transition-all">
                  {c.cta}
                  <Icon name="arrow_forward" size="sm" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
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

      {/* ── CTA final ── */}
      <section className="py-16 md:py-20 bg-black">
        <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tight text-white mb-4">
            ¿Listo para estrenar?
          </h2>
          <p className="text-white/50 mb-8">
            Ya sea que necesites ayuda para decidir o que ya sepas qué quieres,
            estamos para conseguirte el mejor precio de Chile.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/solicitar"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-all text-lg shadow-[0_6px_32px_rgba(0,229,229,0.30)] hover:shadow-[0_8px_40px_rgba(0,229,229,0.45)] hover:scale-[1.02] active:scale-[0.99]"
            >
              Conseguir mi oferta
              <Icon name="arrow_forward" size="sm" />
            </Link>
            <Link href="/contacto" className="text-white/50 hover:text-white transition-colors text-sm">
              Hablar con el equipo →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
