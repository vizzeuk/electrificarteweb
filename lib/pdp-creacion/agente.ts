// Definicion del Managed Agent, leida del JSON versionado en claude/agents/.
// Una sola copia: la que aplica scripts/claude-agents-apply.ts es la misma que
// arma el override por sesion, asi el esquema de `entregar_pdp` no se bifurca.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toolsConHost } from "./encargo";

interface DefinicionAgente {
  name: string;
  model: unknown;
  system: string;
  tools: { type: string; name?: string }[];
}

let cache: DefinicionAgente | null = null;

export function definicionAgente(): DefinicionAgente {
  cache ??= JSON.parse(
    readFileSync(join(process.cwd(), "claude/agents/extractor-pdp.json"), "utf8")
  ) as DefinicionAgente;
  return cache;
}

/** Un custom tool de la definicion aplicada, por nombre. */
export function toolCustom(nombre: string): unknown {
  const tool = definicionAgente().tools.find((t) => t.type === "custom" && t.name === nombre);
  if (!tool) throw new Error(`claude/agents/extractor-pdp.json no define el tool ${nombre}`);
  return tool;
}

/**
 * `tools` para el override de la sesion: toolset con `web_fetch` encerrado en el
 * host de la fila MAS el custom tool.
 *
 * El custom tool va repetido a proposito. Un override reemplaza el campo entero
 * — no mergea —, asi que un override de `tools` que solo traiga el toolset deja
 * a la sesion sin forma de entregar el resultado, y el agente termina escribiendo
 * el JSON en un mensaje de texto (que es justo lo que este contrato evita).
 */
export function toolsDeSesion(host: string): unknown[] {
  return [
    ...toolsConHost(host),
    toolCustom("leer_con_navegador"),
    toolCustom("entregar_pdp"),
  ];
}
