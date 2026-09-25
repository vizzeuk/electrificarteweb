// Genera n8n/sheet-sync.json — el puente para que los scripts locales escriban
// en el Sheet "AUTOS ELECTRIFICARTE" sin exportar ni pegar TSV a mano.
//   node scripts/gen-sheet-sync-workflow.mjs
//
// Es un proxy delgado a la API de Google Sheets: recibe { metodo, ruta, cuerpo },
// lo reenvía con la credencial OAuth "Sheets Cadre" y devuelve la respuesta tal
// cual. Toda la lógica (qué columnas pisar, cuáles respetar) vive en
// lib/sheet-sync.ts, versionada y en TypeScript, no en nodos de n8n.
//
// Por qué pasa por n8n: es el único lugar con una credencial de Google. Si algún
// día hay Service Account, lib/sheet-sync.ts puede hablarle a Google directo y
// este workflow se apaga.
//
// Dos candados: el header secreto (credencial "Electrificarte Sheet Sync") y una
// lista blanca de spreadsheets — con el secreto se puede escribir en ESTE Sheet,
// no en cualquier Sheet al que tenga acceso la cuenta de Google.
import { writeFileSync } from "node:fs";

const SHEETS_CRED = { googleSheetsOAuth2Api: { id: "rwCyQeH6TnQJDJkS", name: "Sheets Cadre" } };
const SYNC_CRED = { httpHeaderAuth: { id: "ecSheetSyncCred1", name: "Electrificarte Sheet Sync" } };
const PERMITIDOS = ["1QYqaKy3pRkGhAe4K4VnV0uUa5G1sOWNMvkyWQxTiGd8"];

const validar = `
const PERMITIDOS = ${JSON.stringify(PERMITIDOS)};
const b = $json.body ?? {};
const metodo = String(b.metodo ?? "").toUpperCase();
const ruta = String(b.ruta ?? "");
const error = (msg) => [{ json: { ok: false, error: msg } }];

if (!["GET", "POST", "PUT"].includes(metodo)) return error("metodo debe ser GET, POST o PUT");
// ruta = "/<spreadsheetId>..." — el resto (/values/..., :batchUpdate) queda libre.
const m = ruta.match(/^\\/([A-Za-z0-9_-]+)([/:?].*)?$/);
if (!m) return error("ruta inválida");
if (!PERMITIDOS.includes(m[1])) return error("spreadsheet no permitido: " + m[1]);

return [{ json: {
  ok: true,
  metodo,
  url: "https://sheets.googleapis.com/v4/spreadsheets" + ruta,
  conCuerpo: metodo !== "GET",
  cuerpo: JSON.stringify(b.cuerpo ?? {}),
} }];
`.trim();

const nodes = [
  {
    parameters: {
      content: [
        "## Sheet sync — proxy a Google Sheets",
        "",
        "Lo usan los scripts de `scripts/` vía `lib/sheet-sync.ts`.",
        "No tiene lógica: valida, reenvía con **Sheets Cadre** y devuelve.",
        "",
        "Si deja de andar, casi siempre es el OAuth de **Sheets Cadre** vencido o revocado.",
      ].join("\n"),
      height: 220, width: 420,
    },
    id: "nota", name: "Nota",
    type: "n8n-nodes-base.stickyNote", typeVersion: 1, position: [-460, -60],
  },
  {
    parameters: {
      httpMethod: "POST",
      path: "electrificarte-sheet-sync",
      authentication: "headerAuth",
      responseMode: "responseNode",
      options: {},
    },
    id: "webhook", name: "Webhook",
    type: "n8n-nodes-base.webhook", typeVersion: 2, position: [0, 200],
    webhookId: "3f1c7a52-5e0b-4d1a-9d0e-ec5eee7a5c01",
    credentials: SYNC_CRED,
  },
  {
    parameters: { jsCode: validar },
    id: "validar", name: "Validar",
    type: "n8n-nodes-base.code", typeVersion: 2, position: [220, 200],
  },
  {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [{
          id: "ok", leftValue: "={{ $json.ok }}", rightValue: true,
          operator: { type: "boolean", operation: "true", singleValue: true },
        }],
        combinator: "and",
      },
      options: {},
    },
    id: "si-ok", name: "¿Válido?",
    type: "n8n-nodes-base.if", typeVersion: 2.2, position: [440, 200],
  },
  {
    parameters: {
      method: "={{ $json.metodo }}",
      url: "={{ $json.url }}",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "googleSheetsOAuth2Api",
      sendBody: "={{ $json.conCuerpo }}",
      specifyBody: "json",
      jsonBody: "={{ $json.cuerpo }}",
      options: {
        timeout: 50000,
        response: { response: { fullResponse: true, neverError: true } },
      },
    },
    id: "sheets", name: "Google Sheets API",
    type: "n8n-nodes-base.httpRequest", typeVersion: 4.2, position: [680, 100],
    credentials: SHEETS_CRED,
  },
  {
    parameters: {
      respondWith: "json",
      responseBody: "={{ JSON.stringify($json.body ?? {}) }}",
      options: { responseCode: "={{ $json.statusCode }}" },
    },
    id: "responder", name: "Responder",
    type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [900, 100],
  },
  {
    parameters: {
      respondWith: "json",
      responseBody: "={{ JSON.stringify({ error: $json.error }) }}",
      options: { responseCode: 400 },
    },
    id: "rechazar", name: "Rechazar",
    type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [680, 320],
  },
];

const connections = {
  Webhook: { main: [[{ node: "Validar", type: "main", index: 0 }]] },
  Validar: { main: [[{ node: "¿Válido?", type: "main", index: 0 }]] },
  "¿Válido?": {
    main: [
      [{ node: "Google Sheets API", type: "main", index: 0 }],
      [{ node: "Rechazar", type: "main", index: 0 }],
    ],
  },
  "Google Sheets API": { main: [[{ node: "Responder", type: "main", index: 0 }]] },
};

const workflow = {
  id: "ecSheetSync00001",
  name: "Electrificarte — Sheet sync (proxy de scripts a Google Sheets)",
  nodes,
  connections,
  settings: { executionOrder: "v1", timezone: "America/Santiago" },
  active: false,
};

writeFileSync("n8n/sheet-sync.json", JSON.stringify(workflow, null, 2) + "\n");
console.log("✓ n8n/sheet-sync.json");
