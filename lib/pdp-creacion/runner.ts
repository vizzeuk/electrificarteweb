// Motor alternativo del flujo v2 (oct-2026): `pdp-runner` en la VPS, que corre el mismo
// extractor (prompt + esquema de `entregar_pdp` de claude/agents/extractor-pdp.json) con
// OpenCode en vez de un Managed Agent de Anthropic. Se activa con PDP_RUNNER_URL +
// PDP_RUNNER_SECRET; sin ellas todo sigue yendo a Anthropic como antes.
//
// La forma del ciclo es la misma (abrir → consultar → leer la entrega), asi que `sesion.ts`
// despacha aca por el prefijo del id y ni n8n ni los endpoints notan la diferencia. Lo que el
// runner resuelve solo: el cerco de dominio (R2), el navegador (Firecrawl, en su propio .env),
// la validacion del esquema (le devuelve el error al modelo para que corrija) y la ficha PDF.
// Codigo del runner: docs/pdp-runner/ (copia versionada de lo desplegado en la VPS).

/** Prefijo de los ids de sesion del runner, para distinguirlos de los `sesn_…` de Anthropic. */
export const PREFIJO_RUNNER = "oc_";
/** Ids de ficha del runner. Calzan con `esFileId` (file_…) a proposito: el panel no cambia. */
export const esFichaRunner = (v: unknown): v is string => typeof v === "string" && /^file_oc_[a-f0-9]{32}$/.test(v);

export const runnerConfigurado = (): boolean => Boolean(process.env.PDP_RUNNER_URL && process.env.PDP_RUNNER_SECRET);
export const esSesionRunner = (id: string): boolean => id.startsWith(PREFIJO_RUNNER);

async function runner<T>(method: string, path: string, body?: BodyInit, tipo = "application/json", timeoutMs = 20_000): Promise<T> {
  const base = process.env.PDP_RUNNER_URL;
  const secreto = process.env.PDP_RUNNER_SECRET;
  if (!base || !secreto) throw new Error("Falta PDP_RUNNER_URL / PDP_RUNNER_SECRET");
  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    method,
    headers: { "x-runner-secret": secreto, ...(body ? { "content-type": tipo } : {}) },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`pdp-runner ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export interface SesionRunner {
  id: string;
  status: "running" | "idle" | "terminated";
  contrato: unknown;
  ultimoMensaje: string | null;
  errores: string[];
  segundos: number;
}

/**
 * Abre la corrida. Devuelve el id ya con prefijo. `fichas`: cada PDF ya subido al runner con la
 * ruta que le da el encargo (la del modelo y las de cada version); el runner los pasa a texto y
 * reescribe esas rutas.
 */
export async function abrirEnRunner(
  encargo: string,
  host: string,
  titulo: string,
  fichas: { id: string; ruta: string }[],
  /** Otro agente del runner (`revision` = re-check de precios), modelo y esfuerzo. */
  opciones: { agente?: "pdp" | "revision"; modelo?: string; variante?: string } = {},
): Promise<{ id: string; status: string }> {
  const r = await runner<{ id: string; status: string }>(
    "POST",
    "/v1/sesiones",
    JSON.stringify({ encargo, host, titulo, ...(fichas.length ? { fichas } : {}), ...opciones }),
  );
  return { id: `${PREFIJO_RUNNER}${r.id}`, status: r.status };
}

export function leerDeRunner(id: string): Promise<SesionRunner> {
  return runner<SesionRunner>("GET", `/v1/sesiones/${encodeURIComponent(id.slice(PREFIJO_RUNNER.length))}`);
}

/** Best-effort: si la corrida ya termino, no hace nada. */
export async function cancelarEnRunner(id: string): Promise<void> {
  try {
    await runner("POST", `/v1/sesiones/${encodeURIComponent(id.slice(PREFIJO_RUNNER.length))}/cancelar`);
  } catch {
    // no fatal
  }
}

export async function subirFichaARunner(bytes: Uint8Array): Promise<string> {
  const r = await runner<{ id?: string }>("POST", "/v1/fichas", bytes as BodyInit, "application/pdf", 30_000);
  if (!esFichaRunner(r.id)) throw new Error(`pdp-runner no devolvio un id de ficha: ${JSON.stringify(r).slice(0, 200)}`);
  return r.id;
}

export async function borrarFichaDeRunner(id: string): Promise<void> {
  try {
    await runner("DELETE", `/v1/fichas/${id}`, undefined, undefined, 10_000);
  } catch {
    // no fatal
  }
}
