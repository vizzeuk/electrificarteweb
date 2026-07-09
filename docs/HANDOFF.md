# Handoff — continuar en otro Mac

> Nota sobre por qué existe este archivo: las sesiones de Claude Code (CLI/VSCode) se guardan
> localmente en `~/.claude/projects/` de cada máquina — no se sincronizan automáticamente entre
> equipos. Antes de asumir que se perdió el contexto, en el Mac nuevo revisa si tu sesión aparece
> en **claude.ai/code** (si usas esa superficie web, ahí sí puede quedar listada). Si no aparece,
> este archivo es el respaldo confiable: contiene el resumen de todo lo hecho y el plan pendiente.

Última actualización: 2026-07-09.

---

## 1. Cómo retomar en el Mac nuevo

```bash
git clone https://github.com/vizzeuk/electrificarteweb.git
cd electrificarteweb
npm install
```

Después crea `.env.local` en la raíz (está en `.gitignore`, **nunca se sube al repo**) con las
variables listadas en la sección 2. Los *valores* reales pásalos por un canal seguro (gestor de
contraseñas, AirDrop, etc.) — nunca por git, Slack o email en texto plano.

Luego:

```bash
npm run dev          # servidor local en :3000
npx tsx --env-file=.env.local scripts/test-chat-flows.ts   # evals del chatbot WhatsApp
```

Studio de Sanity: `/studio` (mismo proyecto, dataset `production`).

**Nota de seguridad aparte:** el remote `origin` de este repo tiene un token de GitHub embebido
en la URL (`git remote -v` lo muestra). Eso vive solo en tu `.git/config` local, no se sube a
GitHub, pero conviene rotarlo/usar SSH o un credential helper en el Mac nuevo en vez de copiar esa
URL literal.

---

## 2. Variables de entorno necesarias (nombres — sin valores)

Sanity:
- `NEXT_PUBLIC_SANITY_PROJECT_ID` (`wd30r9b0`)
- `NEXT_PUBLIC_SANITY_DATASET` (`production`)
- `NEXT_PUBLIC_SANITY_API_VERSION` (`2025-01-01`)
- `SANITY_API_TOKEN` — token con permisos de escritura
- `SANITY_REVALIDATE_SECRET` — **pendiente**, aún no configurado ni en local ni en Vercel

n8n (formularios / leads):
- `N8N_WEBHOOK_URL`, `N8N_NEWSLETTER_URL`, `N8N_FEEDBACK_URL`, `N8N_CONTACT_URL`, `N8N_ADVISORY_WEBHOOK_URL`

Chatbot WhatsApp / Anthropic:
- `ANTHROPIC_API_KEY`
- `WHATSAPP_WEBHOOK_SECRET`
- `ADVISOR_SUBSCRIBE_URL`, `ADVISOR_DAILY_LIMIT`
- `KAPSO_API_KEY`, `KAPSO_API_BASE`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_WEBHOOK_SECRET`

Supabase (gating de suscripción por tier):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SUBSCRIPTION_TABLE` (`advisory_payments`, columna `phone`)
- `SUPABASE_OFERTA_TABLE` (`leads`, columna `telefono` vía `SUPABASE_OFERTA_PHONE_COLUMN`)
- `SUPABASE_VENDOR_TABLE` (`leads_vendors`, columna `telefono` vía `SUPABASE_VENDOR_PHONE_COLUMN`)
- `SUPABASE_PHONE_COLUMN` (default genérico, `phone`)

Redis (contexto de conversación + rate limit):
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (o `KV_REST_API_URL` / `KV_REST_API_TOKEN`
  si Vercel las inyecta con ese otro nombre)

Reveniu (pagos):
- `REVENIU_API_KEY`, `REVENIU_API_BASE`, `REVENIU_PLAN_ID`, `REVENIU_ADVISORY_PLAN_ID`

Otros:
- `ORDER_TOKEN_SECRET` — firma HMAC de cookies de orden
- `NEXT_PUBLIC_SITE_URL` / `SITE_URL`

Solo para correr los evals de WhatsApp localmente (no van en producción):
- `TEST_BASE_URL`, `TEST_PHONE`, `TEST_PHONE_ASESORIA`, `TEST_PHONE_OFERTA`, `TEST_PHONE_VENDEDOR`,
  `TEST_PHONE_NONE`, `TEST_PHONE_ASESORIA_EXPIRING`, `TEST_PHONE_ASESORIA_EXPIRED`, `TEST_PHONE_BOTH`

---

## 3. Qué se hizo en esta sesión (resumen cronológico)

1. **Auditoría de producción para 5.000+ usuarios concurrentes** — fixes críticos/altos/medios en
   API routes, ISR, RSC boundaries, security headers, error boundaries (`not-found.tsx`,
   `error.tsx`), rate limiting con Redis. Commits `bf7e101`, `f6a1ffb`, `1b132d8`.

2. **Integración del SDK de Kapso para el chatbot de WhatsApp** (commits `c987ecb`, `85bbdee`):
   - Tres tiers de suscripción: `asesoria` ($4.990, tabla `advisory_payments`), `oferta` ($19.990,
     tabla `leads` status=`pagado`), `vendedor` (tabla `leads_vendors`, bloqueado).
   - **Dirección correcta del upsell** (importante, se corrigió un malentendido inicial): el
     `$4.990` es asesoría para decidir qué auto comprar → desde ahí se puede recomendar el
     `$19.990` como siguiente paso. El `$19.990` es el formulario que ya tiene el auto decidido y
     busca el mejor precio en la red de vendedores → desde ahí **no** se ofrece nada más (ni el
     `$4.990` hacia atrás, ni el `$19.990` que ya tiene). Vendedores no reciben ninguna oferta de
     compra. Ver `lib/whatsapp/advisor.ts` (prompts `BASE_SYSTEM` / `OFERTA_SYSTEM`) y
     `lib/whatsapp/subscription.ts` (`resolveTier`).
   - Contexto de conversación persistido en Redis (TTL 7 días) para no perderlo tras ~1h de
     inactividad — `lib/whatsapp/context.ts`.
   - Webhook directo `/api/whatsapp/kapso` (reemplaza la dependencia de n8n para este flujo
     específico, justamente por el problema de pérdida de contexto).

3. **Fix de bug real en producción**: `leads` y `leads_vendors` usan la columna `telefono`, no
   `phone` — el gating de tier fallaba en silencio para esos dos tiers. Se agregaron
   `SUPABASE_OFERTA_PHONE_COLUMN` / `SUPABASE_VENDOR_PHONE_COLUMN` (default `telefono`). Commit
   `3393763`.

4. **30 flujos de eval del chatbot corridos contra números reales de Supabase — 30/30 en verde.**
   Quedan 3 flujos de edge case (caducidad de asesoría + tener ambos tiers a la vez) en `SKIP`
   porque faltan números de prueba con esos estados específicos en Supabase — ver sección 4.
   Script: `scripts/test-chat-flows.ts`.

5. **Fix del Sanity Studio** — `sanity.config.ts` tenía `S.documentTypeListItem("category")`
   apuntando a un tipo que ya no existe en el schema, tumbando el Studio con
   `Schema type with name "category" not found`. Commit `bf4423f`.

6. **Precio del formulario `/solicitar` en blanco** — el campo `formServicePrice` en el documento
   `homePage` de Sanity nunca se había poblado. Se fijó a `$19.990` directamente vía script.

7. **Etiqueta "Oferta limitada" hardcodeada → editable desde Sanity.** Antes era texto fijo
   repetido en 5 archivos (`HotDeal.tsx`, `PromoPopup.tsx`, `BrandPageContent.tsx`,
   `TipoPageContent.tsx`, `ElectricoPageContent.tsx`). Ahora es el campo
   `hotDealUrgencyLabel` en `siteSettings` (Sanity → Configuración del Sitio → General),
   con default no comprometedor: *"Bonos exclusivos por tiempo limitado"* — decisión explícita
   del usuario de no usar cantidades exactas ("quedan 3 unidades") que después no se puedan
   cumplir. Commit `27cf521`.

8. **Plan de trabajo para Fase 1.2** (ver sección 5 completa más abajo) — automatización de
   creación de PDPs vía WhatsApp + vigilancia de vigencia/precios de mercado. Quedó como
   documento (Artifact, ver enlace si sigue vigente en esta cuenta) y se copia completo acá para
   que sea portable entre máquinas.

---

## 4. Pendientes conocidos (heredados de CLAUDE.md + nuevos de esta sesión)

- WhatsApp hardcodeado como `+56912345678` en `components/layout/Navbar.tsx` (líneas ~215 y ~339)
  — reemplazar con el número real.
- `N8N_CONTACT_URL` en Vercel necesita la URL de producción (sin `-test`).
- `SANITY_REVALIDATE_SECRET` — agregar a Vercel (el endpoint `/api/revalidate` ya está preparado
  para rechazar todo si falta, así que hoy el webhook de revalidación de Sanity no funciona).
- 10 autos sin imágenes: Tesla Model Y, Chevrolet Blazer/Bolt/Equinox/Spark, Cupra Tavascan,
  JAC E-JS1/JS4, Skoda Elroq, Changan Hunter E.
- 11 marcas sin logo: DFSK, Deepal, GAC, GWM, Jaecoo, MINI, Nammi, Ora, Riddara, Skoda, Ssangyong.
- Configurar en Vercel: `KAPSO_WEBHOOK_SECRET`, `SUPABASE_OFERTA_TABLE=leads`,
  `SUPABASE_VENDOR_TABLE=leads_vendors`, `SUPABASE_SUBSCRIPTION_TABLE=advisory_payments`,
  `SUPABASE_OFERTA_PHONE_COLUMN=telefono`, `SUPABASE_VENDOR_PHONE_COLUMN=telefono` (si no están ya).
- Configurar el webhook de Kapso para apuntar a `/api/whatsapp/kapso` en producción.
- Crear en Supabase 3 números de prueba para los flujos de eval en `SKIP`:
  `TEST_PHONE_ASESORIA_EXPIRING` (asesoría con `expires_at` = mañana),
  `TEST_PHONE_ASESORIA_EXPIRED` (asesoría con `expires_at` = ayer),
  `TEST_PHONE_BOTH` (activo en `advisory_payments` **y** en `leads` con `status=pagado`).

---

## 5. Plan de trabajo — Fase 1.2 (completo)

### Contexto y decisión de arquitectura

Fase 1.1 (la web completa) ya está lista. Fase 1.2 son dos flujos nuevos, ambos pensados para que
**Francisco los autogestione desde un solo chat de WhatsApp**:

- **Flujo A** — Francisco manda el nombre de un modelo nuevo → un agente de IA investiga specs
  reales en el sitio oficial de la marca → completa la ficha (PDP) en Sanity → sube fotos
  candidatas → Francisco aprueba o corrige por WhatsApp antes de publicar.
- **Flujo B** — revisión periódica de vigencia (¿el modelo sigue vendiéndose en Chile?) y de
  precio (¿seguimos siendo más baratos que el mercado?) con ajustes que Francisco aprueba, no que
  el sistema aplica solo.

**Decisión de arquitectura — n8n vs. código propio:**

El chatbot de clientes ya se sacó deliberadamente de n8n (ver sección 3, punto 2) porque n8n
perdía el contexto conversacional tras ~1h. Ese mismo problema aplica al Flujo A: crear una PDP es
una tarea con estado (Francisco corrige un dato, pide otra versión, aprueba fotos). Por eso:

- **Flujo A → código propio**, extendiendo el bot de WhatsApp que ya existe (Kapso + Claude +
  Redis) con un "modo administrador" que solo responde al número de Francisco (mismo canal, otro
  cerebro — gating por número emisor, no por contenido del mensaje).
- **Flujo B → n8n**, porque es tarea programada y por lotes (recorrer ~120 autos una vez por
  semana, con reintentos y log de corridas) — ahí n8n sí aporta valor real. n8n solo dispara un
  cron y llama a un endpoint propio (`/api/admin/price-check`); la lógica de scraping y
  comparación vive en el repo, no en nodos de n8n, para que sea testeable.

### Flujo A — Creación automática de PDP (paso a paso)

1. **Detección de intención + admin gating.** El webhook `/api/whatsapp/kapso` ya existe. Se
   agrega una verificación previa: si el número emisor está en un allowlist
   (`ADMIN_PHONE_NUMBERS`), la conversación se enruta a un handler distinto del asesor de
   clientes.
2. **Investigación con IA.** Un agente Claude con tool-use (mismo patrón que
   `lib/whatsapp/tools.ts`) recibe marca + modelo y usa: búsqueda web nativa para ubicar la ficha
   oficial en Chile, y un scraper con Playwright (ya está en `package.json`, ya se usó así en
   `scripts/fetch-cars-spa.ts`) para extraer specs estructuradas — motor, batería, autonomía WLTP,
   versiones y precios, equipamiento.
3. **Mapeo a los ~60 campos del schema** (`sanity/schemas/car.ts`), por grupos: general, specs,
   `versions[]` (una entrada por versión), carga, seguridad, equipamiento. Cada campo sin dato
   confiable queda vacío, nunca inventado — mismo principio de groundedness que ya rige al asesor
   de clientes.
4. **Fotos candidatas.** El scraper baja imágenes de la sala de prensa / sitio oficial y las sube
   como assets de Sanity (`client.assets.upload`, patrón ya probado en
   `scripts/patch-audi-photos.ts`). El documento se crea con `hidden: true` (campo que ya existe
   en el schema) — nada se publica hasta que Francisco lo revisa.
5. **Aprobación conversacional.** El estado del borrador se guarda en Redis bajo el número de
   Francisco (mismo patrón que `lib/whatsapp/context.ts`). Sus correcciones se aplican como
   `patch()` incrementales. Responder "PUBLICAR" cambia `hidden` a `false`.

### Flujo B — Vigencia y precios de mercado (paso a paso)

1. Cron de n8n dispara semanalmente (día/hora configurable).
2. n8n llama `/api/admin/price-check` — toda la lógica vive en el repo.
3. Por cada auto: Playwright visita el sitio oficial de la marca en Chile — ¿sigue en el
   catálogo? ¿cambió el precio de lista?
4. Comparación: precio oficial vs. nuestro `discountPrice` actual → se calcula una propuesta de
   ajuste, nunca se aplica directo.
5. n8n llama la API de envío de Kapso con un digest semanal a Francisco (ej: "🔴 Chevrolet Bolt
   EUV ya no aparece en el sitio oficial", "🟡 MG4 Electric subió de precio", "🟢 Ioniq 5 sin
   cambios"). Francisco responde con el número del auto + su decisión.

**Dos decisiones de negocio pendientes que el plan no puede resolver solo:**

- **Fuentes de comparación de precio.** El sitio oficial de cada marca en Chile es la fuente más
  confiable para precio de lista y vigencia (bajo riesgo legal, siempre pública). Comparar contra
  marketplaces de terceros añade valor pero requiere elegir 2-3 sitios concretos y validar que no
  bloquean scraping. Sin definición → arrancar solo con sitios oficiales de marca.
- **Regla de ajuste de precio.** "Poner precios más bajos que el mercado" necesita un número:
  ¿% fijo bajo el precio de mercado? ¿monto fijo (ej. $300.000 menos)? ¿con piso de margen mínimo?
  Propuesta: dejarlo como valor configurable (`undercutAmount`) que el sistema usa solo para
  *proponer* — la aplicación real siempre pasa por aprobación de Francisco en v1.

### El rol exacto de n8n (tabla de responsabilidades)

| Responsabilidad | Dónde vive | Por qué |
|---|---|---|
| Recibir el mensaje de Francisco y conversar | Código propio | Necesita estado conversacional multi-turno |
| Investigar el modelo (web + scraping) | Código propio | Razonamiento agéntico con herramientas encadenadas |
| Escribir/editar en Sanity | Código propio | Mismo cliente y guardrails que los scripts existentes |
| Disparar la revisión semanal de precios | n8n (Cron) | Fortaleza real de n8n: programación + reintentos + historial |
| Orquestar el scraping de precios por auto | Código propio, llamado por n8n | Un endpoint testeable en vez de lógica repartida en nodos |
| Notificar a Francisco por WhatsApp | n8n → API de Kapso | n8n ya sabe hacer llamadas HTTP salientes con reintentos |

### Cambios de infraestructura necesarios

Ya existe, se reusa tal cual:
- Campo `hidden` en `car.ts` → gate de "borrador vs. publicado"
- Webhook `/api/whatsapp/kapso` y el adapter de Kapso
- `lib/whatsapp/context.ts` → patrón de estado en Redis, reusado para el borrador en revisión
- Playwright + `client.assets.upload` → ya probado en scripts de importación de fotos

Se agrega:
- `ADMIN_PHONE_NUMBERS` — allowlist de números con acceso al modo administrador
- Campos de auditoría en `car.ts` (grupo nuevo "🤖 IA"): `aiGenerated`, `sourceUrls[]`,
  `lastPriceCheckAt`
- `/api/admin/pdp-research` — endpoint que ejecuta la investigación + escritura del borrador
- `/api/admin/price-check` — endpoint que ejecuta la revisión semanal, llamado por n8n

### Seguridad y control de costos

- Allowlist estricta de número — el modo administrador nunca se activa por contenido del mensaje,
  solo por número emisor verificado vía Kapso.
- Los endpoints `/api/admin/*` no quedan públicos — exigen el mismo secreto compartido que ya
  protege `/api/whatsapp/advisor` y `/api/revalidate`.
- Presupuesto de tokens por corrida — igual que la cuota diaria del asesor de clientes
  (`lib/whatsapp/quota.ts`), tope de iteraciones de herramientas por investigación.
- Nada se publica sin aprobación explícita en v1 — ni fichas nuevas, ni cambios de precio.

### Secuencia de construcción sugerida

- **M1** — Investigación + borrador (sin fotos, sin WhatsApp). Script CLI que recibe marca+modelo
  y crea el documento en Sanity con `hidden: true`. Valida el mapeo de campos antes de meter el
  canal conversacional.
- **M2** — Pipeline de fotos. Se agrega búsqueda y subida de imágenes candidatas al borrador.
- **M3** — Modo administrador en WhatsApp. Se conecta M1+M2 al bot existente, con allowlist de
  número y loop de aprobación/corrección conversacional.
- **M4** — Revisión de vigencia y precios. Endpoint `price-check` + workflow de n8n + digest
  semanal por WhatsApp. Arranca con fuentes oficiales de marca únicamente.
- **M5** (futuro) — Fuentes de mercado ampliadas + auto-ajuste opcional, una vez validado M4.

### Preguntas abiertas para Francisco / el usuario

1. ¿Confirmar el número de WhatsApp de Francisco para el allowlist de administrador?
2. Flujo B: ¿arrancar solo con sitios oficiales de marca, o hay 2-3 sitios de comparación
   (marketplaces/competencia) ya en mente?
3. Regla de ajuste de precio: ¿% fijo, monto fijo, o con piso de margen mínimo?
4. Cadencia del Flujo B: ¿semanal está bien, o otra frecuencia?

---

## 6. Próximo paso sugerido al retomar

Con las respuestas a las 4 preguntas de la sección 5, empezar por **M1**: un script de línea de
comandos (`scripts/`) que reciba marca+modelo, use Claude con tool-use (web search + Playwright)
para investigar, y cree el documento `car` en Sanity con `hidden: true`. Validar el mapeo de
campos manualmente en Studio antes de conectar WhatsApp.
