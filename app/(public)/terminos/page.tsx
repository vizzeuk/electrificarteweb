import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones del servicio de Electrificarte S.P.A.",
  robots: { index: false },
};

const LAST_UPDATED = "08 de abril de 2025";

export default function TerminosPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-black pt-24 pb-14">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <nav className="flex items-center gap-2 text-white/30 text-xs mb-8">
            <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/60">Términos y condiciones</span>
          </nav>
          <p className="text-primary text-[11px] uppercase tracking-widest font-bold mb-3">Legal</p>
          <h1 className="text-4xl md:text-5xl font-headline font-black text-white tracking-tighter mb-4">
            Términos y condiciones
          </h1>
          <p className="text-white/40 text-sm">Última actualización: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <div className="prose prose-sm md:prose-base prose-gray max-w-none">

            <h2>1. Identificación del prestador</h2>
            <p>
              <strong>Electrificarte S.P.A.</strong> (en adelante "Electrificarte"), RUT pendiente de inscripción, con domicilio en Santiago, Región Metropolitana, Chile, es el titular del sitio web <strong>electrificarte.cl</strong> y de los servicios de asesoría en la adquisición de vehículos eléctricos e híbridos.
            </p>

            <h2>2. Objeto del servicio</h2>
            <p>
              Electrificarte actúa como intermediario entre compradores particulares y la red de concesionarios y distribuidores de vehículos electrificados en Chile. El servicio consiste en:
            </p>
            <ul>
              <li>Recepción de solicitudes de oferta a través del formulario del sitio web.</li>
              <li>Negociación con la red de concesionarios para obtener el mejor precio disponible.</li>
              <li>Entrega de una oferta formal al solicitante en un plazo máximo de 24 horas hábiles.</li>
            </ul>
            <p>
              Electrificarte no comercializa vehículos directamente ni actúa como concesionario. La decisión final de compra corresponde exclusivamente al cliente.
            </p>

            <h2>3. Pago del servicio</h2>
            <p>
              El uso del formulario de solicitud es gratuito. El servicio de asesoría y búsqueda exclusiva tiene un costo de <strong>$19.990 CLP</strong> (con IVA incluido), pagadero mediante los medios habilitados en el sitio (WebPay, tarjeta de crédito, tarjeta de débito y transferencia bancaria).
            </p>
            <p>
              El cobro se realiza previo a la activación de la búsqueda. En caso de que Electrificarte no logre obtener un descuento significativo respecto al precio de lista, se reembolsará el 100% del monto pagado dentro de los 5 días hábiles siguientes.
            </p>

            <h2>4. Obligaciones del usuario</h2>
            <p>El usuario se compromete a:</p>
            <ul>
              <li>Proporcionar información veraz y actualizada en el formulario de solicitud.</li>
              <li>No utilizar el servicio con fines fraudulentos o ilegales.</li>
              <li>No realizar acciones que perjudiquen la integridad del sitio web o de terceros.</li>
            </ul>

            <h2>5. Propiedad intelectual</h2>
            <p>
              Todos los contenidos del sitio web (textos, imágenes, logotipos, diseño y código) son propiedad de Electrificarte S.P.A. o de sus licenciantes. Queda prohibida su reproducción, distribución o modificación sin autorización expresa por escrito.
            </p>

            <h2>6. Limitación de responsabilidad</h2>
            <p>
              Electrificarte no garantiza la disponibilidad ininterrumpida del sitio web ni la exactitud de los precios mostrados, los cuales son de carácter referencial y pueden variar según disponibilidad del concesionario. La oferta definitiva se entrega por escrito tras el proceso de negociación.
            </p>

            <h2>7. Ley aplicable y jurisdicción</h2>
            <p>
              Estos términos se rigen por la legislación vigente en Chile, en particular la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores y sus modificaciones. Cualquier disputa será sometida a los tribunales ordinarios de justicia de la ciudad de Santiago.
            </p>

            <h2>8. Modificaciones</h2>
            <p>
              Electrificarte se reserva el derecho de modificar estos términos en cualquier momento. Los cambios se publicarán en esta misma página con la fecha de actualización correspondiente. El uso continuado del servicio tras la publicación de los cambios implica la aceptación de los nuevos términos.
            </p>

            <h2>9. Contacto</h2>
            <p>
              Para consultas relacionadas con estos términos, puedes contactarnos a través del formulario en{" "}
              <Link href="/solicitar" className="text-primary-deep hover:text-primary transition-colors">
                electrificarte.cl/solicitar
              </Link>{" "}
              o escribiéndonos directamente.
            </p>

          </div>
        </div>
      </section>
    </>
  );
}
