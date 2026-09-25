/**
 * POST /api/admin/recheck/close — cierra la corrida y devuelve la fila del log.
 *
 * Se llama SIEMPRE al final de cada corrida, haya cambios o no (C15): esta fila
 * es la prueba auditable de que el flujo corrió, y es lo único que permite
 * detectar la falla que ningún cron puede reportar sobre sí mismo — la corrida
 * que no ocurrió. El digest semanal lee esta tabla para su encabezado de
 * cobertura ("28/28 corridas · 176/176 autos").
 *
 * Auth: header `x-admin-secret`. Body: { runId, resultados[] }.
 */

import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { getSupabase } from "@/lib/whatsapp/subscription";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CarResult {
  carId?: string;
  nombre?: string;
  resultado?: string;
  flag?: string;
  hallazgos?: unknown[];
  error?: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    runId?: string;
    resultados?: CarResult[];
  };
  if (!body.runId) return NextResponse.json({ error: "Falta runId" }, { status: 400 });

  const resultados = Array.isArray(body.resultados) ? body.resultados : [];
  const by = (kind: string) => resultados.filter((r) => r.resultado === kind).length;

  const resumen = {
    revisados: resultados.filter((r) => r.resultado !== "error" && r.resultado !== "sin_fuente").length,
    sinCambios: by("sin_cambios"),
    conCambios: by("cambios") + by("descontinuado"),
    fuenteCaida: by("fuente_caida"),
    errores: by("error"),
    sinFuente: by("sin_fuente"),
  };

  const sb = getSupabase();
  if (sb) {
    // Upsert por run_id: /queue ya abrió la fila. Si esa escritura falló (Supabase
    // caído justo ahí), esto la crea igual — perder el log es perder la auditoría.
    const { error } = await sb.from("catalog_check_runs").upsert(
      {
        run_id: body.runId,
        finished_at: new Date().toISOString(),
        revisados: resumen.revisados,
        sin_cambios: resumen.sinCambios,
        con_cambios: resumen.conCambios,
        errores: resumen.errores + resumen.fuenteCaida,
        detalle: resultados,
      },
      { onConflict: "run_id" }
    );
    if (error) console.error("[recheck/close] no se pudo cerrar la corrida:", error.message);
  }

  // La línea que n8n escribe en la pestaña "corridas" del Sheet.
  const logLine =
    `${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })} · ` +
    `${resumen.revisados} revisados · ${resumen.sinCambios} sin cambios · ` +
    `${resumen.conCambios} con cambios · ${resumen.fuenteCaida} fuente caída · ` +
    `${resumen.errores} errores`;

  return NextResponse.json({ runId: body.runId, ...resumen, logLine });
}
