// Genera los correos transaccionales de n8n con el sistema de diseño v1 (DESIGN.md).
//   node scripts/gen-emails.mjs && node scripts/gen-waitlist-reviews-workflows.mjs
//
// Los HTML de emails/ventas/{waitlist,resena,asesoria}-*.html SALEN DE ACÁ: no se editan a
// mano. Todos comparten layout, tokens y el escapado de lo que escribe el usuario.
//
// Reglas del sistema v1 aplicadas al correo:
// - Dos colores de marca: Laguna (botón, enlaces) y Glaciar (un solo bloque destacado).
// - Hairlines en vez de sombras; radio 12 en cards, 8 en botones, 4 en chips.
// - Sentence case, nada bajo 12 px, sin eyebrows en mayúscula, sin "·" ni "—" como separador.
// - Cabinet Grotesk y Switzer no se pueden servir en correo (licencia Fontshare: sin
//   redistribuir), así que el correo usa la pila del sistema con el mismo peso y tracking.
import { writeFileSync } from "node:fs";

const C = {
  laguna: "#1d605b", glaciar: "#caefea", tinta: "#0f1716", grafito: "#495251",
  piedra: "#687170", lineaFuerte: "#cad1d0", linea: "#dfe4e4", niebla: "#f2f7f6", papel: "#ffffff",
  nocheTexto2: "#b4bdbc", nocheLinea: "#27302f",
};
const FONT = "'Switzer','Helvetica Neue',Helvetica,Arial,sans-serif";
const SITE = "https://www.electrificarte.com";
const DASHBOARD = "https://dashboard.electrificarte.com/admin/resenas";

/**
 * Expresión n8n que lee un campo del nodo `node` y lo ESCAPA para HTML. Todo lo que escribe
 * el usuario pasa por acá: sin esto, una reseña con `<a href=...>` o una imagen de rastreo
 * llega renderizada al correo de Francisco.
 */
const field = (node, path) => `$('${node}').item.json.${path}`;
const esc = (expr, fallback = "") =>
  `{{ String((${expr}) ?? '').trim().replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';')${fallback ? ` || '${fallback}'` : ""} }}`;
/** Solo dígitos: para armar wa.me/<número> y tel: sin romper el href. */
const digits = (expr) => `{{ String((${expr}) ?? '').replace(/[^0-9]/g, '') }}`;

// ─── Piezas ──────────────────────────────────────────────────────────────────
const title = (t) =>
  `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:28px;font-weight:700;line-height:1.1;letter-spacing:-0.02em;color:${C.tinta};">${t}</h1>`;
const p = (t, extra = "") =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.55;color:${C.grafito};${extra}">${t}</p>`;
const strong = (t) => `<strong style="font-weight:600;color:${C.tinta};">${t}</strong>`;
/** Filas etiqueta / valor separadas por hairlines (el `<dl class="specs">` del sitio). */
const specs = (rows, labelW = "34%") => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;border-top:1px solid ${C.linea};">
${rows.map(([label, value]) => `  <tr>
    <td style="padding:12px 16px 12px 0;border-bottom:1px solid ${C.linea};font-family:${FONT};font-size:13px;line-height:1.4;color:${C.grafito};vertical-align:top;width:${labelW};">${label}</td>
    <td style="padding:12px 0;border-bottom:1px solid ${C.linea};font-family:${FONT};font-size:15px;line-height:1.45;font-weight:600;color:${C.tinta};vertical-align:top;">${value}</td>
  </tr>`).join("\n")}
</table>`;

/** El bloque Glaciar: uno solo por correo, para lo principal. */
const highlight = (label, value) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background:${C.glaciar};border-radius:12px;">
  <tr><td style="padding:20px;">
    <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.4;color:${C.tinta};">${label}</p>
    <p style="margin:4px 0 0;font-family:${FONT};font-size:20px;line-height:1.25;font-weight:700;letter-spacing:-0.01em;color:${C.tinta};">${value}</p>
  </td></tr>
</table>`;

/** Cita de la reseña: bloque con hairline a la izquierda, sin comillas decorativas. */
const quote = (t) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr><td style="padding:4px 0 4px 16px;border-left:2px solid ${C.laguna};font-family:${FONT};font-size:16px;line-height:1.6;color:${C.tinta};white-space:pre-line;">${t}</td></tr>
</table>`;

const button = (href, label, kind = "primary") => {
  const primary = kind === "primary";
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0;"><tr>
  <td style="border-radius:8px;background:${primary ? C.laguna : C.papel};${primary ? "" : `border:1px solid ${C.lineaFuerte};`}">
    <a href="${href}" style="display:inline-block;padding:14px 24px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1.2;color:${primary ? C.papel : C.tinta};text-decoration:none;border-radius:8px;">${label}</a>
  </td>
</tr></table>`;
};


/** Subtítulo de bloque dentro de la card (18 px, como .t-h4). */
const h3 = (t) =>
  `<p style="margin:0 0 12px;font-family:${FONT};font-size:18px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;color:${C.tinta};">${t}</p>`;

const divider = () => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 28px;"><tr><td style="border-top:1px solid ${C.linea};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;

/** "Sigue explorando": filas enlazadas con hairline, título + bajada + flecha (como .type-links). */
const EXPLORE = [
  ["Autos 100% eléctricos", "Autonomía, batería y precio de cada modelo", "/electrico/ev"],
  ["Híbridos enchufables", "Andan en eléctrico en la ciudad y a bencina en ruta", "/electrico/phev"],
  ["SUV electrificados", "El segmento con más modelos en Chile", "/tipo/suv"],
  ["Compara modelos lado a lado", "Hasta 3 autos, spec por spec", "/comparador"],
  ["Calcula cuánto ahorras", "Tu gasto en bencina frente a un electrificado", "/calculadora"],
];
const explore = (title = "Sigue explorando", rows = EXPLORE) => `
${h3(title)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.linea};">
${rows.map(([t, d, href]) => `  <tr><td style="border-bottom:1px solid ${C.linea};">
    <a href="${SITE}${href}" style="display:block;padding:14px 0;text-decoration:none;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${FONT};">
          <span style="display:block;font-size:15px;font-weight:600;line-height:1.3;color:${C.tinta};">${t}</span>
          <span style="display:block;margin-top:2px;font-size:13px;line-height:1.4;color:${C.grafito};">${d}</span>
        </td>
        <td align="right" style="width:24px;font-family:${FONT};font-size:18px;color:${C.laguna};">&rarr;</td>
      </tr></table>
    </a>
  </td></tr>`).join("\n")}
</table>`;

/** Bloque de producto sobre Niebla (no Glaciar: el Glaciar del correo ya se usó arriba). */
const promo = ({ title, text, price, href, cta }) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;background:${C.niebla};border:1px solid ${C.linea};border-radius:12px;">
  <tr><td style="padding:24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:${FONT};font-size:18px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;color:${C.tinta};">${title}</td>
      ${price ? `<td align="right" style="font-family:${FONT};font-size:18px;font-weight:600;color:${C.tinta};white-space:nowrap;">${price}</td>` : ""}
    </tr></table>
    <p style="margin:8px 0 16px;font-family:${FONT};font-size:15px;line-height:1.55;color:${C.grafito};">${text}</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="border-radius:8px;background:${C.papel};border:1px solid ${C.lineaFuerte};">
        <a href="${href}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:14px;font-weight:600;line-height:1.2;color:${C.tinta};text-decoration:none;">${cta}</a>
      </td>
    </tr></table>
  </td></tr>
</table>`;

const ASESORIA_PROMO = promo({
  title: "¿No sabes cuál te conviene?",
  price: "$4.990",
  text: "Un asesor experto te acompaña por WhatsApp durante 10 días: entiende cómo usas el auto, te recomienda hasta 3 modelos del catálogo y te explica cómo cotizarlos con vendedores oficiales.",
  href: `${SITE}/asesoria`,
  cta: "Conocer la asesoría",
});

/** Mini footer: banda oscura (Tinta), como el footer del sitio. Es la última pieza del correo. */
const SITE_LINKS = [["Catálogo", `${SITE}/marcas`], ["Comparador", `${SITE}/comparador`], ["Calculadora", `${SITE}/calculadora`], ["Asesoría", `${SITE}/asesoria`], ["Blog", `${SITE}/blog`]];
const footerBand = (reason, links = SITE_LINKS, contacto = "contacto@electrificarte.com") => `
        <tr><td style="padding:16px 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.tinta};border-radius:12px;">
            <tr><td style="padding:28px 32px;">
              <img src="${SITE}/brand/email-wordmark-niebla.png" alt="Electrificarte" width="190" height="14" style="display:block;border:0;width:190px;height:14px;">
              <p style="margin:12px 0 20px;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.nocheTexto2};">El marketplace de autos electrificados de Chile. Conéctate a una nueva movilidad.</p>
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                ${links
                  .map(([t, h]) => `<td style="padding:0 16px 8px 0;"><a href="${h}" style="font-family:${FONT};font-size:13px;font-weight:600;color:${C.glaciar};text-decoration:none;">${t}</a></td>`).join("")}
              </tr></table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px solid ${C.nocheLinea};"><tr>
                <td style="padding-top:16px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.nocheTexto2};">
                  <a href="https://www.instagram.com/autos.electricos.con.francisco" style="color:${C.nocheTexto2};text-decoration:underline;">Instagram</a>&nbsp;&nbsp;&nbsp;
                  <a href="https://www.tiktok.com/@autos_electricos_con_fco" style="color:${C.nocheTexto2};text-decoration:underline;">TikTok</a>&nbsp;&nbsp;&nbsp;
                  <a href="mailto:${contacto}" style="color:${C.nocheTexto2};text-decoration:underline;">${contacto}</a><br>
                  ${reason}
                </td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>`;

const layout = ({ preheader, doc, internal = false, reason = "", footerLinks, body }) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Electrificarte</title>
</head>
<!--
${doc}

  GENERADO por scripts/gen-emails.mjs (sistema de diseño v1). No editar a mano: cambiá el
  generador y corré  node scripts/gen-emails.mjs && node scripts/gen-waitlist-reviews-workflows.mjs
  Todo dato que escribe el usuario va escapado para HTML.
-->
<body style="margin:0;padding:0;background:${C.niebla};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.niebla};">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">

        <tr><td style="padding:0 4px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td><picture><source srcset="${SITE}/brand/email-wordmark-niebla.png" media="(prefers-color-scheme: dark)"><img src="${SITE}/brand/email-wordmark-tinta.png" alt="Electrificarte" width="218" height="16" style="display:block;border:0;width:218px;height:16px;"></picture></td>
          </tr></table>
        </td></tr>

        <tr><td style="background:${C.papel};border:1px solid ${C.linea};border-radius:12px;padding:36px 32px 32px;">
${body}
        </td></tr>

${internal ? "" : footerLinks ? footerBand(reason, footerLinks, "vendedores@electrificarte.com") : footerBand(reason)}
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ─── WAITLIST ────────────────────────────────────────────────────────────────
const WL = (k) => field("Webhook waitlist", `body.${k}`);

const waitlistConfirmacion = layout({
  preheader: "Quedaste registrado en la waitlist de Electrificarte.",
  reason: "Recibes este correo porque te registraste en la waitlist de electrificarte.com.",
  doc: `  WAITLIST: confirmación a la persona que se registró. Va al nodo Resend de n8n.
  Lee del nodo "Webhook waitlist": body.firstName, body.model (opcional).
  ⚠️ La waitlist SOLO registra interesados: no prometer una oferta, no dar plazos y no decir
  que el servicio de negociación es o será gratis.`,
  body: [
    title("Ya estás en la lista"),
    p(`Hola ${strong(esc(WL("firstName")))}, registramos tus datos. Te contactaremos cuando abramos el acceso y tengamos novedades para ti.`),
    highlight("Auto que te interesa", esc(WL("model"), "Aún no lo definiste")),
    h3("Qué pasa ahora"),
    specs([
      ["1", "Quedas en la lista con el modelo que te interesa."],
      ["2", "Te escribimos cuando abramos el acceso o haya novedades para ese modelo."],
      ["3", `Sin compromiso: si quieres salir de la lista, escríbenos a <a href="mailto:contacto@electrificarte.com" style="color:${C.laguna};">contacto@electrificarte.com</a>.`],
    ], "8%"),
    divider(),
    explore(),
    ASESORIA_PROMO,
  ].join("\n"),
});

const waitlistFrancisco = layout({
  internal: true,
  preheader: "Se registró una persona nueva en la waitlist.",
  doc: `  WAITLIST: aviso interno a Francisco.
  Lee del nodo "Webhook waitlist": body.firstName, lastName, email, phone, model, source.`,
  body: [
    title("Se sumó una persona a la waitlist"),
    p("Entró un registro nuevo. Estos son sus datos."),
    specs([
      ["Nombre", `${esc(WL("firstName"))} ${esc(WL("lastName"))}`],
      ["Auto de interés", esc(WL("model"), "No indicó")],
      ["Teléfono", esc(WL("phone"))],
      ["Email", esc(WL("email"))],
      ["Vino desde", esc(WL("source"), "web")],
    ]),
    button(`https://wa.me/${digits(WL("phone"))}`, "Escribir por WhatsApp"),
  ].join("\n"),
});

// ─── RESEÑAS ─────────────────────────────────────────────────────────────────
// Regla (sep-2026, Vicente + Matías): solo se moderan las reseñas CON fotos. Las que vienen
// solo con texto se publican solas. n8n enruta con el IF "¿Trae fotos?" a uno de dos pares
// de correos: "en revisión" (con fotos) o "publicada" (sin fotos).
const RV = (k) => field("Webhook reseñas", `body.${k}`);
const carName = `[${RV("carBrand")}, ${RV("carModel")}].filter(Boolean).join(' ')`;
const carFull = `[${RV("carBrand")}, ${RV("carModel")}, ${RV("carYear")}].filter(Boolean).join(' ')`;
const ratingN = `Math.max(0, Math.min(5, Number(${RV("rating")}) || 0))`;
const stars = `{{ '★'.repeat(${ratingN}) + '☆'.repeat(5 - ${ratingN}) }}`;
const pdpUrl = `{{ ${RV("carSlug")} ? '${SITE}/auto/' + String(${RV("carSlug")}).replace(/[^a-z0-9-]/gi, '') : '${SITE}/marcas' }}`;

const SHARE = promo({
  title: "¿Alguien cerca está pensando en cambiarse?",
  text: "Tu experiencia vale mucho para quien está decidiendo. Compártele electrificarte.com: puede comparar modelos, calcular su ahorro y leer reseñas de dueños como tú.",
  href: SITE,
  cta: "Ir a electrificarte.com",
});

/** Lo que escribió la persona, citado: su calificación y su texto. */
const suResena = () => [
  highlight(`Tu reseña del ${esc(carName, "auto")}`, `${stars} <span style="font-size:15px;font-weight:600;">${esc(RV("rating"))}/5</span>`),
  quote(esc(RV("body"))),
].join("\n");

const resenaEnRevision = layout({
  preheader: "Recibimos tu reseña y sus fotos. La revisamos antes de publicarla.",
  reason: "Recibes este correo porque dejaste una reseña en electrificarte.com.",
  doc: `  RESEÑAS (con fotos): agradecimiento a quien la dejó. Queda en revisión hasta que Francisco
  la apruebe en el dashboard. Lee del nodo "Webhook reseñas": firstName, carBrand, carModel,
  rating, body.`,
  body: [
    title("Gracias por compartir tu experiencia"),
    p(`Hola ${strong(esc(RV("firstName")))}, recibimos tu reseña y tus fotos. Como trae imágenes, la revisamos antes de publicarla: te avisaremos si hay algo que ajustar.`),
    suResena(),
    divider(),
    explore("Mientras tanto"),
    SHARE,
  ].join("\n"),
});

const resenaPublicada = layout({
  preheader: "Tu reseña ya está publicada.",
  reason: "Recibes este correo porque dejaste una reseña en electrificarte.com.",
  doc: `  RESEÑAS (sin fotos): se publican solas. Agradecimiento con el link a la ficha del auto.
  Lee del nodo "Webhook reseñas": firstName, carBrand, carModel, carSlug, rating, body.`,
  body: [
    title("Tu reseña ya está publicada"),
    p(`Hola ${strong(esc(RV("firstName")))}, gracias por tomarte el tiempo. Tu opinión ya aparece en la ficha del auto y va a ayudar a la próxima persona a elegir bien.`),
    suResena(),
    button(pdpUrl, "Ver mi reseña"),
    divider(),
    explore(),
    SHARE,
  ].join("\n"),
});

const francisco = ({ titulo, intro, cta, fotos = true }) => [
  title(titulo),
  p(intro),
  highlight(esc(carFull, "Auto sin indicar"), `${stars} <span style="font-size:15px;font-weight:600;">${esc(RV("rating"))}/5</span>`),
  quote(esc(RV("body"))),
  specs([
    ["Quién la dejó", `${esc(RV("firstName"))} ${esc(RV("lastName"))}`],
    ["Email", esc(RV("email"))],
    ["Teléfono", esc(RV("phone"), "No indicó")],
    ...(fotos ? [["Fotos", `{{ Math.floor(((${RV("photos")}) || []).length / 2) }}`]] : []),
  ]),
  button(DASHBOARD, cta),
].join("\n");

const nuevaResenaFrancisco = layout({
  internal: true,
  preheader: "Hay una reseña con fotos esperando tu revisión.",
  doc: `  RESEÑAS (con fotos): aviso interno a Francisco para moderar.
  Lee del nodo "Webhook reseñas": rating, body, carBrand, carModel, carYear, firstName,
  lastName, email, phone, photos.`,
  body: francisco({
    titulo: "Nueva reseña con fotos por revisar",
    intro: `Llegó una reseña con fotos. ${strong("No está publicada")}: aparece en el sitio solo cuando la apruebes en el dashboard. Revisa que las fotos sean del auto y que sean apropiadas.`,
    cta: "Moderar en el dashboard",
  }),
});

const resenaPublicadaFrancisco = layout({
  internal: true,
  preheader: "Se publicó una reseña nueva (sin fotos).",
  doc: `  RESEÑAS (sin fotos): aviso interno a Francisco. Ya está publicada; no requiere acción.`,
  body: francisco({
    titulo: "Se publicó una reseña nueva",
    intro: "Llegó una reseña sin fotos, así que se publicó sola. No tienes que hacer nada; queda en el dashboard junto a las demás.",
    cta: "Ver en el dashboard",
    fotos: false,
  }),
});

// ─── ASESORÍA ────────────────────────────────────────────────────────────────
// El correo de asesoría sale DESPUÉS de que Reveniu confirma el pago, y los datos vienen de
// nodos del workflow de pagos (cuyo nombre depende de cómo esté armado). Para no acoplar la
// plantilla a esos nombres, el workflow agrega un nodo Set "Datos correo asesoría" justo
// antes de los correos, que normaliza: nombre, email, telefono, orderId. Ver n8n/asesoria-correos.json.
const AS = (k) => field("Datos correo asesoría", k);

const asesoriaConfirmada = layout({
  preheader: "Tu asesoría está confirmada. Te escribimos por WhatsApp.",
  reason: "Recibes este correo porque contrataste la asesoría de electrificarte.com.",
  doc: `  ASESORÍA: confirmación de pago a la persona.
  Lee del nodo Set "Datos correo asesoría": nombre, telefono.
  ⚠️ Copy del giro: la asesoría NO negocia ni consigue ofertas. No mencionar $19.990.`,
  body: [
    title("Tu asesoría está confirmada"),
    p(`Hola ${strong(esc(AS("nombre")))}, recibimos tu pago. Durante los próximos 10 días tienes un asesor experto por WhatsApp para ayudarte a elegir tu auto electrificado según tu uso, tu presupuesto y dónde vas a cargar.`),
    highlight("Te escribimos a este WhatsApp", esc(AS("telefono"))),
    h3("Cómo va a ser"),
    specs([
      ["1. Diagnóstico", "Cómo usas el auto, cuántos km haces y con qué presupuesto."],
      ["2. Recomendación", "Hasta 3 modelos del catálogo, con datos reales de cada ficha."],
      ["3. Compra", "Cómo cotizar con vendedores oficiales y qué revisar antes de firmar."],
    ]),
    h3("Para aprovecharla al máximo"),
    p("Ten a mano tu presupuesto aproximado, cuántos kilómetros haces al día y si tienes dónde cargar (casa, trabajo o solo carga pública). Con eso la primera respuesta ya es útil."),
    p(`Si el número no es el correcto, escríbenos a <a href="mailto:contacto@electrificarte.com" style="color:${C.laguna};">contacto@electrificarte.com</a> y lo corregimos.`, "font-size:14px;"),
    divider(),
    explore("Mientras tanto, mira el catálogo"),
  ].join("\n"),
});

const asesoriaFrancisco = layout({
  internal: true,
  preheader: "Se pagó una asesoría nueva.",
  doc: `  ASESORÍA: aviso interno a Francisco de un pago confirmado.
  Lee del nodo Set "Datos correo asesoría": nombre, email, telefono, orderId.`,
  body: [
    title("Se pagó una asesoría"),
    p("Reveniu confirmó el pago. El asesor de WhatsApp ya la atiende por 10 días."),
    specs([
      ["Nombre", esc(AS("nombre"))],
      ["Teléfono", esc(AS("telefono"))],
      ["Email", esc(AS("email"))],
      ["Orden", esc(AS("orderId"))],
    ]),
    button(`https://wa.me/${digits(AS("telefono"))}`, "Escribir por WhatsApp"),
  ].join("\n"),
});


// ─── VENDEDORES (suscripción $12.990/mes) ─────────────────────────────────────
// Salen tras el pago de Reveniu (rama VENDORS del Switch). Igual que asesoría, leen de un Set
// "Datos correo vendedor" que se arma justo antes con la fila de leads_vendors: nombre,
// apellido, email, telefono, concesionario, marcas. (Hoy los nodos vivos leen de "Create a
// row1", que es de OTRA ejecución: el formulario de registro. Se corrige en la verificación
// del flujo de ventas.)
const VD = (k) => field("Datos correo vendedor", k);
const VENDOR_LINKS = [["Página de vendedores", "https://vendedores.electrificarte.com"], ["Catálogo", `${SITE}/marcas`], ["Blog", `${SITE}/blog`]];

const registroVendedor = layout({
  preheader: "Recibimos tu registro y tu pago. Bienvenido a la red de vendedores oficiales.",
  reason: "Recibes este correo porque te suscribiste a la red de vendedores de electrificarte.com.",
  footerLinks: VENDOR_LINKS,
  doc: `  VENDEDORES: bienvenida al vendedor tras pagar la suscripción.
  Lee del nodo Set "Datos correo vendedor": nombre, concesionario, marcas.
  Terminología: "punto de venta" / "vendedores oficiales", nunca "concesionario" en el copy.`,
  body: [
    title("Bienvenido a la red de vendedores"),
    p(`Hola ${strong(esc(VD("nombre")))}, recibimos tu registro y tu pago. Tu cuenta está en revisión: en breve te contactamos para activarla y que empieces a recibir clientes interesados en los modelos que vendes.`),
    highlight("Tu suscripción", "Vendedor oficial, $12.990 al mes"),
    specs([
      ["Nombre", esc(VD("nombre"))],
      ["Punto de venta", esc(VD("concesionario"), "Sin indicar")],
      ["Marcas", esc(VD("marcas"), "Sin indicar")],
    ]),
    h3("Qué sigue"),
    specs([
      ["1", "Revisamos tu información y tus marcas."],
      ["2", "Te contactamos para activar tu acceso al panel."],
      ["3", "Empiezas a recibir personas interesadas en tus modelos."],
    ], "8%"),
    p(`¿Algún dato está mal? Escríbenos a <a href="mailto:vendedores@electrificarte.com" style="color:${C.laguna};">vendedores@electrificarte.com</a>.`, "font-size:14px;"),
    button("https://vendedores.electrificarte.com", "Ir a la página de vendedores"),
  ].join("\n"),
});

const nuevoVendedorFrancisco = layout({
  internal: true,
  preheader: "Un vendedor pagó su suscripción. Hay que contactarlo para activarlo.",
  doc: `  VENDEDORES: aviso a Francisco de una suscripción pagada.
  Lee del nodo Set "Datos correo vendedor": nombre, apellido, email, telefono, concesionario, marcas.`,
  body: [
    title("Un vendedor pagó su suscripción"),
    p("Completó el registro y el pago. Contáctalo para verificar sus datos y activar su cuenta."),
    specs([
      ["Vendedor", `${esc(VD("nombre"))} ${esc(VD("apellido"))}`],
      ["Punto de venta", esc(VD("concesionario"), "Sin indicar")],
      ["Marcas", esc(VD("marcas"), "Sin indicar")],
      ["Teléfono", esc(VD("telefono"))],
      ["Email", esc(VD("email"))],
    ]),
    h3("Próximos pasos"),
    specs([
      ["1", "Contactarlo por WhatsApp o teléfono."],
      ["2", "Verificar sus datos y sus marcas."],
      ["3", "Activar su cuenta en el panel."],
    ], "8%"),
    button(`https://wa.me/${digits(VD("telefono"))}`, "Escribir por WhatsApp"),
  ].join("\n"),
});

// ─── OFERTA EXCLUSIVA $19.990 (🟡 STANDBY) ────────────────────────────────────
// No se envían hoy (nodos desactivados). Quedan listas para cuando se reactive la Oferta.
// Leen de un Set "Datos correo oferta": nombre, email, telefono, auto, comuna, region. (Los
// nodos viejos apuntaban a "HTTP Request2", que ya no existe en el workflow.)
const OF = (k) => field("Datos correo oferta", k);

const pagoConfirmadoCliente = layout({
  preheader: "Tu pago fue confirmado y tu solicitud ya está en proceso.",
  reason: "Recibes este correo porque pagaste la Oferta Exclusiva en electrificarte.com.",
  doc: `  OFERTA EXCLUSIVA (🟡 STANDBY): confirmación de pago al cliente.
  Lee del nodo Set "Datos correo oferta": nombre, auto.`,
  body: [
    title("Tu solicitud está en proceso"),
    p(`Hola ${strong(esc(OF("nombre")))}, tu pago se procesó con éxito. Estamos buscando la mejor oferta para tu auto en la red de vendedores oficiales y te contactaremos a la brevedad.`),
    highlight("Auto que buscas", esc(OF("auto"), "Sin indicar")),
    h3("Qué pasa ahora"),
    specs([
      ["1", "Llevamos tu solicitud a la red de vendedores oficiales."],
      ["2", "Comparamos las ofertas que lleguen para tu modelo."],
      ["3", "En un plazo máximo de 72 horas hábiles te escribimos con los próximos pasos."],
    ], "8%"),
    divider(),
    explore("Mientras tanto"),
  ].join("\n"),
});

const nuevoLeadFrancisco = layout({
  internal: true,
  preheader: "Un cliente pagó la Oferta Exclusiva.",
  doc: `  OFERTA EXCLUSIVA (🟡 STANDBY): aviso a Francisco de un lead pagado.
  Lee del nodo Set "Datos correo oferta": nombre, auto, telefono, email, comuna, region.`,
  body: [
    title("Un cliente pagó la Oferta Exclusiva"),
    p("Ya decidió su auto y busca el mejor precio en la red. Hay que conseguirle una oferta dentro de las próximas 72 horas."),
    highlight("Auto que busca", esc(OF("auto"), "Sin indicar")),
    specs([
      ["Cliente", esc(OF("nombre"))],
      ["Teléfono", esc(OF("telefono"))],
      ["Email", esc(OF("email"))],
      ["Ubicación", `{{ [${OF("comuna")}, ${OF("region")}].filter(Boolean).join(', ').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';') || 'Sin indicar' }}`],
    ]),
    button(`https://wa.me/${digits(OF("telefono"))}`, "Escribir por WhatsApp"),
  ].join("\n"),
});

const out = {
  "waitlist-confirmacion.html": waitlistConfirmacion,
  "waitlist-francisco.html": waitlistFrancisco,
  "resena-en-revision.html": resenaEnRevision,
  "resena-publicada.html": resenaPublicada,
  "nueva-resena-francisco.html": nuevaResenaFrancisco,
  "resena-publicada-francisco.html": resenaPublicadaFrancisco,
  "asesoria-confirmada.html": asesoriaConfirmada,
  "asesoria-francisco.html": asesoriaFrancisco,
  "registro-vendedor.html": registroVendedor,
  "nuevo-vendedor-francisco.html": nuevoVendedorFrancisco,
  "pago-confirmado-cliente.html": pagoConfirmadoCliente,
  "nuevo-lead-francisco.html": nuevoLeadFrancisco,
};
for (const [f, html] of Object.entries(out)) {
  writeFileSync(`emails/ventas/${f}`, html);
  console.log(`✓ emails/ventas/${f}`);
}
