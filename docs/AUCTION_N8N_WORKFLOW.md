# n8n — Subasta inversa, nodo por nodo

Traducción del diagrama de Miro a workflows de n8n. La **lógica** vive en la web
principal (endpoints); n8n **orquesta y notifica**. Este doc es para diagramarlo
nodo por nodo; cuando esté confirmado, se puede generar el JSON importable.

## Credenciales a cargar en n8n

| Credencial | Valor | Uso |
|---|---|---|
| `SITE_URL` | https://electrificarte.com | base de los endpoints |
| `ADMIN_API_SECRET` | (el de Vercel) | header `x-admin-secret` de todos los endpoints |
| `KAPSO_API_KEY` + `KAPSO_PHONE_NUMBER_ID` | (los de Vercel) | envío WhatsApp |
| `RESEND_API_KEY` + remitente verificado | ⬜ **falta crear** | envío correo |
| `SUPABASE_URL` + `SERVICE_ROLE_KEY` | (los de Vercel) | leer/actualizar estados |

## ⚠️ Trampa de WhatsApp (define el diseño de notificaciones)

Fuera de la **ventana de 24 h** de WhatsApp solo se puede enviar con **plantillas
aprobadas** por Meta (no texto libre). Los mensajes de la subasta son generados
por IA (largos, dinámicos) → **no** se pueden mandar como texto libre en frío.
Dos caminos:
1. **Dentro de sesión** (el vendedor/cliente escribió en las últimas 24 h): se
   manda el texto de IA tal cual (nodo `type: text`).
2. **En frío**: plantilla aprobada con estructura fija + variables acotadas
   (precio, modelo, nº de ofertas), no el texto completo de IA. Hay que crear y
   aprobar estas plantillas en Kapso/Meta: `nuevo_lead_vendedor`,
   `ofertas_cliente`, `presion_vendedor`, `lead_perdido`, `oferta_exitosa`.

Recomendación: plantilla en frío que invite a abrir la conversación; una vez en
sesión, mandar el detalle de IA.

## Nodos reutilizables

**HTTP → endpoint de la web principal** (mismo patrón en todos):
- Method: `POST` · URL: `{{$env.SITE_URL}}/api/auction/<endpoint>`
- Headers: `x-admin-secret: {{$env.ADMIN_API_SECRET}}`, `Content-Type: application/json`
- Body (JSON): según el endpoint.

**HTTP → Kapso (enviar WhatsApp):**
- `POST https://api.kapso.ai/meta/whatsapp/v24.0/{{$env.KAPSO_PHONE_NUMBER_ID}}/messages`
- Headers: `X-API-Key: {{$env.KAPSO_API_KEY}}`, `Content-Type: application/json`
- Body en sesión (texto): `{ "messaging_product":"whatsapp", "to":"<telefono>", "type":"text", "text":{ "body":"<mensaje>" } }`
- Body en frío (plantilla): `{ "messaging_product":"whatsapp", "to":"<telefono>", "type":"template", "template":{ "name":"<plantilla>", "language":{"code":"es"}, "components":[...] } }`

**HTTP → Resend (enviar correo):**
- `POST https://api.resend.com/emails`
- Headers: `Authorization: Bearer {{$env.RESEND_API_KEY}}`
- Body: `{ "from":"Electrificarte <no-reply@electrificarte.com>", "to":["<email>"], "subject":"...", "html":"<mensaje>" }`

---

## Workflow 1 — Lead nuevo → notificar vendedores

Del Miro: *cliente pide auto → aparece disponible → notificación correo + WhatsApp*.

1. **Trigger**: **se encadena al flujo de pagos existente**. El webhook de pago
   (Reveniu→n8n) ya hace un switch por tipo (vendedor / cliente / asesoría) y
   marca `pagado` en Supabase. En la rama **"cliente"**, después de marcar
   `pagado`, se continúa con los nodos de abajo usando ese `leadId`. Sin cambios
   en el dashboard.
2. **HTTP → `/api/auction/match`** · body `{ "leadId": {{leadId}} }` → devuelve
   `eligible[]` (vendorId, nombre, telefono, email, cercania).
3. **Split In Batches / Loop** sobre `eligible`.
4. **HTTP → Kapso** (plantilla `nuevo_lead_vendedor`, variables: modelo del lead).
5. **HTTP → Resend** (correo al `email` del vendedor).

## Workflow 2 — Vendedor pujó → evaluar

Del Miro: *generar oferta por puja → (motor de notificaciones) → ¿ganó?*.

1. **Trigger: Supabase Database Webhook** al insertar una fila en `ofertas`.
   El dashboard está muy MVP y no llama nada, así que Supabase dispara el POST a
   n8n automáticamente en cada `INSERT` (payload con `leadId`/`offerId`). Cero
   dependencia del dashboard.
2. **HTTP → `/api/auction/evaluate`** · body `{ "leadId": {{leadId}} }` → recalcula
   y persiste score/estado de todas las pujas del lead; devuelve `ranking`.
3. **(Opcional) Presión**: para los que no lideran, ver Workflow 3.

## Workflow 3 — Presión al vendedor (mientras la ventana está abierta)

Del Miro: *generar presión (IA) → WhatsApp + correo*.

1. **Trigger**: al recibir una puja (encadenado a WF2) o un **Schedule** cada X h
   mientras la ventana no cierra.
2. Para cada oferta que no va primera en `ranking`:
   **HTTP → `/api/auction/message/pressure`** · body `{ "offerId": "<uuid>", "horasRestantes": <n> }`
   → devuelve `message` (anclado a señales reales).
3. **HTTP → Kapso** + **HTTP → Resend** con ese `message`.

## Workflow 4 — Enviar ofertas al cliente (lo antes posible)

Del Miro: *notifica → se manda oferta a cliente → ¿acepta?*.

**No hay ventana larga** — modelo de agente negociador: apenas hay una puja
válida bajo el precio publicado, se corre 1 ronda de presión (WF3), se espera
la contra-oferta un tiempo corto (**definir: 30 min / 1 h / 2 h**) y se manda al
cliente. Si llega una puja mejor antes de que el cliente acepte, se re-evalúa.

1. **Trigger**: `Wait` (el tiempo de espera de la contra-oferta) encadenado desde
   la primera puja válida; o re-disparo si entra una mejor.
2. **HTTP → `/api/auction/evaluate`** (evaluación final) → `ranking`.
3. **HTTP → `/api/auction/message/client`** · body `{ "leadId": {{leadId}}, "top": 2 }`
   → devuelve `message` (comparación de las 1–2 mejores) + `offerIds`.
4. **HTTP → Kapso** (al `telefono` del lead) + **HTTP → Resend** (al `email`).
5. **Supabase (update)**: marcar las `offerIds` como `ganadora`; el resto quedan
   para el Workflow 6.

## Workflow 5 — Cliente responde (acepta / no)

Del Miro: *¿acepta? sí → mensaje + OOS; no → recuperación → devolución*.

1. **Trigger**: Kapso inbound (el cliente responde por WhatsApp). Parsear la
   intención (aceptar / rechazar / dudar) — puede apoyarse en el bot existente.
2. **Sí acepta**:
   - **Kapso/Resend** al cliente y al vendedor ganador ("oferta exitosa")
     (`/api/auction/...` no genera este texto aún — usar plantilla).
   - **Supabase**: oferta ganadora → `aceptada`.
   - **Wait X h** → preguntar por WhatsApp si la venta se concretó (OOS).
3. **No acepta**:
   - **Flujo de recuperación** (cambiar modelo): reingresar el lead al embudo.
   - Si tras recuperación tampoco → **devolución de plata** (proceso manual/n8n).

## Workflow 6 — Vendedores perdedores → lead perdido

Del Miro: *notifica lead perdido + menciona valor de oferta ganadora (anonimizado)*.

1. Tras elegir ganadora (WF4): para las ofertas `perdida`,
   **Kapso/Resend** con plantilla `lead_perdido` incluyendo el **valor de la
   oferta ganadora anonimizado** (dato real, sin identidad).

---

## Decisiones — estado

- ✅ **Ventana**: no hay ventana larga (modelo negociador). Falta solo el
  **tiempo de espera de la contra-oferta** del vendedor (30 min / 1 h / 2 h).
- ✅ **Triggers**: lead paga → encadena al flujo de pagos existente (rama
  "cliente"). Puja → Supabase Database Webhook sobre `ofertas`.
- ✅ **Plantillas Kapso/Meta**: redactadas en `KAPSO_TEMPLATES.md`; las crea y
  valida el usuario por Kapso.
- ⬜ **Resend**: falta la `RESEND_API_KEY` (dominio ya verificado). Va como
  credencial en n8n.
- ✅ **Estados**: los setea n8n con nodos Supabase-update (WF4/WF5); ya quedan en
  el diagrama.
- ⬜ **"Oferta exitosa" / "OOS"**: por ahora plantilla fija + texto en sesión; se
  puede agregar endpoint generador más adelante si se quiere.

**Falta para generar el JSON importable:** el tiempo de espera de la contra-oferta
y la `RESEND_API_KEY`. Con eso, se genera el workflow completo.
