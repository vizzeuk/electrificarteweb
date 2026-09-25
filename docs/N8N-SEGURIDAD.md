# Seguridad de los webhooks de n8n

## El problema

Los webhooks de n8n (`https://n8n.cadre.cl/webhook/...`) son URLs públicas. Hasta ahora
**cualquiera que conociera o adivinara la ruta** (`/webhook/waitlist`, `/webhook/reviews`) podía:
- meter filas falsas en Supabase (waitlist, reseñas, leads),
- disparar correos a nombre de Electrificarte a cualquier dirección (el `to` sale del payload),
- llenar la cola de moderación de Francisco con basura.

## La solución: un header secreto

La web manda en **cada** llamada a n8n el header `x-electrificarte-secret` con el valor de
`N8N_WEBHOOK_SECRET` (`lib/n8n.ts` → `n8nHeaders()`, usado por las 8 rutas que hablan con n8n).
Cada nodo Webhook de n8n valida ese header con una credencial **Header Auth**: sin el header
correcto responde **403** y el flujo no corre.

Estado:
- ✅ Web mandando el header (`N8N_WEBHOOK_SECRET` en Vercel production + preview y `.env.local`).
- ✅ `n8n/waitlist.json` y `n8n/reviews.json` generados con `authentication: headerAuth`.
- ⏳ Activarlo en los workflows vivos de n8n (pasos abajo).

## Orden: primero la web, después n8n

1. **Desplegar la web** con el header (push a master). n8n ignora headers que no espera, así
   que no se corta nada.
2. Recién ahí activar Header Auth en n8n. Al revés, cada formulario del sitio falla con 403
   hasta que se despliegue la web.

## Activarlo en n8n (una vez)

1. **Credentials → New → Header Auth**
   - Name: `Web Electrificarte (x-electrificarte-secret)`
   - Header name: `x-electrificarte-secret`
   - Header value: el valor de `N8N_WEBHOOK_SECRET` (Vercel → electrificarteweb → Settings →
     Environment Variables). **Nunca pegarlo en un JSON del repo.**
2. En cada nodo **Webhook** que recibe de la web → *Authentication: Header Auth* → elegir esa
   credencial → **guardar y reactivar el workflow**:

   | Workflow | Variable en Vercel que apunta ahí |
   |---|---|
   | Waitlist | `N8N_WAITLIST_URL` |
   | Reseñas | `N8N_REVIEWS_URL` |
   | Asesoría (pendiente, desde el checkout) | `N8N_ADVISORY_WEBHOOK_URL` |
   | Contacto y feedback | `N8N_CONTACT_URL` |
   | Newsletter | `N8N_NEWSLETTER_URL` |
   | Oferta / leads (🟡 standby) | `N8N_WEBHOOK_URL`, `N8N_LEAD_PAID_URL` |

3. **Verificar** (debe dar 403 sin header y 200 con header):
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' -X POST "$N8N_WAITLIST_URL" -d '{}'
   ```
   Y un registro real desde el sitio para confirmar que el camino feliz sigue andando.

## Lo que el header NO cubre

- **El webhook de pagos de Reveniu → n8n.** Reveniu no puede mandar nuestro header. Su
  protección es el nodo de verificación que ya existe: el `orderId` del pago tiene que coincidir
  con una fila `pendiente` creada por el checkout. Mejor aún: antes de activar, consultar el
  estado del pago a la API de Reveniu con ese `orderId`, en vez de confiar en el cuerpo del
  webhook. **No poner Header Auth en ese webhook** o se dejan de activar los pagos.
- **Webhooks que llaman otros sistemas** (sheet-sync ya usa su propio `x-sheet-sync-secret`;
  los flujos 1–5 de la subasta los llama n8n a la web, no al revés).

## Si se filtra el secreto

Generar uno nuevo (`openssl rand -hex 32`), cambiarlo en Vercel **y** en la credencial de n8n
casi al mismo tiempo, y redesplegar la web. Mientras no coincidan, los formularios fallan.
