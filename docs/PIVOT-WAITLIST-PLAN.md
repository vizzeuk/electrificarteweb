# Giro a Waitlist + Asesoría-first — plan y estado

> **Documento vigente.** Septiembre 2026. Reestructuración decidida por Francisco tras feedback
> externo. Reemplaza como prioridad al marketplace de subasta inversa
> (`docs/HANDOFF-CONDUCTOR.md`), que queda en **STANDBY**.

## Por qué

Francisco necesita **primero una base grande de gente interesada** en recibir ofertas de autos,
para recién después poder venderle ese valor a la red de vendedores. Cobrar $19.990 por buscar
la oferta frenaba la captación. Una **waitlist gratis** maximiza el volumen de leads; esa base
es el nuevo activo del negocio.

## Qué cambia (resumen)

| | Antes | Ahora |
|---|---|---|
| Producto principal | Oferta Exclusiva $19.990 | **Asesoría $4.990** |
| CTA de "mejor oferta" | Form pagado en `/solicitar` | **Popup de waitlist (gratis)** |
| Subasta inversa / dashboard / n8n de pujas | Activo | 🟡 **STANDBY** (código intacto) |

## Decisiones tomadas (confirmadas por Vicente)

1. **Hero:** primario (izquierda, relleno) = **Asesoría $4.990**. Secundario (derecha) =
   "Consigue la mejor oferta" → **abre el popup de waitlist** (ya no vende los $19.990).
2. **Campos de waitlist:** `nombre`, `email`, `teléfono`, `modelo de interés` (**opcional**).
3. **`/solicitar`:** queda **oculta**. Ningún CTA apunta ahí — todos abren el popup. No se deja
   accesible para no confundir al usuario.
4. **Interruptor:** constante **`OFERTA_STANDBY`** en `lib/products.ts` (no env var: una línea
   versionada en git, sin depender de configuración en Vercel).

## Principio técnico — reversible, no empezar de 0

No se borra ni se edita a mano la lógica de los ~40 CTAs. Se centraliza:
`OFERTA_STANDBY` + un componente/hook único de CTA. En standby abren la waitlist; al apagar el
flag vuelven a `/solicitar` **sin re-tocar archivos**. Todo el flujo pagado (`/solicitar`,
`LeadForm`, `/api/checkout` rama lead, `app/api/auction/*`, tests) **queda en el repo**.

---

# Fases

## Fase 0 — Infra de waitlist ✅ HECHA
- [x] `OFERTA_STANDBY = true` en `lib/products.ts`
- [x] `components/waitlist/WaitlistProvider.tsx` — context + hook `useWaitlist()`, montado en
      `app/(public)/layout.tsx` (envuelve todo el sitio público)
- [x] `components/waitlist/WaitlistModal.tsx` — cáscara de `PromoPopup` (overlay oscuro, glow
      cyan, borde white/10) + Escape para cerrar + bloqueo de scroll + estado de éxito
- [x] Formulario: nombre, email, teléfono (+56, 9 dígitos), **modelo opcional** (se prellena
      con el `prefill` cuando se abre desde una PDP/card)
- [x] `app/api/waitlist/route.ts` — zod + rate limit (`bucket: "waitlist"`) → `N8N_WAITLIST_URL`,
      guarda `source` para medir qué CTA convierte
- [x] `scripts/sql/2026-09-07_waitlist.sql` — tabla + índices + RLS + vista `waitlist_unicos`
- [x] `n8n/waitlist.json` — workflow importable (Webhook → Supabase)

**Cómo se usa desde cualquier CTA (Fase 2):**
```tsx
const { open } = useWaitlist();
<button onClick={() => open({ model: "BYD Dolphin", source: "pdp" })}>Quiero mi oferta</button>
```

## Fase 1 — Hero ✅ HECHA
- [x] Invertido: primario (relleno cyan) = **Asesoría $4.990** ("Te ayudamos a elegir");
      secundario = **"Consigue la mejor oferta · Únete a la waitlist · gratis"** → popup
- [x] Fuera "$19.990", "Pagas … y negociamos por ti" y la garantía de devolución del 100%
- [x] Subtítulo reescrito hacia asesoría + waitlist (se ignora el de Sanity mientras dure el standby)

## Fase 2 — Retargetear los CTAs ✅ HECHA (37 CTAs en 20 archivos)
Todos usan `<OfferCta>` → popup de waitlist, con `source` por área y prefill del auto donde
aplica. **Diseño intacto** (se conservó cada `className` y el markup interno).

- **Home (7):** `HowItWorks` ×2 · `StickyCTA` · `HotDeal` ×2 · `PromoPopup` · `FAQ`
- **PDP (5):** `AutoPageClient` ×4 (sticky, hero desktop/mobile, banda) · `auto/[slug]/page.tsx`
- **PLP (13):** `marcas/page` · `BrandPageContent` ×3 · `TipoPageContent` ×3 ·
  `ElectricoPageContent` ×4 · `ColeccionPageContent` ×2
- **Comparador + páginas (12):** `ComparadorClient` ×3 · `nosotros` ×2 · `negociacion` ×2 ·
  `asesoria` · `blog` ×3 · `(public)/not-found`

**Excepciones y decisiones:**
- `app/not-found.tsx` (404 raíz) vive **fuera** del grupo `(public)`, o sea fuera del
  `WaitlistProvider` → `useWaitlist()` reventaría. Se apuntó a **`/asesoria`** en vez del popup.
- `terminos` y `privacidad` conservan el texto legal que menciona `/solicitar` — es prosa legal
  que describe el servicio; **no tocar sin Francisco**.
- `OfferCta` recibió un prop `onClick` opcional para que `PromoPopup` cierre su modal antes de
  abrir la waitlist.

**Verificado:** `tsc --noEmit` limpio · `next build` OK (293 páginas estáticas) · smoke test 200
en `/`, `/marcas`, `/comparador`, `/nosotros`, `/negociacion`, `/asesoria`, `/blog` y una PDP,
sin errores de provider.

**Home:** `HowItWorks.tsx:219,226` · `StickyCTA.tsx:68` · `HotDeal.tsx:121,169` ·
`PromoPopup.tsx:184` · `FAQ.tsx:168`
**PDP:** `auto/[slug]/AutoPageClient.tsx:296-300, 376-380, 448-452, 989-990` ·
`auto/[slug]/page.tsx:59-60`
**PLP marcas:** `marcas/page.tsx:88,92,95` · `marcas/[slug]/BrandPageContent.tsx:396-397, 427-428, 617-621`
**PLP tipo:** `tipo/[slug]/TipoPageContent.tsx:388-389, 421-422, 646-656`
**PLP electrico:** `electrico/[slug]/ElectricoPageContent.tsx:458-459, 491-492, 738, 779-789`
**PLP coleccion:** `coleccion/[slug]/ColeccionPageContent.tsx:181-184, 342-352`
**Comparador:** `comparador/ComparadorClient.tsx:484-487, 545-548, 604-607`
**Otras:** `nosotros/page.tsx:97,200` · `negociacion/page.tsx:120,230` · `asesoria/page.tsx:171` ·
`blog/BlogListingContent.tsx:309` · `blog/[slug]/BlogPostContent.tsx:426,489` ·
`not-found.tsx:59` / `(public)/not-found.tsx:45`
**Legal (solo texto):** `terminos/page.tsx:93-94` · `privacidad/page.tsx:83-84,106-107`

## Fase 3 — Copy y secciones que venden la oferta ✅ HECHA

**Regla de wording aplicada:** la waitlist **solo registra interesados**. Prohibido decir o
insinuar que el servicio de la Oferta será **gratis**, prometer **una oferta**, dar **plazos**
(48-96 h) o mantener la **garantía de devolución**. "Sin costo" solo puede referirse al acto de
registrarse, nunca al servicio.

- [x] `Hero.tsx` — subtítulo, sub-label del CTA y microcopy (ver commit de corrección de wording)
- [x] `HowItWorks.tsx` — `OFERTA_STEPS` reescritos al camino de waitlist (paso 02 ya no cobra,
      paso 03 ya no promete 48-96 h), label del track "Oferta · $19.990" → "Oferta", puente
      "conseguir tu precio" → "súmate a la waitlist"
- [x] `StickyCTA.tsx` — "$19.990 único · Si no ahorras, te devolvemos todo" → "Súmate a la
      waitlist y te avisamos cuando abramos el acceso"
- [x] `FAQ.tsx` — pregunta de costo reescrita (waitlist sin costo / asesoría $4.990); la de
      "¿qué pasa si no consiguen buen precio?" → "¿qué pasa después de sumarme a la waitlist?";
      card CTA sin "48-96 h" y sin la garantía
- [x] `TrustBadges.tsx` — "Garantía de devolución" → "Sin compromiso"
- [x] `negociacion/page.tsx` — se elimina la dependencia del precio (`getOfferPrice`), metadata,
      OG, steps, stats (48-96h y garantía), hero, microcopy y CTA final reescritos
- [x] `nosotros/page.tsx` — razón "Sin riesgo" → "Sin compromiso"; card "Oferta Exclusiva ·
      $19.990" → "Waitlist de ofertas"; stats de 48-96h y garantía reemplazadas
- [x] PLP (`coleccion`, `tipo`, `electrico`) — "Respuesta en 48-96 h" → "Sin costo ni compromiso"

**Pendiente de decisión (no tocado a propósito):**
- `Testimonials.tsx` — las citas mencionan "oferta en 48 horas" y "me trajeron una oferta". Son
  **testimonios atribuidos a personas**; reescribir palabras de un cliente no corresponde
  hacerlo sin Francisco. Son en pasado, así que no prometen nada — pero conviene revisarlos.
- `ParaVendedores.tsx` ("48-96h · entrega del lead") — es del producto de vendedores
  ($12.990/mes, otra plataforma), fuera del alcance de este giro.
- `terminos` / `privacidad` — texto legal que menciona el $19.990 y `/solicitar`. No tocar
  sin Francisco.

**Verificado:** `tsc` limpio · `next build` OK (293 páginas) · sin "$19.990", plazos ni garantías
en UI fuera de los archivos de Fases 4-6 y los legales.

## Fase 4 — Chatbots ✅ HECHA

**Deep-link nuevo:** los bots y correos no pueden abrir un popup, así que el
`WaitlistProvider` acepta **`/?waitlist=1`** (opcional `&auto=Modelo&source=...`) y abre el
popup al cargar. Se lee de `window.location` (no `useSearchParams`) para no tener que envolver
el sitio en un `<Suspense>`.

- [x] **WhatsApp** `advisor.ts` `BASE_SYSTEM`: la sección "Producto principal — Oferta
      Exclusiva $19.990" pasó a "Paso siguiente — Waitlist", con **reglas duras**: no nombrar
      precio, no prometer una oferta, no dar plazos, no decir que el servicio es/será gratis
      (lo único sin costo es registrarse). Los **10 CASOS** reescritos para invitar a la
      waitlist. Link permitido cambiado a `/?waitlist=1`.
- [x] `OFERTA_SYSTEM`: se mantiene para quienes **ya pagaron** antes del standby (no entran
      nuevos). Ya prohibía nombrar cifras; se documentó el standby.
- [x] **Web** `app/api/chat/route.ts`: "DOS PRODUCTOS" → asesoría + **waitlist** (con las
      mismas reglas duras), rutas útiles, menú de `handleRecommendation` y `fallbackMessage`.
- [x] `public/ev-chat-widget.js`: `CONTACT_MENU` → waitlist; se mantiene el upsell de asesoría.
- [x] `lib/whatsapp/bot.ts` `subscribeMessage` (tier `null`) → ofrece asesoría **y** waitlist.
- [x] `scripts/test-chat-flows.ts` y `test-site-chat-flows.ts` actualizados: donde antes se
      esperaba "$19.990" o `/solicitar`, ahora se espera waitlist; se agregó un
      `shouldNotContain: ["$19.990"]` al caso de modelo ya decidido.

**Verificado:** `tsc` limpio · `next build` OK (293 páginas) · `/?waitlist=1` responde 200.

## Fase 5 — SEO / structured data / CMS ✅ HECHA
- [x] `StructuredData.tsx` — el `Offer`/`Service` del OfferCatalog pasa a la **Asesoría $4.990**
      (antes $19.990); FAQ de descuento y de costo reescritas; `HowTo` sin `totalTime: PT96H`,
      paso "Paga tu asesoría" → "Súmate a la lista de espera", paso "Recibe tu oferta en 48-96
      horas" → "Te avisamos"; `priceRange` → `$4.990 CLP`
- [x] `app/llms.txt/route.ts` — "Oferta Exclusiva $19.990" → "Waitlist de ofertas (registro sin
      costo)", link a `/?waitlist=1`, y regla explícita para las IA: **no atribuirle precio al
      servicio de negociación y no confundir "registro sin costo" con "servicio gratis"**
- [x] Sanity: `homePage.ts` (subtítulo y `cta1Href` → `/?waitlist=1`), `blogPost.ts` (CTA por
      defecto → "Súmate a la waitlist" → `/?waitlist=1`), y nota 🟡 STANDBY en los campos de
      precio de `siteSettings.ts` y `homePage.ts` para que ningún editor lo reintroduzca

## Fase 6 — Standby seguro del flujo pagado ✅ HECHA
- [x] `/solicitar` **oculta**: `robots: { index: false, follow: false }` en su metadata, sacada
      del `sitemap.ts` y agregada al `DISALLOW` de `robots.ts`. La página, `LeadForm`,
      `/api/checkout` (rama lead) y `app/api/auction/*` **siguen intactos** en el repo.
- [x] Su metadata ya no anuncia "$19.990" ni "48 a 96 horas" ni la garantía.
- [x] `npm test` (subasta) sigue verde: no se tocó esa lógica.

**Verificado en Fases 5-6:** `tsc` limpio · `next build` OK (293 páginas).

---

# Tareas manuales (fuera del repo)

- [ ] **n8n:** desactivar los nodos del flujo $19.990 — rama **CUSTOMERS** del flujo de ventas +
      los **flujos 1-5** de la subasta.
- [ ] **n8n:** crear el **workflow de waitlist** (webhook → Supabase → correo opcional).
- [ ] **Supabase:** crear tabla `waitlist` (nombre, email, teléfono, modelo, source, created_at).
- [ ] **Vercel:** agregar `N8N_WAITLIST_URL`.
- [ ] **Sanity:** ajustar hero/precio que vienen del CMS (si no, reintroducen el $19.990).
- [ ] **Dashboard** (`~/proyects/electrificarte-dashboard`): standby.

# Cómo reactivar la oferta (cuando Francisco lo diga)

1. `OFERTA_STANDBY = false` en `lib/products.ts` → los CTAs vuelven a `/solicitar`.
2. Reactivar en n8n los nodos del $19.990 y los flujos 1-5.
3. Revisar copy: los textos de Fase 3/4/5 fueron reescritos hacia waitlist; hay que decidir
   cuáles vuelven al mensaje de oferta.
4. `npm test` para confirmar que la subasta sigue sana (nunca se borró).
