import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ReviewSummaryPanel } from "@/components/reviews/ReviewSummary";
import { ReviewFeed } from "@/components/reviews/ReviewFeed";
import { REVIEW_CATEGORIES } from "@/lib/reviews/categories";
import { getAllReviews, summarize } from "@/lib/reviews/queries";

/**
 * /resenas: página explicativa de las reseñas de dueños.
 *
 * Camino desde el home: franja "¿Ya tienes un auto electrificado?" (HomeReviewPrompt) → acá →
 * /resenas/escribir (el formulario). Desde la ficha de un auto se sigue usando el popup, que es
 * más rápido y ya trae el auto puesto. Los dos usan el mismo formulario (ReviewForm) y el mismo
 * envío a n8n.
 *
 * Cada reseña se califica en 4 categorías (autonomía, confort, agilidad, calidad) y la nota es su
 * promedio; "lo bueno" y "lo que mejoraría" son opcionales. Las reseñas publicadas se leen en
 * /resenas/todas (acá, un adelanto con las más recientes).
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Reseñas de dueños de autos electrificados",
  description:
    "Cómo funcionan las reseñas de Electrificarte: dueños de autos eléctricos e híbridos en Chile califican autonomía, confort, agilidad y calidad, y cuentan cómo les ha ido.",
  alternates: { canonical: "/resenas" },
};

const PARA_QUE = [
  { icon: "thumb_up", title: "Deciden mejor", text: "Quien está eligiendo auto lee cómo le fue a alguien con el mismo modelo, no solo lo que promete la marca." },
  { icon: "bolt", title: "Autonomía y carga reales", text: "Los kilómetros que de verdad hace el auto en ciudad y en carretera, y cuánto tarda en cargar." },
  { icon: "payments", title: "Costos del día a día", text: "Cuánto se gasta en carga y mantención, contado por quien lo paga cada mes." },
  { icon: "verified", title: "Junto a los datos oficiales", text: "Cada reseña aparece en la ficha del modelo, al lado de su ficha técnica y sus versiones." },
];

const PASOS = [
  { title: "Califica y cuenta", text: "Pon de 1 a 5 estrellas en autonomía, confort, agilidad y calidad, y escribe cómo te ha ido. Si quieres, suma lo bueno, lo que mejorarías y fotos." },
  { title: "Se publica", text: "Si tu reseña es solo texto, se publica al instante. Si trae fotos, el equipo las revisa antes de mostrarlas." },
  { title: "Queda en la ficha", text: "Tu reseña aparece en la ficha de tu modelo y en la página con todas las reseñas. Las mejor evaluadas, también en el inicio." },
];

/** Íconos de las 4 categorías (del subset de Material Symbols ya generado). */
const ICONO_CATEGORIA: Record<string, string> = {
  autonomia: "battery_charging_full",
  confort: "airline_seat_recline_extra",
  agilidad: "speed",
  calidad: "workspace_premium",
};

const IDEAS = [
  "Cuántos kilómetros haces con una carga, en ciudad y en carretera",
  "Dónde cargas y cuánto se demora",
  "Cuánto gastas al mes comparado con tu auto anterior",
  "Cómo se maneja, el espacio y la comodidad",
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

const escribir = "/resenas/escribir";

export default async function ResenasPage() {
  // Adelanto de las reseñas publicadas. Fail-soft: sin reseñas (o sin Supabase) la sección no se muestra.
  const reviews = await getAllReviews();
  const summary = summarize(reviews);

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
                <Link href="/resenas/todas" className="btn btn--secondary btn--lg">
                  Leer las reseñas
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

      {/* ── Qué se califica ── */}
      <section className="section" aria-labelledby="califica-t">
        <div className="wrap">
          <div className="section-head">
            <div className="section-head__text">
              <h2 className="t-h2" id="califica-t">Qué se califica</h2>
              <p className="t-lead">
                Cuatro categorías de 1 a 5 estrellas. La nota de tu reseña es el promedio de las cuatro.
              </p>
            </div>
          </div>
          <div className="trust">
            {REVIEW_CATEGORIES.map((c) => (
              <div key={c.key} className="trust__item">
                <Icon name={ICONO_CATEGORIA[c.key]} size="none" />
                <h3 className="trust__title">{c.label}</h3>
                <p className="trust__text">{c.hint}.</p>
              </div>
            ))}
          </div>
          <p className="t-small mt-6">
            Además puedes contar, si quieres, <strong className="font-semibold text-ink">lo bueno</strong> y{" "}
            <strong className="font-semibold text-ink">lo que mejorarías</strong>. Es lo que más buscan quienes
            están decidiendo.
          </p>
        </div>
      </section>

      {/* ── Qué contar (el bloque destacado de la página) ── */}
      <section className="section section--rule" aria-labelledby="ideas-t">
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
                <li><Icon name="check" size="none" /><span>Tus notas por categoría, lo que escribiste, lo bueno y lo que mejorarías.</span></li>
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

      {/* ── Adelanto de las reseñas publicadas (Niebla) ── */}
      {summary && (
        <section className="section section--subtle" aria-labelledby="ultimas-t">
          <div className="wrap">
            <div className="section-head">
              <div className="section-head__text">
                <h2 className="t-h2" id="ultimas-t">Lo que ya contaron</h2>
                <p className="t-lead">Las reseñas más recientes de dueños de autos electrificados.</p>
              </div>
            </div>
            <div className="rv-layout">
              <aside className="rv-layout__side" aria-label="Resumen de las reseñas">
                <ReviewSummaryPanel summary={summary} className="card">
                  <Link href="/resenas/todas" className="link-arrow">
                    Ver todas las reseñas
                    <Icon name="arrow_forward" size="none" />
                  </Link>
                </ReviewSummaryPanel>
              </aside>
              <div className="card rv-layout__list">
                <ReviewFeed reviews={reviews.slice(0, 3)} pageSize={3} showCar />
                {reviews.length > 3 && (
                  <div className="rv-list__more">
                    <Link href="/resenas/todas" className="btn btn--secondary">
                      Ver las {reviews.length} reseñas
                      <Icon name="arrow_forward" size="none" className="arrow" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Preguntas frecuentes: blanca si la sección anterior es Niebla ── */}
      <section className={summary ? "section section--rule" : "section section--subtle"} aria-labelledby="faq-t">
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
            <Link href="/resenas/todas" className="link">Leer las reseñas</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
