# Crear PDPs desde el panel — instrucciones para el dashboard

> Para el repo **`electrificarte-dashboard`** (proyecto aparte, rol **admin**).
> Este documento vive acá porque **esta web es dueña del contrato**: la validación, la cola y
> la escritura en Sanity viven en la web. El panel solo muestra un formulario y una lista.
> Contexto técnico completo del flujo: `docs/FLUJO-PDP-N8N.md` §3.

## Qué cambia

Hasta ahora, para crear una PDP nueva había que llenar una fila en la hoja **AUTOS** del Google
Sheet y poner `estado = listo`. Desde ahora **la entrada es un formulario en el panel**. Todo lo
demás sigue igual: la investigación la hace el agente de Claude, el borrador nace **oculto** en
Sanity y llega un aviso por WhatsApp.

```
Panel (form)  ──POST──▶  Web /api/admin/pdp/solicitudes   valida sin IA y guarda en Supabase
                                     │                     (tabla pdp_solicitudes, estado "listo")
                                     └──▶ despierta a n8n ──▶ toma la solicitud ──▶ agente Claude
                                                                                   (~3 min)
Panel (lista) ◀──GET───  Web /api/admin/pdp/solicitudes   ◀── la web escribe el resultado
                                                               + borrador OCULTO en Sanity
```

**El panel no necesita ninguna key de Supabase, Sanity, Anthropic ni n8n para esto.** Solo la URL
de la web y el secreto de admin, en el **servidor** del dashboard. Si el dashboard ya tiene
variables para llamar a `/api/reviews/publish`, **reutiliza esas mismas**; si no, créalas así:

```
ELECTRIFICARTE_API_BASE=https://www.electrificarte.com
ELECTRIFICARTE_ADMIN_SECRET=<ADMIN_API_SECRET de PRODUCCIÓN, el de Vercel>
```

> La base va **con `www`**. `https://electrificarte.com` responde 308 hacia `www`, y un redirect
> en el medio de un POST con secreto es un riesgo que no vale la pena.

> ⚠️ Usa el `ADMIN_API_SECRET` **de Vercel**, no el de `.env.local`: no son iguales y con el local
> todo responde 401. Es el mismo secreto que ya usa el dashboard para `/api/reviews/publish`.

## ⚠️ Seguridad — reglas que no se pueden romper

1. **El secreto nunca llega al browser.** Nada de `NEXT_PUBLIC_*`. Todas las llamadas a la web
   van desde un **route handler o server action** del dashboard, que agrega el header
   `x-admin-secret`.
2. **Solo rol admin.** Un vendedor no debe ver ni este formulario ni la lista.
3. Guarda **quién** pidió cada PDP: manda `creado_por` con el email del admin logueado.

## Pantalla 1 — Formulario "Nueva PDP"

Una fila = **un modelo = una PDP**. Las versiones van adentro, nunca una PDP por versión.

| Campo | Control | Origen de las opciones | Validación en el form |
|---|---|---|---|
| `marca` | select con búsqueda | `GET /api/admin/pdp/opciones` → `marcas[].valor` | obligatorio |
| `modelo` | texto | — | obligatorio. Sin la marca ("Ora 03", no "GWM Ora 03") |
| `anio` | número | `anioMin`–`anioMax` de opciones | obligatorio, entero |
| `tipo` | select | `tipos[].valor` | obligatorio |
| `electrificacion` | select | `electrificaciones[].valor` (mostrar `nombre`) | obligatorio |
| `url_oficial` | URL | — | obligatorio, `https://`. Ver nota abajo |
| `versiones` | **lista repetible** de `nombre` + `precio` | — | mínimo 1. Precio en pesos, > 0 |

**Usa los `valor` tal cual vienen de `/opciones`.** Son exactamente los textos con los que la web
busca las referencias en Sanity; si los transformas, la validación responde "no existe en Sanity".
Si una marca no aparece en el select, hay que crearla primero en Studio (`/studio`): el flujo no
crea marcas.

**Ayudas de copy para el formulario** (son las reglas que más se equivocan):

- **URL oficial**: *"Página de precios, configurador o ficha de venta del modelo en el sitio
  chileno de la marca. Nunca una noticia, nota de prensa o blog."* De un newsroom salió una vez
  un "precio oficial" de $151.900. Si `marcas[].sitio` existe, muéstralo como pista.
- **Precio**: *"Precio de lista, no el precio con bonos."* Formatea con puntos al escribir
  (`24.990.000`) pero manda el número entero (`24990000`).
- **El precio lo pone la persona, no la IA.** El precio base de la PDP será el más bajo de las
  versiones. La IA solo lo compara con la fuente y avisa si no calza.

### Enviar

```http
POST {ELECTRIFICARTE_API_BASE}/api/admin/pdp/solicitudes
x-admin-secret: <secreto>
Content-Type: application/json

{
  "marca": "GWM",
  "modelo": "Ora 5",
  "anio": 2026,
  "tipo": "SUV",
  "electrificacion": "EV",
  "url_oficial": "https://www.gwm.cl/vehiculo/ora/nuevo-ora-5/",
  "versiones": [
    { "nombre": "Ora 5 Pro", "precio": 26490000 },
    { "nombre": "Ora 5 Ultra", "precio": 28990000 }
  ],
  "creado_por": "francisco@electrificarte.com"
}
```

Tarda **1 a 15 s** (revisa que la URL esté viva): deja el botón en "Validando…" y bloquéalo para
evitar doble envío.

| Respuesta | Significa | Qué hace el panel |
|---|---|---|
| **201** `{ ok: true, solicitud, avisos[], arrancaYa }` | Quedó en cola | Toast "Solicitud creada" → ir a la lista. Si `avisos` trae algo, mostrarlo (ej. la URL redirige a otra). Si `arrancaYa` es `false`, decir "empieza en menos de 15 min" |
| **422** `{ ok: false, errores[] }` | Los datos no sirven | Mostrar **cada** error arriba del form, sin borrar lo escrito. Son accionables: "La marca X no existe en Sanity", "La URL responde 404", "Ya existe una PDP con el slug…" |
| **409** `{ ok: false, errores[] }` | Ya hay una solicitud en curso de ese auto | Mostrar el error y un link a la lista |
| 401 | Secreto incorrecto | Error de configuración, no del usuario |
| 500 | Algo de la web | "No se pudo crear, intenta de nuevo" |

## Pantalla 2 — Lista "PDPs en creación"

```http
GET {ELECTRIFICARTE_API_BASE}/api/admin/pdp/solicitudes?limit=50
GET {ELECTRIFICARTE_API_BASE}/api/admin/pdp/solicitudes?estado=error
GET {ELECTRIFICARTE_API_BASE}/api/admin/pdp/solicitudes?id=<uuid>
x-admin-secret: <secreto>
```

Devuelve `{ solicitudes: [...] }` (más nuevas primero, máx. 200) o `{ solicitud }` con `?id=`.
Cada una trae:

| Campo | Para mostrar |
|---|---|
| `marca`, `modelo`, `anio`, `versiones[]` | Qué se pidió |
| `estado` | El chip de estado (tabla abajo) |
| `detalle` | Una línea: qué está pasando o qué faltó |
| `mensaje` | El aviso completo (el mismo que llega por WhatsApp). Mostrar en un expandible |
| `studio_url` | Botón **"Abrir en Studio"** cuando hay borrador |
| `lote` | Cuándo lo revisa el re-check semanal ("martes 15:00") |
| `costo_usd` | Lo que costó la investigación (~US$0,30) |
| `creado_por`, `created_at`, `terminada_at`, `intentos` | Trazabilidad |

**Refresco:** mientras haya alguna en `listo`, `en cola` o `procesando`, consulta cada **15 s**.
Si todas están terminadas, deja de consultar.

### Estados

| `estado` | Etiqueta sugerida | Acción |
|---|---|---|
| `listo` | En espera | **Cancelar** |
| `en cola` | Tomada | — (si lleva más de 30 min: **Reintentar**) |
| `procesando` | Investigando (~3 min) | — (si lleva más de 30 min: **Reintentar**) |
| `listo_para_revisar` | Lista para revisar | **Abrir en Studio** — revisar y publicar |
| `borrador_incompleto` | Borrador con faltantes | **Abrir en Studio** — completar lo que dice `detalle` |
| `sin_datos` | No encontró datos | **Corregir y reintentar** (casi siempre es la URL) |
| `rechazada` | Rechazada | Ver `detalle` (ej. alguien la creó a mano mientras tanto) |
| `error` | Error | **Corregir y reintentar** |

> **Ninguna PDP se publica sola.** `listo_para_revisar` significa que el borrador está completo,
> pero sigue **oculto**: publicarlo es siempre una persona, en Studio.

### Reintentar (con o sin corrección)

```http
POST {ELECTRIFICARTE_API_BASE}/api/admin/pdp/solicitudes/reintentar
x-admin-secret: <secreto>

{ "id": "<uuid>" }
```

o, para corregir algo antes (lo normal: la URL estaba mala), reabre el formulario precargado y
manda solo lo que cambió:

```json
{ "id": "<uuid>", "cambios": { "url_oficial": "https://www.kia.cl/..." } }
```

Responde igual que crear: `200 { ok: true, solicitud }`, `422 { errores }` o `409` si el estado
no permite reintentar (una que terminó bien ya tiene su borrador en Sanity).

### Cancelar

```http
POST {ELECTRIFICARTE_API_BASE}/api/admin/pdp/solicitudes/cancelar
x-admin-secret: <secreto>

{ "id": "<uuid>" }
```

Solo funciona en `listo` (antes de que la tome el flujo). Si ya la tomó: `409`.

## Opciones de los selects

```http
GET {ELECTRIFICARTE_API_BASE}/api/admin/pdp/opciones
x-admin-secret: <secreto>
```

```json
{
  "marcas": [{ "valor": "GWM", "slug": "gwm", "sitio": "https://www.gwm.cl" }],
  "tipos": [{ "valor": "SUV", "slug": "suv" }],
  "electrificaciones": [{ "valor": "EV", "nombre": "100% Eléctrico" }],
  "anioMin": 2015,
  "anioMax": 2028
}
```

Cachéalo unos minutos en el servidor del dashboard; cambia solo cuando alguien agrega una marca o
un tipo en Studio.

## Checklist para dar por terminado

- [ ] Variables `ELECTRIFICARTE_API_BASE` y `ELECTRIFICARTE_ADMIN_SECRET` en el servidor del dashboard (y en su Vercel)
- [ ] Formulario con selects desde `/opciones` y versiones repetibles
- [ ] Errores 422/409 mostrados en el form sin perder lo escrito
- [ ] Lista con estados, `detalle`, `mensaje` expandible y botón a Studio
- [ ] Reintentar (con corrección) y cancelar
- [ ] Refresco cada 15 s solo mientras haya solicitudes activas
- [ ] Solo rol admin; el secreto nunca en el browser
- [ ] Prueba real: crear una PDP de un modelo que **no** esté en el catálogo y verla llegar a
      `listo_para_revisar` o `borrador_incompleto` con su link a Studio (~3–5 min, ~US$0,30)

## Lo que tiene que estar hecho antes (no es tarea del dashboard)

| # | Qué | Quién |
|---|---|---|
| 1 | Correr `scripts/sql/2026-10-08_pdp_solicitudes.sql` en Supabase | Matías |
| 2 | Re-importar `n8n/pdp-creacion.json` (reemplaza al workflow `ecPdpCreacionV2`) y activarlo | Matías |
| 3 | En Vercel: `N8N_PDP_CREACION_URL=https://n8n.cadre.cl/webhook/electrificarte-pdp-creacion` (el webhook solo existe con el workflow **activo**; valida `x-electrificarte-secret`, ver `docs/N8N-SEGURIDAD.md`) | Matías |
| 4 | En Vercel (ya deberían estar): `ADMIN_API_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PDP_AGENT_ID`, `PDP_ENVIRONMENT_ID`, `ANTHROPIC_API_KEY` | Matías |

Mientras 1–3 no estén, los endpoints responden pero las solicitudes se quedan en `listo` (sin el
SQL, crear responde 500).
