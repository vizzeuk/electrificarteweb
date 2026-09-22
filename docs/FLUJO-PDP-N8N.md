# Flujos PDP en n8n — directrices de implementación

Implementación de los dos diagramas del board de Miro **FLUJO PDP's**
(`https://miro.com/app/board/uXjVHsrznZw=/`):

| Flujo | Qué hace | Estado |
|---|---|---|
| **v2 — Creación** | Google Sheet → validación sin IA → 1 agente Claude → borrador `hidden:true` en Sanity | Parcialmente hecho (workflow n8n existente, con trigger equivocado) |
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
| Google Sheets OAuth2 *o* Service Account | `Google Sheets — Electrificarte` | — | **no existe ninguna credencial de Google en la instancia** |

La de Google es bloqueante para el Flujo v2 y para los logs del Flujo C.

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

### 3.1 Qué hay que corregir en el workflow existente

`6ViRF8qaij5BI2Cq` tiene bien resuelto lo difícil — el ciclo de vida del Managed Agent:
verificación HMAC del webhook de Anthropic sobre el body crudo, la ventana de 300 s, el
`session_id → job` en static data, el `GET /v1/sessions/{id}/events`, la idempotencia por slug, y
el mapeo completo a Sanity con subida de portada. **Se reusa casi entero.** Lo que cambia:

1. **El trigger.** Hoy es un webhook de WhatsApp. El board dice Google Sheet cada 15 min, y la
   razón es buena: el humano es dueño de marca, modelo, año, URL y `versiones =
   "nombre|precio, nombre|precio"` (R4), y eso no se dicta por WhatsApp sin errores.
2. **Los `$env`** → credenciales + nodo Config (Directriz 1).
3. **El umbral.** Hoy `PDP_MIN_FILLED_SPECS` decide *si crea*. El board lo cambió: **el borrador
   SIEMPRE se crea**; el umbral solo decide el mensaje y el estado de la fila. Lo único que
   impide crear es la validación sin IA o el slug duplicado (R8).
4. **La métrica.** `N/M campos aplicables`, no % sobre 32 fijos: BEV 29 · PHEV/EREV 31 ·
   HEV/MHEV 25. Un HEV perfecto no puede pasar de 25/32 con el denominador plano — por eso el
   porcentaje actual miente.
5. **`sourceUrls`.** El v2 debe escribirlo siempre. Es lo que hace que la Fase 0 no se repita
   nunca más.

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
name:  Extractor PDP Chile
model: claude-sonnet-5
tools: agent_toolset_20260401            (bash + archivos: PDF de ficha técnica)
       web_fetch_20260209  allowed_domains = [host de la URL de la fila]
```

Sistema: las reglas R2–R5 y R9 textuales. Salida: el contrato estricto de
`claude-pdp-output-template.json`, JSON puro, sin markdown.

Se crea **una vez** (`POST /v1/agents`), se guarda `id` + `version`, y cada corrida solo abre
sesión (`POST /v1/sessions` con `agent`, `environment_id`, `initial_events`). Nunca
`agents.create()` por ejecución: las sesiones se fijan a una versión, y eso es lo que permite
iterar el prompt sin romper lo que está corriendo.

---

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

**Los 60 que faltan** son casi todos marcas chinas con importador propio, sitio lento o sin
catálogo estático: JAC (4), Deepal (4), Smart (3), Leapmotor (3), Jaecoo (3), Dongfeng (3),
Jetour (2), GAC (2), Maxus (2), Lynk & Co (2), Mercedes-Benz (2), BAIC (2), y sueltos. Jaecoo,
Omoda y DS dan timeout incluso con el dominio correcto. Ahí el camino es Firecrawl sobre la home
de cada una (~15 credits) o buscarlas a mano.

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
| **6** | Flujo v2: retriggear al Sheet, credenciales, umbral N/M | Console · credencial Google |

Las fases 1 y 2 no dependen de nada externo y se pueden testear contra el único auto que hoy
tiene `sourceUrls` (Ora 03, `https://www.gwm.cl/vehiculo/ora/ora-03/`) más 2–3 sembrados a mano.

---

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
