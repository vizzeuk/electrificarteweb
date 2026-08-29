# Workflows de n8n — Subasta inversa (4 flujos)

Cada archivo es un flujo importable, con la misma estructura de tu diagrama pero
con los errores corregidos. La **lógica** vive en la web principal (endpoints);
n8n **orquesta y notifica** (Kapso + Resend). Sin secretos: las keys van como
credenciales de n8n.

| Archivo | Flujo | Disparador |
|---|---|---|
| `flujo-1-entra-una-puja.json` | Confirma al vendedor que recibimos su puja | Supabase Webhook (INSERT en `ofertas`) |
| `flujo-2-entra-un-lead.json` | Notifica a los vendedores que calzan | Flujo de pagos (rama cliente) |
| `flujo-3-presion.json` | Presiona a los que no van ganando | **Schedule (cron)** cada 3 h |
| `flujo-4-tiempo-agotado.json` | Cierra la subasta y manda ofertas al cliente | **Schedule (cron)** cada 15 min |

## ⚠️ Antes de nada: correr la migración

Estos flujos usan la **hora de cierre** de cada subasta. Corré en Supabase:
`scripts/sql/2026-08-28_ventana.sql` (agrega `leads.cierra_at`, `leads.cerrada_at`,
`ofertas.ultima_presion_at`). **Sin esto, `/match` y los crons fallan.**

Variables de entorno de la subasta (opcionales, con default): `AUCTION_WINDOW_HOURS`
(48), `AUCTION_PRESSURE_HOURS_BEFORE` (24), `AUCTION_PRESSURE_THROTTLE_HOURS` (6).

## 1. Credenciales en n8n (una vez)

| Tipo | Nombre | Config |
|---|---|---|
| Header Auth | `Electrificarte Admin (x-admin-secret)` | Name `x-admin-secret` · Value `<ADMIN_API_SECRET>` |
| Header Auth | `Kapso (X-API-Key)` | Name `X-API-Key` · Value `<KAPSO_API_KEY>` |
| Header Auth | `Resend (Authorization Bearer)` | Name `Authorization` · Value `Bearer re_...` |

Env var de n8n: `KAPSO_PHONE_NUMBER_ID` (o reemplazalo en las URLs de los nodos Kapso).

## 2. Importar y disparar

**Workflows → Import from File** cada `.json`. En los nodos que dicen "REEMPLAZAR",
elegí la credencial. Después:
- **Flujo 2**: encadenalo a tu flujo de pagos (rama "cliente", tras marcar `pagado`):
  un nodo HTTP que haga POST a `/webhook/auction-lead-paid` con `{ "leadId": <id> }`.
- **Flujo 1**: en Supabase → Database → Webhooks, creá uno sobre `ofertas`, evento
  **INSERT**, apuntando a `/webhook/auction-puja`.
- **Flujos 3 y 4**: no necesitan disparador externo, corren solos por cron.

## 3. Qué cambió respecto a tu versión (los arreglos)

- **Flujo 1**: saqué el nodo `update: row` ("asigne el puntaje") — era **redundante**,
  `/evaluate` ya guarda el score. Y los envíos van en **POST** (estaban en GET).
- **Flujo 3**: agregué **"Un item por oferta"** (faltaba el split → solo presionabas al
  primero). El endpoint `ofertas-a-presionar` ya filtra: solo los que **no lideran**,
  cerca del cierre, y con **throttle** (no re-presionar antes de 6 h).
- **Flujo 4**: **el disparador ya no es un webhook** (nadie lo llamaba solo) → ahora es
  un **Schedule** que busca leads vencidos. Saqué los nodos "GET puntajes" + "ver mayor"
  (redundantes: `/cerrar` ya elige la ganadora). El cierre es **atómico** (marca
  ganadora/perdedoras + cierra el lead en una sola llamada, sin doble envío). Agregué la
  rama de **perdedores** con el valor ganador anonimizado.
- **Re-pujas**: `/cerrar` deja **una oferta por vendedor** (la de mejor score), así una
  re-puja del mismo vendedor no aparece dos veces al cliente.

## 4. Nodo por nodo

### Flujo 1 — Entra una puja
| Nodo | Qué hace |
|---|---|
| Puja nueva (Supabase) | Webhook. Entra la fila nueva de `ofertas` en `body.record`. |
| Evaluar pujas | `POST /evaluate` → puntúa **y guarda** todas las pujas del lead. |
| Datos de la puja | `POST /oferta-info` → contacto del vendedor + modelo + precio. |
| WhatsApp/Correo confirmación | Le confirman al vendedor que registramos su puja. |

### Flujo 2 — Entra un lead
| Nodo | Qué hace |
|---|---|
| Lead pagado (webhook) | Entrada: `{ leadId }` desde el flujo de pagos. |
| Match vendedores | `POST /match` → vendedores que calzan + contacto; sella `cierra_at`. |
| Un item por vendedor | Split del array `eligible`. |
| WhatsApp/Correo vendedor | Avisan "te llegó un lead". |

### Flujo 3 — Presión
| Nodo | Qué hace |
|---|---|
| Cada 3 horas (Schedule) | Cron. Corre solo. Solo revisa; el throttle (12 h) limita cuánto le llega a cada vendedor. |
| Revisar no ganadores | `POST /ofertas-a-presionar` → ofertas que no lideran, cerca del cierre, sin presión reciente. |
| Un item por oferta | Split (uno por oferta a presionar). |
| Generar mensaje presión | `POST /message/pressure` → texto + datos + contacto; marca `ultima_presion_at`. |
| WhatsApp/Correo presión | Empujan al vendedor a mejorar. |

### Flujo 4 — Tiempo de puja agotado
| Nodo | Qué hace |
|---|---|
| Cada 15 min (Schedule) | Cron. |
| Leads por cerrar | `POST /leads-por-cerrar` → leads con `cierra_at` vencido. |
| Un item por lead | Split (uno por lead a cerrar). |
| Cerrar subasta | `POST /cerrar` → elige ganadora (1×vendedor), marca estados, cierra el lead, arma el mensaje al cliente. Devuelve cliente + ganadora + perdedores. |
| ¿Hubo ganadora? | IF: si hubo ofertas → notificar; si no → fin. |
| WhatsApp/Correo ofertas | Mandan las 1–2 mejores al cliente. |
| Un item por perdedor | Split de `perdedores` (0 si no hay). |
| WhatsApp/Correo perdedor | Avisan "no ganaste" + valor ganador anonimizado. |
| Sin ofertas (fin) | Cierre de la rama sin ganadora. |

## 5. A verificar tras importar

- Todos los nodos Kapso/Resend deben ser **POST** (ya vienen así).
- Nodo **IF** (Flujo 4): condición = `ganadora.offerId` no vacío → rama TRUE.
- Falta crear en Kapso la plantilla **`confirmacion_puja`** (ver `docs/KAPSO_TEMPLATES.md`).

## 6. Pendiente (siguiente iteración)

- **Cliente responde** (acepta/rechaza) → inbound de Kapso + NLU, y seguimiento OOS.
