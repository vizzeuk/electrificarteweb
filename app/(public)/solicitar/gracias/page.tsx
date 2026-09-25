import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifyOrderToken } from "@/lib/order-token";

export const metadata: Metadata = {
  title: "¡Gracias por tu solicitud!",
  description: "Tu solicitud quedó activa. Pronto recibirás la mejor oferta.",
  robots: { index: false, follow: false },
};

export default async function GraciasPage() {
  // Gate: solo quien pasó por el checkout (y por tanto pagó) tiene la cookie
  // firmada. Sin cookie válida → 404. No es accesible para cualquiera.
  const store = await cookies();
  const orderId = verifyOrderToken(store.get("ec_order")?.value);
  if (!orderId) notFound();

  const isAdvisory = store.get("ec_order_type")?.value === "advisory";

  // Referencia corta y legible del pedido, para que el usuario la cite si
  // necesita escribir a soporte. No expone datos personales (es un UUID).
  const orderRef = orderId.slice(0, 8).toUpperCase();

  // La rama de la Oferta ($19.990) solo la ven quienes pagaron antes del standby.
  const content = isAdvisory
    ? {
        badge:       "Asesoría confirmada",
        heading:     "¡Tu asesoría está confirmada!",
        body:        "Recibimos tu pago. Un experto de Electrificarte te contactará directamente por WhatsApp para guiarte en la elección del auto ideal según tu presupuesto y necesidades.",
        pasos: [
          "En los próximos minutos recibirás un mensaje de WhatsApp de nuestro equipo.",
          "El asesor revisará tus necesidades y te presentará las mejores opciones.",
          "Sin presión: es una conversación personalizada, no una venta.",
        ],
        secondaryCta: { href: "/marcas", label: "Explorar el catálogo" },
      }
    : {
        badge:       "Pago confirmado",
        heading:     "¡Gracias por confiar en Electrificarte!",
        body:        "Tu solicitud quedó activa. Nuestro equipo ya está negociando con la red de vendedores oficiales para conseguirte el mejor precio de Chile.",
        pasos: [
          "En 48 a 96 horas te enviamos la mejor oferta.",
          "Revisa tu email y WhatsApp: ahí te contactamos.",
          "No necesitas hacer nada más: nosotros te contactamos.",
        ],
        secondaryCta: { href: "/marcas", label: "Ver otros modelos" },
      };

  return (
    <div className="page">
      <section className="section">
        <div className="wrap">
          <div className="max-w-[40rem]">
            <div className="head-chips">
              <span className="chip chip--soft">{content.badge}</span>
            </div>
            <h1 className="t-h1">{content.heading}</h1>
            <p className="t-lead mt-6">{content.body}</p>

            <h2 className="t-h4 mt-10">Qué sigue ahora</h2>
            <ol className="mt-4 border-b border-line">
              {content.pasos.map((paso, i) => (
                <li key={paso} className="step">
                  <span className="step__n">{String(i + 1).padStart(2, "0")}</span>
                  <p className="t-body">{paso}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/" className="btn btn--primary btn--lg">
                Volver al inicio
              </Link>
              <Link href={content.secondaryCta.href} className="btn btn--secondary btn--lg">
                {content.secondaryCta.label}
              </Link>
            </div>

            <div className="t-small mt-10 grid gap-2 border-t border-line pt-6">
              <p>
                Referencia de tu pedido:{" "}
                <span className="num font-semibold text-ink">#{orderRef}</span>
              </p>
              <p>
                ¿Problemas con tu compra? Escríbenos a{" "}
                <a
                  href={`mailto:contacto@electrificarte.com?subject=${encodeURIComponent(`Problema con mi compra (Ref #${orderRef})`)}`}
                  className="link"
                >
                  contacto@electrificarte.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
