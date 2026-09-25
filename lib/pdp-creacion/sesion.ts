// Ciclo de vida de la sesion del Managed Agent, del lado de la web.
//
// n8n NO habla con Anthropic (Directriz 1: el contenedor de n8n es compartido
// con 30 workflows de otros proyectos y no lleva secretos nuestros). La web abre
// la sesion, la consulta y saca el resultado; n8n solo orquesta y avisa.
import { armarEncargo, type FilaSheet } from "./encargo";
import { toolsDeSesion } from "./agente";
import type { ContratoPdp } from "./contrato";

const API = "https://api.anthropic.com";
const BETA = "managed-agents-2026-04-01";

function headers(): Record<string, string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Falta ANTHROPIC_API_KEY");
  return {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "anthropic-beta": BETA,
    "content-type": "application/json",
  };
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Anthropic ${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export interface SesionCreada {
  id: string;
  status: string;
}

/**
 * Abre la sesion y le manda el encargo en la misma llamada (`initial_events`),
 * asi la sesion nace en `running` — no pasa por `idle`. Un cliente que espere
 * la transicion idle→running espera para siempre.
 *
 * `agent_with_overrides` encierra `web_fetch` en el host de la fila (R2). El
 * override reemplaza `tools` ENTERO, por eso `toolsDeSesion` repite tambien el
 * custom tool: sin el, el agente se queda sin forma de entregar el resultado.
 */
export async function abrirSesion(
  fila: FilaSheet,
  host: string,
  opciones: { agentId: string; environmentId: string; topeUsd?: number },
): Promise<SesionCreada> {
  const centavos = String(Math.round((opciones.topeUsd ?? 1.5) * 100));
  return api<SesionCreada>("POST", "/v1/sessions", {
    agent: { type: "agent_with_overrides", id: opciones.agentId, tools: toolsDeSesion(host) },
    environment_id: opciones.environmentId,
    title: `PDP ${fila.marca} ${fila.modelo} ${fila.anio}`,
    metadata: { flujo: "pdp-v2", modelo: `${fila.marca} ${fila.modelo}`.slice(0, 512) },
    // Tope duro por sesion. Una corrida medida costo US$0,26; el tope existe
    // para que una sesion que se enrede no se lleve el presupuesto del mes.
    budget: { type: "limit", max_list_cost: { amount: centavos, currency: "USD" } },
    initial_events: [{ type: "user.message", content: [{ type: "text", text: armarEncargo(fila) }] }],
  });
}

export interface EstadoSesion {
  status: string;
  listCostUsd: number | null;
}

export async function estadoSesion(sessionId: string): Promise<EstadoSesion> {
  const s = await api<{ status: string; usage?: { list_cost?: { amount?: string } } }>(
    "GET",
    `/v1/sessions/${sessionId}`,
  );
  const cent = Number(s.usage?.list_cost?.amount);
  return { status: s.status, listCostUsd: Number.isFinite(cent) ? cent / 100 : null };
}

export interface PedidoNavegador {
  id: string;
  url: string;
  motivo: string;
}

export interface Entrega {
  contrato: ContratoPdp | null;
  toolUseId: string | null;
  /**
   * El agente pidio leer la pagina con navegador y la sesion quedo esperando.
   * Mientras esto no sea null, la sesion NO termino: hay que contestarle.
   */
  pedidoNavegador: PedidoNavegador | null;
  /** Lo que dijo el agente si no llamo a la herramienta — para el aviso. */
  ultimoMensaje: string | null;
  errores: string[];
}

/**
 * Saca el `entregar_pdp` de la sesion.
 *
 * `order=desc` no es un detalle: los eventos vienen paginados y una sesion de
 * investigacion pasa de 100 eventos facil. Pidiendo ascendente, la entrega —
 * que es de lo ultimo que pasa — queda fuera de la primera pagina y el flujo
 * concluye "el agente no entrego nada" cuando si lo hizo.
 */
export async function leerEntrega(sessionId: string): Promise<Entrega> {
  const res = await api<{ data: Record<string, unknown>[] }>(
    "GET",
    `/v1/sessions/${sessionId}/events?limit=100&order=desc`,
  );
  const eventos = res.data;

  const tool = eventos.find((e) => e.type === "agent.custom_tool_use" && e.name === "entregar_pdp");

  // Un custom tool sin su resultado = la sesion esta `idle` esperandonos, no
  // termino. Distinguirlo importa: si se trata como "termino sin entregar", el
  // flujo cierra una sesion que estaba a medio camino y reporta "sin datos".
  const respondidos = new Set(
    eventos
      .filter((e) => e.type === "user.custom_tool_result")
      .map((e) => String((e as { custom_tool_use_id?: string }).custom_tool_use_id ?? "")),
  );
  const pendiente = eventos.find(
    (e) => e.type === "agent.custom_tool_use" && e.name === "leer_con_navegador" && !respondidos.has(String(e.id)),
  );
  const entradaPendiente = (pendiente?.input ?? {}) as { url?: string; motivo?: string };

  const errores = eventos
    .filter((e) => e.type === "session.error")
    .map((e) => String((e as { message?: string }).message ?? JSON.stringify(e).slice(0, 300)));

  const msg = eventos.find((e) => e.type === "agent.message");
  const texto = Array.isArray((msg as { content?: { type: string; text?: string }[] })?.content)
    ? (msg as { content: { type: string; text?: string }[] }).content
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("\n")
        .slice(0, 800)
    : null;

  return {
    contrato: tool ? ((tool.input as ContratoPdp) ?? null) : null,
    toolUseId: tool ? String(tool.id) : null,
    pedidoNavegador: pendiente
      ? { id: String(pendiente.id), url: String(entradaPendiente.url ?? ""), motivo: String(entradaPendiente.motivo ?? "") }
      : null,
    ultimoMensaje: texto,
    errores,
  };
}

/** Le devuelve al agente el resultado de un custom tool y lo deja seguir. */
export async function responderTool(
  sessionId: string,
  toolUseId: string,
  texto: string,
  esError = false,
): Promise<void> {
  await api("POST", `/v1/sessions/${sessionId}/events`, {
    events: [{
      type: "user.custom_tool_result",
      custom_tool_use_id: toolUseId,
      content: [{ type: "text", text: texto }],
      is_error: esError,
    }],
  });
}

/**
 * Cierra el ciclo y libera la sesion. El agente quedo `idle` esperando el
 * resultado del custom tool: se le contesta y se archiva. Si no se contesta, la
 * sesion queda colgada consumiendo el tope hasta que expire.
 */
export async function cerrarSesion(sessionId: string, toolUseId: string | null): Promise<void> {
  try {
    if (toolUseId) {
      await api("POST", `/v1/sessions/${sessionId}/events`, {
        events: [{
          type: "user.custom_tool_result",
          custom_tool_use_id: toolUseId,
          content: [{ type: "text", text: "Recibido. La PDP quedo como borrador oculto. No sigas trabajando." }],
        }],
      });
    }
    await api("POST", `/v1/sessions/${sessionId}/events`, { events: [{ type: "user.interrupt" }] });
    await api("POST", `/v1/sessions/${sessionId}/archive`, {});
  } catch {
    // Cerrar es higiene, no parte del resultado: si falla, la PDP igual se creo.
  }
}
