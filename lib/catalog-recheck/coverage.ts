/**
 * Cobertura real de las últimas 28 corridas, leída de `catalog_check_runs`.
 *
 * Es el encabezado del digest semanal, y la única forma de distinguir "todo en
 * orden" de "el cron lleva tres semanas caído": un cron no puede reportar sobre
 * sí mismo la corrida que no ocurrió. Si faltaron corridas, el digest lo dice — y
 * eso es justamente la señal de que algo se cayó.
 */

import { SLOTS_PER_WEEK } from "./admin";
import { getSupabase } from "@/lib/whatsapp/subscription";

export interface Coverage {
  /** Corridas registradas en los últimos 7 días. */
  corridas: number;
  /** Corridas esperadas en ese período (28). */
  esperadas: number;
  /** Autos distintos revisados, sumando las corridas. */
  autosRevisados: number;
  /** true si no se pudo leer el historial — no es lo mismo que "no hubo corridas". */
  desconocida: boolean;
}

export async function weeklyCoverage(): Promise<Coverage> {
  const unknown: Coverage = {
    corridas: 0,
    esperadas: SLOTS_PER_WEEK,
    autosRevisados: 0,
    desconocida: true,
  };

  const sb = getSupabase();
  if (!sb) return unknown;

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data, error } = await sb
    .from("catalog_check_runs")
    .select("revisados")
    .gte("started_at", since);

  if (error) {
    console.error("[coverage] no se pudo leer catalog_check_runs:", error.message);
    return unknown;
  }

  const rows = data ?? [];
  return {
    corridas: rows.length,
    esperadas: SLOTS_PER_WEEK,
    autosRevisados: rows.reduce((sum, r) => sum + (Number(r.revisados) || 0), 0),
    desconocida: false,
  };
}

/** La línea de cobertura tal como sale en el digest. */
export function coverageLine(c: Coverage, publicados: number): string {
  if (c.desconocida) return "⚠️ No se pudo leer el historial de corridas.";
  const faltaron = c.esperadas - c.corridas;
  const base = `${c.corridas}/${c.esperadas} corridas · ${c.autosRevisados}/${publicados} autos`;
  // Una corrida de menos es tolerable (jitter del cron); varias son una falla.
  return faltaron > 1 ? `${base} · ⚠️ faltaron ${faltaron} corridas` : base;
}
