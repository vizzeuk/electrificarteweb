import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

/**
 * /resenas: página explicativa de las reseñas de dueños.
 *
 * Camino desde el home: franja "¿Ya tienes un auto electrificado?" (HomeReviewPrompt) → acá →
 * /resenas/escribir (el formulario). Desde la ficha de un auto se sigue usando el popup, que es
 * más rápido y ya trae el auto puesto. Los dos usan el mismo formulario (ReviewForm) y el mismo
 * envío a n8n.
 *
 * Si la persona tocó una estrella en el home, llega con ?calificacion=N y ese valor sigue hasta
 * el formulario, que se abre con la calificación ya puesta.
 */

export const metadata: Metadata = {
  title: "Reseñas de dueños de autos electrificados",
  description:
    "Cómo funcionan las reseñas de Electrificarte: opiniones de personas que ya manejan un auto eléctrico o híbrido en Chile. Autonomía real, carga y costos del día a día.",
  alternates: { canonical: "/resenas" },
};

const PARA_QUE = [
  { icon: "thumb_up", title: "Deciden mejor", text: "Quien está eligiendo auto lee cómo le fue a alguien con el mismo modelo, no solo lo que promete la marca." },
  { icon: "bolt", title: "Autonomía y carga reales", text: "Los kilómetros que de verdad hace el auto en ciudad y en carretera, y cuánto tarda en cargar." },
  { icon: "payments", title: "Costos del día a día", text: "Cuánto se gasta en carga y mantención, contado por quien lo paga cada mes." },
  { icon: "verified", title: "Junto a los datos oficiales", text: "Cada reseña aparece en la ficha del modelo, al lado de su ficha técnica y sus versiones." },
];

const PASOS = [
  { title: "Califica y cuenta", text: "Elige de 1 a 5 estrellas y escribe cómo te ha ido. Si quieres, suma fotos de tu auto. Toma un par de minutos." },
  { title: "Se publica", text: "Si tu reseña es solo texto, se publica al instante. Si trae fotos, el equipo las revisa antes de mostrarlas." },
  { title: "Queda en la ficha", text: "Tu reseña aparece en la ficha de tu modelo, y las mejor evaluadas también en el inicio del sitio." },
];

const IDEAS = [
  "Cuántos kilómetros haces con una carga, en ciudad y en carretera",
  "Dónde cargas y cuánto se demora",
  "Cuánto gastas al mes comparado con tu auto anterior",
  "Cómo se maneja, el espacio y la comodidad",
  "Lo que más te gusta y lo que cambiarías",
  "Cómo ha sido la mantención y el servicio",
];

const FAQS = [
  { q: "¿Tiene algún costo?", a: "No. Dejar una reseña es gratis." },
  { q: "¿Necesito haber comprado el auto con Electrificarte?", a: "No. Si manejas un auto electrificado, tu experiencia le sirve a quien está decidiendo." },
  { q: "¿Por qué se revisan las reseñas con fotos?", a: "Para asegurarnos de que las imágenes sean del auto y sean apropiadas antes de mostrarlas en el sitio." },
  { q: "¿Cuánto demora en aparecer?", a: "Si es solo texto, al instante. Si trae fotos, cuando el equipo termine de revisarlas." },
  { q: "¿Qué reseñas se retiran?", a: "Las que no hablan del auto, las que tienen insultos o publicidad, las que exponen datos de otras personas y las que traen fotos que no corresponden." },
  { q: "¿Puedo editar o borrar mi reseña?", a: "Sí. Escríbenos a contacto@electrificarte.com desde el correo que usaste y la ajustamos." },
];

type PageProps = { searchParams: Promise<{ calificacion?: string }> };

export default async function ResenasPage({ searchParams }: PageProps) {
  const { calificacion } = await searchParams;
  const n = Number(calificacion);
  const escribir = Number.isInteger(n) && n >= 1 && n <= 5 ? `/resenas/escribir?calificacion=${n}` : "/resenas/escribir";

  return (
    <div className="page">
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Reseñas</span>
          </nav>
          <div className="page-head__grid grid-cols-1">
            <div>
              <h1 className="t-h1">Reseñas de dueños</h1>
              <p className="t-lead">
                Opiniones de personas que ya manejan un auto electrificado en Chile. Cuentan lo que ninguna ficha
                técnica dice: la autonomía real, cómo cargan y cuánto gastan.
              </p>
              <div className="page-head__actions">
                <Link href={escribir} className="btn btn--primary btn--lg">
                  Escribir mi reseña
                  <Icon name="arrow_forward" size="none" className="arrow" />
                </Link>
                <a href="#como-funciona" className="btn btn--quiet">
                  Cómo funcionan
                  <Icon name="expand_more" size="none" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Para qué sirven ── */}
      <section className="section" aria-labelledby="para-que-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="para-que-t">Para qué sirven</h2>
              <p className="t-lead">Una reseña honesta le ahorra dudas y errores a quien viene detrás.</p>
            </div>
          </div>
          <div className="trust">
            {PARA_QUE.map((b) => (
              <div key={b.title} className="trust__item">
                <Icon name={b.icon} size="none" />
                <h3 className="trust__title">{b.title}</h3>
                <p className="trust__text">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo funcionan ── */}
      <section className="section section--subtle" id="como-funciona" aria-labelledby="como-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="como-t">Cómo funcionan</h2>
              <p className="t-lead">Tres pasos, desde que la escribes hasta que otros la leen.</p>
            </div>
          </div>
          <ol className="steps-row">
            {PASOS.map((p, i) => (
              <li key={p.title}>
                <span className="step__n">{String(i + 1).padStart(2, "0")}</span>
                <p className="step__title">{p.title}</p>
                <p className="step__text">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Qué contar (el bloque destacado de la página) ── */}
      <section className="section" aria-labelledby="ideas-t">
        <div className="wrap">
          <div className="soft-block price-block">
            <div>
              <h2 className="t-h2" id="ideas-t">Ideas para tu reseña</h2>
              <p className="t-body mt-3">Mientras más concreta, más útil: números, lugares y situaciones reales.</p>
              <Link href={escribir} className="btn btn--primary btn--lg mt-6">
                Escribir mi reseña
                <Icon name="arrow_forward" size="none" className="arrow" />
              </Link>
            </div>
            <ul className="checklist">
              {IDEAS.map((idea) => (
                <li key={idea}>
                  <Icon name="check" size="none" />
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Privacidad ── */}
      <section className="section section--rule" aria-labelledby="privacidad-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="privacidad-t">Tus datos, cuidados</h2>
              <p className="t-lead">Pedimos tu contacto solo para escribirte si hay una duda con tu reseña.</p>
            </div>
          </div>
          <div className="fit">
            <div className="fit__col">
              <h3 className="t-h3">Lo que se publica</h3>
              <ul>
                <li><Icon name="check" size="none" /><span>Tu nombre y la inicial de tu apellido, por ejemplo <strong>Juan P.</strong></span></li>
                <li><Icon name="check" size="none" /><span>Tu calificación y lo que escribiste.</span></li>
                <li><Icon name="check" size="none" /><span>El auto: marca, modelo, año, versión y color.</span></li>
                <li><Icon name="check" size="none" /><span>Tus fotos, una vez revisadas.</span></li>
              </ul>
            </div>
            <div className="fit__col fit__col--no">
              <h3 className="t-h3">Lo que nunca se publica</h3>
              <ul>
                <li><Icon name="lock" size="none" /><span>Tu apellido completo.</span></li>
                <li><Icon name="lock" size="none" /><span>Tu email.</span></li>
                <li><Icon name="lock" size="none" /><span>Tu teléfono.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Preguntas frecuentes ── */}
      <section className="section section--subtle" aria-labelledby="faq-t">
        <div className="wrap faq-2">
          <div>
            <h2 className="t-h2" id="faq-t">Preguntas frecuentes</h2>
            <p className="t-lead">Lo que más nos preguntan sobre las reseñas.</p>
          </div>
          <div>
            {FAQS.map((f, i) => (
              <details className="qa" key={f.q} open={i === 0}>
                <summary>
                  {f.q}
                  <Icon name="add" size="none" />
                </summary>
                <p className="qa__a">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cierre claro (el footer ya es oscuro) ── */}
      <section className="band section--rule" aria-labelledby="band-t">
        <div className="wrap band__in">
          <div>
            <h2 className="t-h2" id="band-t">¿Tienes un auto electrificado?</h2>
            <p>Tu experiencia ayuda al próximo comprador a elegir bien.</p>
          </div>
          <div className="band__actions">
            <Link href={escribir} className="btn btn--primary btn--lg">
              Escribir mi reseña
              <Icon name="arrow_forward" size="none" className="arrow" />
            </Link>
            <Link href="/marcas" className="link">Ver el catálogo</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
