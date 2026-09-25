// Genera docs/design/guia-diseno.html: la guía visual del revamp de diseño (web principal, web de
// vendedores, panel y correos) en láminas horizontales, como el PDF de páginas de Matías.
// Un solo archivo autocontenido (imágenes incrustadas) para mandarlo o exportarlo a PDF
// (Imprimir → Guardar como PDF: cada lámina sale en su propia página).
//
//   node scripts/gen-guia-diseno.mjs
//
// Las capturas salen de docs/design/guia/{secciones,capturas,correos}/. Se regeneran con los
// scripts de .qa-shots (secciones-guia.mjs, capturas-guia.mjs, correos-guia.mjs); las del panel
// van con los datos personales reemplazados por datos de ejemplo.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const G = "docs/design/guia";
const img = (path) => `data:image/jpeg;base64,${readFileSync(path).toString("base64")}`;
const png = (path) => `data:image/png;base64,${readFileSync(path).toString("base64")}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const LOGO = png("public/brand/email-wordmark-tinta.png");
const LOGO_NIEBLA = png("public/brand/email-wordmark-niebla.png");

const slides = [];
const toc = [];
const chapter = (id, n, title, lead, bullets = []) => {
  toc.push({ id, n, title });
  slides.push(`<section class="slide slide--chapter" id="${id}"><div class="chapter">
    <p class="chapter__n">${n}</p><h2>${esc(title)}</h2><p class="lead">${esc(lead)}</p>
    ${bullets.length ? `<ul class="points">${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
  </div></section>`);
};
const shot = (label, src, { note = "", fit = "contain" } = {}) =>
  slides.push(`<section class="slide"><header class="slide__head"><span>${esc(label)}</span>${note ? `<span class="note">${esc(note)}</span>` : ""}</header>
    <div class="slide__body"><img class="fit-${fit}" src="${src}" alt="${esc(label)}" loading="lazy"></div></section>`);
const pair = (label, items, note = "") =>
  slides.push(`<section class="slide"><header class="slide__head"><span>${esc(label)}</span>${note ? `<span class="note">${esc(note)}</span>` : ""}</header>
    <div class="slide__body slide__body--row">${items.map(([cap, src]) => `<figure><img src="${src}" alt="${esc(cap)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`).join("")}</div></section>`);

// ─── Portada ─────────────────────────────────────────────────────────────────
slides.push(`<section class="slide slide--cover"><div class="cover">
  <img class="cover__logo" src="${LOGO_NIEBLA}" alt="Electrificarte">
  <h1>Revamp de diseño</h1>
  <p class="lead">Web principal, web de vendedores, panel y correos con un mismo sistema de diseño. Septiembre 2026.</p>
  <div class="cover__sites">
    <div><strong>Web principal</strong><span>electrificarte.com</span></div>
    <div><strong>Web de vendedores</strong><span>vendedores.electrificarte.com</span></div>
    <div><strong>Panel</strong><span>dashboard.electrificarte.com</span></div>
  </div></div></section>`);

// ─── Índice (se completa al final) ───────────────────────────────────────────
const tocIndex = slides.length; slides.push("");

// ─── 1. Sistema de diseño ────────────────────────────────────────────────────
chapter("sistema", "01", "Sistema de diseño", "Una sola identidad para los tres sitios: dos colores de marca sobre neutros fríos, líneas finas en vez de sombras y títulos que abren cada sección.", [
  "<strong>Laguna</strong> para actuar (botones, enlaces) y <strong>Glaciar</strong> para destacar, un bloque por pantalla",
  "<strong>Cabinet Grotesk</strong> en títulos y <strong>Switzer</strong> en el resto",
  "Superficies sólidas, sin brillos ni degradados, esquinas de 4, 8 y 12 px",
  "Textos en minúscula inicial y cifras siempre reales",
]);
const COLORS = [["Laguna", "#1d605b", "Acción: botones, enlaces, foco", "#fff"], ["Glaciar", "#caefea", "Destacado, un bloque por pantalla", "#0f1716"], ["Tinta", "#0f1716", "Texto principal, bandas oscuras", "#fff"], ["Grafito", "#495251", "Texto secundario", "#fff"], ["Piedra", "#687170", "Texto terciario", "#fff"], ["Línea", "#dfe4e4", "Líneas finas y separadores", "#0f1716"], ["Niebla", "#f2f7f6", "Fondo alterno", "#0f1716"], ["Papel", "#ffffff", "Fondo base", "#0f1716"]];
slides.push(`<section class="slide"><header class="slide__head"><span>Sistema de diseño / Paleta</span></header><div class="slide__body slide__body--pad">
  <div class="swatches">${COLORS.map(([n, hex, use, fg]) => `<div class="sw"><div class="sw__chip" style="background:${hex};color:${fg}">${hex}</div><strong>${n}</strong><span>${use}</span></div>`).join("")}</div>
</div></section>`);
for (const [f, label] of [["kit-principios", "Principios"], ["kit-color", "Color"], ["kit-tipografia", "Tipografía"], ["kit-componentes", "Componentes"], ["kit-voz", "Voz y copy"]])
  if (existsSync(`${G}/capturas/${f}.jpg`)) shot(`Sistema de diseño / ${label}`, img(`${G}/capturas/${f}.jpg`), { note: "Guía de marca" });

// ─── 2 y 3. Sitios públicos, lámina por sección ──────────────────────────────
const manifest = JSON.parse(readFileSync(`${G}/secciones/manifest.json`, "utf8"));
const bySite = (site) => manifest.filter((m) => m.site === site);
const sectionSlides = (site, siteName) => {
  const pages = [...new Set(bySite(site).map((m) => m.page))];
  for (const page of pages) {
    const items = bySite(site).filter((m) => m.page === page);
    items.forEach((m, i) => shot(`${siteName} / ${page}`, img(`${G}/secciones/${m.file}`), { note: `${i + 1} de ${items.length}` }));
  }
};
chapter("web", "02", "Web principal", "El sitio dejó de vender la Oferta de $19.990: capta interesados gratis con la waitlist y lleva a la Asesoría de $4.990. Todas las pantallas públicas se rediseñaron.", [
  "Hero con la asesoría como acción principal y cifras reales del catálogo",
  "Waitlist en un popup desde todos los botones que antes llevaban al pago",
  "Reseñas de dueños con fotos en cada ficha y en el home",
  "Catálogo, fichas, comparador y calculadora con el sistema nuevo",
]);
sectionSlides("web", "Web principal");
pair("Web principal / Ventanas y móvil", [["Waitlist", img(`${G}/capturas/web-waitlist.jpg`)]]);
pair("Web principal / Móvil", [["Home", img(`${G}/capturas/web-movil.jpg`)], ["Ficha de auto", img(`${G}/capturas/web-movil-pdp.jpg`)]]);

chapter("vendedores", "03", "Web de vendedores", "De una sola página a un sitio completo, con el mismo diseño de la web principal y un formulario más simple.", [
  "Páginas nuevas: Cómo funciona, Ventajas, Preguntas frecuentes, Contacto, Términos y Privacidad",
  "Formulario con el 50% de descuento ya aplicado y errores claros por campo",
  "Footer con todas las páginas, la web principal y las redes",
  "Favicon y vista previa propia al compartir el link",
]);
sectionSlides("ven", "Web de vendedores");
pair("Web de vendedores / Móvil y al compartir", [["Home en móvil", img(`${G}/capturas/ven-movil.jpg`)], ["Vista previa en WhatsApp y redes", img(`${G}/capturas/ven-compartir.jpg`)]]);

// ─── 4. Panel ────────────────────────────────────────────────────────────────
chapter("panel", "04", "Panel de administración", "De una plantilla con datos de ejemplo a una herramienta con los datos reales de todo lo que entra por los sitios. Tema claro y oscuro.", [
  "Resumen con la waitlist como métrica principal y la actividad reciente",
  "Waitlist, Asesorías, Vendedores, Reseñas, Newsletter, Feedback y Leads de la Oferta",
  "Búsqueda, filtros, exportar a Excel y accesos a WhatsApp y correo",
  "Moderación de reseñas con fotos",
]);
for (const [f, label] of [["panel-resumen", "Resumen"], ["panel-resumen-oscuro", "Resumen en tema oscuro"], ["panel-waitlist", "Waitlist"], ["panel-asesorias-oscuro", "Asesorías en tema oscuro"], ["panel-resenas", "Reseñas y moderación"], ["panel-vendedor", "Vista de vendedor"]])
  shot(`Panel / ${label}`, img(`${G}/capturas/${f}.jpg`), { note: "Datos de ejemplo" });
pair("Panel / Móvil", [["Resumen en móvil", img(`${G}/capturas/panel-movil.jpg`)]], "Datos de ejemplo");

// ─── 5. Correos ──────────────────────────────────────────────────────────────
chapter("correos", "05", "Correos automáticos", "Doce correos con la marca: a la persona y a Francisco, en cada flujo. Llevan enlaces al catálogo, un bloque de producto y un pie con redes.", [
  "Waitlist, reseñas (con y sin fotos), asesoría y vendedores",
  "Oferta Exclusiva lista para cuando se reactive",
  "Todo lo que escribe una persona llega como texto, sin enlaces ni imágenes ajenas",
]);
const EMAILS = [
  ["Waitlist", "waitlist-confirmacion", "A la persona", "waitlist-francisco", "A Francisco"],
  ["Reseña sin fotos", "resena-publicada", "A quien la dejó", "resena-publicada-francisco", "A Francisco"],
  ["Reseña con fotos", "resena-en-revision", "A quien la dejó", "nueva-resena-francisco", "A Francisco, para moderar"],
  ["Asesoría pagada", "asesoria-confirmada", "A la persona", "asesoria-francisco", "A Francisco"],
  ["Vendedor suscrito", "registro-vendedor", "Al vendedor", "nuevo-vendedor-francisco", "A Francisco"],
  ["Oferta Exclusiva (en pausa)", "pago-confirmado-cliente", "Al cliente", "nuevo-lead-francisco", "A Francisco"],
];
for (const [flow, a, ca, b, cb] of EMAILS) pair(`Correos / ${flow}`, [[ca, img(`${G}/correos/${a}.jpg`)], [cb, img(`${G}/correos/${b}.jpg`)]]);

// ─── Cierre ──────────────────────────────────────────────────────────────────
slides.push(`<section class="slide slide--cover"><div class="cover">
  <img class="cover__logo" src="${LOGO_NIEBLA}" alt="Electrificarte">
  <h1>Todo esto ya está en producción</h1>
  <p class="lead">electrificarte.com, vendedores.electrificarte.com y dashboard.electrificarte.com</p>
</div></section>`);

slides[tocIndex] = `<section class="slide"><header class="slide__head"><span>Contenido</span></header><div class="slide__body slide__body--pad">
  <ol class="toc">${toc.map((t) => `<li><a href="#${t.id}"><span>${t.n}</span>${esc(t.title)}</a></li>`).join("")}</ol></div></section>`;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revamp de diseño de Electrificarte</title>
<style>
:root{--laguna:#1d605b;--glaciar:#caefea;--tinta:#0f1716;--grafito:#495251;--piedra:#687170;--linea:#dfe4e4;--niebla:#f2f7f6;--papel:#fff}
*{box-sizing:border-box}
body{margin:0;background:#e6ecea;color:var(--tinta);font:16px/1.5 -apple-system,"Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.slide{position:relative;width:min(1200px,calc(100vw - 48px));aspect-ratio:1080/796;margin:24px auto;background:var(--papel);border:1px solid var(--linea);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.slide__head{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 22px;border-bottom:1px solid var(--linea);font-size:13px;font-weight:600;color:var(--grafito)}
.slide__head .note{font-weight:500;color:var(--piedra)}
.slide__body{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:var(--niebla);padding:18px}
.slide__body img{max-width:100%;max-height:100%;object-fit:contain;border:1px solid var(--linea);border-radius:8px;background:#fff}
.slide__body--row{gap:24px;align-items:stretch}
.slide__body--row figure{margin:0;flex:1;min-width:0;min-height:0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:8px}
.slide__body--row figure img{flex:0 1 auto;min-height:0;max-height:calc(100% - 28px);width:auto;height:auto}
figcaption{font-size:13px;font-weight:600;color:var(--grafito)}
.slide__body--pad{padding:40px 56px;align-items:flex-start;justify-content:flex-start;background:var(--papel)}
.slide--cover{background:var(--tinta);color:#f2f7f6;border-color:var(--tinta)}
.cover{margin:auto;padding:0 8%;width:100%}
.cover__logo{height:22px;width:auto;display:block;margin-bottom:56px}
.cover h1{font-size:clamp(36px,5.4vw,68px);line-height:1.02;letter-spacing:-.03em;margin:0;font-weight:800}
.cover .lead{color:#b4bdbc;font-size:clamp(16px,1.7vw,22px);max-width:760px;margin:20px 0 0}
.cover__sites{display:grid;grid-template-columns:repeat(3,1fr);margin-top:56px;border-top:1px solid #27302f}
.cover__sites div{padding:18px 18px 0 0;display:grid;gap:4px}.cover__sites div+div{padding-left:18px;border-left:1px solid #27302f}
.cover__sites strong{font-size:17px}.cover__sites span{color:var(--glaciar);font-size:14px}
.slide--chapter{background:var(--papel)}
.chapter{margin:auto 0;padding:0 8%}
.chapter__n{font-size:15px;font-weight:700;color:var(--laguna);margin:0 0 12px}
.chapter h2{font-size:clamp(32px,4.6vw,58px);line-height:1.04;letter-spacing:-.03em;margin:0;font-weight:800}
.chapter .lead{font-size:clamp(16px,1.6vw,21px);color:var(--grafito);max-width:780px;margin:18px 0 0}
.points{list-style:none;padding:0;margin:36px 0 0;max-width:820px;border-top:1px solid var(--linea)}
.points li{padding:12px 0;border-bottom:1px solid var(--linea);font-size:clamp(14px,1.3vw,17px)}
.swatches{display:grid;grid-template-columns:repeat(4,1fr);gap:28px 24px;width:100%}
.sw{display:grid;gap:6px}.sw__chip{height:110px;border-radius:12px;border:1px solid var(--linea);display:flex;align-items:flex-end;padding:12px;font-size:13px;font-weight:600}
.sw strong{font-size:16px}.sw span{font-size:13px;color:var(--grafito)}
.toc{list-style:none;padding:0;margin:0;width:100%;max-width:760px;border-top:1px solid var(--linea)}
.toc li{border-bottom:1px solid var(--linea)}.toc a{display:flex;gap:24px;padding:18px 0;color:var(--tinta);text-decoration:none;font-size:clamp(20px,2.4vw,30px);font-weight:700;letter-spacing:-.02em}
.toc a span{color:var(--laguna);font-size:16px;padding-top:8px;width:28px}
.toc a:hover{color:var(--laguna)}
@media print{
  @page{size:1080px 796px;margin:0}
  body{background:#fff}
  .slide{width:1080px;height:796px;aspect-ratio:auto;margin:0;border:0;border-radius:0;break-after:page;page-break-after:always}
  .slide__body img{border-radius:6px}
}
</style></head><body>
${slides.join("\n")}
</body></html>`;
writeFileSync("docs/design/guia-diseno.html", html);
const mb = (Buffer.byteLength(html) / 1e6).toFixed(1);
console.log(`✓ docs/design/guia-diseno.html — ${slides.length} láminas, ${mb} MB`);
