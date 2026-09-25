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
const chip = (t) =>
  `<span style="display:inline-block;padding:4px 8px;border-radius:4px;background:${C.tinta};color:${C.papel};font-family:${FONT};font-size:12px;font-weight:600;line-height:1.2;">${t}</span>`;

/** Filas etiqueta / valor separadas por hairlines (el `<dl class="specs">` del sitio). */
const specs = (rows) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;border-top:1px solid ${C.linea};">
${rows.map(([label, value]) => `  <tr>
    <td style="padding:12px 16px 12px 0;border-bottom:1px solid ${C.linea};font-family:${FONT};font-size:13px;line-height:1.4;color:${C.grafito};vertical-align:top;width:34%;">${label}</td>
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
    <a href="${href}" style="display:inline-block;padding:14px 24px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1.2;color:${primary ? C.papel : C.tinta};text-decoration:none;border-radius:8px;">${label} &rarr;</a>
  </td>
</tr></table>`;
};

const layout = ({ preheader, doc, internal = false, body }) => `<!DOCTYPE html>
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
            ${internal ? `<td align="right">${chip("Uso interno")}</td>` : ""}
          </tr></table>
        </td></tr>

        <tr><td style="background:${C.papel};border:1px solid ${C.linea};border-radius:12px;padding:36px 32px 32px;">
${body}
        </td></tr>

        <tr><td style="padding:24px 4px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.piedra};">
          ${internal
            ? "Aviso interno generado automáticamente por n8n."
            : `Electrificarte, marketplace de autos electrificados en Chile.<br>
          <a href="${SITE}" style="color:${C.laguna};text-decoration:underline;">electrificarte.com</a> y <a href="mailto:contacto@electrificarte.com" style="color:${C.laguna};text-decoration:underline;">contacto@electrificarte.com</a>`}
        </td></tr>

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
  doc: `  WAITLIST: confirmación a la persona que se registró. Va al nodo Resend de n8n.
  Lee del nodo "Webhook waitlist": body.firstName, body.model (opcional).
  ⚠️ La waitlist SOLO registra interesados: no prometer una oferta, no dar plazos y no decir
  que el servicio de negociación es o será gratis.`,
  body: [
    title("Ya estás en la lista"),
    p(`Hola ${strong(esc(WL("firstName")))}, registramos tus datos. Te contactaremos cuando abramos el acceso y tengamos novedades para ti.`),
    highlight("Auto que te interesa", esc(WL("model"), "Aún no lo definiste")),
    p(`Mientras tanto puedes seguir explorando el catálogo. Si todavía no tienes claro qué auto te conviene, la ${strong("Asesoría")} te ayuda a decidir según tu uso, tu presupuesto y dónde vas a cargar.`),
    button(`${SITE}/marcas`, "Ver el catálogo"),
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
const RV = (k) => field("Webhook reseñas", `body.${k}`);
const carName = `[${RV("carBrand")}, ${RV("carModel")}].filter(Boolean).join(' ')`;
const carFull = `[${RV("carBrand")}, ${RV("carModel")}, ${RV("carYear")}].filter(Boolean).join(' ')`;
const stars = `{{ '★'.repeat(Math.max(0, Math.min(5, Number(${RV("rating")}) || 0))) + '☆'.repeat(5 - Math.max(0, Math.min(5, Number(${RV("rating")}) || 0))) }}`;

const resenaRecibida = layout({
  preheader: "Recibimos tu reseña y la estamos revisando.",
  doc: `  RESEÑAS: agradecimiento a quien dejó la reseña.
  Lee del nodo "Webhook reseñas": body.firstName, carBrand, carModel (opcionales).`,
  body: [
    title("Gracias por compartir tu experiencia"),
    p(`Hola ${strong(esc(RV("firstName")))}, recibimos tu reseña del ${strong(esc(carName, "auto"))}. La revisamos antes de publicarla, para asegurarnos de que todo esté en orden.`),
    p("Opiniones como la tuya ayudan a que la próxima persona elija bien su auto electrificado. Gracias por tomarte el tiempo."),
    button(`${SITE}/marcas`, "Ver el catálogo"),
  ].join("\n"),
});

const nuevaResenaFrancisco = layout({
  internal: true,
  preheader: "Hay una reseña esperando tu revisión.",
  doc: `  RESEÑAS: aviso interno a Francisco para moderar.
  Lee del nodo "Webhook reseñas": body.rating, body, carBrand, carModel, carYear, firstName,
  lastName, email, phone, photos.`,
  body: [
    title("Nueva reseña por revisar"),
    p(`Llegó una reseña nueva. ${strong("No está publicada")}: aparece en el sitio solo cuando la apruebes en el dashboard.`),
    highlight(esc(carFull, "Auto sin indicar"), `${stars} <span style="font-size:15px;font-weight:600;">${esc(RV("rating"))}/5</span>`),
    quote(esc(RV("body"))),
    specs([
      ["Quién la dejó", `${esc(RV("firstName"))} ${esc(RV("lastName"))}`],
      ["Email", esc(RV("email"))],
      ["Teléfono", esc(RV("phone"), "No indicó")],
      ["Fotos", `{{ Math.floor(((${RV("photos")}) || []).length / 2) }}`],
    ]),
    p("Revisa que el contenido sea sobre el auto y que sea apropiado antes de publicarla.", "font-size:14px;"),
    button(DASHBOARD, "Moderar en el dashboard"),
  ].join("\n"),
});

// ─── ASESORÍA ────────────────────────────────────────────────────────────────
// El correo de asesoría sale DESPUÉS de que Reveniu confirma el pago, y los datos vienen de
// nodos del workflow de pagos (cuyo nombre depende de cómo esté armado). Para no acoplar la
// plantilla a esos nombres, el workflow agrega un nodo Set "Datos correo asesoría" justo
// antes de los correos, que normaliza: nombre, email, telefono, orderId. Ver n8n/asesoria-correos.json.
const AS = (k) => field("Datos correo asesoría", k);

const asesoriaConfirmada = layout({
  preheader: "Tu asesoría está confirmada. Te escribimos por WhatsApp.",
  doc: `  ASESORÍA: confirmación de pago a la persona.
  Lee del nodo Set "Datos correo asesoría": nombre, telefono.
  ⚠️ Copy del giro: la asesoría NO negocia ni consigue ofertas. No mencionar $19.990.`,
  body: [
    title("Tu asesoría está confirmada"),
    p(`Hola ${strong(esc(AS("nombre")))}, recibimos tu pago. Durante los próximos 10 días tienes un asesor experto por WhatsApp para ayudarte a elegir tu auto electrificado según tu uso, tu presupuesto y dónde vas a cargar.`),
    highlight("Te escribimos a este WhatsApp", esc(AS("telefono"))),
    specs([
      ["1. Diagnóstico", "Cómo usas el auto, cuántos km haces y con qué presupuesto."],
      ["2. Recomendación", "Hasta 3 modelos del catálogo, con datos reales de cada ficha."],
      ["3. Compra", "Cómo cotizar con vendedores oficiales y qué revisar antes de firmar."],
    ]),
    p(`Si el número no es el correcto, escríbenos a <a href="mailto:contacto@electrificarte.com" style="color:${C.laguna};">contacto@electrificarte.com</a> y lo corregimos.`, "font-size:14px;"),
    button(`${SITE}/marcas`, "Explorar el catálogo", "secondary"),
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

const out = {
  "waitlist-confirmacion.html": waitlistConfirmacion,
  "waitlist-francisco.html": waitlistFrancisco,
  "resena-recibida.html": resenaRecibida,
  "nueva-resena-francisco.html": nuevaResenaFrancisco,
  "asesoria-confirmada.html": asesoriaConfirmada,
  "asesoria-francisco.html": asesoriaFrancisco,
};
for (const [f, html] of Object.entries(out)) {
  writeFileSync(`emails/ventas/${f}`, html);
  console.log(`✓ emails/ventas/${f}`);
}
