// Sección "Para vendedores" — se muestra en el home, justo antes del footer.
// Giro sep-2026: la red de vendedores está en STANDBY (todavía no funciona), así que esta
// sección la presenta como "próximamente" y lleva a /vendedores (en esta web), no a
// vendedores.electrificarte.com. Sin cifras: no hay datos que las respalden todavía.

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const STEPS = [
  {
    title: "Personas interesadas",
    desc: "Quienes visitan Electrificarte comparan modelos y nos dejan su interés por un auto específico.",
  },
  {
    title: "Te llega el contacto",
    desc: "Te avisaremos cuando alguien se interese en un modelo que vendes, para que le hagas tu propuesta.",
  },
  {
    title: "Cierras directo",
    desc: "Conversas y cierras la venta directamente con la persona. Electrificarte no media el trato.",
  },
];

export function ParaVendedores() {
  return (
    <section className="section" aria-labelledby="vendedores-title">
      <div className="wrap">
        <div className="sellers">
          <div>
            <h2 id="vendedores-title" className="t-h2">¿Vendes autos electrificados?</h2>
            <p className="t-lead">
              Estamos preparando una red de vendedores oficiales para conectarte con personas interesadas en los
              modelos que vendes. Todavía no está disponible: deja tus datos y te llamamos cuando esté funcionando.
            </p>
            <div className="sellers__actions">
              <Link href="/vendedores" className="btn btn--primary btn--lg">
                Cómo va a funcionar
                <Icon name="arrow_forward" size="none" className="arrow" />
              </Link>
              <Link href="/vendedores/unirme" className="link-arrow">
                Dejar mis datos
                <Icon name="arrow_forward" size="none" />
              </Link>
            </div>
          </div>

          {/* Cómo va a funcionar, en 3 pasos */}
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
      </div>
    </section>
  );
}
