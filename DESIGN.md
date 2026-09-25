# Sistema de diseño v1 — Electrificarte

Vigente desde septiembre de 2026. Reemplaza al sistema anterior (Space Grotesk / Inter, cyan
`#00E5E5`). Fuente de verdad visual: `docs/design/electrificarte-brand-kit.html`. Maquetas de
referencia: `docs/design/electrificarte-home.html`, `electrificarte-asesoria.html`,
`electrificarte-plp-electricos.html` y `electrificarte-pdp-ioniq-5.html`.

**Para construir algo nuevo, leé `docs/design/GUIDELINES.md`**: qué patrones quedaron prohibidos,
con qué se reemplaza cada uno (tabla de equivalencias), el inventario de las ~300 clases ya
definidas y el checklist de revisión. Se verifica con `npm run design:check`.

**Para llevar el sistema a otro proyecto** (dashboard, vendedores): `docs/design/portable/`.

En código:
- Tokens: `app/globals.css` (`@theme` con primitivos, `@theme inline` con la capa semántica,
  `.theme-dark` para bandas oscuras).
- Clases de marca: `app/styles/brand.css` (tipografía, botón, chip, campo, card, precio),
  `app/styles/home.css` (navegación, hero, secciones del home, footer, modal) y
  `app/styles/pages.css` (páginas laterales, PLP, PDP). Todo dentro de `@layer components`,
  así una utilidad de Tailwind siempre puede ajustar una clase de marca.

## Principios

1. **Dos colores de marca, no más.** Laguna para actuar, Glaciar para destacar. El resto son
   neutros fríos.
2. **Hairlines en vez de sombras.** Las cards y paneles se separan con una línea de 1 px.
   La sombra (`shadow-overlay`) es solo para lo que flota: menús, buscador, modales, chat.
3. **Macizo, nunca translúcido.** Nada de `bg-white/10`, `border-white/20`, `backdrop-blur`
   ni glow. Única excepción: el velo sobre video o foto con texto encima y el fondo de un modal.
4. **El título abre la sección.** Sin eyebrows, sin mayúsculas con tracking, sentence case
   siempre.
5. **Datos reales.** Cifras del hero y de las cards salen del catálogo; nunca se escriben a mano.

## Color

### Primitivos (utilidades `bg-laguna`, `text-tinta`, `border-linea`…)

| Token | Hex | Uso |
|---|---|---|
| Laguna | `#1d605b` | Acento en claro: botón primario, enlaces, foco |
| Laguna hover | `#144e49` | Hover del primario |
| Glaciar | `#caefea` | Acento en oscuro, chip destacado, bloque destacado (uno por página) |
| Glaciar hover | `#b3e5de` | Hover de Glaciar |
| Tinta | `#0f1716` | Texto principal, bandas oscuras |
| Tinta 2 | `#161f1e` | Superficie dentro de una banda oscura |
| Grafito | `#495251` | Texto secundario |
| Piedra | `#687170` | Texto terciario, placeholders |
| Línea fuerte | `#cad1d0` | Bordes de controles |
| Línea | `#dfe4e4` | Hairlines de cards y separadores |
| Niebla | `#f2f7f6` | Fondo de sección alterna |
| Papel | `#ffffff` | Fondo base |
| Alerta | `#ba362b` (oscuro: `#ed8c7f`) | Errores de formulario |

### Semánticos (lo que se usa en componentes)

`bg-canvas`, `bg-canvas-2`, `bg-surface`, `text-ink`, `text-ink-2`, `text-ink-3`,
`border-line`, `border-line-2`, `bg-accent`, `bg-accent-hover`, `text-on-accent`,
`bg-accent-soft`, `text-on-accent-soft`, `text-link`, `outline-focus`, `text-danger`.

Dentro de un elemento con `.theme-dark` estos mismos nombres se invierten solos: el lienzo pasa
a Tinta, el texto a Niebla y el acento de Laguna a Glaciar (el `.btn--primary` queda Glaciar con
texto Tinta). Por eso los componentes no llevan colores fijos.

Reglas:
- Nunca dos bandas oscuras seguidas. El footer ya es oscuro: la última sección de una página
  no puede serlo.
- Nunca dos secciones Niebla seguidas: si comparten fondo, se separan con `section--rule`.
- Un solo bloque Glaciar por página (la llamada principal).

### Transparencias permitidas

`--veil-media` (degradado sobre video o foto con texto), `--veil-modal` (fondo detrás de un
modal), `--line-on-media` y `--line-2-on-media` (líneas sobre media). Nada más.

## Tipografía

| Rol | Fuente | Clase |
|---|---|---|
| Display (solo hero) | Cabinet Grotesk 800 | `.t-display` |
| Títulos (20 px o más) | Cabinet Grotesk 700 | `.t-h1`, `.t-h2`, `.t-h3`, `font-display` |
| Todo lo demás | Switzer 400–700 | por defecto (`font-sans`) |
| Cifras y precios | Switzer 600, tabulares | `.price`, `.price--lg`, `.price-was`, `.price-save` |

Escala: `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-h4`, `text-lead`, `text-body`,
`text-small`, `text-label` (13 px), `text-micro` (12 px, el mínimo). Nada bajo 12 px.

Las fuentes son de Fontshare (ITF Free Font License). La licencia permite usarlas en el sitio,
pero **no redistribuirlas en un repositorio público**, así que no se versionan:
`scripts/fetch-fonts.mjs` las descarga a `app/fonts/fontshare/` antes de `dev` y `build`
(`predev` / `prebuild` en `package.json`).

Íconos: Material Symbols Outlined, peso 300, subset propio (`<Icon>`; al sumar un ícono hay que
regenerar el subset, ver CLAUDE.md). Nunca dentro de cuadrados o círculos de color.

## Forma

- Radios: `rounded-chip` (4 px), `rounded-control` (8 px, botones e inputs), `rounded-card`
  (12 px). `rounded-full` solo para fotos de personas.
- Controles: 40 / 48 / 56 px de alto (`--control-sm|md|lg`). Inputs de 48 px con texto de 16 px.
- Foco: contorno sólido de 2 px en `--focus`.

## Espaciado

| Token | Valor | Uso |
|---|---|---|
| `--page-max` | 1200 px | Ancho del contenido (`.wrap`) |
| `--gutter` | 20–48 px | Margen lateral |
| `--section-y` | 72–120 px | Alto de sección (`.section`) |
| `--section-y-sm` | 40–64 px | Franjas (`.section--tight`) |
| `--header-gap` | 32–48 px | Título de sección → contenido |
| `--grid-gap` | 16–24 px | Separación de grillas |
| `--card-pad` | 20 px | Relleno de card |

## Componentes

- **Botón** `.btn` + `--primary | --secondary | --soft | --quiet`, tamaños `--sm | --lg`,
  `--block`, `--icon`. Un solo primario por bloque. Flecha que se desplaza al hover
  (`<Icon name="arrow_forward" size="none" className="arrow" />`). Sin `hover:scale`.
- **Chip** `.chip` + `--soft` (Glaciar), `--solid` (Tinta), `--media` (sobre foto). Macizo,
  12 px, radio 4.
- **Campo** `.field` > `.field__label` + `.input`; error `.field__error`; prefijo
  `.input-group` + `.input-group__prefix`.
- **Card** `.card` (hairline, radio 12, sin sombra). La card de auto es `.card.car`:
  foto 16:10 con chips encima, marca y modelo debajo, specs en `<dl class="specs">`, precio.
- **Sección** `<section class="section">` (+ `--subtle` Niebla, `--rule` hairline arriba,
  `--tight` franja) con `.wrap` y `.section-head` (h2 `.t-h2` + bajada `.t-lead`).

## Copy

- Sentence case siempre. Sin `·` (coma o preposición) ni `—` como separador. Para strings de
  Sanity: `cleanSeparators()` y `sentenceCase()` de `lib/utils.ts`.
- Cifras en formato chileno: coma decimal y punto de miles (`formatNumber`, `formatCLP`).
- Terminología y copy prohibido: ver CLAUDE.md ("vendedores oficiales", nada de "$19.990"
  mientras dure el standby).
