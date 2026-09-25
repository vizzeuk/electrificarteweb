import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { OfferCta } from "@/components/waitlist/OfferCta";
import { ASESORIA_PRICE } from "@/lib/products";

export interface FAQItem {
  question: string;
  answer: string;
  icon?: string;
}

interface FAQProps {
  title?: string;
  faqs?: FAQItem[];
}

const DEFAULT_FAQS: FAQItem[] = [
  { icon: "savings",        question: "¿Cuánto ahorro realmente usando Electrificarte?", answer: "El ahorro depende del modelo y del momento de compra. Negociamos con nuestra red de vendedores oficiales para conseguirte la mejor oferta disponible, incluyendo bonos y descuentos que no están al alcance del público general. Nuestros clientes han ahorrado desde $800.000 hasta más de $6.000.000." },
  { icon: "groups",         question: "¿Cómo logran esos descuentos?",                   answer: "Trabajamos con una amplia red de vendedores oficiales en Chile. Al agrupar múltiples solicitudes de compra, podemos negociar descuentos por volumen, acceder a bonos exclusivos y encontrar ofertas de inventario que no están disponibles al público general." },
  { icon: "payments",       question: "¿Tiene algún costo para mí?",                     answer: "Sumarte a la waitlist no tiene costo: solo dejas tus datos y quedas registrado como interesado. Si además quieres ayuda para decidir qué auto comprar, la asesoría por WhatsApp tiene un valor de $4.990." },
  { icon: "directions_car", question: "¿Tengo que comprar sin ver el auto?",             answer: "Para nada. Te conectamos con el vendedor oficial y puedes visitarlo, hacer test drive y revisar el vehículo antes de tomar cualquier decisión. La oferta final siempre es tuya para aceptar o rechazar." },
  { icon: "shield",         question: "¿Qué pasa después de sumarme a la waitlist?",     answer: "Quedas registrado como interesado en el modelo que nos indicaste. Te contactamos cuando abramos el acceso y tengamos novedades para ti. No adquieres ningún compromiso al registrarte." },
];

/**
 * Preguntas frecuentes (acordeón nativo con <details>, la primera abierta) y, a la derecha,
 * la tarjeta de ayuda con los dos caminos: Asesoría (principal) y waitlist (secundario).
 */
export function FAQ({ title = "Preguntas frecuentes", faqs }: FAQProps) {
  const displayFaqs = faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS;

  return (
    <section className="section section--rule" aria-labelledby="faq-title">
      <div className="wrap faq">
        {/* ── Izquierda: acordeón ── */}
        <div>
          <h2 id="faq-title" className="t-h2">{title}</h2>
          <div>
            {displayFaqs.map((faq, i) => (
              <details key={faq.question} className="qa" open={i === 0}>
                <summary>
                  {faq.question}
                  <Icon name="add" size="none" className="text-[20px]" />
                </summary>
                <p className="qa__a">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>

        {/* ── Derecha: ayuda según la etapa ── */}
        <aside className="help" aria-label="Ayuda según tu etapa">
          <div className="help__media">
            {/* Lazy a propósito: el FAQ está bajo el pliegue y precargar esta foto le
                quitaba ancho de banda al primer pintado del hero en móvil. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/coleccion-byd-electrico.jpg"
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="help__body">
            <p className="t-label">¿Todavía tienes dudas?</p>
            <h3 className="t-h3">Elige la ayuda según la etapa en que estés</h3>

            {/* Camino 1 — Asesoría: para quien aún no decide */}
            <div className="help__path">
              <p>
                <strong>¿Aún no sabes qué auto comprar?</strong> Te ayudamos a decidir según tu uso,
                tu kilometraje y tu presupuesto.
              </p>
              <Link href="/asesoria/contratar" className="btn btn--primary">
                Quiero asesoría por {ASESORIA_PRICE}
              </Link>
            </div>

            {/* Camino 2 — Waitlist: para quien ya eligió su auto */}
            <div className="help__path">
              <p>
                <strong>¿Ya sabes cuál quieres?</strong> Súmate a la waitlist y te avisamos cuando
                abramos el acceso.
              </p>
              <OfferCta source="faq" className="btn btn--secondary">
                Únete a la waitlist
              </OfferCta>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
