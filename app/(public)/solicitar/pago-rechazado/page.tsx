import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifyOrderToken } from "@/lib/order-token";

export const metadata: Metadata = {
  title: "El pago no se completó",
  description: "El pago no pudo procesarse. Puedes reintentar tu solicitud.",
  robots: { index: false, follow: false },
};

export default async function PagoRechazadoPage() {
  const store = await cookies();
  const orderId = verifyOrderToken(store.get("ec_order")?.value);
  if (!orderId) notFound();

  const isAdvisory = store.get("ec_order_type")?.value === "advisory";
  const retryHref = isAdvisory ? "/asesoria/contratar" : "/solicitar";

  return (
    <div className="page">
      <section className="section">
        <div className="wrap">
          <div className="max-w-[40rem]">
            <div className="head-chips">
              <span className="chip">Pago no completado</span>
            </div>
            <h1 className="t-h1">El pago no se procesó</h1>
            <p className="t-lead mt-6">
              No pudimos confirmar tu pago, así que tu solicitud no quedó activa. No te
              preocupes: no se realizó ningún cobro. Puedes intentarlo de nuevo.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={retryHref} className="btn btn--primary btn--lg">
                Reintentar mi solicitud
              </Link>
              <Link href="/" className="btn btn--secondary btn--lg">
                Volver al inicio
              </Link>
            </div>

            <p className="t-small mt-10 border-t border-line pt-6">
              ¿Necesitas ayuda? <Link href="/contacto" className="link">Contáctanos</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
