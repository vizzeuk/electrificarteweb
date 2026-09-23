// Genera n8n/pdp-creacion.json — el Flujo v2 del board de Miro "FLUJO PDP's"
// (diagrama "Flujo PDP v2"). Ver docs/FLUJO-PDP-N8N.md §3.
//   node scripts/gen-pdp-creacion.mjs
//
// Reemplaza a `6ViRF8qaij5BI2Cq — PDP desde WhatsApp` (ver la auditoría en el
// doc): mismo objetivo, trigger correcto, y sin la mitad de webhooks + static
// data que lo hacía imposible de operar.
//
// Nada de secretos acá: van como CREDENCIALES de n8n. Lo no-secreto (IDs del
// Sheet, cada cuánto se reintenta) vive en el nodo Config, editable desde la UI
// sin tocar la VPS.
import { writeFileSync } from "node:fs";

const ADMIN_CRED = { httpHeaderAuth: { id: "V9iMtS3nXUravFD5", name: "Electrificarte Admin" } };
const SHEETS_CRED = { googleSheetsOAuth2Api: { id: "rwCyQeH6TnQJDJkS", name: "Sheets Cadre" } };

const cfg = (k) => `{{ $('Config').first().json.${k} }}`;
/** La fila que se está procesando, desde cualquier punto del loop. */
const fila = (k) => `{{ $('Una fila a la vez').first().json.${k} }}`;

const http = (id, name, path, bodyJson, pos, notes, extra = {}) => ({
  parameters: {
    method: "POST",
    url: `=${cfg("siteBase")}${path}`,
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth",
    sendBody: true,
    specifyBody: "json",
    jsonBody: `=${bodyJson}`,
    options: { timeout: 90000, ...extra.options },
  },
  id, name,
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: pos,
  credentials: ADMIN_CRED,
  notes,
  ...extra.node,
});

const code = (id, name, jsCode, pos, notes) => ({
  parameters: { jsCode },
  id, name, type: "n8n-nodes-base.code", typeVersion: 2, position: pos, notes,
});

const ifEq = (id, name, left, right, pos, notes) => ({
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
      conditions: [{
        id: `${id}-c1`,
        leftValue: `=${left}`,
        rightValue: right,
        operator: { type: "string", operation: "equals" },
      }],
      combinator: "and",
    },
    looseTypeValidation: true,
    options: {},
  },
  id, name, type: "n8n-nodes-base.if", typeVersion: 2.2, position: pos, notes,
});

/** Actualiza la fila del Sheet por número de fila (matching column row_number). */
const actualizarFila = (id, name, columnas, pos, notes) => ({
  parameters: {
    operation: "update",
    documentId: { __rl: true, value: `=${cfg("sheetId")}`, mode: "id" },
    sheetName: { __rl: true, value: "AUTOS", mode: "name" },
    columns: {
      mappingMode: "defineBelow",
      value: { row_number: `=${fila("row_number")}`, ...columnas },
      matchingColumns: ["row_number"],
      schema: ["row_number", ...Object.keys(columnas)].map((k) => ({
        id: k, displayName: k, required: false, defaultMatch: k === "row_number",
        display: true, type: k === "row_number" ? "number" : "string", canBeUsedToMatch: true,
      })),
    },
    options: {},
  },
  id, name, type: "n8n-nodes-base.googleSheets", typeVersion: 4.5,
  position: pos, credentials: SHEETS_CRED, notes,
});

const avisar = (id, name, textExpr, pos, notes) =>
  http(id, name, "/api/admin/notify", `{ "text": ${textExpr} }`, pos, notes);

// ─── Nodos ───────────────────────────────────────────────────────────────────

const nodes = [
  {
    parameters: {
      content: [
        "## Flujo v2 — Creación de PDP desde el Sheet",
        "",
        "Cada 15 min lee la hoja **AUTOS** y toma las filas con `estado = listo`.",
        "Por cada una: valida sin IA → abre una sesión del Managed Agent → espera → crea el",
        "borrador **oculto** en Sanity → escribe el resultado en la fila y avisa por WhatsApp.",
        "",
        "### Reglas del board que este flujo hace cumplir",
        "- **R6 · todo nace `hidden:true`.** Publicar es siempre acto humano.",
        "- **R8 · idempotencia por slug.** Si la PDP ya existe, no se crea: se avisa duplicado.",
        "- **El borrador SIEMPRE se crea.** El umbral de llenado decide el mensaje y el estado de",
        "  la fila, no si se crea. Lo único que impide crear es la validación sin IA o el slug.",
        "",
        "### Antes de activar",
        "1. **Nodo Config**: pegá `sheetId` (el de *AUTOS ELECTRIFICARTE*) y confirmá `siteBase`.",
        "2. **Credenciales**: `Electrificarte Admin` (Header Auth, name `x-admin-secret`) y",
        "   `Sheets Cadre` (Google Sheets OAuth2). Las dos ya existen en esta instancia.",
        "3. **En Vercel**: `ADMIN_API_SECRET` (el mismo de la credencial), `ANTHROPIC_API_KEY`,",
        "   `PDP_AGENT_ID` y `PDP_ENVIRONMENT_ID` — los dos últimos los imprime",
        "   `npx tsx --env-file=.env.local scripts/claude-agents-apply.ts --aplicar`.",
        "",
        "### Por qué n8n no habla con Anthropic",
        "Este stack de Portainer es compartido con ~30 workflows de Retoma, CADRE y frank. La key",
        "de Anthropic y la de Sanity viven en Vercel; acá solo va el `x-admin-secret`. Es la misma",
        "Directriz 1 que sigue el Flujo C.",
        "",
        "### Estados de la columna `estado`",
        "`listo` → **`en cola`** (reservada al leer el lote) → `procesando` → resultado.",
        "Ninguno de los estados finales es `listo`, así que una fila nunca se re-procesa sola.",
        "Si una ejecución se corta a la mitad, la fila queda en `en cola` o `procesando` y se ve:",
        "para reintentarla, ponela de vuelta en `listo`.",
        "",
        "### La espera",
        "Tres corridas medidas: **155–185 s**, **US$0,26–0,31**. El loop consulta cada 30 s hasta",
        "24 veces (**12 min de techo**, 4× el peor caso medido). n8n no tiene límite de ejecución",
        "(`EXECUTIONS_TIMEOUT = -1`), así que esperar es gratis — pero el techo sí importa por otra",
        "razón: las filas se procesan de a una, así que una fila trabada retrasa a las que siguen.",
        "",
        "⚠️ **El corte de 60 s de Vercel sigue existiendo** para `/api/admin/pdp/*`, que son",
        "funciones de Vercel. Lo que esta arquitectura saca del medio es hacer *la investigación*",
        "ahí: cada llamada individual del loop tarda 2–15 s. Los timeouts internos (Sanity 25 s,",
        "fotos 30 s, Firecrawl 45 s) reparten ese presupuesto de 60 s, no el de n8n.",
      ].join("\n"),
      height: 760, width: 560, color: 5,
    },
    id: "nota", name: "Lee antes de activar",
    type: "n8n-nodes-base.stickyNote", typeVersion: 1, position: [-660, 60],
  },

  {
    parameters: { rule: { interval: [{ field: "minutes", minutesInterval: 15 }] } },
    id: "cron", name: "Cada 15 minutos",
    type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [-60, 300],
    notes: "El board pide 15 min. Una fila tarda ~3 min, así que no hay riesgo de pisarse: el Sheet marca 'procesando' antes de empezar.",
  },

  {
    parameters: {
      assignments: {
        assignments: [
          { id: "c-site", name: "siteBase", value: "https://electrificarte.com", type: "string" },
          { id: "c-sheet", name: "sheetId", value: "1QYqaKy3pRkGhAe4K4VnV0uUa5G1sOWNMvkyWQxTiGd8", type: "string" },
          { id: "c-int", name: "segundosEntreConsultas", value: 30, type: "number" },
          { id: "c-max", name: "maxConsultas", value: 24, type: "number" },
        ],
      },
      options: {},
    },
    id: "config", name: "Config",
    type: "n8n-nodes-base.set", typeVersion: 3.4, position: [160, 300],
    notes: "Lo no-secreto y editable sin tocar la VPS. sheetId = AUTOS ELECTRIFICARTE.",
  },

  {
    parameters: {
      documentId: { __rl: true, value: `=${cfg("sheetId")}`, mode: "id" },
      sheetName: { __rl: true, value: "AUTOS", mode: "name" },
      filtersUI: { values: [{ lookupColumn: "estado", lookupValue: "listo" }] },
      options: { returnAllMatches: true },
    },
    id: "leer", name: "Filas marcadas listo",
    type: "n8n-nodes-base.googleSheets", typeVersion: 4.5, position: [380, 300],
    credentials: SHEETS_CRED,
    notes: "Paso 4 del diagrama. Solo `estado = listo`. Las 182 filas precargadas van con estado vacío a propósito: ya existen como PDP.",
  },

  {
    parameters: {
      operation: "update",
      documentId: { __rl: true, value: `=${cfg("sheetId")}`, mode: "id" },
      sheetName: { __rl: true, value: "AUTOS", mode: "name" },
      columns: {
        mappingMode: "defineBelow",
        value: {
          row_number: "={{ $json.row_number }}",
          estado: "en cola",
          detalle: `=Tomada ${"{{ $now.setZone('America/Santiago').toFormat('dd/MM HH:mm') }}"}`,
        },
        matchingColumns: ["row_number"],
        schema: ["row_number", "estado", "detalle"].map((k) => ({
          id: k, displayName: k, required: false, defaultMatch: k === "row_number",
          display: true, type: k === "row_number" ? "number" : "string", canBeUsedToMatch: true,
        })),
      },
      options: {},
    },
    id: "reservar", name: "Reservar el lote",
    type: "n8n-nodes-base.googleSheets", typeVersion: 4.5, position: [490, 300],
    credentials: SHEETS_CRED,
    notes:
      "Marca TODAS las filas del lote antes de empezar, no una por una.\n\n" +
      "Sin esto: el cron corre cada 15 min y una fila tarda ~3 min. La corrida de las 10:00 toma " +
      "[A,B,C], marca A y se pone a trabajar; a las 10:15 arranca otra corrida que sigue viendo B y C " +
      "en `listo` y las toma también. Las dos terminan creando la misma PDP — la segunda la rebota R8, " +
      "pero recién después de gastar ~US$0,30 y 3 minutos. Reservando el lote entero, la corrida " +
      "siguiente no ve nada.",
  },

  {
    parameters: { options: { reset: false } },
    id: "loop", name: "Una fila a la vez",
    type: "n8n-nodes-base.splitInBatches", typeVersion: 3, position: [600, 300],
    notes: "De a una: cada fila abre una sesión propia y la web escribe en Sanity. En paralelo no se gana nada (la espera es del agente) y se pierde trazabilidad.",
  },

  actualizarFila("marcar", "Marcar procesando",
    { estado: "procesando", detalle: `=Arrancó ${"{{ $now.setZone('America/Santiago').toFormat('dd/MM HH:mm') }}"}` },
    [820, 420],
    "'en cola' → 'procesando'. Si el flujo se cae a la mitad, la fila queda así y se ve en el Sheet — mejor que volver a 'listo' y re-procesarse sola cada 15 min."),

  http("iniciar", "Validar y abrir sesión", "/api/admin/pdp/iniciar",
    `{{ JSON.stringify({
      marca: $('Una fila a la vez').first().json.marca,
      modelo: $('Una fila a la vez').first().json.modelo,
      anio: Number($('Una fila a la vez').first().json.anio),
      tipo: $('Una fila a la vez').first().json.tipo,
      electrificacion: $('Una fila a la vez').first().json.electrificacion,
      url_oficial: $('Una fila a la vez').first().json.url_oficial,
      versiones: String($('Una fila a la vez').first().json.versiones ?? '')
    }) }}`,
    [1040, 420],
    "Pasos 5 a 10. La web valida sin IA (URL viva, refs en Sanity, slug libre, precios > 0) y, si pasa, abre la sesión del Managed Agent. Devuelve en segundos: el trabajo corre en la infra de Anthropic."),

  ifEq("ok", "¿Validación OK?", "{{ $json.ok }}", "true", [1260, 420],
    "Rama falsa = pasos 6 a 8 del diagrama: el error se escribe en la fila y sale un aviso corto."),

  actualizarFila("fila-err", "Fila · error de validación",
    { estado: "error", detalle: "={{ $('Validar y abrir sesión').first().json.errores.join(' | ') }}" },
    [1480, 620],
    "El detalle es accionable: qué columna corregir."),

  avisar("avisa-err", "Avisar error de validación",
    `{{ '⚠️ Fila ' + $('Una fila a la vez').first().json.row_number + ' del Sheet (' + $('Una fila a la vez').first().json.marca + ' ' + $('Una fila a la vez').first().json.modelo + '):\\n\\n• ' + $('Validar y abrir sesión').first().json.errores.join('\\n• ') }}`,
    [1700, 620],
    "Aviso corto, como pide el board. El detalle completo ya quedó en la fila."),

  {
    parameters: { amount: `=${cfg("segundosEntreConsultas")}`, unit: "seconds" },
    id: "esperar", name: "Esperar",
    type: "n8n-nodes-base.wait", typeVersion: 1.1, position: [1480, 300],
    webhookId: "pdp-v2-espera",
    notes: "Una corrida real tardó 155 s. La primera consulta a los 30 s casi nunca acierta, y da igual: consultar es gratis.",
  },

  http("cerrar", "¿Terminó? Cerrar y crear", "/api/admin/pdp/cerrar",
    `{{ JSON.stringify({
      sessionId: $('Validar y abrir sesión').first().json.sessionId,
      host: $('Validar y abrir sesión').first().json.host,
      fila: {
        marca: $('Una fila a la vez').first().json.marca,
        modelo: $('Una fila a la vez').first().json.modelo,
        anio: Number($('Una fila a la vez').first().json.anio),
        tipo: $('Una fila a la vez').first().json.tipo,
        electrificacion: $('Una fila a la vez').first().json.electrificacion,
        url_oficial: $('Una fila a la vez').first().json.url_oficial,
        versiones: String($('Una fila a la vez').first().json.versiones ?? '')
      }
    }) }}`,
    [1700, 300],
    "Pasos 11 a 21. Si la sesión sigue corriendo devuelve {estado:'corriendo'} y el loop vuelve a esperar. Si terminó: mide el llenado N/M, sube la portada, crea el borrador oculto y le asigna lote de re-check."),

  code("contar", "¿Seguir esperando?",
    [
      "// `$runIndex` es cuántas veces corrió ESTE nodo en ESTA ejecución: 0 en la",
      "// primera vuelta, 1 en la segunda… Es el contador correcto para un ciclo.",
      "// El flujo anterior usaba $getWorkflowStaticData('global'), que es global al",
      "// workflow y se pisa entre ejecuciones concurrentes — por eso su propia nota",
      "// pedía 'worker concurrency 1'.",
      "const max = Number($('Config').first().json.maxConsultas ?? 20);",
      "const r = $input.first().json;",
      "const corriendo = r.estado === 'corriendo';",
      "const agotado = corriendo && $runIndex + 1 >= max;",
      "return [{ json: { ...r, corriendo: corriendo && !agotado, agotado, vuelta: $runIndex + 1, max } }];",
    ].join("\n"),
    [1920, 300],
    "Techo de vueltas para que una sesión colgada no deje la ejecución girando para siempre."),

  ifEq("sigue", "¿Sigue corriendo?", "{{ $json.corriendo }}", "true", [2140, 300],
    "Rama verdadera vuelve a Esperar. Es el único ciclo del flujo."),

  ifEq("agotado", "¿Se agotó la espera?", "{{ $json.agotado }}", "true", [2140, 460],
    "Separa 'la sesión entregó' de 'nos cansamos de esperar'. Sin esto las dos ramas escribirían en la misma fila."),

  actualizarFila("fila-ok", "Fila · resultado",
    {
      estado: "={{ $('¿Terminó? Cerrar y crear').first().json.estado }}",
      detalle: "={{ $('¿Terminó? Cerrar y crear').first().json.detalleFila || '' }}",
      pdp_id: "={{ $('¿Terminó? Cerrar y crear').first().json.carId || '' }}",
      link_studio: "={{ $('¿Terminó? Cerrar y crear').first().json.studioUrl || '' }}",
      lote: "={{ $('¿Terminó? Cerrar y crear').first().json.lote || '' }}",
      publicado: "no",
    },
    [2380, 560],
    "`estado` queda en 'listo_para_revisar', 'borrador_incompleto', 'sin_datos' o 'rechazada'. Ninguno es 'listo', así que la fila no se re-procesa sola."),

  avisar("avisa-ok", "Avisar resultado",
    "{{ $('¿Terminó? Cerrar y crear').first().json.mensaje }}",
    [2600, 560],
    "Pasos 16 a 21. El mensaje lo arma la web: trae el N/M, los faltantes y el link directo a Studio."),

  actualizarFila("fila-timeout", "Fila · se agotó la espera",
    {
      estado: "error",
      detalle: "={{ 'La sesión ' + $('Validar y abrir sesión').first().json.sessionId + ' no terminó en ' + Math.round($('Config').first().json.segundosEntreConsultas * $('Config').first().json.maxConsultas / 60) + ' min' }}",
    },
    [2380, 360],
    "La sesión sigue viva en Console: se puede mirar ahí qué pasó antes de volver a marcar la fila."),

  avisar("avisa-timeout", "Avisar espera agotada",
    `{{ '⏱️ ' + $('Una fila a la vez').first().json.marca + ' ' + $('Una fila a la vez').first().json.modelo + ': la investigación no terminó a tiempo.\\n\\nSesión: ' + $('Validar y abrir sesión').first().json.sessionId }}`,
    [2600, 360],
    "Sin esto, una sesión colgada se pierde en silencio."),

  {
    parameters: {}, id: "volver", name: "Siguiente fila",
    type: "n8n-nodes-base.noOp", typeVersion: 1, position: [2820, 460],
    notes: "Devuelve el control al loop para la fila que sigue.",
  },
];

const to = (node, index = 0) => [{ node, type: "main", index }];

const connections = {
  "Cada 15 minutos": { main: [to("Config")] },
  "Config": { main: [to("Filas marcadas listo")] },
  "Filas marcadas listo": { main: [to("Reservar el lote")] },
  "Reservar el lote": { main: [to("Una fila a la vez")] },
  "Una fila a la vez": {
    // salida 0 = terminó el loop · salida 1 = siguiente item
    main: [[], to("Marcar procesando")],
  },
  "Marcar procesando": { main: [to("Validar y abrir sesión")] },
  "Validar y abrir sesión": { main: [to("¿Validación OK?")] },
  "¿Validación OK?": { main: [to("Esperar"), to("Fila · error de validación")] },
  "Fila · error de validación": { main: [to("Avisar error de validación")] },
  "Avisar error de validación": { main: [to("Siguiente fila")] },
  "Esperar": { main: [to("¿Terminó? Cerrar y crear")] },
  "¿Terminó? Cerrar y crear": { main: [to("¿Seguir esperando?")] },
  "¿Seguir esperando?": { main: [to("¿Sigue corriendo?")] },
  "¿Sigue corriendo?": { main: [to("Esperar"), to("¿Se agotó la espera?")] },
  "¿Se agotó la espera?": { main: [to("Fila · se agotó la espera"), to("Fila · resultado")] },
  "Fila · resultado": { main: [to("Avisar resultado")] },
  "Avisar resultado": { main: [to("Siguiente fila")] },
  "Fila · se agotó la espera": { main: [to("Avisar espera agotada")] },
  "Avisar espera agotada": { main: [to("Siguiente fila")] },
  "Siguiente fila": { main: [to("Una fila a la vez")] },
};

const workflow = {
  // ID fijo: `n8n import:workflow` es idempotente contra el mismo ID, así que
  // re-importar actualiza este workflow en vez de dejar copias sueltas.
  id: "ecPdpCreacionV2",
  name: "Electrificarte — Creación de PDP desde el Sheet (Flujo v2)",
  nodes,
  connections,
  settings: { executionOrder: "v1", timezone: "America/Santiago" },
  active: false,
};

writeFileSync("n8n/pdp-creacion.json", JSON.stringify(workflow, null, 2) + "\n");
console.log("✓ n8n/pdp-creacion.json");
