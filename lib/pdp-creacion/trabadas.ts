// Red de seguridad de la cola de PDPs que NO depende de n8n.
//
// Si n8n no corre (la VPS caida) la solicitud se queda en "listo" para siempre;
// si la ejecucion se corta a mitad de camino (un 500, un timeout, un reinicio),
// queda en "en cola"/"procesando". En ambos casos nadie llama a /cerrar ni a
// /marcar, y nadie avisa. Este barrido la pasa a "error" con la razon (mirando
// la sesion del agente si la hay) y avisa por WhatsApp desde la web, que no
// depende de la VPS. Reintentar desde el panel la devuelve a "listo".
//
// Corre en el GET de /api/admin/pdp/solicitudes (el panel lo consulta cada 15 s
// mientras haya alguna en curso), en /reservar (el cron de n8n) y una vez al dia
// en /api/cron/pdp-trabadas (Vercel Hobby no deja crons mas seguidos). El cron
// de n8n toma las "listo" en <= 15 min y su espera tiene techo de 12 min, asi que
// pasados MINUTOS_TRABADA sin movimiento ya nadie la va a tomar ni esperar.
import type { SupabaseClient } from "@supabase/supabase-js";
import { avisarAdmins } from "@/lib/whatsapp/avisar-admins";
import { cerrarSesion, estadoSesion, falloDeSesion, leerEntrega } from "./sesion";
import { MINUTOS_TRABADA, razonTrabada, TABLA, type RevisionSesion, type Solicitud } from "./solicitudes";

type Trabada = Pick<Solicitud, "id" | "marca" | "modelo" | "anio" | "estado" | "session_id">;

/** Las lecturas de la sesion no tienen timeout propio: el barrido corre adentro de un GET del panel. */
function conTope<T>(p: Promise<T>, ms = 4_000): Promise<T> {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`Anthropic no respondio en ${ms / 1000} s`)), ms))]);
}

async function revisar(sessionId: string): Promise<{ revision: RevisionSesion; toolUseId: string | null }> {
  try {
    const estado = await conTope(estadoSesion(sessionId));
    if (estado.status === "running" || estado.status === "rescheduling") {
      return { revision: { status: estado.status, fallo: null, entrego: false }, toolUseId: null };
    }
    const entrega = await conTope(leerEntrega(sessionId));
    return {
      revision: { status: estado.status, fallo: falloDeSesion(estado.status, entrega), entrego: Boolean(entrega.contrato) },
      toolUseId: entrega.toolUseId,
    };
  } catch (e) {
    const error = (e instanceof Error ? e.message : String(e)).slice(0, 200);
    return { revision: { status: null, fallo: null, entrego: false, errorConsulta: error }, toolUseId: null };
  }
}

/**
 * Marca como "error" las solicitudes trabadas. Devuelve cuantas marco. Nunca lanza.
 * `listo: false` desde /reservar: si n8n esta llamando, esta vivo y las va a tomar ahora.
 * `max`/`presupuestoMs`: el GET del panel tiene 10 s de timeout; lo que no alcance queda
 * para el proximo GET (15 s despues).
 */
export async function barrerTrabadas(
  sb: SupabaseClient,
  opts: { listo?: boolean; max?: number; presupuestoMs?: number; ahora?: number } = {},
): Promise<number> {
  const ahora = opts.ahora ?? Date.now();
  const hasta = Date.now() + (opts.presupuestoMs ?? 40_000);
  const corte = new Date(ahora - MINUTOS_TRABADA * 60_000).toISOString();
  try {
    const { data, error } = await sb
      .from(TABLA)
      .select("id, marca, modelo, anio, estado, session_id")
      .in("estado", opts.listo === false ? ["en cola", "procesando"] : ["listo", "en cola", "procesando"])
      .lt("updated_at", corte)
      .limit(opts.max ?? 10);
    if (error || !data?.length) return 0;

    let marcadas = 0;
    for (const s of data as Trabada[]) {
      if (Date.now() > hasta) break;
      const { revision, toolUseId } = s.session_id ? await revisar(s.session_id) : { revision: null, toolUseId: null };
      const detalle = razonTrabada(s, revision).slice(0, 480);
      const nombre = [s.marca, s.modelo, s.anio].filter(Boolean).join(" ");
      const mensaje = `❌ ${nombre}: la solicitud se quedo sin avanzar.\n\n${detalle}\n\nQuedo como error en el panel: reintenta desde ahi${s.estado === "listo" ? " cuando n8n vuelva" : ""}.${s.session_id ? ` Sesion: ${s.session_id}` : ""}`;

      // Condicional: si otro barrido (u n8n) la movio entretanto, no se pisa ni se avisa dos veces.
      const { data: tocadas } = await sb
        .from(TABLA)
        .update({ estado: "error", detalle, mensaje, terminada_at: new Date(ahora).toISOString() })
        .eq("id", s.id)
        .eq("estado", s.estado)
        .lt("updated_at", corte)
        .select("id");
      if (!tocadas?.length) continue;
      marcadas++;

      // Una sesion viva o esperando una herramienta sigue gastando hasta el tope: se corta.
      if (s.session_id && revision?.status !== "terminated") await cerrarSesion(s.session_id, toolUseId);
      await avisarAdmins(mensaje).catch((e) => console.warn("[pdp/trabadas] no se pudo avisar:", e));
    }
    return marcadas;
  } catch (e) {
    console.warn("[pdp/trabadas] barrido fallido:", e instanceof Error ? e.message : e);
    return 0;
  }
}
