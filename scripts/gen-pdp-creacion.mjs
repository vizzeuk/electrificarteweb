// Genera n8n/pdp-creacion.json — el Flujo v2 del board de Miro "FLUJO PDP's"
// (diagrama "Flujo PDP v2"). Ver docs/FLUJO-PDP-N8N.md §3.
//   node scripts/gen-pdp-creacion.mjs
//
// El INPUT es el panel (oct-2026), no el Sheet: el formulario crea una fila en
// `pdp_solicitudes` (Supabase) vía la web, y este workflow la toma. Contrato
// del panel en docs/DASHBOARD_PDP_CREACION.md.
//
// n8n no toca ni Supabase ni el Sheet: solo habla con /api/admin/pdp/* con
// `x-admin-secret`. La web lee la solicitud, la valida y escribe el resultado.
// Lo no-secreto (cada cuánto se reintenta, tamaño del lote) vive en el nodo
// Config, editable desde la UI sin tocar la VPS.
import { writeFileSync } from "node:fs";

const ADMIN_CRED = { httpHeaderAuth: { id: "V9iMtS3nXUravFD5", name: "Electrificarte Admin" } };
// El webhook de entrada valida el mismo header que el resto de los webhooks que llama la web
// (x-electrificarte-secret, docs/N8N-SEGURIDAD.md). Con --env-file=.env.local toma el ID real de
// N8N_HEADER_AUTH_CRED; sin él queda "REEMPLAZAR" y se elige la credencial a mano al importar.
const WEB_CRED = {
  httpHeaderAuth: {
    id: process.env.N8N_HEADER_AUTH_CRED || "REEMPLAZAR",
    name: "Web Electrificarte (x-electrificarte-secret)",
  },
};

const cfg = (k) => `{{ $('Config').first().json.${k} }}`;
/** La solicitud que se está procesando, desde cualquier punto del loop. */
const sol = (k) => `$('Una solicitud a la vez').first().json.${k}`;
/** Lo que devolvió /iniciar para esta solicitud. */
const ini = (k) => `$('Validar y abrir sesión').first().json.${k}`;

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

const avisar = (id, name, textExpr, pos, notes) =>
  http(id, name, "/api/admin/notify", `{ "text": ${textExpr} }`, pos, notes);

// ─── Nodos ───────────────────────────────────────────────────────────────────

const nodes = [
  {
    parameters: {
      content: [
        "## Flujo v2 — Creación de PDP desde el panel",
        "",
        "El formulario del **panel** (dashboard) crea una solicitud en `pdp_solicitudes` a través",
        "de la web y despierta este workflow por webhook. El cron de 15 min es la red de seguridad",
        "por si el webhook no llegó.",
        "",
        "Por cada solicitud: valida sin IA → abre una sesión del Managed Agent → espera → crea el",
        "borrador **oculto** en Sanity → la web escribe el resultado en la solicitud (lo ve el",
        "panel) → aviso por WhatsApp.",
        "",
        "### Reglas del board que este flujo hace cumplir",
        "- **R6 · todo nace `hidden:true`.** Publicar es siempre acto humano.",
        "- **R8 · idempotencia por slug.** Si la PDP ya existe, no se crea. Además la tabla no",
        "  admite dos solicitudes activas del mismo auto.",
        "- **El borrador SIEMPRE se crea.** El umbral de llenado decide el mensaje y el estado,",
        "  no si se crea. Lo único que impide crear es la validación sin IA o el slug.",
        "",
        "### Antes de activar",
        "1. **Supabase**: correr `scripts/sql/2026-10-08_pdp_solicitudes.sql`.",
        "2. **Nodo Config**: confirmar `siteBase`.",
        "3. **Credenciales** (las dos ya existen en esta instancia):",
        "   - `Electrificarte Admin` (`x-admin-secret`) en los HTTP hacia la web.",
        "   - `Web Electrificarte (x-electrificarte-secret)` en el webhook de entrada, igual que",
        "     waitlist y reseñas (docs/N8N-SEGURIDAD.md). Si dice REEMPLAZAR, elegirla a mano.",
        "4. **En Vercel**: `ADMIN_API_SECRET` (el mismo de la credencial), `ANTHROPIC_API_KEY`,",
        "   `PDP_AGENT_ID`, `PDP_ENVIRONMENT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y",
        "   `N8N_PDP_CREACION_URL` = la URL de producción del webhook de este workflow.",
        "",
        "### n8n no tiene ninguna key salvo `x-admin-secret`",
        "Ni Anthropic, ni Sanity, ni Supabase. La reserva del lote, la validación y la escritura",
        "del resultado las hace la web. Es la Directriz 1 y la 4 del doc.",
        "",
        "### Estados (columna `estado` de `pdp_solicitudes`)",
        "`listo` → **`en cola`** (reserva atómica) → `procesando` → `listo_para_revisar` ·",
        "`borrador_incompleto` · `sin_datos` · `rechazada` · `error`.",
        "Ninguno final es `listo`: nada se re-procesa solo. Para reintentar, botón en el panel.",
        "",
        "### La espera",
        "Tres corridas medidas: **155–185 s**, **US$0,26–0,31**. El loop consulta cada 30 s hasta",
        "24 veces (**12 min de techo**). n8n no tiene límite de ejecución, pero las solicitudes",
        "van de a una: una trabada retrasa a las que siguen.",
        "",
        "⚠️ **El corte de 60 s de Vercel sigue existiendo** para `/api/admin/pdp/*`. Cada llamada",
        "del loop tarda 2–15 s; la investigación de 3 min corre en la infra de Anthropic.",
      ].join("\n"),
      height: 820, width: 560, color: 5,
    },
    id: "nota", name: "Lee antes de activar",
    type: "n8n-nodes-base.stickyNote", typeVersion: 1, position: [-660, 60],
  },

  {
    parameters: {
      httpMethod: "POST",
      path: "electrificarte-pdp-creacion",
      authentication: "headerAuth",
      responseMode: "onReceived",
      options: {},
    },
    id: "webhook", name: "Panel: solicitud nueva",
    type: "n8n-nodes-base.webhook", typeVersion: 2, position: [-60, 200],
    webhookId: "8d2f4b1e-6c3a-4e7d-9a51-ec7d0c9b2a11",
    credentials: WEB_CRED,
    notes: "Lo llama la web (N8N_PDP_CREACION_URL) cada vez que el panel crea o reintenta una solicitud. No trae datos: el workflow igual reserva desde la cola, así que da lo mismo si llegan dos avisos juntos.",
  },

  {
    parameters: { rule: { interval: [{ field: "minutes", minutesInterval: 15 }] } },
    id: "cron", name: "Cada 15 minutos",
    type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [-60, 400],
    notes: "Red de seguridad: toma lo que el webhook no alcanzó a disparar (n8n caído un rato, N8N_PDP_CREACION_URL sin configurar).",
  },

  {
    parameters: {
      assignments: {
        assignments: [
          { id: "c-site", name: "siteBase", value: "https://www.electrificarte.com", type: "string" },
          { id: "c-lote", name: "lote", value: 5, type: "number" },
          { id: "c-int", name: "segundosEntreConsultas", value: 30, type: "number" },
          { id: "c-max", name: "maxConsultas", value: 24, type: "number" },
        ],
      },
      options: {},
    },
    id: "config", name: "Config",
    type: "n8n-nodes-base.set", typeVersion: 3.4, position: [160, 300],
    notes: "Lo no-secreto y editable sin tocar la VPS. `lote` = cuántas solicitudes toma por corrida. siteBase va con www: el dominio sin www responde 308 y un redirect en el medio es un riesgo gratis.",
  },

  http("reservar", "Reservar solicitudes", "/api/admin/pdp/reservar",
    `{{ JSON.stringify({ limit: $('Config').first().json.lote }) }}`,
    [380, 300],
    "Pasa a 'en cola' hasta `lote` solicitudes 'listo' de una sola vez, de forma atómica (for update skip locked). Una corrida simultánea (cron + webhook) nunca toma la misma solicitud."),

  {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
        conditions: [{
          id: "hay-c1",
          leftValue: "={{ ($json.solicitudes ?? []).length }}",
          rightValue: 0,
          operator: { type: "number", operation: "gt" },
        }],
        combinator: "and",
      },
      looseTypeValidation: true,
      options: {},
    },
    id: "hay", name: "¿Hay solicitudes?",
    type: "n8n-nodes-base.if", typeVersion: 2.2, position: [490, 300],
    notes: "Cola vacía = la ejecución termina acá. Sin este IF, según la versión de n8n, el Split Out de una lista vacía puede emitir un item vacío y mandar un aviso de error cada 15 min.",
  },

  {
    parameters: { fieldToSplitOut: "solicitudes", options: {} },
    id: "split", name: "Una por solicitud",
    type: "n8n-nodes-base.splitOut", typeVersion: 1, position: [600, 300],
    notes: "Un item por solicitud reservada.",
  },

  {
    parameters: { options: { reset: false } },
    id: "loop", name: "Una solicitud a la vez",
    type: "n8n-nodes-base.splitInBatches", typeVersion: 3, position: [820, 300],
    notes: "De a una: cada solicitud abre una sesión propia y la web escribe en Sanity. En paralelo no se gana nada (la espera es del agente) y se pierde trazabilidad.",
  },

  http("iniciar", "Validar y abrir sesión", "/api/admin/pdp/iniciar",
    `{{ JSON.stringify({ solicitudId: ${sol("solicitudId")} }) }}`,
    [1040, 420],
    "Pasos 5 a 10. La web lee la solicitud, la marca 'procesando', valida sin IA (URL viva, refs en Sanity, slug libre, precios > 0) y abre la sesión del Managed Agent. Devuelve en segundos."),

  ifEq("ok", "¿Validación OK?", "{{ $json.ok }}", "true", [1260, 420],
    "Rama falsa = pasos 6 a 8: la web ya dejó la solicitud en 'error' con el detalle; acá solo se avisa."),

  avisar("avisa-err", "Avisar error de validación",
    `{{ '⚠️ Solicitud del panel (' + ${ini("nombre")} + '):\\n\\n• ' + ${ini("errores")}.join('\\n• ') + '\\n\\nCorrígela y reintenta desde el panel.' }}`,
    [1480, 620],
    "Aviso corto, como pide el board. El detalle completo ya quedó en la solicitud."),

  {
    parameters: { amount: `=${cfg("segundosEntreConsultas")}`, unit: "seconds" },
    id: "esperar", name: "Esperar",
    type: "n8n-nodes-base.wait", typeVersion: 1.1, position: [1480, 300],
    webhookId: "pdp-v2-espera",
    notes: "Una corrida real tardó 155 s. La primera consulta a los 30 s casi nunca acierta, y da igual: consultar es gratis.",
  },

  http("cerrar", "¿Terminó? Cerrar y crear", "/api/admin/pdp/cerrar",
    `{{ JSON.stringify({
      sessionId: ${ini("sessionId")},
      host: ${ini("host")},
      solicitudId: ${sol("solicitudId")}
    }) }}`,
    [1700, 300],
    "Pasos 11 a 21. Si la sesión sigue corriendo devuelve {estado:'corriendo'} y el loop vuelve a esperar. Si terminó: mide el llenado N/M, sube las fotos, crea el borrador oculto, le asigna lote de re-check y escribe el resultado en la solicitud."),

  code("contar", "¿Seguir esperando?",
    [
      "// `$runIndex` es cuántas veces corrió ESTE nodo en ESTA ejecución: 0 en la",
      "// primera vuelta, 1 en la segunda… Es el contador correcto para un ciclo.",
      "// El flujo anterior usaba $getWorkflowStaticData('global'), que es global al",
      "// workflow y se pisa entre ejecuciones concurrentes.",
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
    "Separa 'la sesión entregó' de 'nos cansamos de esperar'."),

  avisar("avisa-ok", "Avisar resultado",
    "{{ $('¿Terminó? Cerrar y crear').first().json.mensaje }}",
    [2380, 560],
    "Pasos 16 a 21. El mensaje lo arma la web (N/M, faltantes, link a Studio) y ya quedó también en la solicitud."),

  http("marcar-timeout", "Solicitud · se agotó la espera", "/api/admin/pdp/marcar",
    `{{ JSON.stringify({
      solicitudId: ${sol("solicitudId")},
      estado: 'error',
      detalle: 'La sesión ' + ${ini("sessionId")} + ' no terminó en ' + Math.round($('Config').first().json.segundosEntreConsultas * $('Config').first().json.maxConsultas / 60) + ' min'
    }) }}`,
    [2380, 360],
    "La sesión sigue viva en Console: se puede mirar ahí qué pasó antes de reintentar desde el panel."),

  avisar("avisa-timeout", "Avisar espera agotada",
    `{{ '⏱️ ' + ${ini("nombre")} + ': la investigación no terminó a tiempo.\\n\\nSesión: ' + ${ini("sessionId")} }}`,
    [2600, 360],
    "Sin esto, una sesión colgada se pierde en silencio."),

  {
    parameters: {}, id: "volver", name: "Siguiente solicitud",
    type: "n8n-nodes-base.noOp", typeVersion: 1, position: [2820, 460],
    notes: "Devuelve el control al loop para la solicitud que sigue.",
  },
];

const to = (node, index = 0) => [{ node, type: "main", index }];

const connections = {
  "Panel: solicitud nueva": { main: [to("Config")] },
  "Cada 15 minutos": { main: [to("Config")] },
  "Config": { main: [to("Reservar solicitudes")] },
  "Reservar solicitudes": { main: [to("¿Hay solicitudes?")] },
  "¿Hay solicitudes?": { main: [to("Una por solicitud"), []] },
  "Una por solicitud": { main: [to("Una solicitud a la vez")] },
  "Una solicitud a la vez": {
    // salida 0 = terminó el loop · salida 1 = siguiente item
    main: [[], to("Validar y abrir sesión")],
  },
  "Validar y abrir sesión": { main: [to("¿Validación OK?")] },
  "¿Validación OK?": { main: [to("Esperar"), to("Avisar error de validación")] },
  "Avisar error de validación": { main: [to("Siguiente solicitud")] },
  "Esperar": { main: [to("¿Terminó? Cerrar y crear")] },
  "¿Terminó? Cerrar y crear": { main: [to("¿Seguir esperando?")] },
  "¿Seguir esperando?": { main: [to("¿Sigue corriendo?")] },
  "¿Sigue corriendo?": { main: [to("Esperar"), to("¿Se agotó la espera?")] },
  "¿Se agotó la espera?": { main: [to("Solicitud · se agotó la espera"), to("Avisar resultado")] },
  "Avisar resultado": { main: [to("Siguiente solicitud")] },
  "Solicitud · se agotó la espera": { main: [to("Avisar espera agotada")] },
  "Avisar espera agotada": { main: [to("Siguiente solicitud")] },
  "Siguiente solicitud": { main: [to("Una solicitud a la vez")] },
};

const workflow = {
  // ID fijo: `n8n import:workflow` es idempotente contra el mismo ID, así que
  // re-importar actualiza este workflow en vez de dejar copias sueltas.
  id: "ecPdpCreacionV2",
  name: "Electrificarte — Creación de PDP desde el panel (Flujo v2)",
  nodes,
  connections,
  settings: { executionOrder: "v1", timezone: "America/Santiago" },
  active: false,
};

writeFileSync("n8n/pdp-creacion.json", JSON.stringify(workflow, null, 2) + "\n");
console.log("✓ n8n/pdp-creacion.json");
