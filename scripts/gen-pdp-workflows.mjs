// Genera n8n/pdp-recheck.json — el re-check semanal de PDPs (Flujo C del board
// de Miro; ver docs/FLUJO-PDP-N8N.md §2.6).
//   node scripts/gen-pdp-workflows.mjs
//
// Se genera en vez de editarse a mano por el mismo motivo que waitlist/reviews
// (scripts/gen-waitlist-reviews-workflows.mjs): el JSON de n8n es ilegible en un
// diff, y las posiciones de los nodos a mano son un infierno.
//
// Nada de secretos acá. Los secretos son CREDENCIALES de n8n (el contenedor no
// tiene ni una env var de Electrificarte); lo configurable no-secreto vive en el
// nodo "Config", visible y editable desde la UI sin tocar la VPS.
import { writeFileSync } from "node:fs";

// IDs reales de las credenciales que ya existen en la instancia de n8n
// (n8n-cadre, volumen n8n-pruebas_n8n_data). Van con ID para que el workflow
// quede funcional al importar, sin pasar por la UI a elegirlas a mano.
const ADMIN_CRED = { httpHeaderAuth: { id: "V9iMtS3nXUravFD5", name: "Electrificarte Admin" } };
const SHEETS_CRED = { googleSheetsOAuth2Api: { id: "rwCyQeH6TnQJDJkS", name: "Sheets Cadre" } };

/** Lee un valor del nodo Config desde cualquier punto del flujo. */
const cfg = (k) => `{{ $('Config').first().json.${k} }}`;

const http = (id, name, path, bodyParams, pos, notes, extra = {}) => ({
  parameters: {
    method: "POST",
    url: `=${cfg("siteBase")}${path}`,
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth",
    sendBody: true,
    contentType: "json",
    specifyBody: "keypair",
    bodyParameters: { parameters: bodyParams },
    options: { timeout: 120000 },
    ...extra.parameters,
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
  id, name,
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: pos,
  notes,
});

const ifGt = (id, name, left, pos, notes) => ({
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
      conditions: [{
        id: `${id}-c1`,
        leftValue: `=${left}`,
        rightValue: 0,
        operator: { type: "number", operation: "gt" },
      }],
      combinator: "and",
    },
    looseTypeValidation: true,
    options: {},
  },
  id, name,
  type: "n8n-nodes-base.if",
  typeVersion: 2.2,
  position: pos,
  notes,
});

const sheet = (id, name, tab, columns, pos, notes) => ({
  parameters: {
    operation: "append",
    documentId: { __rl: true, value: `=${cfg("sheetId")}`, mode: "id" },
    sheetName: { __rl: true, value: tab, mode: "name" },
    columns: {
      mappingMode: "defineBelow",
      value: columns,
      matchingColumns: [],
      schema: Object.keys(columns).map((k) => ({
        id: k, displayName: k, required: false, defaultMatch: false,
        display: true, type: "string", canBeUsedToMatch: true,
      })),
    },
    options: {},
  },
  id, name,
  type: "n8n-nodes-base.googleSheets",
  typeVersion: 4.5,
  position: pos,
  credentials: SHEETS_CRED,
  notes,
});

const notify = (id, name, textExpr, pos, notes) =>
  http(id, name, "/api/admin/notify", [{ name: "text", value: `=${textExpr}` }], pos, notes);

// ─── Nodos ───────────────────────────────────────────────────────────────────

const nodes = [
  {
    parameters: {
      content: [
        "## Flujo C — Re-check semanal de precios de PDP",
        "",
        "4 corridas al día × 7 días = **28 lotes por semana**. Lote = techo(publicados / 28) → hoy 7 autos.",
        "Cada auto lleva un `checkSlot` 0–27 asignado al crearse, así que se revisa siempre el mismo día y hora.",
        "La corrida toma primero los de su lote y, si no llenan, completa con la cola por antigüedad —",
        "así una corrida caída no hace que esos autos se salten la semana.",
        "",
        "**Precios**: si el precio oficial cambió y una segunda lectura lo confirma, se actualiza solo en Sanity",
        "(solo `basePrice`, nunca el precio con descuento, nunca versiones ni año). Apagable con",
        "`RECHECK_AUTOAPPLY=false` en Vercel. El digest lo reporta y `revertir <modelo>` lo deshace.",
        "",
        "### Antes de activar",
        "1. **Credenciales**: ya vienen enchufadas — `Electrificarte Admin` (Header Auth) y `Sheets Cadre`",
        "   (Google Sheets OAuth2). Verificá que la primera tenga el header con nombre `x-admin-secret`",
        "   y como valor el mismo `ADMIN_API_SECRET` que está en Vercel.",
        "2. **Nodo Config**: pega `siteBase` (sin barra final) y `sheetId`.",
        "3. **El Sheet** necesita las hojas `AUTOS`, `CORRIDAS` y `FALTAN FUENTES` (mayúsculas: el nodo las busca por nombre exacto).",
        "4. **Bloqueante**: hoy solo 1 de 176 autos publicados tiene `sourceUrls`. Hasta que la Fase 0",
        "   los complete, este cron corre en vacío y avisa 175 autos sin fuente. Probá primero a mano",
        "   con el botón de test y `lote = 1`.",
        "",
        "### Por qué el lote se itera acá y no en la web",
        "El lote completo tarda 40–90 s y el límite duro de una función en Vercel Hobby es 60 s (ignora el",
        "`maxDuration` del código). Un auto por llamada son 10–20 s, con reintento propio, y una fuente",
        "lenta no arrastra a los otros 6.",
        "",
        "### Lo que este flujo NO hace",
        "No crea versiones, no borra versiones y no sube el año de modelo. Eso es acto humano desde",
        "WhatsApp o Studio: mientras 9 familias del catálogo compartan una sola página oficial, la",
        "detección de versiones no es confiable como para escribir sola.",
        "",
        "Detalle completo: `docs/FLUJO-PDP-N8N.md` §2",
      ].join("\n"),
      height: 760,
      width: 520,
      color: 5,
    },
    id: "nota", name: "Lee antes de activar",
    type: "n8n-nodes-base.stickyNote", typeVersion: 1, position: [-660, -80],
  },
  {
    parameters: {
      rule: { interval: [{ field: "cronExpression", expression: "0 9,15,19,23 * * *" }] },
    },
    id: "cron", name: "09:00 · 15:00 · 19:00 · 23:00",
    type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [-80, 300],
    notes: "TZ del contenedor: America/Santiago (GENERIC_TIMEZONE). 4 corridas al día = 28 lotes por semana.",
  },
  {
    parameters: {
      assignments: {
        assignments: [
          { id: "c-site", name: "siteBase", value: "https://electrificarte.com", type: "string" },
          { id: "c-sheet", name: "sheetId", value: "1QYqaKy3pRkGhAe4K4VnV0uUa5G1sOWNMvkyWQxTiGd8", type: "string" },
          { id: "c-lote", name: "lote", value: 0, type: "number" },
        ],
      },
      options: {},
    },
    id: "cfg", name: "Config",
    type: "n8n-nodes-base.set", typeVersion: 3.4, position: [140, 300],
    notes: "Lo único que se edita a mano. `lote` en 0 = la web lo calcula sola (techo(publicados/28)). Para probar, ponlo en 1.",
  },

  http("queue", "Tomar el lote", "/api/admin/recheck/queue",
    [{ name: "limit", value: `=${cfg("lote")}` }],
    [380, 300],
    "Devuelve los 7 autos con la revisión más antigua (cola por antigüedad, no partición fija) + los que no tienen URL de fuente + la cobertura de la semana."),

  ifGt("if-sin-fuente", "¿Hay autos sin fuente?", "{{ $json.sinFuenteTotal }}", [620, 120],
    "C3: sin sourceUrls no hay revisión. Se pide la URL y el auto vuelve a la cola."),

  code("prep-fuentes", "Armar filas de faltantes",
    [
      "// Una fila por auto sin fuente. El aviso por WhatsApp va agrupado (una vez),",
      "// no un mensaje por auto: 175 mensajes se dejan de leer al tercero.",
      "const q = $('Tomar el lote').first().json;",
      "const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });",
      "return (q.sinFuente ?? []).map((c) => ({",
      "  json: { fecha, marca: c.marca, modelo: c.nombre, slug: c.slug, carId: c.carId, url_oficial: '' },",
      "}));",
    ].join("\n"),
    [860, 40],
    "La columna url_oficial queda vacía a propósito: es la que llena Francisco."),

  sheet("sheet-fuentes", "Sheet · faltan fuentes", "FALTAN FUENTES", {
    fecha: "={{ $json.fecha }}",
    marca: "={{ $json.marca }}",
    modelo: "={{ $json.modelo }}",
    slug: "={{ $json.slug }}",
    carId: "={{ $json.carId }}",
    url_oficial: "={{ $json.url_oficial }}",
  }, [1100, 40], "Francisco pega la URL en url_oficial; el flujo de aprobación la escribe en Sanity."),

  notify("avisa-fuentes", "Avisar faltantes (agrupado)",
    "'📋 Re-check de catálogo\\n\\n' + $('Tomar el lote').first().json.sinFuenteTotal + ' autos publicados no tienen URL de fuente oficial, así que no se pueden revisar.\\n\\nQuedaron listados en la pestaña \"faltan fuentes\" del Sheet.'",
    [1100, 200],
    "Un solo mensaje con el total. El detalle está en el Sheet."),

  {
    parameters: { fieldToSplitOut: "cars", options: {} },
    id: "split", name: "Un item por auto",
    type: "n8n-nodes-base.splitOut", typeVersion: 1, position: [620, 460],
    notes: "Sin esto solo se revisaría el primer auto del lote.",
  },
  {
    parameters: { batchSize: 3, options: {} },
    id: "loop", name: "Loop (3 en paralelo)",
    type: "n8n-nodes-base.splitInBatches", typeVersion: 3, position: [860, 460],
    notes: "Concurrencia 3 para no pegarle al rate limit de Anthropic. Salida 'done' (arriba) = todos los autos ya revisados.",
  },

  http("car", "Revisar un auto", "/api/admin/recheck/car",
    [
      { name: "carId", value: "={{ $json.carId }}" },
      { name: "runId", value: "={{ $('Tomar el lote').first().json.runId }}" },
    ],
    [1340, 560],
    "Lee la fuente (1 llamada a Claude), hace el diff aritmético y escribe los campos de auditoría. 10–20 s.",
    {
      node: {
        retryOnFail: true,
        maxTries: 2,
        waitBetweenTries: 5000,
        // Un auto que falla no puede tumbar la corrida: se marca como error, entra
        // en el log, y vuelve a la cabeza de la cola en la corrida siguiente.
        onError: "continueRegularOutput",
      },
    }),

  code("norm", "Normalizar resultado",
    [
      "// El endpoint devuelve 502 cuando falla NUESTRA API (rate limit, 5xx), no cuando",
      "// falla la fuente. Con onError=continueRegularOutput eso llega acá como un item",
      "// con `error`, y hay que darle la misma forma que un resultado normal para que el",
      "// log y el digest no tengan que distinguir dos formatos.",
      "const j = $input.first().json ?? {};",
      "if (j.resultado) return [{ json: j }];",
      "return [{ json: {",
      "  carId: j.carId ?? null,",
      "  nombre: j.nombre ?? 'desconocido',",
      "  resultado: 'error',",
      "  hallazgos: [],",
      "  error: j.error ?? j.message ?? 'fallo sin detalle',",
      "} }];",
    ].join("\n"),
    [1580, 560],
    "Sin esto, un 502 rompe el JSON del cierre de corrida."),

  code("armar", "Armar el cierre",
    [
      "// Todos los autos ya revisados llegan juntos por la salida 'done' del loop.",
      "const items = $input.all().map((i) => i.json);",
      "const urgentes = items.filter((r) => r.urgente);",
      "const aplicados = items.filter((r) => r.aplicado);",
      "const clp = (n) => '$' + Number(n).toLocaleString('es-CL');",
      "return [{ json: {",
      "  runId: $('Tomar el lote').first().json.runId,",
      "  resultados: items,",
      "  aplicadosTotal: aplicados.length,",
      "  urgentesTotal: urgentes.length,",
      "  urgentesTexto: urgentes",
      "    .map((r) => r.aplicado",
      "      ? '• ' + r.nombre + ' — precio lista ' + clp(r.aplicado.from) + ' → ' + clp(r.aplicado.to) + ' (ya en el sitio)'",
      "      : '• ' + r.nombre + ' — ' + (r.nota ?? r.flag))",
      "    .join('\\n'),",
      "} }];",
    ].join("\n"),
    [1100, 380],
    "urgente = descontinuado, fuente muerta, o un precio que se aplicó solo. Los tres ya cambiaron el sitio o detuvieron la revisión de un auto. Todo lo demás espera al digest del lunes."),

  http("close", "Cerrar la corrida", "/api/admin/recheck/close",
    [
      { name: "runId", value: "={{ $json.runId }}" },
      { name: "resultados", value: "={{ JSON.stringify($json.resultados) }}" },
    ],
    [1340, 380],
    "Graba la corrida en Supabase (catalog_check_runs). De esa tabla sale la cobertura del digest semanal."),

  sheet("sheet-corridas", "Sheet · corridas", "CORRIDAS", {
    fecha: "={{ new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }) }}",
    runId: "={{ $json.runId }}",
    lote: "={{ $('Tomar el lote').first().json.slot }} ({{ $('Tomar el lote').first().json.slotDescrito }})",
    del_lote: "={{ $('Tomar el lote').first().json.delSlot }}",
    relleno: "={{ $('Tomar el lote').first().json.relleno }}",
    revisados: "={{ $json.revisados }}",
    sin_cambios: "={{ $json.sinCambios }}",
    con_cambios: "={{ $json.conCambios }}",
    fuente_caida: "={{ $json.fuenteCaida }}",
    errores: "={{ $json.errores }}",
    detalle: "={{ $json.logLine }}",
  }, [1580, 380],
    "Se escribe SIEMPRE, haya cambios o no (C15). Es lo que permite detectar la falla que ningún cron puede reportar sobre sí mismo: la corrida que no ocurrió."),

  ifGt("if-urg", "¿Hay urgentes?", "{{ $('Armar el cierre').first().json.urgentesTotal }}", [1820, 380],
    "C16: solo descontinuado y fuente muerta interrumpen. El resto se acumula para el lunes."),

  notify("avisa-urg", "Avisar urgente",
    "'🔴 Re-check de catálogo — atención\\n\\n' + $('Armar el cierre').first().json.urgentesTexto + '\\n\\nPara deshacer: \"revertir <modelo>\" un precio aplicado solo, \"restaurar <modelo>\" un descontinuado que sigue a la venta.'",
    [2060, 300],
    "Va al instante porque o ya cambió algo en el sitio (precio aplicado, auto oculto), o la revisión de ese auto quedó detenida."),

  {
    parameters: {},
    id: "fin", name: "Sin novedad",
    type: "n8n-nodes-base.noOp", typeVersion: 1, position: [2060, 460],
    notes: "El resumen de que la corrida ocurrió ya quedó en el Sheet y en Supabase. Acá no se manda nada.",
  },
];

const connections = {
  "09:00 · 15:00 · 19:00 · 23:00": { main: [[{ node: "Config", type: "main", index: 0 }]] },
  "Config": { main: [[{ node: "Tomar el lote", type: "main", index: 0 }]] },
  "Tomar el lote": {
    main: [[
      { node: "¿Hay autos sin fuente?", type: "main", index: 0 },
      { node: "Un item por auto", type: "main", index: 0 },
    ]],
  },
  "¿Hay autos sin fuente?": {
    main: [
      [{ node: "Armar filas de faltantes", type: "main", index: 0 }],
      [],
    ],
  },
  "Armar filas de faltantes": {
    main: [[
      { node: "Sheet · faltan fuentes", type: "main", index: 0 },
      { node: "Avisar faltantes (agrupado)", type: "main", index: 0 },
    ]],
  },
  "Un item por auto": { main: [[{ node: "Loop (3 en paralelo)", type: "main", index: 0 }]] },
  "Loop (3 en paralelo)": {
    main: [
      [{ node: "Armar el cierre", type: "main", index: 0 }],
      [{ node: "Revisar un auto", type: "main", index: 0 }],
    ],
  },
  "Revisar un auto": { main: [[{ node: "Normalizar resultado", type: "main", index: 0 }]] },
  "Normalizar resultado": { main: [[{ node: "Loop (3 en paralelo)", type: "main", index: 0 }]] },
  "Armar el cierre": { main: [[{ node: "Cerrar la corrida", type: "main", index: 0 }]] },
  "Cerrar la corrida": { main: [[{ node: "Sheet · corridas", type: "main", index: 0 }]] },
  "Sheet · corridas": { main: [[{ node: "¿Hay urgentes?", type: "main", index: 0 }]] },
  "¿Hay urgentes?": {
    main: [
      [{ node: "Avisar urgente", type: "main", index: 0 }],
      [{ node: "Sin novedad", type: "main", index: 0 }],
    ],
  },
};

const workflow = {
  // ID fijo a propósito: `n8n import:workflow` es idempotente contra el mismo ID,
  // así que re-importar actualiza este workflow en vez de dejar copias sueltas.
  id: "ecRecheckFlujoC1",
  name: "Electrificarte — Re-check semanal de PDPs (Flujo C)",
  nodes,
  connections,
  settings: { executionOrder: "v1", timezone: "America/Santiago" },
  active: false,
};

writeFileSync("n8n/pdp-recheck.json", JSON.stringify(workflow, null, 2) + "\n");
console.log("✓ n8n/pdp-recheck.json");
