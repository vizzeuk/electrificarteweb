// Aplica las definiciones de claude/ contra la API de Managed Agents.
//   npx tsx --env-file=.env.local scripts/claude-agents-apply.ts [--aplicar]
//
// Idempotente y por NOMBRE: si ya existe un agente/entorno con ese nombre, lo
// actualiza (crea una version nueva); si no, lo crea. Nunca crea duplicados —
// que es el anti-patron que la API advierte: un agents.create() por corrida
// acumula agentes huerfanos y rompe el versionado al que se fijan las sesiones.
//
// Imprime al final los IDs que hay que pegar en el nodo Config de n8n.
import { readFileSync } from "node:fs";

const API = "https://api.anthropic.com";
const BETA = "managed-agents-2026-04-01";
const APLICAR = process.argv.includes("--aplicar");

const key = process.env.ANTHROPIC_API_KEY;
if (!key) throw new Error("Falta ANTHROPIC_API_KEY");

const headers = {
  "x-api-key": key,
  "anthropic-version": "2023-06-01",
  "anthropic-beta": BETA,
  "content-type": "application/json",
};

async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}\n${text}`);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

/** Recorre todas las paginas de un endpoint de lista. */
async function listAll<T extends { name?: string }>(path: string): Promise<T[]> {
  const out: T[] = [];
  let page: string | null = null;
  do {
    const qs = page ? `?page=${encodeURIComponent(page)}` : "";
    const res: { data: T[]; next_page?: string | null } = await api("GET", `${path}${qs}`);
    out.push(...res.data);
    page = res.next_page ?? null;
  } while (page);
  return out;
}

const leer = (p: string) => JSON.parse(readFileSync(p, "utf8"));

async function main() {
  const entorno = leer("claude/environments/pdp.json");
  const agente = leer("claude/agents/extractor-pdp.json");

  const entornos = await listAll<{ id: string; name: string }>("/v1/environments");
  const agentes = await listAll<{ id: string; name: string; version: number }>("/v1/agents");

  const envExistente = entornos.find((e) => e.name === entorno.name);
  const agExistente = agentes.find((a) => a.name === agente.name);

  console.log(`entorno "${entorno.name}": ${envExistente ? `existe (${envExistente.id}) → update` : "no existe → create"}`);
  console.log(`agente  "${agente.name}": ${agExistente ? `existe (${agExistente.id} v${agExistente.version}) → update` : "no existe → create"}`);

  if (!APLICAR) {
    console.log("\n(seco — pasa --aplicar para escribir)");
    return;
  }

  const env = envExistente
    ? await api<{ id: string }>("POST", `/v1/environments/${envExistente.id}`, entorno)
    : await api<{ id: string }>("POST", "/v1/environments", entorno);

  const ag = agExistente
    ? await api<{ id: string; version: number }>("POST", `/v1/agents/${agExistente.id}`, agente)
    : await api<{ id: string; version: number }>("POST", "/v1/agents", agente);

  console.log("\n─── Pegar en el nodo Config de n8n ─────────────────────────");
  console.log(`agentId        = ${ag.id}`);
  console.log(`agentVersion   = ${ag.version}`);
  console.log(`environmentId  = ${env.id}`);
  console.log("────────────────────────────────────────────────────────────");
  console.log(`\nConsola: https://platform.claude.com/ → Managed Agents → Agents`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
