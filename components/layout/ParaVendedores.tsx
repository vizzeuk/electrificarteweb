// Sección "Para vendedores" — se muestra en el home, justo antes del footer.
// Resume la propuesta de la red de vendedores (landing vendedores.electrificarte.com):
// tráfico orgánico → prospección → cierre, con leads precalificados.

import { Icon } from "@/components/ui/Icon";

const VENDEDORES_URL = "https://vendedores.electrificarte.com";

const STEPS = [
  {
    title: "Tráfico orgánico",
    desc: "Electrificarte atrae compradores a su plataforma. Comparan, configuran su búsqueda y manifiestan interés: los clientes llegan solos.",
  },
  {
    title: "Te prospectamos el lead",
    desc: "Te informamos del interés del cliente por un modelo y entras a competir por ser la mejor oferta de la red, en 48 a 96 horas.",
  },
  {
    title: "Tú cierras la venta",
    desc: "Si tu propuesta convence al cliente, te conectamos con él. La comisión es 100% tuya.",
  },
];

const STATS = [
  { value: "3×",        label: "más cierres mensuales" },
  { value: "120+",      label: "modelos disponibles" },
  { value: "48 a 96 h", label: "entrega del lead" },
  { value: "100%",      label: "leads con intención" },
];

export function ParaVendedores() {
  return (
    <section className="section section--subtle" aria-labelledby="vendedores-title">
      <div className="wrap">
        <div className="sellers">
          <div>
            <h2 id="vendedores-title" className="t-h2">¿Vendes autos electrificados?</h2>
            <p className="t-lead">
              Únete a la red de vendedores oficiales de Electrificarte y recibe leads calificados
              de personas que ya quieren comprar. Sin publicidad y sin perder tiempo.
            </p>
            <a
              href={VENDEDORES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary btn--lg"
            >
              Quiero sumarme a la red
              <Icon name="north_east" size="none" />
            </a>
          </div>

          {/* Cómo funciona — 3 pasos */}
          <ol className="sellers__steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="step__n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="step__title">{s.title}</p>
                  <p className="step__text">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Cifras de la red */}
        <div className="stats">
          {STATS.map((st) => (
            <div key={st.label} className="stat">
              <p className="stat__num">{st.value}</p>
              <p className="stat__label">{st.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
