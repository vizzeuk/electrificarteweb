# Spec — Investigación de autos + revisión conversacional por WhatsApp (modo admin)

Documento de referencia para reimplementar este flujo fuera de Vercel (ej. n8n + agente Claude en
una VPS), donde no aplica el límite de 60s/300s por invocación que hoy limita esto en Vercel.
Contiene **todas** las reglas de negocio, prompts y umbrales tal como quedaron probados y
funcionando en este repo (`electrificarteweb`) al día de hoy. Si algo de acá cambia en el código,
actualizar también este documento.

Código fuente real (fuente de verdad — este doc es una copia, ante cualquier duda gana el código):
- `lib/pdp-research/research.ts` — motor de investigación (búsqueda, scraping, extracción, gates de calidad, creación del doc).
- `app/api/admin/pdp-research/route.ts` — orquestación HTTP (disparo async, mensajes a WhatsApp).
- `lib/whatsapp/admin-advisor.ts` — el agente conversacional (system prompt + tools) que habla con Francisco.
- `lib/whatsapp/admin-review-state.ts`, `lib/whatsapp/admin-pending-electric.ts` — estado en Redis.
- `lib/chile-url.ts` — validación de que una URL es efectivamente del mercado chileno.

## 1. Qué hace este flujo (resumen para Francisco)

Por WhatsApp, Francisco puede:
1. Pedir que se investigue un auto nuevo ("agrega el GWM Ora 03 GT") → el sistema busca la ficha
   oficial en Chile, extrae specs reales, sube fotos, y crea el auto **oculto** en el catálogo.
2. Revisar y aprobar lo encontrado antes de que se publique — primero las specs (puede corregir
   datos o pedir que se busque de nuevo lo que falte), después las fotos (elegir portada, sacar las
   que no sirven) — y recién ahí publicar.
3. Resolver los hallazgos de una revisión semanal automática de precio/vigencia (fuera del alcance
   de este documento — ver `lib/price-check/`, es un flujo aparte, M4).

**Regla de negocio dura, no negociable**: el auto se crea SIEMPRE oculto (`hidden: true`). Solo
pasa a visible cuando Francisco dice explícitamente "publica"/"listo" al final del flujo de fotos.
Nunca se publica automáticamente.

## 2. Arquitectura (por qué está separado en pasos async)

En Vercel, el trigger (webhook de WhatsApp) y el trabajo pesado (investigar) están desacoplados:
el webhook responde rápido (par de cientos de ms) y el trabajo real corre en background,
avisando por WhatsApp cuando termina (puede tardar 1-5 minutos: búsqueda + scraping + extracción +
subida de fotos). Esto existe por el límite de duración de función de Vercel — **en una VPS esto
no aplica**, se podría hacer todo síncrono en un solo paso si el flujo de n8n lo permite. Lo que sí
hay que preservar es el *comportamiento* que esto protege:

- El disparo debe responder rápido al webhook de WhatsApp (Kapso u otro proveedor puede tener su
  propio timeout).
- Nunca mandar un mensaje de "arrancando" y otro de "ya existe" casi simultáneos — el chequeo de
  duplicado debe pasar ANTES de comprometerse a decir "arrancando".
- Todo el trabajo pesado debe poder tardar varios minutos sin que eso rompa nada.

## 3. Pipeline de investigación — paso a paso

### 3.1 Chequeo de duplicado
Antes de cualquier búsqueda: `slugify("${brand} ${model}")` y buscar si ya existe un `car` en
Sanity con ese slug. Si existe, no se hace nada más — se avisa que ya existe, sin gastar tokens.

### 3.2 Buscar la fuente oficial
Un llamado a Claude con la tool nativa `web_search` (`web_search_20250305`, máx. 5 usos), pidiendo
la página oficial de la marca para Chile (ficha técnica + precio). Ver **prompt exacto** en la
sección 6.1. El modelo debe reportar `found: boolean` + hasta 3 URLs vía una tool `report_sources`
— nunca inventa una URL si no la encontró.

**Red de seguridad de mercado**: cada URL devuelta se valida con `isChileConfirmedUrl()` (sección
7) — si el modelo devuelve URLs pero ninguna confirma ser de Chile, se descartan todas y se trata
como "no encontrado". Existe porque el modelo a veces confunde un sitio regional LatAm genérico
con uno específico de Chile.

### 3.3 Scraping
Con Playwright (o equivalente), renderizar cada URL encontrada:
- Esperar `networkidle` (45s timeout), si falla usar `domcontentloaded` (30s) + esperar 3s extra —
  algunos sitios nunca llegan a networkidle por widgets de chat/trackers.
- Hacer scroll completo de la página antes de extraer (para que carguen imágenes lazy-load).
- Extraer: texto visible (`document.body.innerText`, máx. 12.000 caracteres), imágenes (excluyendo
  nav/header/footer/carruseles de "otros modelos" — importante: en sitios de marca con varios
  autos esas zonas muestran fotos de OTROS modelos), y hasta 2 enlaces internos a ficha
  técnica/PDF por página (regex de texto de enlace: "ficha técnica", "especificaciones",
  "características técnicas", "specs", o cualquier `.pdf`).
- PDFs: descargar y parsear texto (en este repo se usa `unpdf`, build de pdf.js sin dependencia de
  `canvas`/`DOMMatrix` — cualquier librería de parseo de PDF sirve mientras no dependa de APIs de
  navegador).
- Contenido "no usable" si: menos de 400 caracteres, o si el texto matchea patrones de bloqueo
  (`access denied`, `403 forbidden`, `enable javascript and cookies`, `attention required`,
  "verificando que eres humano", "are you a human").
- Imágenes descartadas si: son `data:`, `.svg`, contienen `logo|icon|favicon|sprite|placeholder`
  en la URL, o son thumbnails con sufijo `-NNxNN.ext`.

### 3.4 Respaldo — concesionario autorizado
Si la fuente oficial no tuvo NINGÚN contenido usable (ni la página ni sus PDFs), se prueba un
segundo llamado a Claude+web_search buscando un concesionario/distribuidor AUTORIZADO de la marca
en Chile (debe confirmar explícitamente esa condición en el sitio — nunca marketplaces de
terceros ni reventa particular). Ver prompt exacto en 6.2. Mismo filtro de mercado chileno.

**Importante — lección aprendida esta sesión**: este respaldo automático SOLO se activa cuando la
fuente oficial no trajo contenido en absoluto. Pero hay un caso más común: la fuente oficial SÍ
tiene contenido (specs completas) pero el sitio de fábrica no publica precio de lista (muy común
en Chile — BYD, por ejemplo, nunca publica precio en byd.com/cl). En ese caso el respaldo normal
NUNCA se activa (porque "hubo contenido"), y sin embargo el precio sigue faltando. Por eso hay una
**segunda instancia de respaldo, específica para precio**, que se explica en 3.6.

### 3.5 Extracción estructurada
Un llamado a Claude con `tool_choice` forzado a una tool `extract_car_specs` (schema completo en
sección 6.3), pasando todo el texto recolectado como "material fuente". **Regla estricta no
negociable**: usar SOLO datos que aparezcan explícitamente en el texto — nunca inventar, nunca
estimar por comparación con otros modelos, nunca usar conocimiento general del modelo. Preferible
dejar un campo vacío a arriesgar un dato incorrecto. Si el texto no trae info útil, se llama a la
tool con objeto vacío (nunca placeholders como "N/A", "<UNKNOWN>" — hay un filtro adicional
(`PLACEHOLDER_RE`) que limpia esos placeholders si igual aparecen).

### 3.6 Precio obligatorio (base + por versión) — con respaldo dedicado
Antes de dar por buena la ficha:
- `basePrice` debe ser un número > 0.
- Si el modelo tiene `versions[]` (trims/variantes), CADA versión también debe tener su propio
  `price` > 0.

Si falta el precio base O el de alguna versión, Y todavía no se usó el respaldo de concesionario
en este intento: se dispara una búsqueda de concesionario específica para esto (mismo mecanismo
de 3.4, pero forzada independientemente de si la fuente original tuvo contenido). Los datos que
trae el concesionario:
- Para campos simples (precio, batería, etc.): solo llenan lo que esté vacío en la fuente
  original — **nunca pisan un dato que la fuente oficial sí trajo**.
- Para versiones: se matchea por nombre de versión (slugificado) y SOLO se completa el `price` de
  versiones que YA existían en la extracción original y no tenían precio — nunca se agregan
  versiones nuevas desde el concesionario, nunca se pisan otros campos de una versión ya extraída.

Si después de esto el precio (base o de alguna versión) sigue sin aparecer, no es un error — es un
resultado real (algunos modelos de nicho no publican precio en ningún lado, ej. Hyundai IONIQ 5N
en Chile). Hay que decirlo explícito en el mensaje final para no invitar a reintentar en vano
("no tiene sentido reintentar de nuevo, hay que completarlo a mano").

### 3.7 Tipo de electrificación — regla estricta + confirmación manual
`electricType` (enum EV/PHEV/HEV/EREV/MHEV) solo se acepta si el texto confirma EXPLÍCITAMENTE que
ESA versión/trim específica (no "el modelo en general", que puede tener variantes a combustión
pura junto a variantes electrificadas) tiene motor eléctrico y/o batería. **Nunca inferirlo del
nombre del modelo** (ej. no asumir que algo es eléctrico solo porque el nombre "suena" a EV).

Regla de alcance de negocio: Electrificarte excluye autos 100% a combustión. Si no se puede
confirmar un tipo válido, NO se crea la ficha — mejor revisar a mano que publicar (aunque sea
oculto) algo fuera de alcance.

**Mecanismo de recuperación (agregado esta sesión, importante para no perder trabajo)**: cuando
esto falla, TODO lo ya investigado (specs extraídas, imágenes candidatas, URLs fuente, IDs de
marca/tipo de vehículo ya resueltos) se guarda en un estado temporal ligado al número de teléfono
de Francisco (TTL ~2 horas). Si Francisco confirma manualmente que sí es electrificado y de qué
tipo (ver tool `confirm_electric_type` en sección 5), se retoma con lo ya investigado — sin repetir
búsqueda ni scraping ni extracción, solo se resuelve el tipo y se continúa el pipeline desde el
paso 3.6 en adelante. Esto es intencional para no quemar tokens repitiendo trabajo ya hecho.

### 3.8 Mínimo de calidad
`MIN_FILLED_SPECS = 10`: si menos de 10 de los ~32 campos del schema de extracción quedaron
llenos, no se crea la ficha — quedaría casi vacía en la PDP pública, que muestra bastante más
detalle. Además se exige que al menos UNA de las tres categorías de equipamiento tenga contenido:
`safetyFeatures`, `techFeatures`, o `comfortFeatures` (arrays de strings) — están presentes en
todas las PDP del sitio, una ficha sin ninguna se ve incompleta.

Estos tres gates (specs mínimas + equipamiento + precio, sección 3.6) se evalúan juntos; si
cualquiera falla, no se crea nada y el mensaje final detalla cuál(es) faltó.

### 3.9 Fotos
- Candidatas: unión de todas las imágenes recolectadas en el scraping (deduplicadas), máximo 12.
- Mínimo deseado: 7 (1 portada + 6 galería) — si hay menos, se avisa pero NO bloquea la creación
  (a diferencia de specs/precio, que sí bloquean).
- Se suben todas las candidatas como assets. La primera subida es la portada (`mainImage`) Y
  también el primer elemento de la galería (`gallery[0]`) — convención del catálogo completo: la
  portada siempre está duplicada como primer elemento de la galería.
- Cada imagen de la galería tiene un `_key` único (ej. `img0`, `img1`...) — se usa para mapear
  "foto N" (como la ve Francisco, 1-indexed) al elemento real más adelante, en la revisión.

### 3.10 Creación del documento
`car` con `hidden: true`, `aiGenerated: true`, `sourceUrls` (todas las URLs realmente usadas,
oficiales + concesionario si se usó), y todos los campos de specs mapeados 1:1 desde lo extraído.
Se resuelven referencias a `brand` (se crea si no existe), `vehicleType` (match por label, si no
matchea queda vacío — no bloquea) y `electricType` (por el `tag` del enum). Se guarda el link a
Sanity Studio del doc recién creado.

## 4. Revisión conversacional (specs → fotos → publicar)

Estado por número de teléfono (una revisión activa a la vez — limitación conocida, ver sección 8):
```
{ carId, brand, model, step: "specs" | "photos", galleryKeys: string[] }
```

**Paso "specs"**: Francisco recibe un mensaje con nombre, tagline, precio, batería, autonomía,
potencia, garantía, lista de versiones (con precio o "precio no encontrado en ninguna fuente" si
corresponde), link a Sanity Studio, y el prompt de qué responder. Puede:
- Aprobar ("sí"/"dale") → se manda la galería completa numerada (fotos 1..N, la 1 marcada como
  portada actual) + instrucciones de fotos, pasa a paso "photos".
- Corregir un campo puntual ("la autonomía es 420", "el precio son 25990000") → patch directo en
  Sanity de ese campo (allowlist: `basePrice, discountPrice, range, batteryCapacity, power,
  tagline, description, warranty` — coerción numérica cuando corresponde). No avanza de paso.
- Pedir que se busque lo que falta ("faltan specs", "reintenta", "búscalo tú") → dispara una
  investigación de reintento que **agota TODAS las fuentes disponibles en un solo llamado** (ver
  sección 4.1) y **nunca** le pide a Francisco que pase el dato manualmente — es trabajo del
  sistema, no de él.

**Paso "photos"**: Francisco recibió todas las fotos numeradas. Puede:
- "portada N" → esa foto pasa a ser primera de la galería y `mainImage`.
- Números a sacar ("3, 7" o "saca la 5") → se eliminan esos elementos de la galería (por `_key`,
  mapeado desde el índice guardado en el estado). Si se saca la portada actual, la foto que queda
  primera pasa a ser la nueva portada automáticamente.
- "LISTO"/"todas bien"/"publica" → `hidden: false`, se limpia el estado de revisión, se manda el
  link público.

### 4.1 Reintento sobre un auto ya creado — agota TODAS las fuentes de una

Bug real encontrado y corregido esta sesión: al principio, el reintento solo probaba la MISMA
fuente que ya había fallado, y si encontraba aunque sea un campo (ej. la descripción) pero no el
precio, se daba por "resuelto" sin nunca probar el concesionario — Francisco tenía que pedir
"reintenta" varias veces y recibía el resultado goteado campo por campo.

**Comportamiento correcto (el que hay que replicar)**: un solo "reintenta"
1. Repite la búsqueda completa (pasos 3.2 a 3.5) desde cero.
2. Compara contra los datos actuales del auto en Sanity — arma un patch SOLO con los campos que
   estén vacíos ahora Y que la nueva búsqueda sí trajo. **Nunca pisa un campo que ya tiene dato**
   (sea el original o uno que Francisco corrigió a mano) — esto es una regla dura, sin excepciones.
3. Si TODAVÍA quedan campos vacíos después de eso (aunque se haya llenado algo), y no se usó
   todavía el concesionario en este intento: prueba el concesionario como fuente adicional, y
   fusiona lo que traiga (mismo criterio: solo campos vacíos, nunca pisa nada).
4. Reporta TODO lo que se llenó en un solo mensaje ("Se completaron N campo(s): ..."). Si el
   precio específicamente sigue sin aparecer tras agotar ambas fuentes, lo dice explícito y agrega
   que no tiene sentido seguir reintentando (para no quemar tokens en búsquedas que ya sabemos que
   no van a traer el dato).
5. No toca fotos ni versiones — eso tiene su propio flujo (revisión de fotos, o edición manual en
   Studio para versiones).

## 5. Tools que el agente de WhatsApp necesita exponer

Todas devuelven un string corto que el modelo debe repetir/parafrasear brevemente — **nunca debe
agregar contenido inventado sobre lo que la tool no devolvió** (ver sección 8, el bug de
alucinación).

| Tool | Cuándo | Qué hace |
|---|---|---|
| `start_research(brand, model)` | "agrega/investiga el X" | Dispara el pipeline completo (sección 3) para un auto nuevo. Devuelve "queued" o "ya existe". |
| `retry_missing_specs()` | "faltan specs", "reintenta", solo durante paso "specs" | Ver sección 4.1. |
| `confirm_electric_type(type)` | Tras un fallo de tipo eléctrico, Francisco confirma a mano | Ver sección 3.7. `type` ∈ {EV, PHEV, HEV, EREV, MHEV}. |
| `approve_specs()` | "sí"/"dale" en paso "specs" | Manda galería numerada, pasa a paso "photos". |
| `update_spec(field, value)` | Corrección puntual en paso "specs" | Patch directo del campo (allowlist fija). |
| `set_cover_photo(index)` | "portada N" en paso "photos" | Reordena galería, actualiza `mainImage`. |
| `remove_gallery_photos(indexes)` | Números a sacar en paso "photos" | Elimina fotos de la galería por índice. |
| `publish_car()` | "LISTO"/"publica" en paso "photos" | `hidden:false`, limpia estado, manda link público. |
| `apply_suggested_price(query)` / `restore_car(query)` / `dismiss_price_flag(query)` | Resolución de hallazgos semanales (M4, flujo aparte) | Fuera del alcance principal de este doc — ver `lib/price-check/`. |

## 6. Prompts exactos (copiar tal cual, son el resultado de mucho ajuste fino)

### 6.1 Búsqueda de fuente oficial (system prompt, con tool `web_search` + `report_sources`)
```
Buscas la página oficial (sitio de la marca, para Chile) de un modelo de auto específico —
precio de lista y ficha técnica. SOLO sitios oficiales de la marca. Nunca marketplaces de
terceros, foros, ni portales de reventa. Si el modelo no se vende oficialmente en Chile o no
encuentras una fuente oficial confiable, repórtalo con found:false — no inventes una URL.
Cuidado con sitios regionales genéricos (LatAm/Hispanoamérica) que NO son específicos de
Chile aunque estén en español — verifica que el sitio corresponda efectivamente al mercado
chileno (dominio .cl es la señal más confiable; si el dominio no es .cl, confirma
explícitamente en el contenido que el país/mercado es Chile antes de aceptarlo).
```
Mensaje de usuario: `Marca: {brand}\nModelo: {model}\nPaís: Chile`. Máx. 5 usos de `web_search`,
`user_location: {type: "approximate", country: "CL"}`. Tool `report_sources`: `{found: boolean,
urls: string[] (máx 3), note?: string}`.

### 6.2 Búsqueda de concesionario autorizado (respaldo)
```
Buscas el sitio de un concesionario o distribuidor AUTORIZADO de una marca de auto específica,
en Chile — se usa como respaldo porque el sitio oficial de fábrica no tuvo información
disponible. El sitio debe confirmar explícitamente su condición de representante autorizado de
la marca (ej. "concesionario oficial", "distribuidor autorizado"). Nunca marketplaces de
terceros, portales de clasificados, ni reventa particular. Si no encuentras uno confiable,
repórtalo con found:false — no inventes una URL. Mismo cuidado con sitios regionales genéricos
que no son específicos de Chile (dominio .cl es la señal más confiable).
```
Misma estructura de mensaje/tool que 6.1.

### 6.3 Extracción de specs (system prompt, con `tool_choice` forzado a `extract_car_specs`)
```
Extraes specs técnicas de un auto a partir de texto de páginas oficiales de marca. Regla
estricta: usa SOLO datos que aparezcan explícitamente en el texto entregado. Cualquier campo
que no puedas confirmar textualmente en la fuente queda ausente/null — nunca lo inventes,
nunca lo estimes por comparación con otros modelos, nunca uses tu conocimiento general. Es
preferible dejar un campo vacío a arriesgar un dato incorrecto. Si el texto fuente no trae
información útil (ej. página bloqueada, error de acceso, "Access Denied"), NO llames a la
herramienta con placeholders como "<UNKNOWN>", "N/A" o similares — en ese caso llama a la
herramienta sin ningún campo (objeto vacío), directamente omitiendo cada propiedad.
```
Mensaje de usuario: `Marca: {brand}\nModelo: {model}\n\n--- MATERIAL FUENTE ---\n{corpus}`.

Schema de la tool `extract_car_specs` (JSON Schema, `type: object`, sin `required` salvo donde se
indica):
```json
{
  "modelYear": { "type": "number", "description": "Año del modelo." },
  "vehicleType": { "type": "string", "description": "Ej: \"SUV\", \"Sedán\", \"City Car\", \"Pickup\"." },
  "electricType": {
    "type": "string", "enum": ["EV", "PHEV", "HEV", "EREV", "MHEV"],
    "description": "Solo si el texto confirma explícitamente que ESTA versión/trim específica (no el modelo en general, que puede tener variantes a combustión pura junto a variantes híbridas/eléctricas) tiene motor eléctrico y/o batería. Si el texto es ambiguo sobre si esta versión puntual es electrificada, omitir el campo — nunca inferirlo del nombre del modelo o de otras versiones."
  },
  "tagline": { "type": "string" },
  "description": { "type": "string" },
  "basePrice": { "type": "number", "description": "Precio de lista oficial en CLP, sin descuentos." },
  "motorDescription": { "type": "string" },
  "transmission": { "type": "string" },
  "batteryCapacity": { "type": "number", "description": "kWh" },
  "batteryType": { "type": "string", "enum": ["LFP", "NMC", "NCA", "NMCA", "other"] },
  "range": { "type": "number", "description": "Autonomía WLTP en km." },
  "electricRangeKm": { "type": "number", "description": "Solo PHEV/EREV: km en modo 100% eléctrico." },
  "fuelConsumption": { "type": "number", "description": "Solo HEV/PHEV/MHEV, km/L." },
  "rendimientoElectrico": { "type": "number", "description": "Solo BEV/PHEV, km/kWh." },
  "power": { "type": "number", "description": "CV/HP." },
  "torque": { "type": "number", "description": "Nm." },
  "acceleration": { "type": "number", "description": "0-100 km/h en segundos." },
  "topSpeed": { "type": "number", "description": "km/h." },
  "traction": { "type": "string", "enum": ["FWD", "RWD", "AWD"] },
  "seats": { "type": "number" },
  "cargo": { "type": "number", "description": "Maletero en litros." },
  "warranty": { "type": "string" },
  "connectorType": { "type": "string", "enum": ["CCS2", "Type2", "CHAdeMO", "GBT", "NACS", "Type1"] },
  "maxDCChargingPower": { "type": "number", "description": "kW." },
  "maxACChargingPower": { "type": "number", "description": "kW." },
  "chargeTimeDC": { "type": "string", "description": "Ej: \"18 min (10-80%)\"." },
  "chargeTimeAC": { "type": "string", "description": "Ej: \"7h (0-100%)\"." },
  "euroNcap": { "type": "number", "description": "Estrellas 1-5, solo si está explícito en la fuente." },
  "safetyFeatures": { "type": "array", "items": { "type": "string" } },
  "techFeatures": { "type": "array", "items": { "type": "string" } },
  "comfortFeatures": { "type": "array", "items": { "type": "string" } },
  "versions": {
    "type": "array",
    "description": "Una entrada por versión/trim distinta si el material lista varias.",
    "items": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "price": { "type": "number" },
        "batteryCapacity": { "type": "number" },
        "range": { "type": "number" },
        "power": { "type": "number" },
        "traction": { "type": "string", "enum": ["FWD", "RWD", "AWD"] },
        "acceleration": { "type": "number" }
      },
      "required": ["name"]
    }
  }
}
```

### 6.4 System prompt del agente conversacional (WhatsApp, el que habla con Francisco)

Este es el prompt más crítico y el que más ajuste requirió — cada "REGLA DURA" corrige un bug real
encontrado probando el flujo en vivo (ver sección 8 para el contexto de cada una). **Reforzar
estas reglas, no suavizarlas, al reimplementar en otro agente**:

```
Eres el asistente interno de Francisco, dueño de Electrificarte, en un canal de WhatsApp exclusivo para él (nunca clientes). Tienes tres funciones:

1. **Investigar autos nuevos**: Francisco escribe algo como "agrega el GWM Ora 03 GT". Extrae marca y modelo y llama a start_research(brand, model). Si es ambiguo, pregunta antes de llamar la tool — nunca inventes marca/modelo. El resultado de la tool es uno de dos: "queued" → responde SOLO con 1-2 frases cortas confirmando que quedó en curso y que avisas cuando termine (puede tardar unos minutos). "duplicate:<id>" → ese auto YA existe, dile a Francisco que ya está en el catálogo y que no se creó nada nuevo — nunca digas "arranqué la investigación" en ese caso.
   REGLA DURA: cada vez que Francisco pida agregar/investigar un auto, llama a start_research de nuevo — SIEMPRE, sin excepción. Nunca respondas "ya existe" o "es la ficha que estás revisando" basado en lo que dijiste en un turno anterior de esta misma conversación; esa afirmación SOLO vale si viene de un resultado "duplicate:<id>" de ESTE llamado a la tool, recién hecho. Tu propio historial de chat puede contener respuestas tuyas equivocadas — no es una fuente confiable de qué existe realmente en la base de datos.
   REGLA DURA: cuando el resultado es "queued", tu respuesta termina ahí — NUNCA sigas escribiendo precio, batería, autonomía, versiones, link de Studio, ni nada con forma de resumen de specs. Ese mensaje (portada + specs) lo manda el sistema automáticamente, en un mensaje aparte, minutos después, cuando la investigación de verdad termina — vos en ese momento no tienes esos datos, cualquier cosa que "recuerdes" o "completes" ahí es inventada y puede ser falsa (precio, link, specs — todo). Si te tienta escribir algo que se parece a una ficha técnica en esta respuesta, es la señal de que estás alucinando: bórralo y deja solo la confirmación corta.
   Si una investigación falla porque "no se pudo confirmar un tipo de electrificación válido" y Francisco te dice que sí es electrificado (ej. "es eléctrico" → EV, "es plug-in"/"enchufable" → PHEV, "es híbrido" a secas → HEV, "tiene extensor de rango" → EREV, "es mild hybrid/48V" → MHEV — si no está claro cuál de los cinco, pregúntale), llama a confirm_electric_type(type). Esto reusa la búsqueda ya hecha — nunca le digas que hay que investigar todo de nuevo.

2. **Guiar la revisión antes de publicar** (dos pasos, en este orden — nunca te saltes uno):
   - **Paso "specs"**: Francisco ya recibió el resumen de specs/versiones + link a Studio. Si dice "sí"/"aprobado"/"dale" → llama approve_specs() (esto manda las fotos directo, no agregues texto propio describiendo fotos que no has visto). Si en cambio corrige un dato ("la autonomía es 420", "el precio son 25990000") → llama update_spec(field, value) con el campo que corresponda (basePrice, discountPrice, range, batteryCapacity, power, tagline, description, warranty) y responde confirmando el cambio, sin avanzar de paso todavía. Si Francisco dice que falta un dato y pide que lo busques de nuevo ("faltan specs", "reintenta", "búscalo tú") → llama retry_missing_specs() — NUNCA le pidas a Francisco que te pase el dato manualmente, ese es tu trabajo. retry_missing_specs() solo completa campos vacíos, nunca pisa uno ya confirmado; avísale que la búsqueda corre aparte y tarda unos minutos, igual que start_research.
   - **Paso "photos"**: Francisco ya recibió todas las fotos numeradas. Si dice "portada N" → set_cover_photo(index). Si da números de fotos a sacar ("3, 7" o "saca la 5") → remove_gallery_photos(indexes). Si dice "LISTO"/"todas bien"/"publica" → publish_car().
   Estas tools (approve_specs, set_cover_photo, remove_gallery_photos) devuelven confirmaciones cortas — respóndelas tal cual, sin inventar detalle adicional sobre fotos o specs que no te devolvió la tool.

3. **Resolver hallazgos de la revisión semanal de precio/vigencia**: cada semana Francisco recibe un resumen con autos que quedaron con precio sobre el oficial (🟡) o posiblemente descontinuados (🔴, ya ocultos automáticamente). Francisco responde en lenguaje natural sobre esos hallazgos:
   - "aplicar <modelo>" o "bájale el precio al X" → llama apply_suggested_price(query) con el nombre del modelo que mencionó.
   - "restaurar <modelo>" o "el X sigue a la venta" → llama restore_car(query) (revierte el ocultamiento automático).
   - "descartar <modelo>" o "déjalo así el X" → llama dismiss_price_flag(query) (limpia el aviso sin cambiar nada).
   Si el nombre que da Francisco es ambiguo o no calza con nada, dile qué encontraste (o que no encontraste nada) — nunca asumas cuál auto es si hay duda real.

Si Francisco tiene una ficha en revisión (viste specs o fotos recientemente en la conversación), un "sí" o "listo" suyo se refiere a ESE paso — no lo confundas con otra cosa. Si el mensaje no calza con ninguna de estas tres funciones (saludo, pregunta general), responde breve y cordial, recordando que este canal es para gestionar el catálogo.

Mensajes cortos, directos, sin relleno — Francisco es el dueño del negocio, no un cliente.
```

**Sugerencias para robustecer aún más al reimplementar en n8n** (no implementadas todavía acá,
pero recomendadas si el nuevo agente muestra los mismos síntomas):
- Bajar el límite de tokens de la respuesta cuando el único resultado esperado es un ack corto
  ("queued"), para reducir el espacio en el que el modelo puede empezar a divagar/alucinar.
- Si la plataforma de destino lo permite, forzar `tool_choice` cuando el mensaje del usuario
  matchea claramente un patrón de intención (ej. "agrega/investiga X") en vez de dejar la decisión
  100% al criterio del modelo — reduce el riesgo de que responda de memoria sin llamar la tool.
- Cualquier claim del tipo "ya existe" / "ya está en revisión" que el agente haga debería poder
  auditarse: idealmente que la tool devuelva explícitamente ese estado en vez de que el modelo lo
  infiera del historial de chat.

## 7. Validación de mercado (Chile)

```js
function isChileConfirmedUrl(url) {
  return /(^|[./-])cl([/_-]|$)/i.test(url) || /chile/i.test(url);
}
```
Cubre: ccTLD `.cl` (`volvocars.com/cl`), locale con guión (`models.porsche.com/es-CL/...`), y
"chile" como palabra en la ruta. Se agregó cada patrón tras un falso negativo real que ocultó
autos vigentes — no angostar sin revisar por qué se agregó cada uno (ver git log del archivo
`lib/chile-url.ts` en este repo si hace falta el detalle histórico).

## 8. Bugs reales encontrados y corregidos esta sesión (contexto para no repetirlos)

1. **Mensajes contradictorios** ("ya existe" + "arranqué la investigación" casi simultáneos): el
   chequeo de duplicado vivía solo dentro del trabajo async, después de que el ack síncrono ya
   había prometido "arrancando". Fix: chequeo de duplicado SIEMPRE síncrono, antes de comprometerse
   a cualquier mensaje de "en curso".
2. **Reintento inútil sobre la misma fuente vacía**: ver sección 4.1 — el reintento repetía
   exactamente la misma búsqueda que ya había fallado. Fix: agotar concesionario también en el
   reintento, no solo en la creación inicial, y solo si TODAVÍA quedan campos vacíos (no solo si
   todos quedaron vacíos).
3. **Precio no era obligatorio**: una ficha podía crearse y mandarse a revisión sin precio. Fix:
   sección 3.6 (precio base + por versión, con respaldo de concesionario dedicado).
4. **Alucinación de resultados** (el más grave): al recibir "queued" del disparo de investigación,
   el agente conversacional, en el mismo turno, siguió escribiendo un resumen de specs COMPLETO
   inventado (precio, batería, versiones, hasta un link a Sanity Studio con un project ID que no
   existe) — el auto nunca se había creado. Peor: en el turno siguiente, citó su propia respuesta
   inventada como si fuera un hecho real ("ya existe, es la ficha en revisión"), sin volver a
   llamar ninguna tool — un loop de alucinación alimentado por su propio historial de chat. Fix:
   las dos "REGLA DURA" en el prompt de la sección 6.4 (nunca seguir escribiendo tras un "queued",
   nunca responder "ya existe" sin un tool call fresco). **Este es el riesgo más alto a vigilar en
   cualquier reimplementación** — probarlo específicamente pidiendo el mismo auto dos veces
   seguidas y verificando que la segunda respuesta también dispare una tool real.
5. **Estado de revisión abandonado reactivado por error**: si una investigación nueva fallaba (sin
   crear nada) y después Francisco decía "sí" pensando en esa investigación, el sistema en
   cambio retomaba una revisión vieja sin terminar de OTRO auto (mandó fotos del auto equivocado).
   Fix: al arrancar una investigación nueva genuina ("queued" real), se limpia cualquier estado de
   revisión viejo pendiente — un "sí" después de eso no tiene nada viejo que reactivar por error.
6. **Tipo de electrificación no confirmado tiraba todo el trabajo hecho**: ver sección 3.7 — se
   perdía toda la búsqueda/scraping/extracción ya pagada (en tokens y tiempo) solo porque el texto
   fuente no confirmaba explícitamente el tipo, aun cuando Francisco sabe con certeza que el auto
   es electrificado. Fix: mecanismo de confirmación manual reusando el trabajo ya hecho.
7. **Vercel Hobby, límite de 60s por función**: causa real (antes diagnosticada erróneamente como
   problema de memoria) de crashes tipo `browser.newPage: Target page, context or browser has been
   closed` — el plan gratuito mata la función a los 60s sin importar el `maxDuration` declarado en
   código. Con Vercel Pro sube a 300s. **En una VPS este problema no debería existir** — es
   justamente la motivación de este documento.

## 9. Limitación de diseño conocida, no resuelta (decisión pendiente)

El estado de revisión (`admin_review`) y el de confirmación pendiente de tipo eléctrico
(`admin_pending_electric`) son **un solo slot por número de teléfono**, no una cola. Si Francisco
pide investigar varios autos de una y terminan casi al mismo tiempo, solo puede revisar
conversacionalmente el ÚLTIMO que terminó — los demás quedan creados (ocultos) pero sin flujo de
revisión por WhatsApp, hay que revisarlos y publicarlos a mano en Sanity Studio. No es un bug, es
una simplificación deliberada mientras el volumen de uso es bajo — si el flujo en n8n va a
soportar que Francisco agregue varios autos de una, esto hay que rediseñarlo como una cola por
teléfono en vez de un slot único.

## 10. Constantes / umbrales (todos ajustables, valores actuales probados)

| Constante | Valor | Qué controla |
|---|---|---|
| `MIN_FILLED_SPECS` | 10 | Mínimo de campos de specs llenos para crear la ficha. |
| `MIN_DESIRED_PHOTOS` | 7 | Mínimo deseado de fotos (portada + 6) — solo avisa, no bloquea. |
| `MAX_SEARCH_USES` | 5 | Máximo de usos de `web_search` por búsqueda de fuente. |
| `MAX_SOURCE_URLS` | 3 | Máximo de URLs que se aceptan por búsqueda de fuente. |
| `MAX_TEXT_CHARS_PER_SOURCE` | 12.000 | Tope de texto por página/PDF scrapeado. |
| `MAX_EXTRA_LINKS_PER_SOURCE` | 2 | Enlaces internos adicionales (specs/PDF) que se siguen por página. |
| `MAX_IMAGE_CANDIDATES` | 12 | Tope de imágenes candidatas a subir. |
| `MIN_USEFUL_CHARS` | 400 | Umbral para descartar una página como "sin contenido útil". |
| TTL `admin_review` | 24h | Vigencia del estado de revisión en Redis. |
| TTL `admin_pending_electric` | 2h | Vigencia del estado pendiente de confirmar tipo eléctrico. |
