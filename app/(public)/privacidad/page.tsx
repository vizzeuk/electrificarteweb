import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Política de privacidad y tratamiento de datos personales de Electrificarte S.P.A.",
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

export default function PrivacidadPage() {
  return (
    <div className="page">
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Política de privacidad</span>
          </nav>
          <h1 className="t-h1 mt-header">Política de privacidad</h1>
          <p className="t-small mt-6">Última actualización: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className={LEGAL_PROSE}>

            <h2>1. Responsable del tratamiento</h2>
            <p>
              <strong>Electrificarte S.P.A.</strong>, domiciliada en Santiago, Chile, es responsable del tratamiento de los datos personales recopilados a través del sitio web <strong>electrificarte.cl</strong>, de conformidad con la Ley N° 19.628 sobre Protección de la Vida Privada.
            </p>

            <h2>2. Datos que recopilamos</h2>
            <p>Recopilamos los siguientes datos cuando completas nuestros formularios:</p>
            <ul>
              <li><strong>Identidad:</strong> nombre completo y RUT.</li>
              <li><strong>Contacto:</strong> dirección de correo electrónico, número de teléfono y comuna de residencia.</li>
              <li><strong>Interés comercial:</strong> vehículo de interés, forma de pago preferida.</li>
              <li><strong>Vehículo de intercambio (si aplica):</strong> marca, modelo, año, kilometraje, patente y fotografías.</li>
              <li><strong>Suscripción newsletter:</strong> dirección de correo electrónico.</li>
            </ul>

            <h2>3. Finalidad del tratamiento</h2>
            <p>Los datos recopilados se utilizan exclusivamente para:</p>
            <ul>
              <li>Gestionar tu solicitud de oferta y comunicar los resultados de la negociación.</li>
              <li>Coordinar el contacto entre el cliente y el vendedor oficial seleccionado.</li>
              <li>Enviar comunicaciones comerciales relacionadas con ofertas de vehículos eléctricos e híbridos, únicamente si otorgaste tu consentimiento expreso (newsletter).</li>
              <li>Cumplir con obligaciones legales aplicables.</li>
            </ul>

            <h2>4. Compartición de datos</h2>
            <p>
              Electrificarte comparte los datos estrictamente necesarios con los vendedores oficiales y distribuidores de su red, únicamente para efectos de preparar y ejecutar la oferta solicitada. No vendemos ni cedemos datos personales a terceros con fines comerciales ajenos al servicio contratado.
            </p>
            <p>
              Utilizamos servicios tecnológicos de terceros para la gestión de formularios y automatización (incluyendo n8n en infraestructura propia), los cuales operan bajo acuerdos de confidencialidad.
            </p>

            <h2>5. Conservación de los datos</h2>
            <p>
              Los datos se conservan durante el tiempo necesario para prestar el servicio solicitado y por el período que exija la legislación tributaria y comercial chilena (generalmente 6 años). Los datos de newsletter se conservan hasta que el titular solicite su eliminación.
            </p>

            <h2>6. Derechos del titular</h2>
            <p>De acuerdo con la Ley N° 19.628, tienes derecho a:</p>
            <ul>
              <li><strong>Acceso:</strong> conocer qué datos tuyos tenemos y cómo los usamos.</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
              <li><strong>Cancelación:</strong> solicitar la eliminación de tus datos cuando ya no sean necesarios.</li>
              <li><strong>Oposición:</strong> oponerte al tratamiento de tus datos para fines de marketing.</li>
            </ul>
            <p>
              Para ejercer estos derechos, contáctanos a través de{" "}
              <span className="text-ink-2">electrificarte.cl/solicitar</span>.
            </p>

            <h2>7. Seguridad</h2>
            <p>
              Implementamos medidas técnicas y organizativas razonables para proteger tus datos contra acceso no autorizado, pérdida o alteración, incluyendo transmisión cifrada (HTTPS) y control de acceso a los sistemas de almacenamiento.
            </p>

            <h2>8. Cookies</h2>
            <p>
              El sitio web puede utilizar cookies técnicas necesarias para su funcionamiento. No utilizamos cookies de seguimiento o publicidad de terceros sin tu consentimiento explícito.
            </p>

            <h2>9. Modificaciones a esta política</h2>
            <p>
              Podemos actualizar esta política en cualquier momento. La versión vigente estará siempre disponible en esta página con su fecha de actualización.
            </p>

            <h2>10. Contacto</h2>
            <p>
              Para cualquier consulta sobre el tratamiento de tus datos personales, escríbenos a través del formulario en{" "}
              <span className="text-ink-2">electrificarte.cl/solicitar</span>.
            </p>

          </div>
        </div>
      </section>
    </div>
  );
}
