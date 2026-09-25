# Guidelines de diseño — cómo construir sin romper el sistema v1

`DESIGN.md` describe **qué es** el sistema. Este documento es lo otro: **qué quedó prohibido, con
qué se reemplaza y cómo se verifica**. Es la defensa contra reintroducir, pantalla por pantalla, el
diseño que el sistema v1 eliminó.

El sistema v1 (septiembre 2026) borró ~9.000 líneas del diseño anterior. Lo que se fue no se fue por
gusto: eran patrones que competían entre sí (cyan saturado + ámbar + degradados), que fingían
profundidad (glass, glow, sombras) o que gritaban (mayúsculas con tracking, píldoras, pulse). El
riesgo real no es un rediseño: es que un desarrollo nuevo — o un agente que leyó el repo viejo —
traiga de vuelta `bg-white/10` en un componente y nadie lo note hasta que hay diez.

**Verificación automática:** `npm run design:check` (también corre dentro de `npm test`).
Falla con las 15 reglas de abajo. Si una excepción es deliberada, justificala con un comentario
`design-ok` en la misma línea.

---

## 1. El orden en que se elige (no empieces por Tailwind)

1. **¿Existe una clase de marca?** → usala. `.btn`, `.chip`, `.card`, `.field`, `.section`,
   `.t-h2`, `.price`… y las de página en `app/styles/pages.css` / `home.css` (§4).
2. **¿Necesitás una variante?** → agregala al CSS de la clase (`.btn--ghost`), no un `className`
   largo en el TSX. Así la próxima pantalla la reutiliza.
3. **¿Es composición (layout, grilla, espaciado)?** → utilidades de Tailwind **con tokens**:
   `py-section`, `gap-grid`, `px-gutter`, `bg-canvas-2`, `border-line`, `text-ink-2`.
4. **Nunca un valor crudo.** Ni un hex, ni un `px` de radio, ni un `rem` de tipografía. Si de
   verdad falta un valor, se agrega como token en `@theme` y se discute — no se hardcodea.

Corolario: **los componentes no llevan colores fijos.** Llevan tokens semánticos, y dentro de un
contenedor con `.theme-dark` se invierten solos (el lienzo pasa a Tinta, `.btn--primary` pasa de
Laguna a Glaciar). Un color fijo es un componente que se rompe en la primera banda oscura.

---

## 2. Equivalencias — de qué a qué

Si estás copiando un patrón de un archivo viejo, de un commit anterior a `f98b3af` o de memoria,
esta es la traducción.

### Color

| Sistema anterior | Sistema v1 |
|---|---|
| `#00E5E5`, `text-primary`, `bg-primary`, `border-primary` | `bg-accent` / `text-link` / `outline-focus` (Laguna en claro, Glaciar en oscuro) |
| `#006A61`, `primary-deep` | `bg-accent-hover` |
| `amber` / `bg-amber` (urgencia) | no existe color de urgencia. `.chip--solid` si hay que destacar; `text-danger` solo para errores |
| `bg-black` fijo para una banda | `.theme-dark` en la sección (el token se invierte solo) |
| `bg-white`, `text-black` | `bg-surface`, `text-ink` |
| `text-gray-400`, `text-white/60` | `text-ink-2` (secundario), `text-ink-3` (terciario) |
| `border-gray-200`, `border-white/10` | `border-line` (hairline), `border-line-2` (controles) |
| Degradado de fondo (`bg-gradient-*`) | fondo plano: `bg-canvas`, `bg-canvas-2`, o `.section--subtle` |

### Tipografía

| Sistema anterior | Sistema v1 |
|---|---|
| `font-headline` (Space Grotesk) | `font-display` (Cabinet Grotesk) o directamente `.t-h1` / `.t-h2` / `.t-h3` |
| Inter por defecto | Switzer por defecto (`font-sans`, no hay que declararlo) |
| `text-4xl font-bold tracking-tight` a mano | `.t-h2` (la escala ya trae line-height y letter-spacing) |
| `text-xs`, `text-[10px]`, `text-[11px]` | `text-micro` — **12 px es el piso absoluto** |
| Eyebrow: `uppercase tracking-widest text-xs` | **nada.** El título abre la sección, en sentence case |
| `TÍTULOS EN MAYÚSCULA` | sentence case, siempre |
| Precio como texto normal | `.price` / `.price--lg` (Switzer 600, cifras tabulares) |

### Forma, profundidad y movimiento

| Sistema anterior | Sistema v1 |
|---|---|
| `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-lg` | `rounded-chip` (4) · `rounded-control` (8, botones e inputs) · `rounded-card` (12) |
| Botones y chips en píldora (`rounded-full`) | radio 8 y 4. `rounded-full` queda **solo** para fotos de personas (`.avatar`) |
| `bg-white/10 border-white/20 backdrop-blur` (glass) | superficie maciza: `bg-surface` + `border-line` |
| `shadow-lg`, `shadow-xl`, `shadow-[0_0_40px...]` (glow) | **hairline de 1 px.** `shadow-overlay` solo para lo que flota: modal, menú, buscador, chat |
| Orbes / blobs desenfocados de fondo | nada. El ritmo lo dan las bandas y los hairlines |
| `hover:scale-105`, `group-hover:scale-110` | el hover cambia color o borde. La flecha se desplaza: `<Icon name="arrow_forward" size="none" className="arrow" />` |
| `animate-pulse`, `animate-bounce` | nada. Para cargas: `progress_activity` + `animate-spin` |
| Ícono dentro de un círculo o cuadrado de color | ícono suelto, Material Symbols peso 300 |

### Ritmo y copy

| Sistema anterior | Sistema v1 |
|---|---|
| `py-24`, `py-20`, `max-w-7xl mx-auto px-4` | `<section className="section">` + `<div className="wrap">` |
| Espaciados a ojo | `py-section`, `gap-grid`, `px-gutter`, `--card-pad` |
| `Autos eléctricos · Chile · 2026` | sin punto medio: coma o preposición. `cleanSeparators()` en strings de Sanity |
| `Título — subtítulo` | sin raya como separador |
| `1,234.5` | formato chileno: `formatNumber()`, `formatCLP()` |

---

## 3. Reglas de composición de página

Estas no las detecta ningún script — son de criterio, y son las que se rompen al agregar una
sección nueva al final de una página existente:

- **Nunca dos bandas oscuras seguidas.** El footer ya es oscuro, así que **la última sección de
  cualquier página no puede ser `.theme-dark`**.
- **Nunca dos secciones Niebla seguidas.** Si comparten fondo, separalas con `section--rule`.
- **Un solo bloque Glaciar por página** — es la llamada principal. Dos Glaciar es ninguno.
- **Un solo `.btn--primary` por bloque.** El resto `--secondary`, `--soft` o `--quiet`.
- **Sin eyebrows.** Si sentís que falta contexto sobre el título, el título está mal escrito.
- **Las cifras salen del catálogo.** Nada de números escritos a mano en el hero o en cards
  (`heroStats()`, `carStats()` en `lib/utils.ts`).

---

## 4. Inventario — buscá acá antes de crear

Hay ~300 clases ya definidas. El error más caro no es romper el diseño: es reimplementar con
Tailwind algo que ya existe con nombre.

- **`app/styles/brand.css`** — el vocabulario transversal. Tipografía (`.t-display` … `.t-micro`),
  `.btn` (+ `--primary|--secondary|--soft|--quiet`, `--sm|--lg`, `--block`, `--icon`),
  `.chip` (+ `--soft|--solid|--media`), `.field`/`.field__label`/`.input`/`.input-group`,
  `.card`, **`.card.car`** (card de auto completa: media 16:10, chips, marca, `.specs`, precio),
  `.price`/`.price--lg`/`.price-was`/`.price-save`, `.section` (+ `--subtle|--rule|--tight`),
  `.wrap`, `.section-head`, `.link`, `.link-arrow`, `.logo`.
- **`app/styles/home.css`** — home y chrome global: `.nav`/`.menu`/`.mnav`, `.hero` (+ `__veil`,
  `__actions`, `__how`), `.paths`, `.services`, `.types`, `.collections`, `.brands`, `.facts`,
  `.stats`, `.steps`, `.trust`, `.reviews`/`.review`/`.stars`/`.rating`, `.posts`, `.faq`/`.qa`,
  `.newsletter`, `.footer`, `.modal`, `.sticky-bar`, `.marquee`, `.avatar`.
- **`app/styles/pages.css`** — páginas internas: `.page`/`.page-head`, `.crumbs`, `.toolbar`,
  `.results`, `.cars-grid`, `.pills`, `.drawer` (filtros), `.empty`, PDP (`.pdp-top`, `.gallery__*`,
  `.buy`, `.vers`/`.ver`, `.vtable`, `.specband`, `.ficha`, `.equip`, `.hl`, `.proscons`,
  `.checklist`, `.kpis`), `.sim`/`.sim-grid` (comparador), `.chat`/`.msg`, `.band`, `.cta-row`,
  `.pricebox`, `.ad-card`, `.type-links`.

Convención: BEM plano — `.bloque`, `.bloque__parte`, `.bloque--variante`. Todo dentro de
`@layer components`, así una utilidad de Tailwind siempre puede ajustar una clase de marca sin
`!important`.

---

## 5. Checklist antes de dar por lista una pantalla

1. `npm run design:check` pasa.
2. Ningún hex, ningún radio en px, ninguna tipografía en rem escritos a mano.
3. Se ve bien en claro **y** dentro de una `.theme-dark`.
4. Un solo `.btn--primary` en el bloque; un solo Glaciar en la página.
5. La última sección no es oscura (el footer lo es).
6. Foco visible con teclado: contorno sólido de 2 px (no `outline-none` sin reemplazo).
7. Nada bajo 12 px; todo en sentence case; sin `·` ni `—` como separador.
8. Íconos nuevos: regenerar el subset o **no se dibujan**
   (`npx tsx --env-file=.env.local scripts/subset-icon-font.ts`).
9. Las cifras vienen de datos reales, no del copy.

---

## 6. Trampas del sistema

- **Las fuentes no están en el repo.** Cabinet Grotesk y Switzer son de Fontshare (ITF Free Font
  License): se pueden usar en el sitio pero **no redistribuir**. `scripts/fetch-fonts.mjs` las baja
  a `app/fonts/fontshare/` en `predev` y `prebuild`. En un entorno nuevo, sin correr eso la
  tipografía cae al fallback del sistema y todo parece roto sin que haya nada roto.
- **La fuente de íconos es un subset generado.** Un ícono nuevo — en código o escrito en un campo
  de Sanity — no se dibuja hasta regenerar el subset.
- **`.theme-dark` es un contenedor, no una utilidad de color.** Se pone en la sección; los hijos no
  tocan colores.
- **Los tokens `--space-*`, `--lh-*`, `--ls-*` de `:root` no generan utilidades de Tailwind** —
  son para usar dentro de `app/styles/*.css`.
- **La fuente de verdad visual es `docs/design/electrificarte-brand-kit.html`** y las maquetas
  (`electrificarte-home.html`, `-asesoria.html`, `-plp-electricos.html`, `-pdp-ioniq-5.html`).
  Ante una duda de criterio, se abren en el navegador; no se improvisa.
- **`components/forms/LeadForm.tsx` es del flujo `/solicitar`, hoy en 🟡 STANDBY.** Está migrado al
  sistema, pero es la pantalla que nadie mira: si se reactiva la Oferta, revisarla de nuevo.
