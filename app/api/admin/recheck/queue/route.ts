/**
 * POST /api/admin/recheck/queue — arma el lote de la corrida.
 *
 * Lo llama el cron de n8n (4 veces al día). Dos cosas pasan acá:
 *
 * 1. **Asignación de lote.** Todo auto publicado lleva un `checkSlot` 0–27, así
 *    que "¿cuándo se revisa este auto?" se contesta con "martes a las 15:00".
 *    Se asigna al crear el auto; esta llamada además barre los que quedaron sin
 *    asignar (creados a mano en Studio, o de antes de que existiera el campo).
 *
 * 2. **Selección del lote.** Primero los autos del slot de esta corrida y, si no
 *    llenan el lote, se completa con la cola por antigüedad. Ese relleno es lo
 *    que evita el problema del lote fijo puro: si se cae la corrida del martes,
 *    esos autos entran en las siguientes en vez de saltarse la semana entera, y
 *    no hace falta ningún script mensual de rebalanceo.
 *
 * Auth: header `x-admin-secret`. Body: { limit?: number, slot?: number }.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authorized,
  daysAgoIso,
  MIN_DAYS_BETWEEN_CHECKS,
  sanityWrite,
  SLOTS_PER_WEEK,
} from "@/lib/catalog-recheck/admin";
import { assignMissingSlots } from "@/lib/catalog-recheck/assign";
import { describeSlot, slotFor, TOTAL_SLOTS } from "@/lib/catalog-recheck/slots";
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
  checkSlot: number | null;
}

interface NoSourceCar {
  carId: string;
  nombre: string;
  marca: string;
  slug: string;
}

const CAR_FIELDS = `
  "carId": _id, "nombre": name, "marca": brand->name, "slug": slug.current,
  "sourceUrl": sourceUrls[0], "extraUrls": sourceUrls[1...3], checkSlot
`;

const PUBLISHED = `_type == "car" && hidden != true && !(_id in path("drafts.**"))`;

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sanity = sanityWrite();
  if (!sanity) return NextResponse.json({ error: "Sanity no configurado" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { limit?: number; slot?: number };

  // Barre los autos creados a mano en Studio. Normalmente no escribe nada.
  const { asignados } = await assignMissingSlots(sanity);

  // `slot` en el body es solo para poder probar un lote concreto a mano.
  const slot =
    Number.isInteger(body.slot) && body.slot! >= 0 && body.slot! < TOTAL_SLOTS
      ? body.slot!
      : slotFor();

  const published = await sanity.fetch<number>(`count(*[${PUBLISHED}])`);

  // Sin `limit` (o con 0) el tamaño se recalcula solo: si el catálogo crece a 200
  // autos, el lote pasa a 8 sin tocar el cron ni el workflow. n8n manda 0 justo
  // para eso, así que un 0 no puede significar "revisá cero autos".
  const requested = Number(body.limit) > 0 ? Math.floor(Number(body.limit)) : 0;
  const limit = requested || Math.max(1, Math.ceil(published / SLOTS_PER_WEEK));
  const cutoff = daysAgoIso(MIN_DAYS_BETWEEN_CHECKS);

  // `revisable` = publicado, con fuente, y sin revisar en los últimos 5 días
  // (C14: un auto no se revisa dos veces en la misma semana).
  const revisable = `${PUBLISHED} && count(sourceUrls) > 0 && (!defined(lastPriceCheckAt) || lastPriceCheckAt < $cutoff)`;

  const { delSlot, relleno, sinFuente, revisadosEstaSemana } = await sanity.fetch<{
    delSlot: QueueCar[];
    relleno: QueueCar[];
    sinFuente: NoSourceCar[];
    revisadosEstaSemana: number;
  }>(
    `{
      "delSlot": *[${revisable} && checkSlot == $slot]
                 | order(coalesce(lastPriceCheckAt, "1970-01-01") asc) [0...$limit] { ${CAR_FIELDS} },
      "relleno": *[${revisable} && checkSlot != $slot]
                 | order(coalesce(lastPriceCheckAt, "1970-01-01") asc) [0...$limit] { ${CAR_FIELDS} },
      "sinFuente": *[${PUBLISHED} && count(sourceUrls) == 0] {
        "carId": _id, "nombre": name, "marca": brand->name, "slug": slug.current
      },
      "revisadosEstaSemana": count(*[${PUBLISHED} && defined(lastPriceCheckAt) && lastPriceCheckAt >= $semana])
    }`,
    { cutoff, limit, slot, semana: daysAgoIso(7) }
  );

  // Ojo: `checkSlot != $slot` en GROQ también matchea null/undefined, así que el
  // relleno incluye a los recién asignados de esta misma llamada. Es lo deseado.
  const yaEn = new Set(delSlot.map((c) => c.carId));
  const cars = [...delSlot, ...relleno.filter((c) => !yaEn.has(c.carId))].slice(0, limit);

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
    slot,
    slotDescrito: describeSlot(slot),
    cars,
    // Cuántos vinieron del lote que tocaba y cuántos son relleno de la cola. Si
    // el relleno es alto corrida tras corrida, es que algo se está cayendo.
    delSlot: delSlot.length,
    relleno: cars.length - delSlot.length,
    slotAsignados: asignados.length,
    // n8n avisa esto agrupado, una vez, no un mensaje por auto.
    sinFuente: sinFuente.slice(0, 50),
    sinFuenteTotal: sinFuente.length,
    cobertura: { publicados: published, revisadosEstaSemana, lote: cars.length },
  });
}
