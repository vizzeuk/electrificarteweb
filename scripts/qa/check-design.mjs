// Guardián del sistema de diseño v1. Falla si vuelve un patrón que el sistema eliminó.
//   node scripts/qa/check-design.mjs          (corre dentro de `npm test`)
//
// Por qué existe: el sistema v1 borró ~9.000 líneas del diseño anterior (cyan #00E5E5,
// Space Grotesk, glass/glow, píldoras, eyebrows en mayúscula). Nada impide que un
// desarrollo futuro — humano o agente entrenado con el repo viejo — los reintroduzca
// archivo por archivo. Este chequeo es el que lo impide. Reglas y equivalencias:
// docs/design/GUIDELINES.md
//
// Escape hatch: agregá `design-ok` en un comentario de la misma línea cuando la excepción
// sea deliberada y esté justificada.
import { readFileSync, globSync } from "node:fs";

const RULES = [
  // — Paleta anterior ———————————————————————————————————————————————————————
  { re: /#00E5E5|#006A61/i,                          msg: "color de la paleta anterior (cyan)", fix: "usá los tokens semánticos: bg-accent / text-link / bg-accent-soft" },
  { re: /\b(?:text|bg|border|ring|from|via|to|fill|stroke|divide)-primary(?:-deep)?\b/, msg: "token `primary` del sistema anterior", fix: "bg-accent, text-link, border-line… (capa semántica)" },
  { re: /\b(?:text|bg|border|from|via|to)-amber\b/,   msg: "token `amber` del sistema anterior", fix: "no hay color de urgencia; usá .chip--solid o text-danger si es un error" },

  // — Tipografía ————————————————————————————————————————————————————————————
  { re: /\bfont-headline\b/,                          msg: "`font-headline` (Space Grotesk)", fix: "font-display (Cabinet Grotesk) o las clases .t-h1/.t-h2/.t-h3" },
  { re: /\btext-xs\b|\btext-\[(?:[0-9]|10|11)px\]/,   msg: "texto bajo el mínimo de 12 px", fix: "text-micro (12 px) es el piso; .t-micro para el bloque completo" },
  { re: /\btracking-(?:wider|widest)\b/,              msg: "tracking expandido (eyebrow del sistema anterior)", fix: "el título abre la sección: .t-h2 en sentence case, sin eyebrow" },
  { re: /\buppercase\b/, skip: /textTransform/,       msg: "mayúsculas (eyebrow del sistema anterior)", fix: "sentence case siempre" },

  // — Macizo, nunca translúcido ————————————————————————————————————————————
  { re: /\b(?:bg|border|text|from|via|to|divide)-(?:white|black)\/\d/, msg: "fondo/borde translúcido (glass)", fix: "superficies macizas: bg-surface + border-line; sobre foto, --veil-media" },
  { re: /\bbackdrop-blur\b|\bblur-(?:xs|sm|md|lg|xl|2xl|3xl|\[)/,      msg: "blur decorativo", fix: "el sistema no usa blur; separá con un hairline" },
  { re: /\bdrop-shadow|\bshadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner|\[)/,  msg: "sombra decorativa", fix: "hairline (border-line). shadow-overlay solo para lo que flota: modal, menú, chat" },
  { re: /\bbg-gradient-|\bbg-\[linear-gradient/,                        msg: "degradado decorativo", fix: "fondo plano: bg-canvas / bg-canvas-2 / .section--subtle" },

  // — Forma —————————————————————————————————————————————————————————————————
  { re: /\brounded-(?:sm|md|lg|xl|2xl|3xl)\b/,        msg: "radio fuera de la escala", fix: "rounded-chip (4) · rounded-control (8) · rounded-card (12)" },
  { re: /\brounded-full\b/, skip: /::-(?:webkit-slider|moz-range)-thumb/, msg: "forma de píldora", fix: "rounded-full es solo para fotos de personas (.avatar); botones y chips llevan radio 8/4" },

  // — Movimiento ————————————————————————————————————————————————————————————
  { re: /\b(?:hover|group-hover|focus):scale-/,       msg: "zoom al hover", fix: "el hover cambia color/borde; la flecha .arrow se desplaza" },
  { re: /\banimate-(?:pulse|bounce)\b/,               msg: "animación de atención del sistema anterior", fix: "sin animaciones de urgencia; progress_activity con animate-spin para cargas" },
];

const CSS_RULES = [{ re: /#00E5E5|#006A61/i, msg: "color de la paleta anterior (cyan)", fix: "definí el color en @theme o usá un token existente" }];

const files = [
  ...globSync("app/**/*.{ts,tsx}"),
  ...globSync("components/**/*.{ts,tsx}"),
].filter((f) => !f.startsWith("app/studio"));
const cssFiles = [...globSync("app/**/*.css")];

const findings = [];
function scan(list, rules) {
  for (const file of list) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("design-ok")) return;
      for (const r of rules) {
        if (r.skip?.test(line)) continue;
        if (r.re.test(line)) findings.push({ file, line: i + 1, msg: r.msg, fix: r.fix, snippet: line.trim().slice(0, 100) });
      }
    });
  }
}
scan(files, RULES);
scan(cssFiles, CSS_RULES);

console.log(`\x1b[1m▶ sistema de diseño v1\x1b[0m — ${files.length + cssFiles.length} archivos`);
if (!findings.length) {
  console.log("  \x1b[32m✓\x1b[0m sin patrones del sistema anterior");
  process.exit(0);
}
const byMsg = new Map();
for (const f of findings) (byMsg.get(f.msg) ?? byMsg.set(f.msg, []).get(f.msg)).push(f);
for (const [msg, group] of byMsg) {
  console.log(`\n  \x1b[31m✗ ${msg}\x1b[0m — ${group[0].fix}`);
  for (const f of group) console.log(`      ${f.file}:${f.line}  ${f.snippet}`);
}
console.log(`\n\x1b[31m${findings.length} infracción(es).\x1b[0m Reglas y equivalencias: docs/design/GUIDELINES.md`);
console.log("Si la excepción es deliberada, justificala con un comentario `design-ok` en la línea.");
process.exit(1);
