/**
 * POST /api/admin/recheck/car — revisa UN auto contra su fuente oficial.
 *
 * Un auto por llamada, a propósito: el lote completo de 7 tarda 40–90 s y el
 * límite duro de una función en Vercel Hobby es 60 s (ignora el maxDuration del
 * código). Iterando en n8n cada llamada tarda 10–20 s, holgado, y además una
 * fuente lenta no arrastra a los otros 6 autos del lote.
 *
 * Escribe SOLO campos de auditoría (C5). La única excepción es ocultar un auto
 * que salió del catálogo oficial (C7), y queda marcada con hiddenByCheck para
 * poder revertirla.
 *
 * Auth: header `x-admin-secret`. Body: { carId, runId? }.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { authorized, sanityWrite } from "@/lib/catalog-recheck/admin";
import { decide } from "@/lib/catalog-recheck/diff";
import { readSource } from "@/lib/catalog-recheck/read-source";
import type { CarSnapshot } from "@/lib/catalog-recheck/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CarRow extends CarSnapshot {
  extraUrls?: string[];
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 500 });
  }
  const sanity = sanityWrite();
  if (!sanity) return NextResponse.json({ error: "Sanity no configurado" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { carId?: string; runId?: string };
  if (!body.carId) return NextResponse.json({ error: "Falta carId" }, { status: 400 });

  const car = await sanity.fetch<CarRow | null>(
    `*[_type == "car" && _id == $id][0] {
      "id": _id, "name": name, "brand": brand->name, "slug": slug.current,
      "sourceUrl": sourceUrls[0], "extraUrls": sourceUrls[1...3],
      basePrice, discountPrice, modelYear, sourceFailStreak,
      "versions": versions[]{ name, price },
      "catalogFindings": catalogFindings[]{ kind, detail, proposedPrice, versionName, evidence }
    }`,
    { id: body.carId }
  );

  if (!car) return NextResponse.json({ error: "Auto no encontrado" }, { status: 404 });
  if (!car.sourceUrl) {
    // C3: sin fuente no hay revisión. Sale de la cola sin gastar un token y sin
    // que la fecha se actualice — vuelve a aparecer en "faltan fuentes" cada vez.
    return NextResponse.json({
      carId: car.id,
      nombre: `${car.brand} ${car.name}`,
      resultado: "sin_fuente",
      hallazgos: [],
    });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const label = `${car.brand} ${car.name}`;

  let report;
  try {
    report = await readSource({
      anthropic,
      brand: car.brand,
      model: car.name,
      sourceUrl: car.sourceUrl,
      extraUrls: car.extraUrls,
      log: (l) => console.log(`[recheck/car] ${label} ${l}`),
    });
  } catch (err) {
    // Falla nuestra (rate limit, 5xx), no de la fuente: no se toca nada en Sanity
    // ni se cuenta para la racha de fuente_muerta, y el auto queda a la cabeza de
    // la cola para la corrida siguiente.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[recheck/car] error de API en ${label}:`, message);
    return NextResponse.json(
      { carId: car.id, nombre: label, resultado: "error", hallazgos: [], error: message },
      { status: 502 }
    );
  }

  const decision = decide(car, report);
  const nowIso = new Date().toISOString();

  const set: Record<string, unknown> = {
    lastPriceCheckAt: nowIso,
    priceCheckFlag: decision.flag,
    catalogFindings: decision.findings.map((f, i) => ({ _key: `f${i}`, _type: "finding", ...f })),
    sourceFailStreak: decision.sourceFailStreak,
  };
  const unset: string[] = [];

  if (decision.note) set.priceCheckNote = decision.note;
  else unset.push("priceCheckNote");

  if (decision.suggestedPrice) set.priceCheckSuggestedPrice = decision.suggestedPrice;
  else unset.push("priceCheckSuggestedPrice");

  if (decision.needsReextract) set.needsReextract = true;

  if (decision.hide) {
    set.hidden = true;
    set.hiddenByCheck = true;
  }

  const patch = sanity.patch(car.id).set(set);
  await (unset.length ? patch.unset(unset) : patch).commit();

  return NextResponse.json({
    carId: car.id,
    nombre: label,
    slug: car.slug,
    resultado: decision.outcome,
    flag: decision.flag,
    hallazgos: decision.findings,
    // n8n usa esto para decidir si manda el aviso inmediato (C16) o espera al
    // digest del lunes. hasNewFindings implementa el dedup (C12): si el hallazgo
    // ya estaba registrado con el mismo valor, no se vuelve a avisar.
    urgente: decision.urgent && decision.hasNewFindings,
    ocultado: decision.hide,
    fuente: car.sourceUrl,
    nota: decision.note,
  });
}
