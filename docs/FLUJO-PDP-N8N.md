# Flujos PDP en n8n — directrices de implementación

Implementación de los dos diagramas del board de Miro **FLUJO PDP's**
(`https://miro.com/app/board/uXjVHsrznZw=/`):

| Flujo | Qué hace | Estado |
|---|---|---|
| **v2 — Creación** | Google Sheet → validación sin IA → 1 agente Claude → borrador `hidden:true` en Sanity | **Construido y probado en vivo** (§3). El workflow viejo no servía: auditoría en §3.1 |
| **C — Re-check semanal** | 28 lotes/semana × 7 autos → lee la URL oficial → diff aritmético → flags de auditoría | Por construir (reemplaza al Flujo B actual) |

Este documento es el **contrato**: qué vive en n8n, qué vive en la web, qué vive en Claude
Console, y en qué orden se construye. Las reglas duras (R1–R10, C1–C16) son las del board y no
se re-discuten acá.

---

## 0. Hallazgos que cambian el plan del board

Medido contra producción el **22-09-2026** (Sanity `wd30r9b0/production`) y contra la VPS.

### 0.1 El bloqueante es real y es peor de lo estimado

```
182 autos totales · 176 publicados · 53 marcas con autos publicados
  1 auto publicado con sourceUrls   ← el cron del Flujo C correría en vacío
176 con versions[]                  ← el inventario de versiones sí está completo
 23 con lastPriceCheckAt            ← el Flujo B actual alcanzó a tocar 23
  6 con priceCheckFlag pendiente
```

**Nada del Flujo C funciona antes de tener `sourceUrls[0]` en los 176.** Es la Fase 0, no un
detalle de implementación.

### 0.2 El contenedor de n8n no tiene ni una variable de entorno de Electrificarte

El workflow que ya existe (`6ViRF8qaij5BI2Cq · PDP desde WhatsApp — Claude Managed Agents +
Sanity`, 34 nodos, inactivo) referencia por expresión `$env.ANTHROPIC_API_KEY`,
`$env.SANITY_API_TOKEN`, `$env.KAPSO_API_KEY`, `$env.PDP_MANAGED_AGENT_ID` y 9 más. Ninguna
existe en el contenedor:

```
$ docker exec n8n_app env | grep -E "ANTHROPIC|SANITY|KAPSO|PDP"
(vacío)
```

El stack vive en Portainer (`/data/compose/33`, proyecto `n8n-cadre`), volumen externo
`n8n-pruebas_n8n_data`, uptime 2 semanas, con **30 workflows de otros proyectos** (Retoma,
CADRE, frank, loyalty). Tocar el stack reinicia todo eso.

> **Directriz 1 — nada de `$env` para secretos.** Se usan **credenciales de n8n** (encriptadas
> con `N8N_ENCRYPTION_KEY`), que es el patrón que este repo ya documenta en `n8n/README.md`.
> Cero reinicios, cero secretos en el compose, y Francisco/Vicente no pueden romperlo editando
> un stack compartido. Lo no-secreto (IDs de agente, umbrales, tamaño de lote) va en un nodo
> **Config** (Set) al inicio de cada workflow: visible, editable sin tocar la VPS.

Credenciales que ya existen y sirven: `anthropicApi · Anthropic account`
(`kj8HmKqK6bsSspeC`), `supabaseApi · ElectrifiCARte` (`3tusOno17FIBwCkl`),
`httpHeaderAuth · ele-admin-key` (`T632dsWhpjZ5713j`), `httpHeaderAuth · resend-electrificarte`.

Credenciales que **faltan crear**:

| Tipo | Nombre | Config | Para |
|---|---|---|---|
| Header Auth | `Sanity (Bearer write)` | `Authorization` = `Bearer <SANITY_API_TOKEN>` | mutaciones de Sanity |
| Header Auth | `Kapso (X-API-Key)` | `X-API-Key` = `<KAPSO_API_KEY>` | avisos por WhatsApp |
| ~~Google Sheets OAuth2~~ | ~~`Google Sheets — Electrificarte`~~ | — | ✅ **ya existe**: `Sheets Cadre` (`rwCyQeH6TnQJDJkS`) |

**Actualización (22-09-2026):** las dos credenciales que faltaban ya están creadas en la
instancia — `Electrificarte Admin` (`V9iMtS3nXUravFD5`) y `Sheets Cadre` (`rwCyQeH6TnQJDJkS`) —
y el workflow las trae enchufadas **por ID**, así que al importarlo queda funcional sin pasar por
la UI. Lo único que hay que verificar a mano es que la de admin tenga el header con nombre
`x-admin-secret` y como valor el mismo `ADMIN_API_SECRET` que está en Vercel (el valor está
encriptado en la base de n8n y no se puede comprobar desde afuera).

### 0.3 El límite de 60 s de Vercel mata el lote completo, no el auto

El board calcula "corrida completa de 7 autos con concurrencia 3: 40–90 s, holgado dentro del
límite de 300 s". Ese límite de 300 s **no aplica en Hobby sin Fluid compute** (ver
`CLAUDE.md` → Trampas operativas), y 90 s contra 60 s es una corrida perdida cada vez que la
fuente está lenta.

**n8n self-hosted no tiene límite de ejecución.** Medido en el contenedor:
`EXECUTIONS_TIMEOUT = -1` (sin límite, y ninguna env var la sobreescribe),
`EXECUTIONS_TIMEOUT_MAX = 3600` (solo el tope para el setting por workflow),
`N8N_RUNNERS_TASK_TIMEOUT = 300` (solo aplica a los nodos `Code`, que acá corren en <1 ms).
Una ejecución puede durar horas.

> **Directriz 2 — el lote se itera en n8n, no en Vercel.** La web expone un endpoint
> **por auto** (~10–20 s, holgado bajo 60 s) y n8n hace el `Loop Over Items` con concurrencia 3.
> Gratis, además: reintento por auto, visibilidad por auto en el historial de n8n, y una fuente
> caída no arrastra a los otros 6. Esto hace que **Vercel Pro deje de ser bloqueante para este
> flujo** (sigue siéndolo para el asesor pagado).

### 0.4 Reutilizar `lastPriceCheckAt`, no crear `lastCatalogCheckAt`

El board nombra `lastCatalogCheckAt`. Ese campo no existe; el que existe y ya ordena la cola es
`lastPriceCheckAt` (`sanity/schemas/car.ts`), con 23 autos poblados. Crear el campo nuevo
significa empezar la cola desde cero y mantener dos fechas que quieren decir lo mismo.

> **Directriz 3 — `lastPriceCheckAt` es el `lastCatalogCheckAt` del board.** Mismo rol, mismo
> orden de cola, sin migración.

### 0.5 Sonnet 5 hoy cuesta menos de lo que dice el board

El board presupuesta Sonnet 5 a **US$3 / US$15** por millón. El precio vigente es
**US$2 / US$10**. El costo real del Flujo C queda en **~US$0,015/auto · ~US$2,6/semana ·
~US$11/mes**, no US$16.

---

## 1. Reparto de responsabilidades

```
Claude Console         n8n (VPS)                    Web (Vercel)              Sanity / Supabase
──────────────         ─────────────────            ──────────────            ─────────────────
Agente v2 (extractor)  Cron + lote + reintento      Validación sin IA         Autos (fuente de
Agente Fase 0 (URLs)   Split / concurrencia 3       Llamada al modelo          verdad del catálogo)
Prompts versionados    Logs al Sheet                Diff aritmético           catalog_check_runs
Webhooks de sesión     Avisos por Kapso             Escritura en Sanity       (historial de corridas)
                       Cero lógica de negocio       Umbral de llenado
```

> **Directriz 4 — n8n orquesta y notifica; la lógica vive en la web.** Es la misma regla que ya
> rige la subasta (`n8n/README.md`). Motivo concreto: las reglas C8/C9 (ruido, piso de
> plausibilidad) y el umbral N/M del v2 son **código con tests** (`npm test`), no expresiones de
> n8n imposibles de testear. Un `Code` node con la regla del 1% es un bug esperando.

> **Directriz 5 — la IA nunca es dueña de un precio.** El modelo devuelve *lo que leyó* + la cita
> textual. El diff, el umbral de ruido y el piso de plausibilidad son aritmética en TypeScript.
> Aplicar es siempre acto humano (C6). Esto es lo que hace que la misma URL dé un diff comparable
> semana a semana.

### 1.1 ¿Managed Agents o una sola llamada a Messages?

| Flujo | Superficie | Por qué |
|---|---|---|
| **v2 — Creación** | **Managed Agent** (Console) | Es multi-paso de verdad: leer la página, bajar el PDF de ficha técnica, normalizar ~30 campos, redactar tagline/descripción/meta. Necesita el sandbox (bash/archivos) y gana con prompt versionado y traza en Console. |
| **Fase 0 — Descubrir URLs** | **Managed Agent** | 176 búsquedas web con juicio ("¿es la página de precios o un newsroom?"). Multiagente: un roster con `{"type":"self"}` reparte marcas. |
| **C — Re-check** | **Messages API, 1 llamada** | Es *una* lectura de *una* URL con salida estructurada. Una sesión CMA agrega provisión de contenedor + ciclo de vida (1–3 min) y no-determinismo para cero beneficio. `web_fetch_20260209` + `output_config.format` termina en ~10 s y es reproducible — que es justo el argumento del board contra la búsqueda web ("alertas fantasma"). |

Si igual se quiere el Flujo C en Console por observabilidad, es un cambio de nodo, no de
arquitectura: el contrato de salida es el mismo.

---

## 2. Flujo C — Re-check semanal

### 2.1 Reparto de los 28 lotes

Cron `0 9,15,19,23 * * *` · TZ `America/Santiago` → 4 corridas/día × 7 días = **28 lotes**.
Lote = `techo(176 / 28)` = **7 autos**. Cobertura 28 × 7 = 196 ≥ 176.

Cada auto publicado lleva un **`checkSlot` 0–27** asignado al crearse, así que "¿cuándo se
revisa este auto?" se contesta con *"martes a las 15:00"*. `0` = lunes 09:00 … `27` = domingo
23:00. Asignado al **lote menos cargado** (no round-robin ciego: así se rebalancea solo al
borrar u ocultar autos, sin script mensual).

Estado real tras el backfill (22-09-2026): **176 autos en 28 lotes, 6–7 por lote, 0 sin asignar.**

La selección de cada corrida es **lote primero, cola de relleno después**:

```groq
// 1. Los que le tocan a esta corrida
*[ ...revisable && checkSlot == $slot ] | order(lastPriceCheckAt asc) [0...$limit]
// 2. Si no llenan el lote, se completa con los más atrasados de todo el catálogo
*[ ...revisable && checkSlot != $slot ] | order(lastPriceCheckAt asc) [0...$limit]
```

El relleno es lo que evita el problema del lote fijo puro: **si se cae la corrida del martes,
esos autos entran en las siguientes** en vez de saltarse la semana entera. La respuesta trae
`delSlot` y `relleno` — si el relleno es alto corrida tras corrida, algo se está cayendo.

`revisable` = publicado + con `sourceUrls` + sin revisar en 5 días (C14: un auto no se revisa dos
veces en la misma semana). Los autos sin `sourceUrls` salen en una lista aparte, no bloquean el
lote (C3).

**El lote de un auto nuevo se asigna solo**, por tres caminos:
- `POST /api/admin/recheck/assign-slots` con `{carIds}` — lo llama el flujo de creación (v2) en
  cuanto crea el borrador, así el auto queda con lote al instante.
- `/api/admin/recheck/queue` barre los que quedaron sin lote al inicio de cada corrida (para los
  creados a mano en Studio). Normalmente no escribe nada.
- `npx tsx --env-file=.env.local scripts/recheck-backfill.ts --aplicar`, una vez.

La mecánica de los slots vive en `lib/catalog-recheck/slots.ts`. Detalle que cuesta: **una corrida
de las 23:00 que se atrasa a las 00:20 sigue resolviendo a su propio lote**, no al de las 09:00
del día siguiente — si no, revisaría el lote equivocado dos veces.

### 2.2 Campos de auditoría en Sanity

Ampliación de `sanity/schemas/car.ts`, grupo `ai`. **Solo campos de auditoría — la IA nunca
escribe contenido** (C5).

| Campo | Tipo | Rol |
|---|---|---|
| `lastPriceCheckAt` | datetime | *(existe)* fecha de la última revisión — ordena la cola |
| `priceCheckFlag` | string | *(existe, se amplía la lista)* resumen del hallazgo más grave |
| `priceCheckNote` | text | *(existe)* detalle legible |
| `priceCheckSuggestedPrice` | number | *(existe)* propuesta para `aplicar <modelo>` |
| `catalogFindings` | array | **nuevo** — todos los hallazgos: `{kind, detail, proposedPrice, versionName}` |
| `sourceFailStreak` | number | **nuevo** — corridas consecutivas con la fuente caída (C11: 2 → `fuente_muerta`) |
| `hiddenByCheck` | boolean | **nuevo** — el auto se ocultó automático (C7), para que `restaurar` sepa qué revertir |
| `needsReextract` | boolean | **nuevo** — año nuevo detectado: "conviene re-extraer", lo resuelve el v2 |
| `checkSlot` | number 0–27 | **nuevo** — cuál de las 28 corridas revisa este auto |
| `priceCheckPreviousBasePrice` | number | **nuevo** — precio lista previo a un ajuste automático; es lo que restaura `revertir <modelo>` |
| `sourceVersionScope` / `sourceVersionExclude` | array&lt;string&gt; | **nuevos** — reparto de versiones cuando una página oficial cubre varias PDPs (§2.7) |

`priceCheckFlag` pasa de 3 a 6 valores: `none`, `price_high`, `discontinued`, `fuente_muerta`,
`version_nueva`, `anio_nuevo`. Los tres primeros conservan su significado, así que el digest y
los comandos de WhatsApp que ya existen siguen funcionando sin cambios.

`catalogFindings[].kind` agrega `precio_aplicado` (se escribió solo) y `fuente_compartida`
(la página cubre varias PDPs, §2.7).

### 2.3 Endpoints nuevos en la web

Auth: header `x-admin-secret` (patrón de `app/api/auction/*`). Credencial n8n `ele-admin-key`.

| Endpoint | Entrada | Salida |
|---|---|---|
| `POST /api/admin/recheck/queue` | `{limit}` | `{runId, cars[], sinFuente[], cobertura}` |
| `POST /api/admin/recheck/car` | `{carId, runId}` | `{carId, nombre, resultado, hallazgos[], error?}` |
| `POST /api/admin/recheck/close` | `{runId, resultados[]}` | graba la corrida en Supabase, devuelve el resumen del log |
| `POST /api/admin/recheck/assign-slots` | `{carIds?}` | asigna `checkSlot` a los publicados que no tienen. Idempotente |
| `POST /api/admin/notify` | `{text}` | manda el texto por WhatsApp a `ADMIN_PHONE_NUMBERS` |

`/api/admin/notify` existe para que n8n **no** hable con Kapso directamente: si lo hiciera habría
que duplicar allá la lista de números, la ventana de 24 h de Meta y el fallback a plantilla — tres
cosas ya resueltas en `lib/whatsapp/outbound.ts`.

`resultado` ∈ `sin_cambios` · `precio` · `version_nueva` · `version_faltante` · `anio_nuevo` ·
`descontinuado` · `fuente_caida` · `error`.

### 2.4 El diff, en aritmética

```
precio leído < 3.000.000                    → se descarta la lectura (piso de plausibilidad, C9)
|Δ| < 1% del precio actual  O  |Δ| < 200.000 → ruido, no es hallazgo (C8)
modelo no aparece en la fuente               → hidden:true + hiddenByCheck + aviso inmediato (C7/C16)
fetch falla 2 corridas seguidas              → fuente_muerta + aviso inmediato (C11/C16)
ya hay un flag pendiente con el mismo valor  → no se re-avisa (C12, dedup)
```

### 2.5 El contrato del modelo

Una llamada, `claude-sonnet-5`, `web_fetch_20250910` (**fetch básico, sin filtrado dinámico**)
limitado al host de `sourceUrls[0]` — sin búsqueda web, sin segunda fuente (C2/C10) — `max_uses: 3`
(página + PDF + un redirect), `max_content_tokens: 8000`, y **salida estructurada**:

```json
{
  "fuente_ok": true,
  "modelo_vigente": true,
  "precio_base": 26490000,
  "anio_modelo": 2026,
  "versiones": [{ "nombre": "Ora 03 SR", "precio": null }],
  "evidencia": "Precio Lista $26.490.000",
  "nota": null
}
```

**Por qué el fetch básico y no el de filtrado dinámico.** Medido sobre la misma página, 3 corridas
de cada uno:

| Variante | Latencia | Resultado |
|---|---|---|
| `web_fetch_20250910` (básico) | 3,6 / 4,2 / 9,1 s — **prom 5,6 s** | idéntico, misma cita |
| `web_fetch_20260309` (filtrado dinámico) | 12,6 / 18,2 / 23,1 s — **prom 18,0 s** | idéntico, misma cita |

El filtrado dinámico corre code execution por debajo y acá no aporta nada: la página son ~3k
tokens y ya hay techo con `max_content_tokens`. Importa porque el límite duro de una función en
Vercel Hobby son 60 s, y con filtrado dinámico **una lectura sola llegó a 61,6 s**.

Presupuesto real medido, lectura + confirmación: **15,8 s (GWM) y 23,1 s (BYD)** — 37–44 s de
margen. Antes de este cambio eran 71,4 s, sobre el límite.

**Regla en el prompt (R3/C4):** campo sin evidencia textual = `null`. Nunca inferido. Sin
`evidencia`, el precio se descarta en el diff.

**La regla que más cuesta: cuál de los dos precios es el de lista.** Las marcas chilenas muestran
casi siempre dos. La página del Ora 03 pone *"Desde: $17.990.000*"* arriba y
*"Precio Lista $26.490.000"* más abajo — la diferencia son $7.000.000 de bono de marca más
$1.500.000 de bono de financiamiento. El prompt lleva ese ejemplo textual porque **sin él el
modelo reportaba el promocional**: primera medición con el fetch básico, leyó $17.990.000. Con el
ejemplo, lee $26.490.000. Si solo hay precio promocional, `precio_base` va en `null` con la razón
en `nota` — es mejor que reportar el promocional.

### 2.6 Aplicar precios solo — qué se escribe y qué no

Decisión de Francisco (sep-2026), contra la regla C6 del board. Se implementa **con guardas**,
porque el modo de falla no es hipotético: `MIN_PLAUSIBLE_PRICE` existe en el código desde el
Flujo B porque una lectura devolvió un "precio oficial" de **$151.900** sacado de un newsroom.
Sin guardas, eso se escribía en la PDP viva y salía al sitio en 60 s (ISR), al comparador, a la
calculadora y al structured data.

| | Se escribe solo |
|---|---|
| `basePrice` (precio lista) | ✅ con las 6 guardas de abajo |
| `discountPrice` (precio negociado) | ❌ **nunca** — es el número de Francisco |
| `versions[]` (precios, altas, bajas) | ❌ nunca — ver §2.7 |
| `modelYear` | ❌ nunca |
| `hidden` (descontinuado) | ✅ ya estaba (C7), reversible con `hiddenByCheck` |

Las guardas, todas obligatorias:

1. **Cita textual.** Sin `evidencia` el precio ni se propone (R3/C4).
2. **Piso de plausibilidad** de $3.000.000 (C9).
3. **No es ruido**: sobre el 1% del precio actual o sobre $200.000 (C8).
4. **Techo de deriva del 25%** (`MAX_AUTO_APPLY_DRIFT`). Un salto mayor es error de lectura
   mucho más seguido que cambio real de lista → queda como hallazgo, lo aplica una persona.
5. **No deja el lista bajo el precio con descuento.** Si la marca baja su lista por debajo de
   nuestro `discountPrice`, la PDP mostraría un "descuento" más caro que la lista. Eso es
   decisión comercial, no lectura → flag.
6. **Segunda lectura de confirmación, independiente.** Prefiere una lectura fresca con Firecrawl
   (`maxAge: 0`, navegador propio, otro motor de extracción): así no solo mide la varianza del
   modelo, también descarta que el primer valor viniera de una página cacheada. 1 credit, y solo
   en los autos cuyo precio cambió — que son pocos. Sin Firecrawl configurado cae a re-extraer del
   mismo texto ya leído: guarda más débil, pero no bloquea.
   **Esto ya atrapó un error real:** con el prompt sin el ejemplo de precio promocional, la lectura
   dio $17.990.000 y la confirmación $26.490.000 → no se escribió nada. Funcionó como corresponde.

Y siempre queda **vuelta atrás**: `priceCheckPreviousBasePrice` guarda el valor anterior, y
`revertir <modelo>` por WhatsApp lo restaura. Un precio aplicado solo **avisa al instante**
(no espera al digest del lunes), porque ya cambió el sitio.

Interruptor: `RECHECK_AUTOAPPLY=false` en Vercel lo apaga sin tocar código.

### 2.7 Versiones: el problema de las familias

**Medido en el catálogo real:** hay **9 familias** donde un modelo está partido en 2–3 PDPs que
comparten una sola página oficial de la marca.

| Marca | PDPs separadas | Versiones en cada una |
|---|---|---|
| Porsche | `Taycan` + `Taycan 4 Cross Turismo` | 8 + 3 — porsche.cl lista las 11 juntas |
| Porsche | `Cayenne E-Hybrid` + `... Coupé` | 5 + 5 |
| Volvo | `EX30` + `EX30 Cross Country` | 3 + 1 |
| Geely | `EX5` + `EX5 E-DMi` + `EX5 EM-i` | 2 + 0 + 3 |
| MG | `4` + `4 Urban EV` | 4 + 2 |
| DS | `3` + `3 Opera E-tense` | 1 + 1 |
| GWM | `Ora 03` + `Ora 03 GT` | **las mismas dos en ambas** |

Más Deepal S05 y Subaru Forester Strong Hybrid.

**Qué pasaría sin tratamiento:** la PDP del Taycan lee las 11 versiones de la página y reporta 3
`version_nueva` (las Cross Turismo). La del Cross Turismo lee las mismas 11 y reporta 8. **11
hallazgos fantasma por semana, de una sola familia**; por las 9, unos 30–40. El digest queda
ilegible en la segunda semana — exactamente lo que el board le critica a la búsqueda web.

**Tratamiento, en dos capas:**

- **Por defecto, automático.** Si otra PDP publicada comparte `sourceUrls[0]`, el re-check
  **deja de comparar el inventario de versiones** (ni nuevas ni faltantes) y emite **un** hallazgo
  `fuente_compartida`. Sigue comparando el **precio de las versiones que ya tenemos**, que es
  seguro: el nombre calza con el nuestro, no hay ambigüedad. Cero curación, cero falsos positivos.
- **Opt-in, por familia.** `sourceVersionScope` / `sourceVersionExclude` (grupo 🤖 IA en Studio)
  declaran el reparto y reactivan la detección. Taycan → excluir `Cross Turismo`; Cross Turismo
  → scope `Cross Turismo`. El humano es dueño de las versiones (R4). Solo las 9 familias lo
  necesitan; los otros 167 autos quedan vacíos.

`scripts/recheck-backfill.ts` lista las familias con los tokens sugeridos listos para pegar.

**Bug de datos aparte, a arreglar igual:** `Ora 03 GT` (publicada) contiene las versiones
`ORA 03 SR` **y** `ORA 03 GT`, y `Ora 03` (oculta) tiene esas mismas dos. Y `Geely EX5 E-DMi`
está publicada con **cero** versiones. Eso no lo arregla ningún flujo.

### 2.8 El workflow en n8n

`n8n/pdp-recheck.json` — generado por `scripts/gen-pdp-workflows.mjs` y versionado en el repo
(mismo patrón que `n8n/waitlist.json`).

```
Cron 09/15/19/23  →  Config (Set)  →  Tomar lote
                                        ├─ sinFuente[] →  Sheet "faltan fuentes"  →  Kapso agrupado
                                        └─ cars[] → Split Out → Loop (batch 3) → Revisar auto
                                                                  (retry 1, continueRegularOutput)
                                                        ↓
                                                    Aggregate → Cerrar corrida
                                                        ↓
                                        Sheet "corridas" (SIEMPRE, C15)
                                                        ↓
                                        IF urgentes → Kapso inmediato (C16)
```

### 2.9 Los avisos

| Aviso | Cuándo | Dónde vive | Regla |
|---|---|---|---|
| Fila en "corridas" | cada corrida | n8n → Sheet | **siempre**, haya cambios o no (C15) |
| Corrida en Supabase | cada corrida | web → `catalog_check_runs` | da la cobertura real del digest |
| Urgente | descontinuado · fuente_muerta | n8n → Kapso | al instante, no espera el lunes (C16) |
| Resumen diario 21:00 | 1×/día | Vercel cron | una línea, aunque no pasó nada |
| Digest semanal lunes 11:00 | 1×/semana | Vercel cron | **siempre**, encabezado por `28/28 corridas · 176/176 autos` |

Los dos últimos se quedan en Vercel cron: `/api/cron/price-check-digest` ya existe, ya tiene
`adminPhones()` + Kapso. Lo que cambia es que **hoy no manda nada si no hay hallazgos** — y eso
hace indistinguible "todo en orden" de "el cron lleva tres semanas caído". La cobertura se
calcula leyendo `catalog_check_runs`.

### 2.10 Reemplaza al Flujo B, no se suma

`app/api/cron/price-check-scan` (diario, 17 autos, búsqueda web, ~US$0,10–0,13/auto) se apaga:
sale de `vercel.json`. `lib/price-check/check.ts` se conserva como referencia del patrón de
búsqueda web, pero deja de correr.

---

### 2.11 Firecrawl como fallback (no como camino por defecto)

**Evaluado el 22-09-2026.** El motivo no es ahorrar tokens — ahí no hay nada que ganar:

| Página | HTML crudo | Lo que llega al contexto |
|---|---|---|
| GWM Ora 03 | 228.103 chars (~57k tok) | **11.834 chars (~3k tok)** |
| BYD Sealion 7 | 83.306 chars (~21k tok) | **8.730 chars (~2,2k tok)** |

`web_fetch` entrega un bloque `document` con `media_type: "text/plain"` y **sin cargo extra**
("no additional charges beyond standard token costs"), así que el boilerplate nunca entra.
Limpiarlo antes con Firecrawl ahorraría ~US$1,2/mes sobre el catálogo completo, a cambio de
~763 credits/mes = **76% del free tier**, sin margen para la Fase 0 ni para crecer. Y "cached
results still cost 1 credit": el caché de Firecrawl acelera, no ahorra.

El motivo real es que **`web_fetch` no ejecuta JavaScript** (documentado) y lo bloquean varios
sitios. Medido sobre 48 candidatos de URL validados: **31% carga la página y no tiene ni un
precio en el HTML estático.** BYD (SPA Vue, 9 autos), Audi, Volvo y Peugeot son los casos
confirmados. En esos autos el re-check leería "bien" y sin precio, en silencio, todas las semanas.

**El gatillo es angosto a propósito** (`needsBrowserFallback`, testeado):

```
fuente_ok && modelo_vigente && precio_base === null   → Firecrawl (1 credit)
fuente_ok === false                                    → NO — el problema es la URL (C11)
modelo_vigente === false                               → NO — no hay precio que buscar
precio_base presente                                   → NO
```

Consumo estimado: ~55 autos/semana × 4,3 = **~235 credits/mes, 24% del free tier.**

Cuando el precio viene de Firecrawl, la **confirmación del auto-aplicar re-extrae del mismo
markdown**: un solo credit, dos llamadas al modelo, y con input idéntico la única variable que
queda es la varianza del modelo — que es justo lo que esa guarda mide.

Env var: `FIRECRAWL_API_KEY`. Sin ella el fallback no corre y queda en el log.

**Palancas de token que sí son gratis y ya están aplicadas:**
- `max_content_tokens: 8000` — una página normal son ~3k tokens, pero una de 100 kB son ~25k, o
  4× lo que cuesta revisar un auto entero.
- Fetch básico en vez del de filtrado dinámico: 3,2× más rápido con salida idéntica (§2.5).
- `use_cache: false` **no se usa**: solo existe en `_20260309`, que es la variante lenta. La
  frescura se recupera mejor en la confirmación, que hace una lectura independiente con Firecrawl
  y `maxAge: 0` — más fuerte que saltar el caché en la primera lectura.
- Pendiente: `web_fetch_20260318` + `response_inclusion: "excluded"` recorta tokens de salida.
  **No está en el SDK 0.96** (llega hasta `_20260309`), y nuestra salida son ~400 tokens: vale poco.

**Probado en vivo el 22-09-2026**, con el catálogo real:

| Caso | Camino | Resultado |
|---|---|---|
| GWM Ora 03 (`gwm.cl`) | `web_fetch` | $26.490.000, cita "Precio Lista $26.490.000", `sin_cambios` |
| BYD Sealion 7 (`byd.com/cl/sealion-7`) | fallback a Firecrawl | sin precio **ni con navegador**: la URL es una ficha de características, no de venta |
| BYD Yuan Plus (`byd.com/cl/order-yuan-plus`) | fallback a Firecrawl | **$23.990.000**, cita `## CLP 23990000.00` — el caso que estaba roto en silencio |

El caso del Sealion 7 enseñó dos cosas: que BYD pone los precios en `/cl/order-*` (ahora el
matcher del Sheet lo premia), y un bug — una fuente que **no lista ninguna** versión volvía
"faltantes" a las nuestras. Corregido: una página sin versiones no dice nada del inventario.

## 3. Flujo v2 — Creación desde el Sheet

### 3.1 Auditoría del workflow existente (22-09-2026)

`6ViRF8qaij5BI2Cq — PDP desde WhatsApp · Claude Managed Agents + Sanity` (34 nodos, inactivo,
sin ejecuciones). **No podía funcionar**, y no por un detalle: falla en los tres puntos donde se
habla con un sistema externo.

#### Bloqueantes

| # | Qué | Dónde | Por qué importa |
|---|---|---|---|
| **B1** | **El agente y el entorno no existían.** `GET /v1/agents` y `GET /v1/environments` del workspace devolvían `{"data":[]}`. | `Crear sesión Claude Managed Agent` | `PDP_MANAGED_AGENT_ID` / `PDP_MANAGED_ENVIRONMENT_ID` apuntaban a nada. La primera llamada daba 404. |
| **B2** | **Ninguna de las 13 `$env` existe en el contenedor.** `docker exec n8n_app env \| grep -E "ANTHROPIC\|SANITY\|KAPSO\|PDP"` → vacío. | todo el flujo | Toda expresión `$env.*` resolvía a `undefined`: `Authorization: Bearer undefined`, `x-api-key: undefined`. Es la Directriz 1 del §0.2. |
| **B3** | **`GET /v1/sessions/{id}/events?limit=100` sin `order`.** El default de la API es **ascendente** (verificado en vivo). | `Obtener eventos de la sesión` | La entrega es de lo *último* que pasa. Con más de 100 eventos —una sesión con PDF y reintentos los pasa— la primera página trae el arranque y el flujo concluye "Claude no devolvió el JSON" habiendo devuelto todo. Falla **en los casos difíciles**, que son justo los que importan. |
| **B4** | **El contrato de salida era texto libre.** El extractor barría todos los strings de la respuesta buscando algo parseable con `.fields` y `.status`. | `Extraer plantilla PDP del Agent` | No existe ningún "pegá la plantilla como contrato estricto" en Managed Agents: eso era una instrucción para un humano en un sticky note, no una garantía de la API. |
| **B5** | **`$getWorkflowStaticData('global')` como cola de trabajos.** | `Guardar job` / `Verificar evento` | Es estado **global al workflow**, compartido entre ejecuciones concurrentes. El propio sticky note lo admitía pidiendo *"queue mode y worker concurrency 1"*. Además: si el webhook de Anthropic se pierde (3 reintentos y se descarta, sin aviso), el trabajo queda colgado para siempre. |
| **B6** | **El trigger era un webhook de WhatsApp.** | `Webhook PDP` | El board pide Google Sheet cada 15 min, y con razón: el humano es dueño de marca, modelo, año, URL y `versiones = "nombre\|precio"` (R4). Eso no se dicta por WhatsApp sin errores. |

#### Defectos de diseño

- **El umbral decidía si crear.** `PDP_MIN_FILLED_SPECS` abortaba la creación. El board lo invirtió:
  **el borrador siempre se crea**; el umbral decide el mensaje y el estado de la fila.
- **La métrica mentía.** `filled/32` con denominador plano: un HEV impecable no puede pasar de 25/32
  porque no tiene conector ni carga DC. Ahora es **N/M aplicables** — 29 BEV · 31 PHEV/EREV ·
  25 HEV/MHEV — y el umbral ya no es un porcentaje (§3.4b).
- **La IA era dueña del precio.** `basePrice: Number(f.base_price_clp)` escribía en Sanity lo que
  leyó el modelo. Contra R4 y contra la regla que ya rige el Flujo C.
- **~100 líneas de mapeo a Sanity en un `Code` node**, sin forma de correrlas (Directriz 4).
- **n8n hablaba con Anthropic, Sanity y Kapso directo**, con las tres keys en un stack de Portainer
  compartido con ~30 workflows de Retoma, CADRE y frank.
- **Sin `sourceUrls` garantizado** — que es lo que hace que la Fase 0 no se repita nunca más.

#### Qué se rescató

La idea. El ciclo de vida del Managed Agent, la idempotencia por slug, el mapeo campo a campo
(verificado contra `sanity/schemas/car.ts`: está bien) y la subida de portada se conservan — pero
mudados a `lib/pdp-creacion/*`, con tests.

### 3.1b La arquitectura nueva

```
n8n (VPS)                         Web (Vercel)                    Anthropic / Sanity
─────────                         ────────────                    ──────────────────
Cron 15 min                       POST /api/admin/pdp/iniciar     Managed Agent
Sheet: filas "listo"     ───────▶   · valida SIN IA        ─────▶  sesión (agent_with_overrides,
Marcar "procesando"                 · abre la sesión                web_fetch cercado al host)
                                    ← {sessionId, host}
Esperar 30 s  ◀──┐
POST cerrar   ───┴──────────────▶ POST /api/admin/pdp/cerrar
  (hasta 20 vueltas)                · ¿sigue corriendo? → esperar
                                    · ¿pidió navegador? → Firecrawl ─▶ markdown de vuelta al agente
Sheet: resultado ◀────────────────  · mide N/M, sube portada,
Kapso: aviso     ◀────────────────    crea el borrador OCULTO  ────▶ Sanity + checkSlot
```

**n8n no tiene ninguna key nuestra salvo `x-admin-secret`.** Ni Anthropic, ni Sanity, ni Kapso,
ni Firecrawl: todas viven en Vercel. Es la Directriz 1 y la Directriz 4, las dos.

**Se poletea en vez de usar webhooks.** Anthropic ofrece webhooks de sesión, pero: hay que
registrarlos a mano en Console, se pierden sin aviso tras 3 reintentos, no garantizan orden, y
obligan al mapa `session_id → job` que era B5. n8n self-hosted no tiene límite de ejecución
(`EXECUTIONS_TIMEOUT = -1`), así que esperar es gratis. Una corrida real tardó **155 s**.

#### Piezas

| Pieza | Qué hace |
|---|---|
| `claude/agents/extractor-pdp.json` | La definición del agente, versionada en el repo. Prompt con R2–R5 textuales + los dos custom tools. |
| `claude/environments/pdp.json` | Sandbox `cloud`, sin vaults ni repos: no hay un solo secreto adentro. |
| `scripts/claude-agents-apply.ts` | Aplica las dos por nombre (crea o actualiza). Idempotente: nunca deja agentes huérfanos. |
| `lib/pdp-creacion/encargo.ts` | Fila → encargo + el cerco de `web_fetch` al host (R2). |
| `lib/pdp-creacion/contrato.ts` | Tipos del contrato + la métrica N/M y las 5 vitales. |
| `lib/pdp-creacion/validar.ts` | La validación sin IA (paso 5 del diagrama). |
| `lib/pdp-creacion/sanity-doc.ts` | Contrato + fila → documento `car`. |
| `lib/pdp-creacion/sesion.ts` | Abrir, consultar, leer la entrega, contestar tools, cerrar. |
| `lib/pdp-creacion/imagenes.ts` | Portada + galería: bajada, guardas y subida a Sanity (§3.4). |
| `lib/pdp-creacion/sanity.ts` | Cliente de Sanity propio del flujo, con `timeout`. |
| `app/api/admin/pdp/{iniciar,cerrar}` | Los dos endpoints que llama n8n. |
| `n8n/pdp-creacion.json` | 20 nodos, generado por `scripts/gen-pdp-creacion.mjs`. Importado en la VPS como `ecPdpCreacionV2`, inactivo. |
| `scripts/qa/pdp-contrato.test.ts` | 27 tests, en `npm test`. |

#### El contrato de salida: un custom tool, no un mensaje

`entregar_pdp` es una herramienta con `input_schema`. Tres cosas que un mensaje de texto no da:

1. **La plataforma valida la forma.** `additionalProperties: false`, enums cerrados en `traction`,
   `batteryType` y `connectorType`. No hay JSON a medio escribir que parsear.
2. **El evento es identificable.** `agent.custom_tool_use` con `name == "entregar_pdp"` — no hay
   que adivinar cuál de los mensajes traía el resultado (B4).
3. **La sesión queda `idle` esperándonos** justo cuando el payload existe. No hace falta detectar
   "¿ya terminó?" por heurística.

#### Firecrawl adentro del flujo

`leer_con_navegador` es el **segundo** custom tool: el agente lo pide cuando `web_fetch` ya falló
en esa URL, la web lo resuelve con Firecrawl y le devuelve el markdown por el mismo canal.

Está así y no como camino por defecto por lo mismo del §2.11: `web_fetch` no ejecuta JavaScript
y hay sitios que lo bloquean —BYD es una SPA de Vue, Volvo devuelve 403— pero cada scrape cuesta
1 credit del tier gratis. Poniéndolo como fallback, el consumo del flujo v2 es de **1–2 credits
por auto y solo en los que lo necesitan**, que al volumen de creación (unas pocas filas por
semana) es ruido. Como camino por defecto serían 179 credits de una sentada, sin necesidad.

Dos cercos: la web solo acepta releer **el host de la sesión** (R2 otra vez — el navegador no es
una puerta trasera a otra fuente), y la key de Firecrawl nunca entra al sandbox.

`FIRECRAWL_API_KEY` verificada el 22-09-2026 contra `api.firecrawl.dev/v2/scrape`: la SPA de BYD
(`byd.com/cl/order-yuan-plus`) devuelve 3.058 chars de markdown con `CLP 23990000.00` adentro —
justo la página que `web_fetch` lee vacía. Sin la key el fallback degrada avisándole al agente que
no hay navegador; no rompe nada.

#### Medido en vivo

| Auto | Fuente | Resultado |
|---|---|---|
| GWM Ora 03 | `gwm.cl/vehiculo/ora/ora-03/` | contrato completo · leyó la página **y el PDF de ficha técnica** del mismo dominio · precio de lista **$26.490.000** con su cita, no el promocional de $17.990.000 · solo el delta de la GT (batería 59,1 kWh, 400 km) · reportó que el meta de GWM llama "híbrido" a un auto 100% eléctrico |
| GWM Tank 300 | `gwm.cl/vehiculo/tank/tank-300/` | borrador oculto creado en Sanity, `basePrice` del humano, y **avisó que esa página cubre la versión a combustión** — la fila de prueba estaba mal, no el flujo |
| Kia EV3 | `kia.com/cl/...` | rebotada: la URL redirige a otro dominio (ver abajo) |

**155 s · US$0,26 por auto.** El board presupuestaba US$0,04 para el v2; el número real está en el
orden del v1 (US$0,26). El costo se puede bajar con `effort: "medium"` en
`claude/agents/extractor-pdp.json` si hace falta, a costa de calidad de redacción.

#### Dos bugs que encontró el testing

1. **Los redirects entre dominios.** `www.kia.com/cl/modelos/…/kia-ev3.html` responde **200**…
   aterrizando en `www.kia.cl`. Como `web_fetch` va cercado al host de la fila, la sesión entera
   moría con `url_not_allowed` después de gastar plata. Ahora la validación sigue el redirect,
   usa el **host de destino** para el cerco, guarda la **URL efectiva** en `sourceUrls`, y avisa
   en el mensaje para que se corrija el Sheet. Y si el redirect va a la **home**, rebota la fila:
   es una ficha borrada disfrazada de 200.
2. **El cliente de Sanity no tenía timeout.** Una mutación colgada esperó **36 minutos** en local;
   en Vercel sería un corte a los 60 s sin explicación. Ahora `timeout: 25_000` en
   `lib/catalog-recheck/admin.ts` — aplica también a los endpoints del Flujo C.

Y la portada ahora **reintenta una vez** y dice por qué falló: la primera versión se tragaba
cualquier hipo de red y la PDP salía sin foto diciendo "subila a mano", sin que nadie supiera que
la foto estaba perfecta y lo que había fallado era la subida.

#### Los "duplicados" de Sanity eran borradores

Una consulta sin `!(_id in path("drafts.**"))` devuelve cada documento dos veces cuando tiene
cambios sin publicar. Con el filtro puesto: **5 `electricType`, 5 `vehicleType`, 0 slugs de auto
repetidos.** No hay nada que limpiar. Las queries de `lib/pdp-creacion/validar.ts` filtran drafts,
así que el flujo nunca elige un borrador por error.

### 3.2 El Sheet

Sheet real: **AUTOS ELECTRIFICARTE** (`1QYqaKy3pRkGhAe4K4VnV0uUa5G1sOWNMvkyWQxTiGd8`), con las
hojas `AUTOS`, `FALTAN FUENTES`, `CORRIDAS` e `INSTRUCCIONES`. Los nombres van en **mayúsculas**:
el nodo de Google Sheets las busca por nombre exacto.

Los TSV se generan con **`npx tsx --env-file=.env.local scripts/gen-sheet-autos.ts`** y quedan
en `.context/sheet/`. El script hace dos cosas: volcar el catálogo y **proponer la URL oficial**
de cada auto (ver §4).

**Pestaña `autos`** — una fila = un modelo = una PDP (R1, nunca una fila por versión):

| Columna | Dueño | Notas |
|---|---|---|
| `estado` | n8n | Vacío = la fila no se procesa. `listo` **solo** para crear una PDP nueva. Las 182 precargadas ya existen: van vacías. |
| `pdp_id` | automático | `_id` de Sanity. Lleno = el auto existe (solo se actualiza la fuente). Vacío = PDP nueva. |
| `marca` `modelo` `anio` `tipo` `electrificacion` | humano | Deben existir como refs en Sanity |
| **`url_oficial`** | **humano** | **La columna que importa.** Página de precios, configurador o ficha de venta. Nunca newsroom ni nota de prensa. |
| `url_sugerida` | automático | Candidato encontrado por el script. Revisar y copiar a `url_oficial` si está bien. |
| `revision_url` | automático | Qué pasó con el candidato: ok, 404, el sitio bloquea bots, sin link que calce |
| `necesita_navegador` | automático | `SI` = el precio lo pinta JavaScript → lo resuelve el fallback de Firecrawl solo (§2.11) |
| `versiones` | humano | `"GLX\|24990000, GLS AWD\|27490000"` — pesos, sin puntos ni símbolos |
| `publicado` `lote` | informativo | `lote` = cuál de las 28 corridas revisa este auto |
| `detalle` `link_studio` | n8n | |

`CORRIDAS` y `FALTAN FUENTES` son del Flujo C (solo encabezados; las llena n8n), e
`INSTRUCCIONES` es la guía para Francisco.

**Para volver del Sheet a Sanity** (mientras no exista la credencial de Google en n8n):

```
Sheet → Archivo → Descargar → .tsv
npx tsx --env-file=.env.local scripts/import-sheet-fuentes.ts ~/Downloads/autos.tsv --aplicar
```

Solo escribe `sourceUrls`. Rechaza URLs inválidas, de otro mercado (reusa `lib/chile-url.ts`) y
`pdp_id` que no existan. Sin `--aplicar` solo reporta.

### 3.3 El agente en Console

```
name:  Extractor PDP Chile         id: agent_01Gzn3iesyaqA3AqAdixgojk   (v2)
model: claude-sonnet-5 · effort high
env:   Electrificarte PDP          id: env_013ZGErAchy9an2tDxtPURQ3
tools: agent_toolset_20260401 · web_search APAGADO (R2)
                                 · web_fetch allowed_domains = [host de la fila]
       custom leer_con_navegador  (Firecrawl, lo resuelve la web)
       custom entregar_pdp        (el contrato de salida)
```

La definición vive en `claude/agents/extractor-pdp.json` y `claude/environments/pdp.json`. Se
aplican con:

```
npx tsx --env-file=.env.local scripts/claude-agents-apply.ts            # seco
npx tsx --env-file=.env.local scripts/claude-agents-apply.ts --aplicar
```

El script busca **por nombre**: si el agente ya existe lo actualiza (versión nueva), si no lo crea.
Nunca `agents.create()` por corrida — eso acumula agentes huérfanos y rompe el versionado al que
se fijan las sesiones.

**El cerco de dominio va por sesión, no en el agente.** Cada fila apunta a un sitio distinto, así
que la sesión se abre con `agent_with_overrides` y un `tools` que lleva `allowed_domains: [host]`.
Detalle que cuesta: **un override reemplaza `tools` entero, no mergea** — por eso
`toolsDeSesion()` repite los dos custom tools. Sin eso la sesión se queda sin forma de entregar
el resultado y el agente termina escribiendo el JSON en un mensaje, que es justo lo que este
contrato evita. Hay un test que lo cubre.

**Para iterar el prompt**: editás `claude/agents/extractor-pdp.json`, corrés el script con
`--aplicar`, y probás en vivo sin tocar n8n ni Vercel:

```
npx tsx --env-file=.env.local scripts/qa/pdp-crear.test.ts \
  --agent agent_01Gzn3iesyaqA3AqAdixgojk --env env_013ZGErAchy9an2tDxtPURQ3 \
  --marca GWM --modelo "Ora 03" --anio 2026 --tipo "City Car" --electrificacion EV \
  --url https://www.gwm.cl/vehiculo/ora/ora-03/ \
  --versiones "ORA 03 SR|17990000, ORA 03 GT|21990000"
```

Cada sesión lleva **tope de gasto propio** (`budget`, US$1,50 por defecto). Una sesión que se
enrede se pausa sola en vez de llevarse el presupuesto del mes.

### 3.3b El umbral de llenado: por qué no es el 85%

El board pide *"≥85% de campos aplicables + las 5 vitales + portada + textos"*. Con las dos primeras
corridas reales ese número quedó desmentido:

| Auto | N/M | % | Lo que realmente faltaba |
|---|---|---|---|
| GWM Ora 5 (EV) | 23/29 | 79% | `seats`. El resto — `topSpeed`, `seatRows`, `euroNcap`, `batteryType`, `chargeTimeDC` — **gwm.cl no los publica** |
| GWM Tank 300 (HEV) | 19/25 | 76% | `batteryCapacity` y `acceleration`: dos vitales |

Con el 85%, los dos caían del mismo lado y con el mismo mensaje. Pero uno estaba a un campo de ser
publicable y el otro no sabíamos ni cuánta batería tiene. **Un umbral que no distingue eso no sirve
para decidir nada**, que es para lo único que existe.

El umbral ahora son tres escalones:

```
🔴 Vitales (5)        autonomía · potencia · batería · 0-100 · tracción
                      (en HEV/MHEV la autonomía es el rendimiento de combustible)

🟠 Importantes (6-8)  motorDescription · transmission · torque · seats · warranty · safetyFeatures
                      + connectorType · maxDCChargingPower   (solo enchufables)

⚪ Piso               al menos 20 campos llenos
```

`completo` = 0 vitales + 0 importantes + ≥20 campos + portada + tagline/descripción/meta.

Lo que queda **fuera de los dos escalones** es deliberado: `euroNcap`, `seatRows`, `topSpeed`,
`groundClearance` y `batteryType` casi nunca están en una página de marca chilena. Siguen contando
en el N/M si aparecen, pero exigirlos marcaba como incompleta una ficha que estaba lista.

El piso de 20 existe para que una ficha con las 5 vitales y nada más no pase por completa.

Efecto sobre los mismos dos autos:

```
Ora 5      → 🟡 borrador · falta 1 importante: seats
Tank 300   → 🟡 borrador · faltan 2 vitales: batteryCapacity, acceleration
```

Los dos siguen en borrador, pero ahora el mensaje dice **qué** falta y de qué gravedad, y el de
Francisco es un campo de un minuto en Studio.

> Ajustar esto es editar dos listas en `lib/pdp-creacion/contrato.ts` (`vitales` e `importantes`)
> y `MIN_CAMPOS`. Hay 31 tests que lo cubren.

### 3.4 Las fotos

R7 del board dice *"1 foto automática (portada), galería manual en Studio"*. **Se amplió a galería
automática** por decisión de Francisco/Matías (sep-2026). La procedencia es la misma que la de la
portada —la página oficial de la marca— así que no cambia el riesgo de derechos; lo que cambia es
que hay que evitar que la "galería" termine siendo ocho banners de campaña que alguien tiene que
borrar a mano.

El agente devuelve `portada_url` + `galeria[] = {url, descripcion}` (hasta 8). La web las baja y
las sube (`lib/pdp-creacion/imagenes.ts`), con cinco guardas:

| Guarda | Qué evita |
|---|---|
| `content-type` tiene que ser `image/*` | una página de error que devuelve **200 con HTML**: pasa el status y Sanity guarda un asset roto |
| SVG descartado | los logos y los íconos son SVG casi siempre |
| Entre **25 kB y 12 MB** | abajo son sprites y placeholders; arriba, renders sin comprimir |
| Dedup por **SHA-256 del contenido**, no por URL | las marcas sirven la misma foto en varias rutas (CDN, tamaños, query string) y la galería salía con la misma imagen tres veces |
| Mismo dominio que la fuente | R2 otra vez: la foto sale de la fuente, no de cualquier lado |

Cada bajada **reintenta una vez**: un hipo de red no es "no hay foto". Y si la portada falla pero
la galería trajo algo, **la primera de la galería pasa a portada** — el caso real fue un banner que
devolvía 404 mientras las seis fotos del carrusel estaban perfectas.

La `descripcion` de cada foto va como **texto alternativo** en Sanity. El prompt pide que describa
la foto ("Interior: tablero con pantalla central"), no que repita el nombre del modelo.

**`PDP_GALERIA_MAX`** controla el tope (default 6, máximo 8). **`PDP_GALERIA_MAX=0` vuelve al
comportamiento del board**: solo portada.

Medido en vivo (GWM Tank 300, `gwm.cl`): **6 fotos subidas, 0 descartadas**, todas 1555×670 y
250–457 kB — cuatro exteriores desde ángulos distintos y dos de interior, con el alt text correcto
en cada una.

### 3.5 Los avisos por WhatsApp y la ventana de 24 h

Los avisos salen por `POST /api/admin/notify` → `sendProactiveText` → Kapso, a los números de
`ADMIN_PHONE_NUMBERS`. n8n no habla con Kapso: si lo hiciera habría que duplicar allá la lista de
números y el manejo de la ventana.

**El problema medido (22-09-2026):** Kapso responde
`Cannot send non-template messages outside the 24-hour window`. Texto libre **solo** llega si ese
número le escribió al negocio en las últimas 24 h. Y este flujo lo dispara un cron cada 15 min, así
que el caso normal es estar **fuera** de la ventana.

| Para | Qué hace falta |
|---|---|
| **Probar hoy** | Nada. Escribile cualquier cosa al WhatsApp del negocio desde tu teléfono y la ventana queda abierta 24 h. El texto libre llega tal cual, con emojis y saltos de línea. |
| **Producción** | Una **plantilla aprobada en Kapso/Meta** con un solo parámetro de cuerpo, y `ADMIN_NOTIFY_TEMPLATE` (+ `ADMIN_NOTIFY_TEMPLATE_LANG`, default `es`) en Vercel. El texto del aviso viaja como ese parámetro. |

#### La plantilla

```
Nombre:     pdp_aviso_catalogo
Categoría:  Utility
Idioma:     Español  (código es — tiene que coincidir con ADMIN_NOTIFY_TEMPLATE_LANG)
Header:     ninguno
Footer:     ninguno
Botones:    ninguno

Cuerpo:
Electrificarte · flujo automatico de PDPs

{{1}}

Si necesitas el detalle con formato, responde este mensaje.
```

Tres reglas de Meta que condicionan ese diseño:

1. **El cuerpo no puede empezar ni terminar con una variable**, ni ser solo variables. De ahí el
   texto fijo arriba y abajo.
2. **Un parámetro no puede tener saltos de línea, tabs ni más de 4 espacios seguidos.** Esto no se
   rechaza al crear la plantilla: se rechaza **en el envío**, con `Parameter format does not
   match` — o sea, el error aparece recién en producción, con el aviso ya perdido. Por eso
   `lib/whatsapp/plantilla.ts` aplana el aviso a una línea con ` · ` antes de mandarlo.
3. **El cuerpo son 1.024 caracteres incluido el texto fijo.** El parámetro va topeado en 850.

Ejemplo de `{{1}}` para el formulario de Meta (un aviso real del flujo, ya aplanado, 274 chars):

```
🟡 GWM Ora 5 — quedo en borrador. · 23/29 campos aplicables · Fotos: 7 subida(s) · Pendientes: topSpeed, seats, seatRows, euroNcap, batteryType, chargeTimeDC · Lote de re-check: se asigna al publicarlo. · https://electrificarte.com/studio/structure/car;L73c2B0odFpWpv6l4jcKuM
```

La misma plantilla le sirve al Flujo C: los dos avisan por `/api/admin/notify`.

**Opcional, si se quiere el link como botón**: agregar un botón de URL con base estática
`https://electrificarte.com/studio/structure/` y sufijo dinámico `{{1}}`. Queda más lindo pero
obliga a un segundo parámetro y a cambiar el contrato de `/api/admin/notify`; con el link adentro
del cuerpo, WhatsApp igual lo hace clickeable.

`/api/admin/notify` ahora **intenta texto libre y, si falla, cae a la plantilla**, y devuelve
`{sent, phones, viaPlantilla, fallidos[]}` con el motivo de cada número que no recibió. Antes
devolvía `sent: 0` sin explicación: un aviso que no llega era indistinguible de un flujo que no
avisó nada.

> Meta corta los parámetros de plantilla mucho antes que el texto libre, así que por esa vía el
> aviso se recorta a 900 caracteres. Los mensajes de este flujo entran holgados.

### 3.5b La reserva del lote (por qué no basta con marcar fila por fila)

El cron corre cada 15 min y una fila tarda ~3 min. Si la reserva fuera por fila:

```
10:00  corrida A lee [f12, f13, f14] · marca f12 · empieza a trabajar
10:15  corrida B lee [f13, f14]  ← siguen en "listo": A todavía no llegó a ellas
       las dos corridas terminan creando la PDP de f13
```

La segunda la rebota R8 por slug duplicado, así que **no se duplica nada en Sanity** — pero recién
después de gastar ~US$0,30 y tres minutos, y la fila queda marcada `rechazada` sin que nadie
entienda por qué.

Por eso el nodo **`Reservar el lote`** marca las filas leídas como `en cola` de una sola vez, antes
del loop. La corrida siguiente ya no las ve.

**Estados de `estado`:** `listo` → `en cola` → `procesando` → resultado. Ninguno de los finales es
`listo`, así que una fila nunca se re-procesa sola. Si una ejecución se corta a la mitad, la fila
queda en `en cola` o `procesando` y se ve en el Sheet; para reintentarla se pone de vuelta en
`listo`.

### 3.5c Los timeouts: de quién es cada uno

Que n8n no tenga límite de ejecución **no elimina el corte de 60 s de Vercel**. Son dos relojes
distintos y conviene no mezclarlos:

| Reloj | Quién lo impone | Qué pasa si se agota |
|---|---|---|
| `maxConsultas × segundosEntreConsultas` = **12 min** | nosotros, en el nodo `Config` | La ejecución se rinde y avisa. Es un techo elegido (4× el peor caso medido), no un límite: n8n corre con `EXECUTIONS_TIMEOUT = -1`. Importa porque las filas se procesan de a una: una fila trabada retrasa a las que siguen |
| **60 s por llamada** a `/api/admin/pdp/*` | **Vercel, y sigue vigente** | La función se corta sin aviso: n8n ve un 504 y la PDP puede quedar escrita a medias |
| Sanity 25 s · fotos 30 s · Firecrawl 45 s · URL viva 15 s | nosotros, adentro del endpoint | Reparten ese presupuesto de 60 s para que ninguna pieza se lo coma entera |

Lo que la arquitectura saca del medio es hacer **la investigación** en Vercel: eso tarda 3 minutos
y ahí sí el corte era fatal. Ahora esos 3 minutos los espera n8n, y cada llamada suya es corta.

**Medido (Ora 5, 22-09-2026):**

```
6 vueltas de espera   0,4 – 0,7 s cada una
vuelta final          9,5 s   ← baja 7 fotos, las sube a Sanity, crea el documento
```

50 s de margen sobre el corte. **No lo tenía antes:** las fotos se bajaban y subían de a una, y
siete fotos secuenciales se acercaban peligrosamente al límite. Ahora van en paralelo, con un
presupuesto de reloj de 30 s: si bajarlas se lo come, sube solo la portada y anota el resto como
descartes. Mejor una PDP con portada que un 504 a mitad de la escritura.

### 3.6 Dónde quedan los logs

No hay un solo lugar. Cinco, con vidas distintas:

| Dónde | Qué guarda | Cuánto dura |
|---|---|---|
| **n8n → Executions** | La ejecución entera: qué fila, qué devolvió cada endpoint, cuántas vueltas de espera, el error si lo hubo | Defaults de n8n (no hay override en el contenedor): ~14 días y **10.000 ejecuciones compartidas con los otros 30 workflows** de la instancia. La base ya pesa 251 MB, así que no cuentes con los 14 días |
| **Hoja `AUTOS`** | `estado` y `detalle` de cada fila | Para siempre, pero **se sobrescribe**: solo queda el último intento de esa fila |
| **Claude Console → Sessions** | La sesión completa: cada `web_fetch`, el razonamiento, el contrato entregado, tokens y costo | Persistente. El flujo archiva la sesión al terminar, y archivada sigue siendo legible (solo pasa a ser de solo lectura) |
| **Vercel → Logs** | Los `console.warn` de `/api/admin/notify` con los avisos que no se entregaron | En Hobby, corto. Es el eslabón más débil |
| **Sanity** | El documento en sí: `aiGenerated`, `sourceUrls`, `catalogFindings` con las discrepancias y su cita | Para siempre |

**El agujero:** no hay historial append-only del flujo de creación. Si la misma fila se procesa dos
veces, el primer resultado se pierde del Sheet, y n8n lo puede haber podado. El Flujo C sí lo tiene
(hoja `CORRIDAS` + `catalog_check_runs` en Supabase).

Taparlo cuesta dos nodos: una hoja `CREACIONES` en modo append con
`fecha · fila · modelo · estado · N/M · fotos · costo · sessionId · carId`. Queda propuesto, no
implementado.

### 3.7 Prueba end-to-end (22-09-2026)

Auto real que no estaba en el catálogo: **GWM Ora 5**, `gwm.cl/vehiculo/ora/nuevo-ora-5/`.

```
1. iniciar  → validó sin IA y abrió la sesión           ~2 s
2. cerrar   → 7 vueltas de 25 s (≈ 3 min)               US$0,31
3. notify   → rebotado por la ventana de 24 h
```

Lo que quedó en Sanity (`hidden: true`, borrador):

```
GWM · Ora 5 · 2026 · SUV · EV          basePrice 26.490.000 (el declarado, no el leído)
23/29 campos aplicables · 0 vitales faltantes
435 km · 201 HP · 58,3 kWh · 7,5 s 0-100 · FWD
tagline: "SUV eléctrico con 435 km de autonomía y carga rápida DC de 120 kW"
7 fotos (portada + 6 de galería), 0 descartadas
sourceUrls: la URL de la fila
pendientes: topSpeed, seats, seatRows, euroNcap, batteryType, chargeTimeDC
```

Sin hallazgos de precio: lo que leyó en la fuente coincidió con lo declarado. El costo real por
auto quedó en **US$0,26–0,31** (tres corridas), contra los US$0,04 que presupuestaba el board.

### 3.8 Qué falta para encender el v2

| # | Tarea | Dueño |
|---|---|---|
| 1 | Env vars en Vercel: `ANTHROPIC_API_KEY`, `PDP_AGENT_ID`, `PDP_ENVIRONMENT_ID`, `ADMIN_API_SECRET`, `FIRECRAWL_API_KEY`, `ADMIN_PHONE_NUMBERS` | Matías |
| 2 | ~~Reemplazar la `FIRECRAWL_API_KEY`~~ ✅ hecha y verificada el 22-09-2026 | — |
| 3 | En n8n, nodo `Config` de `ecPdpCreacionV2`: confirmar `sheetId` y `siteBase` | Matías |
| 4 | Probar con **una** fila real marcada `listo` en la hoja AUTOS, con el workflow todavía inactivo (botón *Execute workflow*) | Matías |
| 5 | Decidir qué hacer con `6ViRF8qaij5BI2Cq` (el viejo): queda inactivo y sin tocar, pero tener dos workflows "PDP" confunde | Francisco/Matías |
| 6 | Decidir `PDP_GALERIA_MAX` (default 6; `0` = solo portada, como pedía R7) | Francisco |
| 7 | **Plantilla `pdp_aviso_catalogo` en Kapso/Meta** (copy listo en §3.5) + `ADMIN_NOTIFY_TEMPLATE` en Vercel — sin esto los avisos del cron se pierden | Matías |

## 4. Fase 0 — Descubrir los `sourceUrls`

Sin esto no hay Flujo C. Estado medido el 22-09-2026: **3 de 182 autos tienen `sourceUrls`.**

`scripts/gen-sheet-autos.ts` ya hace el primer pase, sin IA y sin costo. No adivina rutas con
patrones (eso da 404 casi siempre: cada marca arma sus URLs distinto). Lo que hace es:

1. Bajar el **sitemap** de la marca (`/sitemap.xml` y variantes, siguiendo un nivel de índice).
   Es XML estático, así que funciona incluso en sitios que renderizan todo con JavaScript — que
   son justo los que no dejan ver ni un link en la home. Esto subió los candidatos de 41 a 59.
2. Bajar la home y `/modelos`, `/vehiculos`, `/autos` para sumar el **texto del ancla**, que
   desambigua cuando la ruta no dice el nombre completo.
3. Elegir el link que mejor calza con el modelo, con tres filtros que importan:
   - **El primer token del modelo tiene que aparecer.** Sin eso, "i4 eDrive40 Gran Coupé" elegía
     `/modelos/2-gran-coupe`, que es otro auto.
   - **Mercado Chile** (`lib/chile-url.ts`). Los sitemaps de las marcas globales listan todos los
     países: sin el filtro el Sheet se llenaba de `/us/en/ev6` y `/kr/vehicles/ev5`.
   - **Penalización fuerte a `stories`, `blog`, `news`, `prensa`.** De un newsroom salió el
     "precio oficial" de $151.900 que motivó el piso de plausibilidad del código; el matcher
     había elegido `audi.cl/stories/...` para el Q8 e-tron antes de este filtro.
4. Validar el candidato con un GET y registrar **si el precio está en el HTML estático** — de ahí
   sale la columna `necesita_navegador`.

Resultado del pase automático: **48 candidatos válidos de 179.** No alcanza, y no por el
matcher: la mayoría de los sitios chilenos no expone el catálogo sin JavaScript.

**Pase manual (22-09-2026), cruzando sitemaps de marca, buscadores y el patrón de cada sitio:**

```
182 autos · 3 con url_oficial en Sanity · 119 con candidato validado · 60 sin candidato
de los 119: 86 traen el precio en el HTML · 33 necesitan navegador (Firecrawl)
```

Está persistido en **`data/fuentes-candidatas.tsv`** y versionado a propósito: el descubrimiento
automático no puede reproducirlo, así que regenerar el TSV sin esa semilla borraría el trabajo.
`gen-sheet-autos.ts` lo lee y lo siembra solo.

```
# volver a validar todo y actualizar la hoja AUTOS
npx tsx --env-file=.env.local scripts/validar-fuentes.ts data/fuentes-candidatas.tsv
```

**Lo que hizo rendir el pase manual** — patrones por marca, no adivinanza por auto:

| Marca | Patrón | Nota |
|---|---|---|
| Hyundai | `/modelos/<modelo>/precios-y-financiamiento/` | página de precios dedicada |
| Toyota | `toyota.cl/modelos/<categoria>/<modelo>/` | precio de lista + desglose de bonos |
| Kia | `/modelos/hibridos-electricos/kia-<modelo>.html` | |
| **Haval** | `gwm.cl/vehiculo/haval/<modelo>/` | su propio dominio está muerto; en Chile se vende bajo GWM |
| **Cupra** | `cupraofficial.cl/<Modelo>/<modelo>` | `cupra.cl` no existe |
| Chery | `chery.cl/<modelo>/` | |
| Volvo | `/cl/cars/<modelo>-electric/` y `-hybrid/` | |
| BMW · MG | `/modelos/<modelo>` · `/model/MG-<MODELO>` | |
| **Porsche** | `compare.porsche.com/es-CL?model-series=<familia>` | no publica precio de lista en página estática; el comparador sí muestra CLP |

**Pase con Firecrawl (22-09-2026, 36 marcas, ~90 credits en tres corridas).** Cerró 7 más y,
más útil, explicó por qué el resto no cierra. Estado final:

```
182 autos · 3 con url_oficial en Sanity · 125 con candidato validado · 54 sin candidato
de los 125: 91 traen el precio en el HTML · 34 necesitan navegador (Firecrawl)
```

Tres cosas que costaron y conviene no repetir:

- **Rate limit sin throttle.** El tier gratis son 10 req/min. La primera corrida revisó 10 marcas
  y las otras 26 devolvieron 429. Ahora hay una espera de 10 s entre llamadas (un 429 no consume
  credit, así que lo que se perdió fue tiempo, no cuota).
- **Los nombres del catálogo traen la versión, las URLs no.** "Escape HEV" vive en
  `/all-new-escape/`, "i7 M70 xDrive Berlina" en `/modelos/i7`. Exigir todos los tokens deja todo
  afuera; no exigir ninguno trae el auto equivocado. El matcher separa el **núcleo** (lo
  identificatorio) de los sufijos de versión, exige el núcleo, y puntúa los sufijos aparte.
- **Los números que van solos sí son obligatorios.** Sin eso "Tiggo 8 Pro PHEV" elegía
  `/tiggo-7-pro-max-phev/`, que es otro auto con otro precio. Y lo que la ruta trae **de más**
  penaliza: `/modelos/hatchback/gr_yaris` calzaba con "Yaris Sedán Híbrido" y es el GR Yaris, a
  combustión. Con la penalización pasó a `/modelos/sedan/new-yaris-sedan-hybrid/`.

**Los 54 que faltan, por motivo** — y ninguno se arregla con más scraping:

| Motivo | Autos | Detalle |
|---|---|---|
| El modelo **no está** en el sitio de la marca | 5 | `bmw.cl` lista i4/i5/iX1/iX2/iX3 pero **no** i7 ni iX. `byd.com/cl` no lista Seal ni Tang. `gwm.cl` no lista una H6 PHEV. Comprobado sobre la página renderizada: son candidatos a **descontinuado**, no a búsqueda. |
| Sitio de marca no scrapeable | ~22 | Jaecoo, Omoda y DS fallan con `ERR_TUNNEL` incluso en Firecrawl. Leapmotor, Jetour, Nammi y Mercedes-Benz no resuelven DNS con ningún subdominio. Jeep agota todos los motores. |
| Sin sitio web en Sanity | 4 | BAIC (2), AVTR, SOUEST |
| Catálogo renderizado sin link al modelo | ~23 | Smart, Dongfeng, GAC, Lynk & Co, Renault (Kwid), Tesla, Audi (Q8), Nissan, Honda, Fiat, Ford, JMC, Maxus, Riddara, DFSK, Hyundai (Palisade) |

Las dos primeras filas son **datos para Francisco**, no trabajo pendiente de scraping: hay que
decidir si esos autos siguen a la venta, y corregir 12 `brand.website` en Sanity.

**Optimización a decidir acá y no después:** varias marcas publican una sola página de precios
(BYD cubre 9 autos, MG 8, Porsche 8). Un `priceListUrl` por marca bajaría las lecturas semanales
de 176 a ~53 y el costo a ~US$4/mes. Contra: si esa página cambia de formato, caen 9 autos juntos.

## 5. Orden de construcción

| Fase | Entregable | Bloqueado por |
|---|---|---|
| **1** | Campos de auditoría en Sanity + `catalog_check_runs` en Supabase + `checkSlot` asignado a los 176 | ✅ hecho |
| **2** | `/api/admin/recheck/*` + auto-aplicar con guardas + `revertir` por WhatsApp + 45 tests | ✅ hecho, falta la prueba en vivo (key sin saldo) |
| **3** | `n8n/pdp-recheck.json` + credenciales + prueba con lote de 1 auto real | Fase 2 · credencial Google |
| **4** | Digest: cobertura real + "se manda siempre" · apagar el Flujo B | Fase 3 |
| **5** | Fase 0: 48 candidatos propuestos sin costo ✅ · faltan 134, necesitan Firecrawl o Console | `FIRECRAWL_API_KEY` |
| **6** | Flujo v2: agente + entorno en Console, endpoints `/api/admin/pdp/*`, workflow nuevo, 27 tests | ✅ hecho y probado en vivo · falta lo del §3.4 |

Las fases 1 y 2 no dependen de nada externo y se pueden testear contra el único auto que hoy
tiene `sourceUrls` (Ora 03, `https://www.gwm.cl/vehiculo/ora/ora-03/`) más 2–3 sembrados a mano.

---

## 5b. Costo de los scripts de mantenimiento — leer antes de correr uno

Los scripts de `scripts/` que leen fuentes (`corregir-desde-fuente`,
`recheck-corrida`, `buscar-fichas`) hacen **una llamada a la API de Anthropic por
auto**. Una pasada completa del catálogo son ~145 llamadas; con el fallback de
Firecrawl y la confirmación de precio, algunas son dos o tres.

**Lo que costó aprenderlo:** iterando el matcher de versiones se releyeron las
mismas páginas en vivo una y otra vez. Esas re-corridas eran depuración, no
trabajo entregado, y se llevaron cerca de la mitad de un gasto de **US**.

Reglas, en orden:

1. **La lectura se guarda en disco** (`lib/catalog-recheck/cache.ts`, TTL una
   semana). Ajustar la lógica y volver a correr cuesta **cero**. Solo
   `--sin-cache` vuelve a leer en vivo, y solo hace falta cuando el precio de
   verdad pudo cambiar.
2. **Antes de una pasada completa, decir el costo estimado.** 145 lecturas a
   ~US/bin/zsh,015 son ~US por pasada, y se acumulan rápido.
3. **Para verificar uno o dos autos sueltos**, usar las herramientas de la sesión
   (búsqueda y fetch del agente), que no consumen la API del cliente. Fue lo que
   se hizo con el descubrimiento de las 158 fuentes y salió gratis.
4. El endpoint de producción (`/api/admin/recheck/car`) **no usa la caché**: ahí
   el punto es leer la página de nuevo cada semana.

## 5c. PDFs oficiales — dónde vive el dato que la web no publica

`scripts/buscar-fichas.ts` barre la fuente de cada auto buscando PDFs y los guarda en
**`data/fichas-tecnicas.tsv`** (90 enlaces: 78 fichas técnicas y 12 listas de precios). Antes solo
los imprimía en consola y se perdían al cerrar la terminal.

**Qué sirve y qué no**, probado sobre los PDFs reales:

| | Resultado |
|---|---|
| Ficha técnica (Lexus NX) | ❌ **no desglosa por versión** — "240 hp" para toda la serie, y la fila "Versión" trae `Plus Premium Premium Lux F-Sport` en una sola celda |
| **Lista de precios (MG)** | ✅ **30 filas** con versión, transmisión, potencia, cilindrada, equipamiento y **dos precios: lista y promocional** |

O sea: las fichas técnicas casi nunca resuelven el problema de specs por versión — las marcas
publican la ficha del modelo, no de cada trim. **Las listas de precios sí**, y son justo donde
está el precio de lista que la web esconde detrás del promocional.

### context.dev para parsear los PDFs

`POST https://api.context.dev/v1/parse` con los bytes del PDF y `Content-Type: application/pdf`
devuelve markdown **con las tablas preservadas**, por **1 credit**. Free tier de 1.000
credits/mes, sin tarjeta. Env var: `CONTEXT_API_KEY`.

Notas de la prueba, para no perder tiempo:
- `/parse` toma **bytes**, no una URL. Hay que bajar el PDF primero.
- `/web/scrape` con `formats.parse` exige además `parseParams.rules`, así que para un PDF suelto
  conviene `/parse` directo.
- Los requests fallidos no se cobran.

**Por qué no lo reemplaza `web_fetch`:** Anthropic lee PDFs nativamente, pero devuelve prosa —
hay que pedirle que interprete. `/parse` devuelve la tabla, y sobre una tabla el diff aritmético
funciona sin intermediar un modelo, que es la regla C4 de este flujo.

**Como alternativa a Firecrawl:** mismo free tier (1.000/mes), 1 credit por scrape, y el
renderizado con JavaScript y el bypass de anti-bot vienen sin recargo. Tener las dos configuradas
son 2.000 credits gratis al mes. No se migró nada: Firecrawl sigue siendo el fallback del
re-check y anda bien.

### El script: `scripts/precios-desde-pdf.ts`

```
npx tsx --env-file=.env.local scripts/precios-desde-pdf.ts [--marca MG] [--aplicar] [--forzar] [--sin-cache]
```

Lee las filas `tipo=precios` de `data/fichas-tecnicas.tsv`, parsea cada PDF con `/v1/parse` y
compara la tabla contra `versions[]` en Sanity. En seco por defecto.

Cuatro cosas que costaron encontrar y que conviene no re-descubrir:

1. **El primer precio de la fila es el de lista; el segundo es el de campaña.** Verificado contra
   el sitio de MG (ZS HEV LUX figura a $21.990.000). Es la misma trampa del GWM Ora 03 (§2.6):
   quien lea la columna equivocada mete el precio con bonos como si fuera el de lista.
2. **La letra chica repite los mismos precios** dentro de las condiciones del bono y del crédito.
   Sin filtrarla, el PDF de Subaru pasa de 10 versiones a 30 filas, dos tercios basura.
3. **El emparejamiento fila↔versión no puede ser por tokens.** El PDF abrevia (`STD`, `DLX`,
   `49 KWh`) donde nosotros escribimos (`Standard`, `Deluxe`, `49kW`). Se resuelve con asignación
   global puntuada, y sobre todo con la regla de que **precio idéntico dentro del mismo modelo
   gana a cualquier parecido de nombre** — eso solo calzó 6 de los 8 MG al peso.
4. **Cache en disco obligatorio** (`.context/cache-pdf/`). Una lista de precios cambia una vez al
   mes; iterar el matcher sobre ella no puede volver a pagarse. Regla §5b.

Lo que el script **no** hace y es a propósito: no toca `discountPrice` (ese campo es el descuento
de Electrificarte, no el bono de la marca), no aplica cambios con deriva >25% sin `--forzar`, y no
borra versiones — las filas sin calce y las que ningún auto reclama se imprimen para que decida
una persona.

### Resultado de la primera corrida (sep-2026)

Solo hay **2 listas de precios reales** en el TSV, no 12: las 12 filas son 8 autos MG apuntando al
mismo PDF y 4 de Subaru, de las cuales 3 eran fichas técnicas mal etiquetadas (ya corregidas a
`tipo=ficha`, porque re-parsearlas gastaba credits en vano y una da timeout).

- **MG — 6 de 8 autos calzan exactos** con la lista oficial de septiembre 2026. Las 14 filas
  huérfanas son MG3/ZX/ZS/ONE a combustión pura, fuera de alcance.
- **MG Marvel R:** teníamos $29.990.000, que es el precio **con bonos**. El de lista es
  $40.990.000. Corregido.
- **MG ZS EV Long Range:** teníamos $27.990.000; la lista dice $33.990.000 para la única ZS EV que
  publica (`DLX 72KHw`). Corregido y renombrada. Queda una `ZS EV Standard` a $21.990.000 que el
  PDF **no lista** — probablemente descontinuada; no se borró.
- **Subaru Forester Híbrido:** teníamos **una** versión a $31.190.000, precio que no existe en la
  lista oficial. El PDF publica **dos** e-Boxer: Dynamic EyeSight $33.590.000 y Limited EyeSight
  $36.090.000. Aplicadas ambas.

El PDF de Subaru no lleva fecha impresa (el de MG sí: "LISTA DE PRECIOS SEPTIEMBRE 2026"). Se tomó
como vigente por ser el que subaru.cl linkea hoy.

**Lo que esto demuestra:** el PDF de lista es la única fuente que separa precio de lista de precio
con bonos. Los 3 errores encontrados son los 3 autos donde la web publicaba solo el precio
promocional — exactamente el agujero que el re-check por web no puede tapar solo.

## 6. Decisiones pendientes de Francisco / Matías

1. **Credencial de Google en n8n** — no existe ninguna en la instancia. OAuth2 (más simple, pero
   atada a una cuenta) o Service Account (más robusta, hay que compartirle el Sheet). Bloquea
   fases 3, 5 y 6.
2. **El Sheet** — ¿se crea uno nuevo con las 3 pestañas o hay uno que Francisco ya usa?
3. **API key de Anthropic** — la credencial `Anthropic account` de n8n es de otro proyecto. Para
   crear los agentes en el Console del cliente hace falta la key de ese workspace (y su
   `environment_id`).
3b. **`FIRECRAWL_API_KEY`** — la credencial `Firecrawl account` de n8n también parece de otro
   proyecto. Se necesita en `.env.local` y en Vercel para que corra el fallback (§2.11) y para
   cerrar los 134 `sourceUrls` que faltan (§4).
4. **`priceListUrl` por marca** — decidir en Fase 0 (§4). Baja el costo ~3×, pero acopla varios
   autos a una sola fuente: si esa página cambia de formato, caen 9 autos juntos en vez de 1.
5. **El reparto de versiones de las 9 familias** (§2.10). Sin declararlo, el re-check compara
   precios pero no versiones en esos 17 autos. Son ~15 min de Studio con los tokens que ya
   imprime `scripts/recheck-backfill.ts`.
