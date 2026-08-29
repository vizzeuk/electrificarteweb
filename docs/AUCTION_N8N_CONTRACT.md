# Contrato de integración — Subasta inversa (para n8n)

Este repo (web principal) expone la **lógica** de la subasta; n8n **orquesta**
(dispara, notifica por Kapso/Resend, maneja tiempos). Mismo patrón que price-check.

## Estado actual

| Pieza | Dónde | Estado |
|---|---|---|
| Motor de scoring | `lib/auction/score.ts` | ✅ testeado |
| Ruteo lead→vendedores | `lib/auction/routing.ts` | ✅ testeado |
| Precio publicado (Sanity) | `lib/auction/pricing.ts` | ✅ testeado |
| Mensaje al cliente (IA) | `lib/auction/offer-message.ts` | ✅ testeado |
| Mensaje de presión al vendedor (IA) | `lib/auction/pressure-message.ts` | ✅ testeado |
| **Endpoint de ruteo** | `app/api/auction/match` | ✅ **listo** |
| **Endpoint de evaluación** | `app/api/auction/evaluate` | ✅ **listo** |
| **Endpoint mensaje al cliente** | `app/api/auction/message/client` | ✅ **listo** |
| **Endpoint presión al vendedor** | `app/api/auction/message/pressure` | ✅ **listo** |
| **Info de una oferta** (confirmación) | `app/api/auction/oferta-info` | ✅ **listo** |
| **Ofertas a presionar** (cron) | `app/api/auction/ofertas-a-presionar` | ✅ **listo** |
| **Leads por cerrar** (cron) | `app/api/auction/leads-por-cerrar` | ✅ **listo** |
| **Cerrar subasta** (cron) | `app/api/auction/cerrar` | ✅ **listo** |

> Requieren la migración `scripts/sql/2026-08-28_ventana.sql` (agrega `cierra_at`,
> `cerrada_at`, `ultima_presion_at`). Contrato detallado de estos en `n8n/README.md`.

## Endpoints disponibles

### `POST /api/auction/match`

Rutea un lead a los vendedores que calzan (marca + cercanía). Devuelve los
elegibles con contacto para notificar.

- **Auth:** `x-admin-secret` · **Body:** `{ "leadId": 123 }`
- **200:** `{ "leadId": 123, "targetModel": "BYD Dolphin", "total": 3, "eligible": [{ "vendorId": "uuid", "nombre": "...", "telefono": "...", "email": "...", "cercania": "local" }] }`

### `POST /api/auction/evaluate`

Evalúa y rankea las pujas `pendiente`/`evaluada` de un lead. Escribe el
resultado en la tabla `ofertas` y devuelve el ranking.

- **Auth:** header `x-admin-secret: <ADMIN_API_SECRET>`
- **Body:** `{ "leadId": 123 }`
- **Hace:** carga el lead → resuelve `P_publicado` desde Sanity por `target_model`
  → por cada oferta recomputa cercanía (ubicación real del vendedor), corre los
  knockouts + los 5 sub-puntajes, y persiste `score_total`, `score_desglose`,
  `descalificada`, `motivo_descalificacion`, `alertas`, `estado`
  (`evaluada` si válida, `perdida` si descalificada).

**Respuesta 200:**
```json
{
  "leadId": 123,
  "precioPublicado": 17990000,
  "matched": { "name": "Dolphin", "brand": "BYD" },
  "evaluated": [
    { "offerId": "uuid", "scoreTotal": 0.6789, "descalificada": false, "estado": "evaluada" },
    { "offerId": "uuid", "descalificada": true, "motivo": "Modelo/versión no coincide", "estado": "perdida" }
  ],
  "ranking": ["uuid-mejor", "uuid-segundo", "..."]
}
```
`ranking` = solo las válidas, mejor score primero. Para mostrarle 1–2 ofertas al
cliente, tomar los primeros N de `ranking`.

**Errores:** 401 (auth), 404 (lead no existe), 422 (lead sin `target_model`).

### `POST /api/auction/message/client`

Genera el mensaje comparativo (WhatsApp/correo) con las 1–2 mejores ofertas.
Los números los calcula el código; la IA solo redacta (no inventa).

- **Auth:** `x-admin-secret`
- **Body:** `{ "leadId": 123, "offerIds"?: ["uuid"], "top"?: 2 }`
  (sin `offerIds` usa las mejores `top` evaluadas, default 2)
- **200:** `{ "leadId": 123, "offerIds": ["uuid"], "message": "¡Hola! ..." }`

### `POST /api/auction/message/pressure`

Genera el mensaje de presión para un vendedor, anclado a señales REALES
(nº compitiendo, mejor puja vigente, su puja). Nunca inventa competencia.

- **Auth:** `x-admin-secret`
- **Body:** `{ "offerId": "uuid", "horasRestantes"?: 24 }`
- **200:** `{ "offerId": "uuid", "message": "Hola ..." }`

## Flujo que orquesta n8n (del diagrama de Miro)

1. Lead paga $19.990 → fila en `leads` (status `pagado`). *(ya existe)*
2. **Ruteo + notificar** a los vendedores que calzan (marca + cercanía). El
   ruteo hoy es una función del repo; si n8n lo necesita como endpoint, se
   expone igual que evaluate. Notificación: Kapso (WhatsApp) + Resend (correo).
3. Vendedor **puja** → fila en `ofertas` (estado `pendiente`). *(la crea el dashboard)*
4. n8n llama **`/api/auction/evaluate`** → rankea.
5. **Presión** al vendedor (mientras la ventana está abierta): mensaje con
   señales reales (nº compitiendo, mejor puja anonimizada, horas restantes).
6. Al cerrar la ventana: **mensaje al cliente** con las 1–2 mejores ofertas.
7. `¿acepta?` → sí: avisar cliente + vendedor ("oferta exitosa"), y a las X h
   preguntar si se concretó (OOS). No: flujo de recuperación (cambiar modelo)
   → si no acepta, devolución.
8. Vendedores no ganadores: "lead perdido" + valor de la oferta ganadora **anonimizado**.

## Pendiente (fuera de este repo)

- **Ciclo de vida** de estados `ganadora`/`aceptada`/`rechazada`/`expirada`
  (quién los setea: n8n al cerrar la ventana / recibir respuesta del cliente).
- **Ventana** (horas) y su vencimiento — definir el valor y dónde se controla.
- **Cuentas de vendedor**: al pagar el plan, provisionar acceso al dashboard.
  Recomendado: Supabase Auth (magic link / OTP) disparado por n8n, ligado a la
  fila de `leads_vendors`. Vive en el dashboard + n8n, no en este repo.
- **Dashboard**: crear la puja (fila en `ofertas`, estado `pendiente`) y mostrar
  el pool de leads. Hoy es mock.
