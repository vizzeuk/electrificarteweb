// Prueba en vivo del agente de creacion de PDP (Flujo v2), con el mismo ciclo de
// vida que hace n8n: crear sesion → poll → leer el entregar_pdp → cerrar.
//
//   npx tsx --env-file=.env.local scripts/qa/pdp-crear.test.ts \
//     --marca GWM --modelo "Ora 03" --anio 2026 --tipo "City Car" \
//     --electrificacion EV --url https://www.gwm.cl/vehiculo/ora/ora-03/ \
//     --versiones "ORA 03 SR|17990000, ORA 03 GT|21990000"
import { armarEncargo, hostDe, type FilaSheet } from "../../lib/pdp-creacion/encargo";
import { toolsDeSesion } from "../../lib/pdp-creacion/agente";

const API = "https://api.anthropic.com";
const H = {
  "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
  "anthropic-version": "2023-06-01",
  "anthropic-beta": "managed-agents-2026-04-01",
  "content-type": "application/json",
};

function arg(n: string, def = ""): string {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, { method, headers: H, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}\n${text}`);
  return text ? JSON.parse(text) : ({} as T);
}

async function main() {
  const agentId = arg("agent", process.env.PDP_AGENT_ID ?? "");
  const envId = arg("env", process.env.PDP_ENVIRONMENT_ID ?? "");
  if (!agentId || !envId) throw new Error("Faltan --agent / --env (o PDP_AGENT_ID / PDP_ENVIRONMENT_ID)");

  const fila: FilaSheet = {
    marca: arg("marca"),
    modelo: arg("modelo"),
    anio: Number(arg("anio")),
    tipo: arg("tipo"),
    electrificacion: arg("electrificacion"),
    url_oficial: arg("url"),
    versiones: arg("versiones"),
  };

  const host = hostDe(fila.url_oficial);
  console.log(`▶ ${fila.marca} ${fila.modelo} · ${fila.url_oficial}`);
  console.log(`  web_fetch limitado a: ${host}\n`);

  const t0 = Date.now();
  const sesion = await api<{ id: string; status: string }>("POST", "/v1/sessions", {
    agent: { type: "agent_with_overrides", id: agentId, tools: toolsDeSesion(host) },
    environment_id: envId,
    title: `PDP ${fila.marca} ${fila.modelo} ${fila.anio}`,
    metadata: { flujo: "pdp-v2", modelo: `${fila.marca} ${fila.modelo}` },
    budget: { type: "limit", max_list_cost: { amount: "100", currency: "USD" } },
    initial_events: [{ type: "user.message", content: [{ type: "text", text: armarEncargo(fila) }] }],
  });
  console.log(`sesion ${sesion.id} (${sesion.status})`);
  console.log(`traza: https://platform.claude.com/workspaces/default/sessions/${sesion.id}\n`);

  // Poll — el mismo que hace n8n. n8n self-hosted no tiene timeout de ejecucion.
  let estado = sesion.status;
  for (let i = 0; i < 90 && (estado === "running" || estado === "rescheduling"); i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    const s = await api<{ status: string }>("GET", `/v1/sessions/${sesion.id}`);
    estado = s.status;
    process.stdout.write(`  ${Math.round((Date.now() - t0) / 1000)}s ${estado}\r`);
  }
  console.log(`\nestado final: ${estado} · ${Math.round((Date.now() - t0) / 1000)}s\n`);

  // Leer eventos. order=desc para que el entregar_pdp este en la primera pagina.
  const ev = await api<{ data: any[] }>("GET", `/v1/sessions/${sesion.id}/events?limit=100&order=desc`);
  const tipos = ev.data.map((e) => e.type);
  console.log(`eventos (${ev.data.length}):`, [...new Set(tipos)].join(", "));

  const entrega = ev.data.find((e) => e.type === "agent.custom_tool_use" && e.name === "entregar_pdp");
  if (!entrega) {
    console.log("\n⚠️ no hubo entregar_pdp. Ultimos mensajes:");
    for (const e of ev.data.filter((x) => x.type === "agent.message").slice(0, 2)) {
      console.log("  ", JSON.stringify(e.content).slice(0, 1200));
    }
    const err = ev.data.filter((e) => e.type === "session.error");
    if (err.length) console.log("\nerrores:", JSON.stringify(err.slice(0, 3), null, 2).slice(0, 2000));
    return;
  }

  console.log("\n─── entregar_pdp ───────────────────────────────────────────");
  console.log(JSON.stringify(entrega.input, null, 2));

  const uso = await api<{ usage?: any }>("GET", `/v1/sessions/${sesion.id}`);
  console.log("\nusage:", JSON.stringify(uso.usage));

  // Cerrar el ciclo: el agente esta idle esperando el resultado de la tool.
  await api("POST", `/v1/sessions/${sesion.id}/events`, {
    events: [{ type: "user.custom_tool_result", custom_tool_use_id: entrega.id, content: [{ type: "text", text: "recibido" }] }],
  });
  await api("POST", `/v1/sessions/${sesion.id}/events`, { events: [{ type: "user.interrupt" }] });
  console.log(`\n(sesion ${sesion.id} cerrada)`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
