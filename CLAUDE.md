@AGENTS.md

# Electrificarte — Contexto del proyecto

Plataforma B2B2C chilena de autos eléctricos e híbridos. Intermediario entre comprador y vendedores: negocia precios en volumen 

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
