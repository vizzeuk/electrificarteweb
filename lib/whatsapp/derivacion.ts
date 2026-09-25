// Derivación a una persona del equipo.
//
// Cuando el asesor no puede resolver algo (estado de un pago, un reclamo, algo
// que requiere a una persona), el modelo llama a la tool `derivar_a_humano`. Acá
// se avisa a los admins por WhatsApp con el número del cliente y el resumen, y
// el cliente recibe MENSAJE_DERIVACION (lib/whatsapp/mensajes.ts).
//
// El aviso es lo que hace verdad la promesa "la va a revisar una persona": sin
// él, el bot le diría eso a un cliente que pagó y nadie se enteraría.

import { Redis } from "@upstash/redis";
import { avisarAdmins } from "@/lib/whatsapp/avisar-admins";

/** Una derivación por número cada 6 h: si insiste, no se le llena el WhatsApp a Francisco. */
const DEDUP_TTL_SECONDS = 6 * 60 * 60;

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export interface Derivacion {
  phone?: string;
  tier: string;
  motivo: string;
  resumen: string;
}

export interface ResultadoDerivacion {
  /** Se mandó el aviso a al menos un admin. */
  avisado: boolean;
  /** Ya se había derivado este número en las últimas 6 h; no se volvió a avisar. */
  repetida: boolean;
}

export async function derivarAHumano(d: Derivacion): Promise<ResultadoDerivacion> {
  const redis = getRedis();
  if (redis && d.phone) {
    try {
      const nueva = await redis.set(`wa_derivado:${d.phone}`, "1", { nx: true, ex: DEDUP_TTL_SECONDS });
      if (nueva !== "OK") return { avisado: false, repetida: true };
    } catch (err) {
      // Sin dedup se avisa igual: mejor un aviso de más que un cliente sin respuesta.
      console.warn("[derivacion] Redis falló, se avisa sin dedup:", err instanceof Error ? err.message : err);
    }
  }

  const cliente = d.phone ? `+${d.phone}` : "(número desconocido)";
  const texto = [
    "🙋 *Un cliente necesita a una persona*",
    `Cliente: ${cliente} · ${d.tier}`,
    `Motivo: ${d.motivo}`,
    `Resumen: ${d.resumen}`,
    d.phone ? `Responderle: https://wa.me/${d.phone}` : "",
  ].filter(Boolean).join("\n");

  try {
    const r = await avisarAdmins(texto);
    return { avisado: r.sent > 0, repetida: false };
  } catch (err) {
    console.error("[derivacion] no se pudo avisar a los admins:", err instanceof Error ? err.message : err);
    return { avisado: false, repetida: false };
  }
}
