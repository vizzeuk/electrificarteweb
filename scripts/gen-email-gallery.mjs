// Genera emails/galeria.html: los correos de n8n renderizados con datos de ejemplo, en un solo
// archivo autocontenido (logos incrustados) para revisarlos o mandárselos a alguien.
//   node scripts/gen-emails.mjs && node scripts/gen-email-gallery.mjs
// Las expresiones {{ }} se evalúan como lo hace n8n, con un $('Nodo') falso que devuelve los
// datos de ejemplo de abajo. Si una plantilla referencia un nodo que no está acá, falla.
import { readFileSync, writeFileSync } from "node:fs";

const SAMPLE = {
  "Webhook waitlist": { body: { firstName: "Camila", lastName: "Rojas", email: "camila@ejemplo.cl", phone: "+56 9 1234 5678", model: "BYD Dolphin Mini", source: "pdp" } },
  "Webhook reseñas": { body: { firstName: "Andrés", lastName: "Vidal", email: "andres@ejemplo.cl", phone: "+56 9 8765 4321", rating: 4, carSlug: "hyundai-ioniq-5", carBrand: "Hyundai", carModel: "IONIQ 5", carYear: 2024, photos: ["a-card.jpg", "a-full.jpg", "b-card.jpg", "b-full.jpg"],
    body: "Llevo 8 meses y sigue sorprendiéndome. La carga en casa cambia todo: enchufo en la noche y parto al 100%. Lo único a considerar es que en ruta larga conviene planificar las paradas." } },
  "Datos correo asesoría": { nombre: "Francisca Soto", email: "fran@ejemplo.cl", telefono: "+56 9 5555 1234", orderId: "7c1e9a52-3b1f-4d0e-9f7a-2e1b8c0d4a11" },
  "Datos correo vendedor": { nombre: "Rodrigo", apellido: "Martínez", email: "rodrigo@ejemplo.cl", telefono: "+56 9 4444 3333", concesionario: "Automotora Los Andes", marcas: "BYD, MG, Chery" },
  "Datos correo oferta": { nombre: "Matías Fuentes", email: "matias@ejemplo.cl", telefono: "+56 9 2222 1111", auto: "Hyundai IONIQ 5 Limited", comuna: "Providencia", region: "Región Metropolitana" },
};

const GROUPS = [
  ["Waitlist", [
    ["waitlist-confirmacion", "A la persona", "Ya estás en la waitlist de Electrificarte"],
    ["waitlist-francisco", "A Francisco", "Nueva persona en la waitlist"],
  ]],
  ["Reseñas", [
    ["resena-publicada", "Sin fotos → a quien la dejó (se publica sola)", "Tu reseña ya está publicada"],
    ["resena-publicada-francisco", "Sin fotos → a Francisco (aviso)", "Se publicó una reseña nueva"],
    ["resena-en-revision", "Con fotos → a quien la dejó (queda en revisión)", "Recibimos tu reseña"],
    ["nueva-resena-francisco", "Con fotos → a Francisco (moderar)", "Nueva reseña con fotos por revisar"],
  ]],
  ["Asesoría $4.990", [
    ["asesoria-confirmada", "Pago confirmado → a la persona", "Tu asesoría está confirmada"],
    ["asesoria-francisco", "Pago confirmado → a Francisco", "Se pagó una asesoría"],
  ]],
  ["Vendedores $12.990/mes", [
    ["registro-vendedor", "Suscripción pagada → al vendedor", "Bienvenido a la red de vendedores oficiales"],
    ["nuevo-vendedor-francisco", "Suscripción pagada → a Francisco", "Un vendedor pagó su suscripción"],
  ]],
  ["Oferta Exclusiva $19.990 (en standby, no se envían hoy)", [
    ["pago-confirmado-cliente", "Pago confirmado → al cliente", "Tu solicitud está en proceso"],
    ["nuevo-lead-francisco", "Pago confirmado → a Francisco", "Un cliente pagó la Oferta Exclusiva"],
  ]],
];

const $ = (n) => { if (!SAMPLE[n]) throw new Error(`Referenced node doesn't exist: ${n}`); return { item: { json: SAMPLE[n] } }; };
const dataUri = (f) => `data:image/png;base64,${readFileSync(`public/brand/${f}`).toString("base64")}`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

let errors = 0;
const sections = GROUPS.map(([group, items]) => `<h2>${group}</h2><div class="grid">${items.map(([f, who, subject]) => {
  const html = readFileSync(`emails/ventas/${f}.html`, "utf8")
    .replace(/<!--[\s\S]*?-->/, "")
    .replace(/\{\{([\s\S]+?)\}\}/g, (_, expr) => { try { return String(new Function("$", `return (${expr});`)($)); } catch (e) { errors++; return `[[ERROR ${e.message}]]`; } })
    .replaceAll("https://www.electrificarte.com/brand/email-wordmark-tinta.png", dataUri("email-wordmark-tinta.png"))
    .replaceAll("https://www.electrificarte.com/brand/email-wordmark-niebla.png", dataUri("email-wordmark-niebla.png"));
  return `<section><p class="who">${who}</p><p class="subj">Asunto: <b>${esc(subject)}</b></p><iframe srcdoc="${esc(html)}" onload="this.style.height=this.contentDocument.body.scrollHeight+'px'"></iframe><p class="file">emails/ventas/${f}.html</p></section>`;
}).join("")}</div>`).join("");

writeFileSync("emails/galeria.html", `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Correos de Electrificarte (sistema de diseño v1)</title>
<style>
body{margin:0;padding:40px 32px 80px;background:#f2f7f6;color:#0f1716;font:15px/1.5 -apple-system,"Helvetica Neue",Helvetica,Arial,sans-serif}
header{max-width:1400px;margin:0 auto 8px} h1{margin:0;font-size:32px;letter-spacing:-.02em} header p{margin:8px 0 0;color:#495251;max-width:760px}
h2{max-width:1400px;margin:48px auto 16px;font-size:22px;letter-spacing:-.01em;padding-top:24px;border-top:1px solid #dfe4e4}
.grid{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(620px,1fr));gap:24px}
section{background:#fff;border:1px solid #dfe4e4;border-radius:12px;padding:16px}
.who{margin:0;font-weight:700}.subj{margin:2px 0 12px;color:#495251;font-size:13px}.file{margin:8px 0 0;color:#687170;font-size:12px}
iframe{width:100%;height:900px;border:1px solid #dfe4e4;border-radius:8px;background:#f2f7f6}
</style>
<header><h1>Correos de Electrificarte</h1>
<p>Correos automáticos que envía n8n, con el sistema de diseño v1 y datos de ejemplo. Generado el ${new Date().toISOString().slice(0, 10)} desde el repo (scripts/gen-email-gallery.mjs).</p></header>
${sections}
</html>
`);
console.log(`✓ emails/galeria.html — ${GROUPS.flatMap(([, i]) => i).length} correos${errors ? ` · ✗ ${errors} expresiones con error` : " · todas las expresiones OK"}`);
if (errors) process.exit(1);
