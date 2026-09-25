import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones del servicio de Electrificarte S.P.A.",
  robots: { index: false },
};

const LAST_UPDATED = "08 de abril de 2025";

// Tipografía de lectura: cuerpo de 16 px con interlineado 1,55 y ~70 caracteres por línea.
// (El repo no tiene el plugin de typography, así que las clases `prose` de antes no hacían nada.)
const LEGAL_PROSE = [
  "max-w-[70ch] text-body leading-[1.55] text-ink-2",
  "[&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-h3 [&_h2]:font-bold [&_h2]:text-balance [&_h2]:text-ink [&_h2:first-child]:mt-0",
  "[&_p]:mt-4 [&_ul]:mt-4 [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-6 [&_li]:pl-1 [&_li]:marker:text-ink-3",
  "[&_strong]:font-semibold [&_strong]:text-ink",
].join(" ");

export default function TerminosPage() {
  return (
    <div className="page">
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Términos y condiciones</span>
          </nav>
          <h1 className="t-h1 mt-header">Términos y condiciones</h1>
          <p className="t-small mt-6">Última actualización: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className={LEGAL_PROSE}>

            <h2>1. Identificación del prestador</h2>
            <p>
              <strong>Electrificarte S.P.A.</strong> (en adelante &quot;Electrificarte&quot;), RUT pendiente de inscripción, con domicilio en Santiago, Región Metropolitana, Chile, es el titular del sitio web <strong>electrificarte.cl</strong> y de los servicios de asesoría en la adquisición de vehículos eléctricos e híbridos.
            </p>

            <h2>2. Objeto del servicio</h2>
            <p>
              Electrificarte actúa como intermediario entre compradores particulares y la red de vendedores oficiales y distribuidores de vehículos electrificados en Chile. El servicio consiste en:
            </p>
            <ul>
              <li>Recepción de solicitudes de oferta a través del formulario del sitio web.</li>
              <li>Negociación con la red de vendedores oficiales para obtener el mejor precio disponible.</li>
              <li>Entrega de una oferta formal al solicitante en un plazo máximo de 96 horas hábiles.</li>
            </ul>
            <p>
              Electrificarte no comercializa vehículos directamente ni actúa como vendedor. La decisión final de compra corresponde exclusivamente al cliente.
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
              Electrificarte no garantiza la disponibilidad ininterrumpida del sitio web ni la exactitud de los precios mostrados, los cuales son de carácter referencial y pueden variar según disponibilidad del vendedor oficial. La oferta definitiva se entrega por escrito tras el proceso de negociación.
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
              <span className="text-ink-2">electrificarte.cl/solicitar</span>{" "}
              o escribiéndonos directamente.
            </p>

          </div>
        </div>
      </section>
    </div>
  );
}
