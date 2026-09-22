/**
 * POST /api/admin/recheck/car — revisa UN auto contra su fuente oficial.
 *
 * Un auto por llamada, a propósito: el lote completo de 7 tarda 40–90 s y el
 * límite duro de una función en Vercel Hobby es 60 s (ignora el maxDuration del
 * código). Iterando en n8n cada llamada tarda 10–20 s, holgado, y además una
 * fuente lenta no arrastra a los otros 6 autos del lote.
 *
 * Qué escribe:
 *  - Campos de auditoría, siempre.
 *  - `hidden` cuando el modelo salió del catálogo oficial (reversible, queda
 *    marcado con `hiddenByCheck`).
 *  - `basePrice`, SOLO si el diff lo propone Y una segunda lectura lo confirma.
 *    Ver docs/FLUJO-PDP-N8N.md §2.6 para las guardas y el motivo de cada una.
 *
 * Qué NO escribe nunca: `discountPrice` (el precio negociado de Francisco),
 * `versions[]`, `modelYear`. Eso se aplica a mano.
 *
 * Auth: header `x-admin-secret`. Body: { carId, runId? }.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { authorized, sanityWrite } from "@/lib/catalog-recheck/admin";
import { decide } from "@/lib/catalog-recheck/diff";
import { confirmPrice, readSource } from "@/lib/catalog-recheck/read-source";
import type { AutoApply, CarSnapshot, SourceReport } from "@/lib/catalog-recheck/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Apagar sin tocar código: `RECHECK_AUTOAPPLY=false` en Vercel. */
const autoApplyEnabled = () => process.env.RECHECK_AUTOAPPLY !== "false";

interface CarRow extends CarSnapshot {
  extraUrls?: string[];
}

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;

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
      "catalogFindings": catalogFindings[]{ kind, detail, proposedPrice, versionName, evidence },
      "versionScope": sourceVersionScope,
      "versionExclude": sourceVersionExclude,
      // Otra PDP publicada usa la MISMA página oficial. Pasa en 9 familias del
      // catálogo (Porsche Taycan + Cross Turismo, Volvo EX30 + Cross Country,
      // Geely EX5 + E-DMi + EM-i, GWM Ora 03 + GT, …). Sin esto, cada PDP ve las
      // versiones de su hermana como "versión nueva" todas las semanas.
      "sharedSource": defined(sourceUrls[0]) && count(*[_type == "car" && hidden != true && !(_id in path("drafts.**"))
                              && _id != ^._id && defined(sourceUrls[0]) && sourceUrls[0] == ^.sourceUrls[0]]) > 0
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
  const log = (l: string) => console.log(`[recheck/car] ${label} ${l}`);
  const readInput = {
    anthropic,
    brand: car.brand,
    model: car.name,
    sourceUrl: car.sourceUrl,
    extraUrls: car.extraUrls,
    log,
  };

  let report: SourceReport;
  let via: "web_fetch" | "firecrawl" = "web_fetch";
  /**
   * El texto de la página, venga de web_fetch o de Firecrawl. Con esto la
   * confirmación no vuelve a buscar la página: ahorra ~30 s (el límite duro de
   * una función en Vercel Hobby son 60 s) y un credit de Firecrawl.
   */
  let scrapedText: string | undefined;

  try {
    const read = await readSource(readInput);
    report = read.report;
    via = read.via;
    scrapedText = read.text;
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

  // ── Confirmación antes de escribir un precio ────────────────────────────────
  // El modo de falla real no es que la fuente mienta: es que la extracción salga
  // distinta dos veces (ya pasó — un "precio oficial" de $151.900 sacado de un
  // newsroom). Una segunda lectura de la misma URL cuesta ~US$0,015 y solo corre
  // en los autos que cambiaron, que son pocos. Si las dos no coinciden, no se
  // escribe: queda como hallazgo para que lo aplique una persona.
  let applied: AutoApply | undefined;
  let confirmDetail: string | undefined;

  if (decision.autoApply && autoApplyEnabled()) {
    try {
      const check = await confirmPrice(readInput, decision.autoApply.to, scrapedText);
      if (check.confirmado) {
        applied = decision.autoApply;
        log(`✓ precio confirmado por ${check.via}`);
      } else {
        confirmDetail =
          `La segunda lectura (${check.via}) no confirmó ${clp(decision.autoApply.to)} ` +
          `(leyó ${check.leido ? clp(check.leido) : "nada"}), así que no se aplicó solo.`;
        log(`⚠ ${confirmDetail}`);
      }
    } catch (err) {
      // Que falle la confirmación no invalida la revisión: el hallazgo ya está.
      confirmDetail = "No se pudo confirmar el precio con una segunda lectura, así que no se aplicó solo.";
      log(`⚠ ${confirmDetail} (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  const findings = [...decision.findings];
  if (applied) {
    findings.push({
      kind: "precio_aplicado",
      detail:
        `Precio lista actualizado solo: ${clp(applied.from)} → ${clp(applied.to)}. ` +
        `Confirmado por segunda lectura · ${applied.reason}. ` +
        `Para volver atrás: "revertir ${car.name}".`,
      proposedPrice: applied.to,
      evidence: report.evidencia ?? undefined,
    });
  } else if (confirmDetail) {
    findings.push({ kind: "precio_base", detail: confirmDetail, proposedPrice: decision.autoApply?.to });
  }

  const set: Record<string, unknown> = {
    lastPriceCheckAt: nowIso,
    priceCheckFlag: decision.flag,
    catalogFindings: findings.map((f, i) => ({ _key: `f${i}`, _type: "finding", ...f })),
    sourceFailStreak: decision.sourceFailStreak,
  };
  const unset: string[] = [];

  const note = [decision.note, confirmDetail].filter(Boolean).join(" ");
  if (note) set.priceCheckNote = note;
  else unset.push("priceCheckNote");

  if (decision.suggestedPrice) set.priceCheckSuggestedPrice = decision.suggestedPrice;
  else unset.push("priceCheckSuggestedPrice");

  if (decision.needsReextract) set.needsReextract = true;

  if (decision.hide) {
    set.hidden = true;
    set.hiddenByCheck = true;
  }

  if (applied) {
    set.basePrice = applied.to;
    // Lo que restaura "revertir <modelo>". Sin esto el cambio automático no
    // tendría vuelta atrás, y un precio mal aplicado sale al sitio en 60 s (ISR).
    set.priceCheckPreviousBasePrice = applied.from;
  }

  const patch = sanity.patch(car.id).set(set);
  await (unset.length ? patch.unset(unset) : patch).commit();

  return NextResponse.json({
    carId: car.id,
    nombre: label,
    slug: car.slug,
    resultado: decision.outcome,
    flag: decision.flag,
    hallazgos: findings,
    aplicado: applied ?? null,
    // n8n usa esto para decidir si manda el aviso inmediato (C16) o espera al
    // digest del lunes. hasNewFindings implementa el dedup (C12): si el hallazgo
    // ya estaba registrado con el mismo valor, no se vuelve a avisar.
    // Un precio escrito solo también avisa al instante: ya cambió el sitio.
    urgente: Boolean(applied) || (decision.urgent && decision.hasNewFindings),
    ocultado: decision.hide,
    fuente: car.sourceUrl,
    // Cuántos autos necesitaron navegador real = cuántos credits de Firecrawl
    // consumió la corrida. Es el número que dice si el free tier alcanza.
    via,
    nota: note || undefined,
  });
}
