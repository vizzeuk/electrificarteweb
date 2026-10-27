/**
 * El re-check en el pdp-runner de la VPS (oct-2026): la misma lectura que read-source.ts hacia
 * con la API de Anthropic, pero corrida por el agente "revision" del runner (OpenCode +
 * Copilot). Mismo prompt y mismo esquema de salida (scripts/pdp-runner-sync.ts los copia).
 *
 * Es asincrono como la creacion de PDPs: una lectura tarda de 20 s a unos minutos y Vercel
 * corta a los 60, asi que /api/admin/recheck/car abre la revision y n8n vuelve a consultar.
 */
import { abrirEnRunner, leerDeRunner, runnerConfigurado } from "@/lib/pdp-creacion/runner";
import { sanitize } from "./read-source";
import type { SourceReport } from "./types";

/** Modelo del re-check en Copilot. Se cambia sin tocar codigo. */
export const modeloRevision = () => process.env.PDP_RECHECK_MODELO || "github-copilot/claude-haiku-5.5";

export const revisionEnRunner = runnerConfigurado;

function hostDe(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Lo que recibe el agente: el auto, sus URLs y las versiones que tenemos publicadas. */
export function encargoRevision(car: { brand: string; name: string; sourceUrl: string; extraUrls?: string[]; versions?: { name: string }[] }): string {
  const urls = [car.sourceUrl, ...(car.extraUrls ?? [])];
  return [
    `Marca: ${car.brand}`,
    `Modelo: ${car.name}`,
    `País: Chile`,
    "",
    "Lee estas páginas oficiales y reporta lo que dicen de este modelo:",
    ...urls.map((u) => `- ${u}`),
    ...(car.versions?.length
      ? ["", "Versiones que tenemos publicadas (como referencia de nombres; reporta las que liste la página):", ...car.versions.map((v) => `- ${v.name}`)]
      : []),
  ].join("\n");
}

export async function abrirRevision(car: Parameters<typeof encargoRevision>[0]): Promise<string> {
  const host = hostDe(car.sourceUrl);
  if (!host) throw new Error(`URL inválida: ${car.sourceUrl}`);
  const s = await abrirEnRunner(encargoRevision(car), host, `Re-check ${car.brand} ${car.name}`, [], {
    agente: "revision",
    modelo: modeloRevision(),
  });
  return s.id;
}

export type EstadoRevision =
  | { estado: "corriendo" }
  | { estado: "listo"; report: SourceReport }
  /** La corrida termino sin entrega: falla nuestra (runner, cuota), no de la fuente. */
  | { estado: "error"; motivo: string };

export async function leerRevision(sessionId: string): Promise<EstadoRevision> {
  const r = await leerDeRunner(sessionId);
  if (r.status === "running") return { estado: "corriendo" };
  if (r.contrato) return { estado: "listo", report: sanitize(r.contrato) };
  const motivo = r.errores?.[0] ?? (r.status === "terminated" ? "El runner se reinició a mitad de la revisión" : "El agente terminó sin entregar la revisión");
  return { estado: "error", motivo: `${motivo}${r.ultimoMensaje ? ` · ${r.ultimoMensaje.slice(0, 200)}` : ""}` };
}
