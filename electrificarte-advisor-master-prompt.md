# Master Prompt: Agente Advisor EV — Electrificarte × Kapso

> Pega este documento completo al inicio de tu sesión con Claude Code.  
> Es el contexto de proyecto, arquitectura decidida y tareas a ejecutar en orden.

---

## Contexto del proyecto

**Electrificarte** (electrificarte.com) es un marketplace chileno de vehículos electrificados (BEV, HEV, PHEV, MHEV, REEV).

Estamos construyendo un **agente conversacional en WhatsApp** que actúa como asesor de compra: guía al usuario a través de sus necesidades, filtra el catálogo real de vehículos y, en hitos clave de la conversación, entrega links directos a las fichas de producto (PDP) en el sitio.

El agente corre sobre **Kapso** (kapso.ai). El catálogo vive en **Sanity.io**.

### Datos confirmados del proyecto

| Variable | Valor |
|---|---|
| URL base de PDPs | `https://electrificarte.com/auto/[slug]` |
| Campo slug en Sanity | `slug.current` |
| Moneda de precios | CLP, número entero |
| Dataset Sanity | `production` |
| Canal | WhatsApp Business via Kapso |
| Modelo de IA | Claude Sonnet (en Agent Node de Kapso) |

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Canal de conversación | WhatsApp Business via Kapso |
| Orquestación del agente | Kapso Workflows (Agent Node) |
| Lógica de filtrado | Cloudflare Workers (functions Kapso) |
| Knowledge base / catálogo | Sanity.io (GROQ API) |
| Modelo de IA | Claude Sonnet |

---

## Arquitectura

```
Usuario WhatsApp
      ↓
[Kapso Trigger] inbound_message
      ↓
[Send text] → Saludo inicial
      ↓
[Agent Node] → EV Advisor (multi-turno, stateful)
      ├── Tool: search_vehicles    → Cloudflare Worker → Sanity GROQ
      ├── Tool: get_vehicle_detail → Cloudflare Worker → Sanity GROQ
      ├── save_variable / get_variable (estado de sesión)
      └── complete_task() → fin del flujo
      ↓
[Handoff node] → escalar a humano si el usuario lo pide
```

---

## Tarea 1 — Inspección del schema de Sanity (OBLIGATORIA, hacerla primero)

Antes de escribir cualquier query GROQ, inspecciona el schema real para confirmar nombres de campos exactos.

### Cómo listar el schema

```bash
# Opción A: via CLI de Sanity (si el proyecto está disponible localmente)
npx sanity@latest schema extract --path=./schema-dump.json

# Opción B: introspección via GROQ API
curl "https://<PROJECT_ID>.api.sanity.io/v2024-01-01/data/query/production?query=*[_type=='vehicle'][0]" \
  -H "Authorization: Bearer <SANITY_TOKEN>"
# Ajusta 'vehicle' por el nombre real del document type si es diferente
```

### Qué confirmar antes de continuar

1. **Nombre exacto del document type** de vehículos (puede ser `vehicle`, `auto`, `vehiculo`, `car`, `modelo`)
2. **Nombre exacto del campo de tipo de electrificación** y los valores que usa (¿`BEV`, `HEV`, `PHEV`, `MHEV`, `REEV`? ¿o valores distintos?)
3. **Campo que controla visibilidad** — hay autos marcados como "ocultos". Puede ser:
   - Un booleano `hidden: true`
   - Un booleano `visible: false`  
   - Un campo de estado tipo `status: "hidden"` o `status: "inactive"`
   - Documenta el nombre exacto; la query GROQ debe excluir esos registros
4. **Confirmar** que `slug.current` es el campo correcto para construir la URL
5. **Confirmar** que el precio está en un campo numérico directo (no anidado en variantes u objetos)
6. **Campos de eficiencia** disponibles: ¿`kmPerLiter`, `kwhPer100km`, `range`, autonomía?

**No avances a Tarea 2 hasta tener estos nombres exactos.**  
Si hay ambigüedad, documenta las opciones y pregunta.

---

## Tarea 2 — Cloudflare Worker: `search-vehicles`

### Variables de entorno del Worker (configurar como secrets en Kapso)

```
SANITY_PROJECT_ID=
SANITY_TOKEN=          # token read-only de Sanity
```

La URL base de Sanity es siempre:
```
https://<SANITY_PROJECT_ID>.api.sanity.io/v2024-01-01/data/query/production
```

### Input que envía el agente (inyectado por Kapso en `body.input`)

```typescript
interface SearchVehiclesInput {
  drivetrainType?: string;   // BEV | HEV | PHEV | MHEV | REEV — omitir si sin preferencia
  maxPrice?: number;         // CLP entero — omitir si no mencionó presupuesto
  minRange?: number;         // km — omitir si no es relevante
  brand?: string;            // marca específica — omitir si sin preferencia
  limit?: number;            // default: 3, máximo: 5
}
```

### Output que debe retornar el Worker

```typescript
interface VehicleResult {
  id: string;                // _id de Sanity
  brand: string;
  model: string;
  drivetrainType: string;
  price: number;             // CLP
  range?: number;            // km
  efficiency?: string;       // ej. "5.2 L/100km" o "15 kWh/100km"
  pdpUrl: string;            // "https://electrificarte.com/auto/" + slug.current
  shortDescription?: string;
}

interface SearchVehiclesResponse {
  results: VehicleResult[];
  totalFound: number;
}
```

### Query GROQ base (ajustar nombres de campos según Tarea 1)

```groq
*[
  _type == "vehicle"
  && !(_id in path("drafts.**"))
  && <CAMPO_VISIBLE> != true        // reemplazar con el campo real de "oculto"
  && (!defined($drivetrainType) || drivetrainType == $drivetrainType)
  && (!defined($maxPrice) || price <= $maxPrice)
  && (!defined($minRange) || range >= $minRange)
  && (!defined($brand) || brand match $brand + "*")
] | order(price asc) [0...$limit] {
  "_id": _id,
  brand,
  model,
  drivetrainType,
  price,
  range,
  efficiency,
  "pdpUrl": "https://electrificarte.com/auto/" + slug.current,
  shortDescription
}
```

**Nota crítica:** `!(_id in path("drafts.**"))` excluye borradores de Sanity.  
El segundo filtro de visibilidad debe usar el nombre real del campo detectado en Tarea 1.

### Estructura del Worker

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json() as any;
    const input = body.input || {};

    const {
      drivetrainType,
      maxPrice,
      minRange,
      brand,
      limit = 3
    } = input;

    // Construir parámetros para GROQ
    const params = new URLSearchParams();
    const query = buildGroqQuery(); // construir según filtros presentes
    params.set("query", query);
    if (drivetrainType) params.set("$drivetrainType", JSON.stringify(drivetrainType));
    if (maxPrice)       params.set("$maxPrice", String(maxPrice));
    if (minRange)       params.set("$minRange", String(minRange));
    if (brand)          params.set("$brand", JSON.stringify(brand));
    params.set("$limit", String(Math.min(limit, 5)));

    const sanityUrl = `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/production`;

    const response = await fetch(`${sanityUrl}?${params.toString()}`, {
      headers: { "Authorization": `Bearer ${env.SANITY_TOKEN}` }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Sanity query failed", status: response.status }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await response.json() as any;
    const results = data.result || [];

    return new Response(JSON.stringify({
      results,
      totalFound: results.length
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
```

---

## Tarea 3 — Cloudflare Worker: `get-vehicle-detail`

Para cuando el usuario muestra interés en un modelo específico y quiere más detalle.

### Input

```typescript
interface GetVehicleDetailInput {
  vehicleId: string;  // _id de Sanity, obtenido de search_vehicles
}
```

### Query GROQ base (ajustar campos según Tarea 1)

```groq
*[
  _type == "vehicle"
  && _id == $vehicleId
  && !(_id in path("drafts.**"))
][0] {
  "_id": _id,
  brand,
  model,
  drivetrainType,
  price,
  range,
  efficiency,
  enginePower,
  batteryCapacity,
  chargingTime,
  "pdpUrl": "https://electrificarte.com/auto/" + slug.current,
  description,
  features
}
```

Retorna el objeto directamente (no array). Si no se encuentra, retornar `{ error: "not_found" }` con status 404.

---

## Tarea 4 — Workflow de Kapso

```typescript
import { START, Workflow } from "@kapso/workflows";

const EV_ADVISOR_SYSTEM_PROMPT = `...`; // ver Tarea 5

const workflow = new Workflow("ev-advisor", {
  name: "EV Advisor — Electrificarte"
});

workflow.addTrigger({
  type: "inbound_message",
  phoneNumberId: process.env.KAPSO_PHONE_NUMBER_ID!
});

workflow.addNode(START);

workflow.addNode("welcome", {
  type: "send_text",
  message: "👋 Hola, soy el asesor de Electrificarte. Te ayudo a encontrar el vehículo electrificado ideal para ti.\n\n¿Me cuentas cómo usas tu auto actualmente? (ciudad, carretera, cuántos km al día aproximadamente)"
});

workflow.addNode("ev_advisor", {
  type: "agent",
  systemPrompt: EV_ADVISOR_SYSTEM_PROMPT,
  providerModel: "claude-sonnet-4-5",
  temperature: 0.3,
  maxIterations: 40,
  enabledDefaultTools: [
    "get_whatsapp_context",
    "save_variable",
    "get_variable",
    "complete_task",
    "enter_waiting",
    "handoff_to_human"
  ],
  functionTools: [
    {
      name: "search_vehicles",
      description: "Busca vehículos publicados en el catálogo de Electrificarte según los criterios del usuario. Úsala cuando tengas suficiente información: al menos uso y presupuesto aproximado. Retorna máximo 5 opciones.",
      functionSlug: "search-vehicles",
      inputSchema: {
        type: "object",
        properties: {
          drivetrainType: {
            type: "string",
            enum: ["BEV", "HEV", "PHEV", "MHEV", "REEV"],
            description: "Tipo de electrificación. Omitir si el usuario no tiene preferencia."
          },
          maxPrice: {
            type: "number",
            description: "Precio máximo en CLP (número entero). Omitir si no mencionó presupuesto."
          },
          minRange: {
            type: "number",
            description: "Autonomía mínima en km. Relevante principalmente para BEV."
          },
          brand: {
            type: "string",
            description: "Marca específica si el usuario la mencionó explícitamente."
          },
          limit: {
            type: "number",
            description: "Número de resultados. Default 3, máximo 5."
          }
        }
      }
    },
    {
      name: "get_vehicle_detail",
      description: "Obtiene los detalles completos de un vehículo específico cuando el usuario quiere saber más sobre él. Requiere el ID del vehículo obtenido previamente de search_vehicles.",
      functionSlug: "get-vehicle-detail",
      inputSchema: {
        type: "object",
        properties: {
          vehicleId: {
            type: "string",
            description: "Campo _id del vehículo en Sanity, obtenido del resultado de search_vehicles."
          }
        },
        required: ["vehicleId"]
      }
    }
  ]
});

workflow.addEdge(START, "welcome");
workflow.addEdge("welcome", "ev_advisor");

export default workflow;
```

---

## Tarea 5 — System Prompt del Agente

```
Eres el asesor de compra de Electrificarte.com, el marketplace de vehículos 
electrificados en Chile.

## Tu rol
Ayudas a las personas a encontrar el vehículo electrificado que mejor se adapta 
a su vida, presupuesto y hábitos de manejo. Eres directo, honesto y no sobrepromes.

## Regla fundamental sobre el catálogo
SOLO puedes recomendar vehículos que aparezcan en el resultado de la herramienta 
search_vehicles. Si no hay resultados para los filtros del usuario, dilo claramente 
y sugiere ajustar algún criterio. NUNCA inventes modelos, precios ni especificaciones.

## Flujo de la conversación

### Fase 1 — Diagnóstico (máximo 3 preguntas antes de buscar)
Antes de llamar a search_vehicles, entiende:
- Uso principal: ciudad / carretera / mixto
- Distancia diaria aproximada
- Presupuesto máximo
- Si tiene donde cargar en casa o trabajo (relevante para BEV)
- Preferencia de tipo (eléctrico puro, híbrido, sin preferencia)

No hagas todas las preguntas de golpe. Conversa de forma natural, 
una o dos preguntas por mensaje.

### Fase 2 — Búsqueda
Con uso y presupuesto aproximado, ya puedes llamar a search_vehicles.
Si el usuario no da presupuesto, pregunta una vez más antes de buscar sin filtro de precio.

Presenta los resultados así:
• *[Marca] [Modelo]* — $[precio formateado en CLP]
  [1 línea con la característica más relevante para ese usuario]
  🔗 https://electrificarte.com/auto/[slug]

### Fase 3 — Profundización
Si el usuario muestra interés en un modelo específico, usa get_vehicle_detail 
para entregar más información antes de repetir el link.

### Hitos para incluir el link PDP
Incluye siempre el link cuando:
- Presentas resultados de búsqueda (un link por opción)
- El usuario pregunta por un modelo específico
- El usuario dice "me interesa", "cuéntame más", "cómo es ese"
- Haces una comparación entre dos modelos concretos

### Fase 4 — Cierre
Si el usuario parece decidido o quiere hablar con una persona, 
usa handoff_to_human con una breve razón.

## Formato para WhatsApp
- Mensajes cortos. Máximo 4-5 líneas por mensaje.
- Usa *negrita* con asteriscos para nombres de modelos y precios.
- Máximo 2 emojis por mensaje, solo donde aporten claridad.
- Nunca uses listas de más de 4 ítems.

## Lo que NO haces
- No recomiendes vehículos que no estén en el catálogo
- No des precios de mantención, seguros ni financiamiento
- No prometas stock ni plazos de entrega
- No discutas temas fuera de vehículos electrificados
```

---

## Tarea 6 — Variables de entorno

```bash
# .env local para desarrollo
KAPSO_API_KEY=
KAPSO_PHONE_NUMBER_ID=
KAPSO_PROJECT_ID=

SANITY_PROJECT_ID=
SANITY_TOKEN=          # token read-only (no write)

# En producción, configurar como secrets en Kapso y Cloudflare
```

---

## Tarea 7 — Despliegue

```bash
# 1. Instalar dependencias
npm install -g @kapso/cli
npm install --save-dev @kapso/workflows
npm install @cloudflare/workers-types

# 2. Login y link al proyecto Kapso
kapso login
kapso link --project <KAPSO_PROJECT_ID>

# 3. Desplegar Workers (quedan registrados como functions en Kapso)
kapso functions deploy search-vehicles
kapso functions deploy get-vehicle-detail

# 4. Verificar despliegue
kapso functions list

# 5. Build y push del workflow
kapso build
kapso push workflow ev-advisor

# 6. Verificar
kapso workflows list
```

---

## Tarea 8 — Prueba en Kapso Sandbox

Antes de conectar el número real, prueba estos tres casos en el Kapso Sandbox:

**Caso 1 — BEV urbano con presupuesto claro:**
> "Manejo unos 40km al día en la ciudad, tengo enchufe en casa, quiero algo 100% eléctrico bajo los 25 millones"

**Caso 2 — Usuario sin infraestructura de carga:**
> "Me interesa un auto más eficiente pero vivo en departamento y no tengo donde cargar"

**Caso 3 — Sin resultados en catálogo:**
> "Busco un Ferrari eléctrico bajo 10 millones"

**Checklist de validación por caso:**
- [ ] El agente no inventa modelos fuera del catálogo
- [ ] `search_vehicles` se llama con los parámetros correctos según lo que dijo el usuario
- [ ] Los links PDP tienen el formato `https://electrificarte.com/auto/[slug]`
- [ ] En el Caso 3, el agente responde honestamente que no hay resultados
- [ ] El agente no hace más de 3 preguntas seguidas sin buscar

---

*Electrificarte × Cadre Solutions — uso interno*
