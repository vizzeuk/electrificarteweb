/**
 * POST /api/admin/recheck/queue — arma el lote de la corrida.
 *
 * Lo llama el cron de n8n (4 veces al día). Devuelve los autos publicados con la
 * revisión más antigua, más la lista de los que no se pueden revisar porque les
 * falta la URL de fuente.
 *
 * El lote se elige por COLA DE ANTIGÜEDAD, no por partición fija de 28 grupos.
 * Con partición fija, agregar o borrar un auto obliga a reasignar los 28 grupos
 * (si no, unos se revisan dos veces y otros ninguna), y una corrida perdida se
 * salta la semana entera. Con cola, los autos de una corrida caída quedan a la
 * cabeza y entran en la siguiente. Es el mismo reparto en 28 partes, calculado
 * por quién lleva más tiempo sin revisión.
 *
 * Auth: header `x-admin-secret`. Body: { limit?: number }.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authorized,
  daysAgoIso,
  MIN_DAYS_BETWEEN_CHECKS,
  sanityWrite,
  SLOTS_PER_WEEK,
} from "@/lib/catalog-recheck/admin";
import { getSupabase } from "@/lib/whatsapp/subscription";

export const runtime = "nodejs";
export const maxDuration = 60;

interface QueueCar {
  carId: string;
  nombre: string;
  marca: string;
  slug: string;
  sourceUrl: string;
  extraUrls: string[];
}

interface NoSourceCar {
  carId: string;
  nombre: string;
  marca: string;
  slug: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sanity = sanityWrite();
  if (!sanity) return NextResponse.json({ error: "Sanity no configurado" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { limit?: number };

  const published = await sanity.fetch<number>(
    `count(*[_type == "car" && hidden != true && !(_id in path("drafts.**"))])`
  );

  // Sin `limit` (o con 0) el tamaño se recalcula solo: si el catálogo crece a 200
  // autos, el lote pasa a 8 sin tocar el cron ni el workflow. n8n manda 0 justo
  // para eso, así que un 0 no puede significar "revisá cero autos".
  const requested = Number(body.limit) > 0 ? Math.floor(Number(body.limit)) : 0;
  const limit = requested || Math.max(1, Math.ceil(published / SLOTS_PER_WEEK));
  const cutoff = daysAgoIso(MIN_DAYS_BETWEEN_CHECKS);

  const { cars, sinFuente, revisadosEstaSemana } = await sanity.fetch<{
    cars: QueueCar[];
    sinFuente: NoSourceCar[];
    revisadosEstaSemana: number;
  }>(
    `{
      "cars": *[_type == "car" && hidden != true && !(_id in path("drafts.**"))
                && count(sourceUrls) > 0
                && (!defined(lastPriceCheckAt) || lastPriceCheckAt < $cutoff)]
               | order(coalesce(lastPriceCheckAt, "1970-01-01") asc) [0...$limit] {
        "carId": _id, "nombre": name, "marca": brand->name, "slug": slug.current,
        "sourceUrl": sourceUrls[0], "extraUrls": sourceUrls[1...3]
      },
      "sinFuente": *[_type == "car" && hidden != true && !(_id in path("drafts.**"))
                     && count(sourceUrls) == 0] {
        "carId": _id, "nombre": name, "marca": brand->name, "slug": slug.current
      },
      "revisadosEstaSemana": count(*[_type == "car" && hidden != true && !(_id in path("drafts.**"))
                                     && defined(lastPriceCheckAt) && lastPriceCheckAt >= $semana])
    }`,
    { cutoff, limit, semana: daysAgoIso(7) }
  );

  const runId = crypto.randomUUID();

  // La corrida se abre acá y no al cerrar: si el lote se cae a la mitad, queda el
  // rastro de que ocurrió. Un cron silencioso es indistinguible de un cron muerto.
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("catalog_check_runs").insert({
      run_id: runId,
      batch_size: cars.length,
      sin_fuente: sinFuente.length,
    });
    if (error) console.error("[recheck/queue] no se pudo abrir la corrida:", error.message);
  }

  return NextResponse.json({
    runId,
    cars,
    // n8n avisa esto agrupado, una vez, no un mensaje por auto.
    sinFuente: sinFuente.slice(0, 50),
    sinFuenteTotal: sinFuente.length,
    cobertura: { publicados: published, revisadosEstaSemana, lote: cars.length },
  });
}
