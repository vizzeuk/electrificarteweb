// Arma docs/design/portable/ para llevar el sistema de diseño v1 a los otros proyectos
// (dashboard, página de vendedores): tokens.css (de app/globals.css), brand.css (clases de
// marca, copia de app/styles/brand.css) y los logos.
//   node scripts/gen-design-portable.mjs
// Correr cada vez que cambie un token en globals.css: la web es la fuente de verdad.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");
const from = css.indexOf("/* 1. Primitivos");
// Hasta el cierre del bloque .theme-dark (incluido), sin html/body/íconos propios de la web.
const darkStart = css.indexOf(".theme-dark {");
const darkEnd = css.indexOf("}", css.indexOf("color: var(--ink);", darkStart)) + 1;
if (from < 0 || darkStart < 0) throw new Error("No encontré los marcadores en app/globals.css");

const body = css.slice(from, darkEnd)
  // En la web, --font-cabinet/--font-switzer los crea next/font/local. Acá se documenta.
  .replace("/* Las variables --font-cabinet y --font-switzer las crea next/font/local en app/layout.tsx. */",
    "/* --font-cabinet y --font-switzer: créalas con next/font/local (ver README, sección Fuentes). */");

writeFileSync("docs/design/portable/tokens.css", `/* ==========================================================================
   ELECTRIFICARTE: SISTEMA DE DISEÑO v1, tokens (copia exacta de electrificarteweb)
   GENERADO por scripts/gen-design-portable.mjs desde app/globals.css de electrificarteweb.
   No editar en el proyecto destino: si un token cambia, cambia en la web y se vuelve a copiar.

   Uso (Tailwind v4):  @import "tailwindcss";  @import "./tokens.css";
   ========================================================================== */

${body}
  :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  ::selection { background: var(--color-glaciar); color: var(--color-tinta); }
}
`);
console.log("✓ docs/design/portable/tokens.css");

// brand.css: CSS plano sobre los tokens (.btn, .chip, .field, .card, .section, .t-h1…).
writeFileSync("docs/design/portable/brand.css",
  "/* COPIA de app/styles/brand.css de electrificarteweb (scripts/gen-design-portable.mjs). No editar acá. */\n" +
  readFileSync("app/styles/brand.css", "utf8"));
console.log("✓ docs/design/portable/brand.css");

mkdirSync("docs/design/portable/brand", { recursive: true });
for (const f of ["electrificarte-wordmark.webp", "electrificarte-lockup.webp", "email-wordmark-tinta.png", "email-wordmark-niebla.png"]) {
  copyFileSync(`public/brand/${f}`, `docs/design/portable/brand/${f}`);
}
console.log("✓ docs/design/portable/brand/ (logos)");
