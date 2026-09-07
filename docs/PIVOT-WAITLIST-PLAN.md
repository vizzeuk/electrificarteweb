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

## Fase 0 — Infra de waitlist ⬜
Base de todo lo demás.
- [ ] `OFERTA_STANDBY` en `lib/products.ts`
- [ ] `WaitlistProvider` + `WaitlistModal` global (montar en el layout). Cáscara reusada de
      `components/layout/PromoPopup.tsx` (overlay, `AnimatePresence`, cerrar, click-outside).
- [ ] Formulario dentro del popup: base `components/forms/AsesoriaCheckoutForm.tsx`
      (nombre/email/teléfono) + `CarCombobox` de `LeadForm.tsx` para modelo (opcional).
      Copy: *"Únete a la waitlist de electrificarte.com y consigue la mejor oferta en autos
      electrificados"* · botón *"Unirme a la waitlist"*.
- [ ] Hook `useWaitlist().open(prefill?)` — `prefill` con auto (slug/nombre) desde PDP/cards.
- [ ] `app/api/waitlist/route.ts` — calcado de `app/api/newsletter/route.ts` (zod + rate limit)
      → `N8N_WAITLIST_URL`, con `source` para saber de dónde vino el lead.

## Fase 1 — Hero ⬜
`components/layout/Hero.tsx` (CTAs en L102-130):
- [ ] Invertir: primario = Asesoría $4.990 (hoy L117-129, `advCtaHref`); secundario = waitlist.
- [ ] Sacar `offerPrice` "$19.990" (L47) y el subtítulo "Pagas $19.990 y negociamos por ti" (L112)
- [ ] Sacar microcopy de garantía/devolución (L134) y reescribir `offerSubtitle` (L42)

## Fase 2 — Retargetear los ~40 CTAs ⬜
Todos → popup de waitlist (con prefill del auto donde aplique).

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

## Fase 3 — Copy y secciones que venden la oferta ⬜
- [ ] `HowItWorks.tsx` — track "Oferta · $19.990" (L90), `OFERTA_STEPS` (L24-50), step 02 (L36), puente (L224-227)
- [ ] `StickyCTA.tsx` — L60, L63 ("$19.990 único · Si no ahorras, te devolvemos todo")
- [ ] `PromoPopup.tsx` (L146,184-188) · `HotDeal.tsx` (L124,172)
- [ ] `FAQ.tsx` — answer L22, botón L171 ("Quiero mi oferta · $19.990")
- [ ] `Testimonials.tsx` — quotes L22,L23 (mencionan "oferta en 48h")
- [ ] `nosotros/page.tsx:62` ("Oferta Exclusiva · $19.990")

## Fase 4 — Chatbots ⬜
- [ ] **WhatsApp** `lib/whatsapp/advisor.ts` `BASE_SYSTEM`: sacar sección $19.990 (L25-31),
      mandato de compartir `/solicitar` (L33), L61, L65, L68 y los CASOS 1-10 (L79-117).
      Reemplazar por: promover **waitlist** + reforzar **Asesoría $4.990**.
- [ ] `OFERTA_SYSTEM` (L125-149): dejar para clientes que ya pagaron (no entran nuevos).
- [ ] **Web** `app/api/chat/route.ts`: "DOS PRODUCTOS" (L331-334), rutas (L341),
      `handleRecommendation` (L224-228), `fallbackMessage` (L439).
- [ ] `public/ev-chat-widget.js`: `CONTACT_MENU` (L627); mantener upsell asesoría (L594,876).
- [ ] `lib/whatsapp/bot.ts` `subscribeMessage` (L41-48, tier `null`) → waitlist + asesoría.
- [ ] Actualizar `scripts/test-chat-flows.ts` y `scripts/test-site-chat-flows.ts` (asertan "$19.990").

## Fase 5 — SEO / structured data / CMS ⬜
- [ ] `components/layout/StructuredData.tsx` — L52, L85, L101, L125, L138, L144, L174
- [ ] `app/llms.txt/route.ts` — L74-82, L98, L109
- [ ] Sanity: `sanity/schemas/homePage.ts` (L36,74,81) · `siteSettings.ts` (L52-58) ·
      `blogPost.ts` (L137,145) · seed `scripts/setup-home.ts` (L206,215)
- [ ] `app/sitemap.ts:17` y `app/robots.ts:12-14` (sacar `/solicitar`)

## Fase 6 — Standby seguro del flujo pagado ⬜
- [ ] Ocultar `/solicitar` (sin CTAs; decidir noindex/redirect)
- [ ] Verificar que `npm test` (subasta) siga verde — el código no se toca, solo se deja sin uso
- [ ] `metadata` de `solicitar/page.tsx` (L11,15) fuera de indexación

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
