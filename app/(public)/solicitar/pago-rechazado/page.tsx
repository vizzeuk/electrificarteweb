import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifyOrderToken } from "@/lib/order-token";

export const metadata: Metadata = {
  title: "El pago no se completó",
  description: "El pago no pudo procesarse. Podés reintentar tu solicitud.",
  robots: { index: false, follow: false },
};

export default async function PagoRechazadoPage() {
  const store = await cookies();
  const orderId = verifyOrderToken(store.get("ec_order")?.value);
  if (!orderId) notFound();

  const isAdvisory = store.get("ec_order_type")?.value === "advisory";
  const retryHref = isAdvisory ? "/asesoria/contratar" : "/solicitar";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-24 bg-surface">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-8 md:p-12 text-center">
        <div className="w-20 h-20 bg-amber/15 text-amber rounded-full flex items-center justify-center mx-auto mb-7">
          {/* SVG inline — no depende de la fuente Material Symbols */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </div>
        <p className="text-[11px] uppercase tracking-widest text-amber font-bold mb-3">
          Pago no completado
        </p>
        <h1 className="font-headline font-black text-3xl md:text-4xl tracking-tight uppercase leading-tight">
          El pago no se procesó
        </h1>
        <p className="text-text-muted mt-4 leading-relaxed">
          No pudimos confirmar tu pago, así que tu solicitud no quedó activa. No te
          preocupes: no se realizó ningún cobro. Podés intentarlo de nuevo.
        </p>

        <Link
          href={retryHref}
          className="mt-8 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-7 py-3 rounded-xl transition-colors"
        >
          Reintentar mi solicitud
        </Link>
        <p className="mt-4 text-xs text-text-ghost">
          ¿Necesitás ayuda? <Link href="/contacto" className="text-primary-deep font-semibold">Contactanos</Link>
        </p>
      </div>
    </main>
  );
}
