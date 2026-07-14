import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { client } from "@/lib/sanity/client";
import { productPricesQuery } from "@/lib/queries/pages";
import { ASESORIA_PRICE } from "@/lib/products";

export const revalidate = 60;

// Precio de display editable desde Sanity (Configuración del Sitio → Precios).
// Fallback a la constante de lib/products.ts si Sanity no lo trae.
async function getAdvisoryPrice(): Promise<string> {
  const prices = await client
    .fetch(productPricesQuery, {}, { next: { tags: ["siteSettings"] } })
    .catch(() => null);
  return prices?.advisoryPrice ?? ASESORIA_PRICE;
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
    icon: "forum",
    title: "Contratas y te escribimos",
    description: `Pagas ${price} y Francisco IA te contacta por WhatsApp al instante. Sin apps, sin descargas.`,
  },
  {
    icon: "psychology",
    title: "Analizamos tu caso",
    description: "Revisamos tu uso diario, kilometraje, presupuesto y necesidades reales para filtrar el catálogo por ti.",
  },
  {
    icon: "check_circle",
    title: "Llegas a tu auto ideal",
    description: "Terminas con claridad total sobre qué modelo comprar y por qué. Es una conversación, no una venta.",
  },
];

const INCLUYE = [
  "10 días de acceso a la asesoría para resolver todas tus dudas",
  "Recomendación personalizada según tu estilo de uso real",
  "Comparación entre modelos eléctricos e híbridos del catálogo",
  "Resolución de dudas técnicas (autonomía, carga, mantención)",
  "Atención directa por WhatsApp, a tu ritmo",
];

export default async function AsesoriaPage() {
  const price = await getAdvisoryPrice();
  const STEPS = buildSteps(price);
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative bg-black pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-amber/10 rounded-full blur-[140px]" />
        <div className="relative max-w-3xl mx-auto px-4 md:px-8">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-8">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/60">Asesoría</span>
          </nav>
          <p className="text-amber text-[11px] uppercase tracking-widest font-bold mb-4">
            Aún no sé qué auto elegir
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-black text-white tracking-tight leading-[1.05] mb-5">
            Asesoría IA por WhatsApp
          </h1>
          <p className="text-lg text-white/60 leading-relaxed mb-8 max-w-2xl">
            Francisco, nuestro asesor con inteligencia artificial, analiza tu uso y
            presupuesto y te lleva al auto eléctrico ideal. Sin presión: es una
            conversación, no una venta.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              href="/asesoria/contratar"
              className="inline-flex items-center justify-center gap-2 bg-amber hover:bg-amber-dark text-black font-bold px-8 py-4 rounded-xl transition-all text-lg shadow-[0_6px_32px_rgba(245,158,11,0.30)] hover:shadow-[0_8px_40px_rgba(245,158,11,0.45)] hover:scale-[1.02] active:scale-[0.99]"
            >
              Contratar asesoría · {price}
              <Icon name="arrow_forward" size="sm" />
            </Link>
            <span className="text-white/40 text-sm">Pago único · acceso por 10 días · respuesta inmediata</span>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tight text-center mb-12">
            Cómo funciona la asesoría
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="fade-in-up rounded-2xl border border-gray-100 p-6 hover:border-amber/40 hover:shadow-lg hover:shadow-amber/5 transition-all"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-amber/10 text-amber-dark flex items-center justify-center mb-4">
                  <Icon name={step.icon} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-dark">Paso {i + 1}</span>
                <h3 className="font-headline font-bold text-lg mt-1 mb-2">{step.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qué incluye ── */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-headline font-black uppercase tracking-tight text-center mb-4">
            Qué incluye
          </h2>
          <p className="text-text-muted text-center mb-10">
            Ideal si estás entrando al mundo eléctrico y todavía no tienes claro qué modelo te conviene.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {INCLUYE.map((item) => (
              <li key={item} className="flex gap-3 rounded-2xl bg-white border border-gray-100 p-5">
                <span className="w-6 h-6 rounded-full bg-amber/15 text-amber-dark flex items-center justify-center flex-shrink-0 mt-0.5">
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
            Empieza hoy tu asesoría
          </h2>
          <p className="text-white/50 mb-8">
            Un solo pago de {price} y hablas con Francisco IA por WhatsApp en minutos.
          </p>
          <Link
            href="/asesoria/contratar"
            className="inline-flex items-center justify-center gap-2 bg-amber hover:bg-amber-dark text-black font-bold px-8 py-4 rounded-xl transition-all text-lg shadow-[0_6px_32px_rgba(245,158,11,0.30)] hover:shadow-[0_8px_40px_rgba(245,158,11,0.45)] hover:scale-[1.02] active:scale-[0.99]"
          >
            Contratar asesoría · {price}
            <Icon name="arrow_forward" size="sm" />
          </Link>
          <p className="text-white/40 text-sm mt-6">
            ¿Ya sabes qué auto quieres?{" "}
            <Link href="/solicitar" className="text-primary hover:underline">Consigue tu mejor precio →</Link>
          </p>
        </div>
      </section>
    </>
  );
}
