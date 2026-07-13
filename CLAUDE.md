@AGENTS.md

# Electrificarte — Contexto del proyecto

Plataforma B2B2C chilena de autos eléctricos e híbridos. Intermediario entre comprador y vendedores: negocia precios en volumen 

## Modelo de negocio

Electrificarte es un marketplace de vehículos **electrificados**: 100% eléctricos e híbridos en
cualquiera de sus variantes (BEV, PHEV, HEV, MHEV, REEV). El alcance excluye únicamente autos
100% a combustión (sin ningún tipo de batería) — todo lo demás (cualquier auto con batería) sí
aplica. Esto ya está bien reflejado en el código actual (calculadora, PDPs, filtros); no cambiar
ese alcance.

Tres flujos de negocio, dos de ellos viven en esta web:

### 1. Oferta Exclusiva — $19.990 (flujo principal de electrificarteweb)
El usuario busca su auto en el catálogo y llena el formulario principal (`/solicitar`), paga
$19.990. Con eso, Electrificarte busca dentro de su red de **vendedores oficiales** (nunca
"concesionarios" — ver Terminología abajo) la mejor oferta disponible para ese modelo específico:
un precio mejor que el de lista/nacional. El objetivo es que el descuento conseguido valga
claramente más que los $19.990 pagados. (Futuro, no implementado: códigos promocionales/de
descuento — no confundir con el alcance actual.)

### 2. Asesoría IA — $4.990 (chatbot de WhatsApp)
Para el usuario indeciso que no sabe qué auto comprar. Tras pagar, conversa por WhatsApp con el
asesor ("Francisco IA", ver `lib/whatsapp/advisor.ts`) que ayuda a decidir en base a uso,
kilometraje, presupuesto y perfil. Puede recomendar el paso siguiente hacia la Oferta Exclusiva
($19.990) una vez que el cliente tiene claro el modelo.

### 3. Suscripción de vendedores — $12.990/mes (plataforma separada, NO vive en este repo)
Los vendedores oficiales pagan $12.990 para acceder a los leads generados por los flujos 1 y 2
(personas interesadas en un modelo específico). De la red de vendedores asociados (~15 hoy),
pueden tomar un lead y ofrecerle un precio mejor que el oficial de lista. Esto corre en una
plataforma/sitio aparte — este repo (`electrificarteweb`) solo produce y expone los leads
(tablas `leads` / `leads_vendors` en Supabase), no gestiona el flujo de vendedores.

**Cómo se reparten y cierran los leads de Oferta Exclusiva ($19.990):** el pool de leads
disponibles (pagados, aún sin vendedor) es **visible para todos los vendedores activos por
igual** — no hay asignación 1:1 automática. Cualquier vendedor puede "ofertar" sobre un lead
disponible; al hacerlo, la oferta se envía al cliente **por WhatsApp**, y de ahí en adelante la
negociación y el cierre del trato ocurren directamente por ese canal (WhatsApp), fuera de la
plataforma. Electrificarte no media ni registra el cierre real del trato — solo entrega el
contacto y la oportunidad. Esto es relevante para cualquier dashboard/herramienta de vendedores:
el pool de "disponibles" debe ser compartido, no filtrado por vendedor asignado.

**Este repo es responsable de:** catálogo público, comparador, calculadora de ahorro, formularios
de los flujos 1 y 2, y el chatbot básico embebido en el sitio (FAQ + recomendar la Asesoría paga
— distinto del asesor de WhatsApp de pago).

## Terminología — reglas de contenido
Aplican a todo texto de cara al usuario: copy del sitio, contenido de Sanity, prompts del
chatbot/asesor, legal (Términos, Privacidad), structured data.

- ❌ **"concesionario(s)"** → ✅ **"vendedores oficiales"**. No trabajamos con concesionarios como
  entidad — trabajamos con vendedores individuales asociados que buscan mover inventario adicional
  al de su concesionario respectivo. (Hoy "concesionario" aparece en ~25 archivos — meta tags,
  `/terminos`, `/privacidad`, FAQ schema en `StructuredData.tsx`, homepage de Sanity, testimonios,
  blog, prompt del asesor de WhatsApp. Corrección pendiente, no aplicada aún.)
- "Electrificarte" es nombre de marca — no usarlo como adjetivo genérico. Para la categoría de
  vehículo usar **"electrificado/a"** (ej. "vehículos electrificados"), nunca variantes que usen
  el nombre de marca como adjetivo.

## Flujo de pagos — n8n + Supabase + Reveniu/Transbank
Los tres productos (Oferta $19.990, Asesoría $4.990, y la suscripción de vendedores $12.990/mes
que corre en otra plataforma) comparten el mismo patrón de activación:

1. El formulario en el sitio (`/solicitar` para Oferta, `/asesoria/contratar` para Asesoría)
   manda los datos a `/api/checkout` (`app/api/checkout/route.ts`), que:
   - Genera un `orderId` único (`crypto.randomUUID()`).
   - Crea el cobro en Reveniu (`REVENIU_PLAN_ID` o `REVENIU_ADVISORY_PLAN_ID` según `type`) con
     `external_id: orderId`.
   - Manda el registro a n8n como **"pendiente"** (`N8N_WEBHOOK_URL` para Oferta,
     `N8N_ADVISORY_WEBHOOK_URL` para Asesoría) — n8n lo guarda en Supabase (Postgres) en ese
     estado, identificado por `orderId`.
   - Deja una cookie firmada (`ec_order`, HMAC vía `lib/order-token.ts`) + `ec_order_type` para
     que la página de gracias sepa qué copy mostrar y quién puede verla.
   - Devuelve `completionUrl` + `securityToken`.
2. El navegador hace un `POST` directo con `TBK_TOKEN=securityToken` a `completionUrl` — pasa
   derecho a Transbank, sin pasar por una UI hosteada de Reveniu (los datos ya se recolectaron en
   nuestro formulario). Ver el patrón en `components/forms/LeadForm.tsx` /
   `components/forms/AsesoriaCheckoutForm.tsx`.
3. Cuando Transbank confirma el pago, Reveniu dispara su propio webhook de eventos a n8n,
   trayendo el mismo `orderId`.
4. Un nodo de verificación en n8n compara que el `orderId` del webhook de pago coincida con el
   del formulario antes de activar la fila: pasa de "pendiente" a confirmado/activo en Supabase
   (`leads.status = "pagado"` para Oferta, tabla `advisory_payments` para Asesoría — ver
   `lib/whatsapp/subscription.ts`).
5. `/solicitar/gracias` lee la cookie `ec_order` (rechaza con 404 si no es válida — nadie puede
   llegar ahí sin haber pasado por el checkout) y `ec_order_type` para mostrar el copy correcto
   según el producto. `/solicitar/pago-rechazado` hace lo mismo para reintentar en el formulario
   correcto.

**Importante:** antes de este flujo, la Asesoría $4.990 no tenía formulario propio — el chatbot
mandaba un link directo a un checkout-link externo de Reveniu, donde la persona llenaba sus datos
en la página de Reveniu. Ya se igualó al patrón de Oferta (ver `/asesoria/contratar`).

La suscripción de vendedores ($12.990/mes) sigue la misma lógica general de n8n + Supabase, pero
corre en una plataforma aparte — fuera de este repo.

## Diseño — regla dura
No modificar la línea de diseño existente (tipografías, colores, espaciados — ver `DESIGN.md`)
sin autorización explícita. Sí se pueden introducir componentes UI nuevos que aporten valor
visual, siempre dentro de esa misma línea (Space Grotesk / Inter, cyan `#00E5E5` como acento
primario, fondos negro/blanco, `rounded-xl`/`rounded-2xl`, `py-24`).

## Stack
- Next.js 16.2.2 App Router · React 19.2.4 · Tailwind v4 · Framer Motion 12 · Sanity v5 · TypeScript
- Node.js 22

## Sanity
- Project ID: `wd30r9b0` · Dataset: `production` · API version: `2025-01-01`
- Studio en `/studio`
- Datos: ~120 autos · 49 marcas · logos subidos para 39 marcas

## Colores (Tailwind custom tokens)
- `primary` = `#00E5E5` (cyan)
- `primary-deep` = `#006A61`
- `amber` = `#F59E0B`
- Fondos hero/secciones: negro (`bg-black`)

## Tipografía
- Headline: Space Grotesk (`font-headline`)
- Body: Inter

## Rutas públicas
`/` · `/marcas` · `/marcas/[slug]` · `/auto/[slug]` · `/tipo/[slug]` · `/electrico/[slug]` · `/coleccion/[slug]` · `/comparador` · `/solicitar` · `/contacto` · `/blog` · `/blog/[slug]` · `/studio`

## Patrones importantes
- Scripts de datos: `npx tsx --env-file=.env.local scripts/[nombre].ts`
- ISR: `export const revalidate = 60` en todas las páginas SSG
- Imágenes de Sanity: `logo.asset->url` en GROQ para obtener la URL directa
- Scripts en `scripts/` usan `@sanity/client` directamente con token de escritura

## Chatbot WhatsApp — Flujos de suscripción (Kapso SDK)

Tres tiers, cada uno con su propio comportamiento. La tabla Supabase determina el tier en cada mensaje.

| Tier | Tabla Supabase | Servicio | Comportamiento del bot |
|---|---|---|---|
| `asesoria` | `advisory_payments` | Asesoría IA $4.990 | Ayuda a decidir qué auto comprar. Puede y debe recomendar el $19.990 como siguiente paso natural una vez que el cliente tiene claro el modelo. |
| `oferta` | `leads` (status=`pagado`) | Oferta Exclusiva $19.990 | Esta persona ya decidió qué auto quiere y espera precio de la red de vendedores. El bot resuelve dudas técnicas del modelo elegido. ❌ No menciona $4.990 (ya pasó esa etapa) ni $19.990 (ya lo tiene). |
| `vendedor` | `leads_vendors` | Plataforma vendedores | Canal incorrecto. Responde con mensaje de redirección a vendedores@electrificarte.com. ❌ Ninguna oferta de compra. |
| `null` | — | Sin suscripción | Muestra mensaje invitando a contratar la asesoría. |

**Prioridad de resolución**: `vendedor` > `oferta` > `asesoria` (si alguien tiene ambas, prevalece la etapa más avanzada).

**Contexto persistente**: el historial de conversación se guarda en Redis (TTL 7 días). Esto evita la pérdida de contexto tras ~1h de inactividad en la API de Kapso.

**Webhook Kapso**: apunta a `/api/whatsapp/kapso`. Variables necesarias en Vercel: `KAPSO_WEBHOOK_SECRET`, `SUPABASE_OFERTA_TABLE=leads`, `SUPABASE_VENDOR_TABLE=leads_vendors`, `SUPABASE_SUBSCRIPTION_TABLE=advisory_payments`.

**Recordatorio "queda 1 día" (asesoría $4.990)**: la asesoría dura exactamente 10 días desde el pago. En el día 9 (1 día restante) un cron diario (`vercel.json` → `/api/cron/asesoria-reminder`) envía un mensaje proactivo por WhatsApp. Lógica: `lib/whatsapp/lifecycle.ts` (selecciona filas de `advisory_payments` con activación hace 9-10 días) + `lib/whatsapp/outbound.ts` (envío Kapso) + dedup en Redis (`wa_day9_sent:<phone>`, TTL 3 días).
- **Prerequisitos externos para que envíe de verdad**: (1) la tabla `advisory_payments` debe tener columna de fecha de activación (`SUPABASE_SUBSCRIPTION_CREATED_COLUMN`, default `created_at`); (2) por la ventana de 24h de WhatsApp, el mensaje casi siempre cae fuera de ventana → se necesita una **plantilla aprobada** en Kapso/Meta (`ASESORIA_REMINDER_TEMPLATE`, idioma `ASESORIA_REMINDER_TEMPLATE_LANG`). Sin plantilla, cae a texto libre y solo llega a quienes escribieron en las últimas 24h.
- **Env vars**: `CRON_SECRET` (auth del cron), `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `ASESORIA_REMINDER_TEMPLATE`. Opcionales: `ASESORIA_WINDOW_DAYS` (10), `ASESORIA_REMINDER_DAY` (9), `KAPSO_BASE_URL`.
- **Limitación**: si el cron no corre un día (outage), esa cohorte se pierde (la ventana es de 1 día). Aceptable para un nudge.

## Pendientes conocidos
- WhatsApp hardcodeado como `+56912345678` en `components/layout/Navbar.tsx` (líneas ~215 y ~339) — reemplazar con número real
- `N8N_CONTACT_URL` en Vercel necesita URL de producción (sin `-test`)
- 10 autos sin imágenes: Tesla Model Y, Chevrolet Blazer/Bolt/Equinox/Spark, Cupra Tavascan, JAC E-JS1/JS4, Skoda Elroq, Changan Hunter E
- 11 marcas sin logo: DFSK, Deepal, GAC, GWM, Jaecoo, MINI, Nammi, Ora, Riddara, Skoda, Ssangyong

## Variables de entorno necesarias (.env.local)
```
NEXT_PUBLIC_SANITY_PROJECT_ID=wd30r9b0
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=[token con permisos de escritura]
N8N_CONTACT_URL=[url del webhook n8n]
```
