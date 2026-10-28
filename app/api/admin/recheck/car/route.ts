/**
 * POST /api/admin/recheck/car — revisa UN auto contra su fuente oficial.
 *
 * Con el pdp-runner (PDP_RUNNER_URL, oct-2026) la lectura la hace el agente "revision" en la VPS
 * (Copilot) y es asincrona: la primera llamada abre la revision y responde
 * `{ resultado: "corriendo", sessionId }`; n8n vuelve a llamar con ese `sessionId` hasta que
 * termina. Sin el runner, la lectura es la de siempre con la API de Anthropic, en una llamada.
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
 *  - `basePrice` (lista) y `discountPrice` (con bonos y/o financiamiento), SOLO si el diff lo
 *    propone Y la cifra aparece escrita en una lectura fresca de la página.
 *    Ver docs/FLUJO-PDP-N8N.md §2.6 para las guardas y el motivo de cada una.
 *
 * Qué NO escribe nunca: `versions[]`, `modelYear`. Eso se aplica a mano.
 *
 * Auth: header `x-admin-secret`. Body: { carId, runId?, sessionId? }.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { authorized, sanityWrite } from "@/lib/catalog-recheck/admin";
import { decide } from "@/lib/catalog-recheck/diff";
import { confirmarEnFuente, readSource } from "@/lib/catalog-recheck/read-source";
import { abrirRevision, leerRevision, revisionEnRunner } from "@/lib/catalog-recheck/revision-runner";
import type { AutoApply, CarSnapshot, SourceReport } from "@/lib/catalog-recheck/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Apagar sin tocar código: `RECHECK_AUTOAPPLY=false` en Vercel. */
const autoApplyEnabled = () => process.env.RECHECK_AUTOAPPLY !== "false";

interface CarRow extends CarSnapshot {
  extraUrls?: string[];
  electrificacion?: string | null;
}

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conRunner = revisionEnRunner();
  if (!conRunner && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY (o PDP_RUNNER_URL)" }, { status: 500 });
  }
  const sanity = sanityWrite();
  if (!sanity) return NextResponse.json({ error: "Sanity no configurado" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { carId?: string; runId?: string; sessionId?: string; intento?: number | string };
  // n8n cuenta las consultas; se devuelve tal cual para que su IF corte a las 40.
  const intento = Number(body.intento) || 0;
  if (!body.carId) return NextResponse.json({ error: "Falta carId" }, { status: 400 });

  const car = await sanity.fetch<CarRow | null>(
    `*[_type == "car" && _id == $id][0] {
      "id": _id, "name": name, "brand": brand->name, "slug": slug.current,
      "sourceUrl": sourceUrls[0], "extraUrls": sourceUrls[1...3],
      basePrice, discountPrice, modelYear, sourceFailStreak,
      "versions": versions[]{ name, price, discountPrice },
      "electrificacion": electricType->tag,
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

  const label = `${car.brand} ${car.name}`;
  const log = (l: string) => console.log(`[recheck/car] ${label} ${l}`);

  let report: SourceReport;
  let via: "web_fetch" | "firecrawl" | "runner" = "web_fetch";
  /**
   * El texto de la página, venga de web_fetch o de Firecrawl. Con esto la
   * confirmación no vuelve a buscar la página: ahorra ~30 s (el límite duro de
   * una función en Vercel Hobby son 60 s) y un credit de Firecrawl.
   */
  let scrapedText: string | undefined;

  // Falla nuestra (runner, cuota, rate limit, 5xx), no de la fuente: no se toca nada en Sanity
  // ni se cuenta para la racha de fuente_muerta, y el auto queda a la cabeza de la cola.
  const fallaNuestra = (message: string) => {
    console.error(`[recheck/car] error en ${label}:`, message);
    return NextResponse.json(
      { carId: car.id, nombre: label, resultado: "error", hallazgos: [], error: message },
      { status: 502 }
    );
  };

  if (conRunner) {
    if (!body.sessionId) {
      try {
        const sessionId = await abrirRevision(car);
        log(`↗ revisión abierta en el runner (${sessionId})`);
        return NextResponse.json({ carId: car.id, nombre: label, resultado: "corriendo", sessionId, intento: 0 });
      } catch (err) {
        return fallaNuestra(`No se pudo abrir la revisión: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    let estado: Awaited<ReturnType<typeof leerRevision>>;
    try {
      estado = await leerRevision(body.sessionId);
    } catch (err) {
      // Un tropiezo leyendo el runner no es el resultado: n8n vuelve a consultar.
      return NextResponse.json({
        carId: car.id, nombre: label, resultado: "corriendo", sessionId: body.sessionId, intento,
        aviso: `No se pudo leer la revisión: ${err instanceof Error ? err.message : String(err)}`.slice(0, 300),
      });
    }
    if (estado.estado === "corriendo") {
      return NextResponse.json({ carId: car.id, nombre: label, resultado: "corriendo", sessionId: body.sessionId, intento });
    }
    if (estado.estado === "error") return fallaNuestra(estado.motivo);
    report = estado.report;
    via = "runner";
    scrapedText = estado.texto;
  } else try {
    const read = await readSource({
      anthropic: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
      brand: car.brand,
      model: car.name,
      sourceUrl: car.sourceUrl,
      extraUrls: car.extraUrls,
      log,
    });
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
  // El modo de falla real no es que la fuente mienta: es una mala lectura (ya pasó — un
  // "precio oficial" de $151.900 sacado de un newsroom). Antes de escribir, la cifra tiene que
  // aparecer escrita en una lectura fresca de la misma página. Sin otra llamada al modelo: la
  // varianza del modelo no puede inventar una cifra que la página no tiene. Si no aparece, no
  // se escribe: queda como hallazgo para que lo aplique una persona.
  const applied: AutoApply[] = [];
  const confirmDetails: string[] = [];
  const nombreCampo = (a: AutoApply) => (a.field === "basePrice" ? "Precio lista" : "Precio con bonos y/o financiamiento");

  if (decision.autoApply.length && autoApplyEnabled()) {
    for (const a of decision.autoApply) {
      try {
        const check = await confirmarEnFuente(car.sourceUrl, a.enPagina ?? a.to, scrapedText);
        if (check.confirmado) {
          applied.push(a);
          log(`✓ ${nombreCampo(a)} ${clp(a.to)} confirmado por ${check.via}`);
        } else {
          confirmDetails.push(`${nombreCampo(a)}: ${clp(a.to)} no aparece escrito en una lectura fresca de la página, así que no se aplicó solo.`);
        }
      } catch (err) {
        // Que falle la confirmación no invalida la revisión: el hallazgo ya está.
        confirmDetails.push(`${nombreCampo(a)}: no se pudo confirmar ${clp(a.to)} en la página, así que no se aplicó solo.`);
        log(`⚠ ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  const confirmDetail = confirmDetails.join(" ") || undefined;

  const findings = [...decision.findings];
  for (const a of applied) {
    findings.push({
      kind: "precio_aplicado",
      detail:
        `${nombreCampo(a)} actualizado solo: ${a.from ? clp(a.from) : "(no teníamos)"} → ${clp(a.to)}. ` +
        `Confirmado en la página · ${a.reason}.`,
      proposedPrice: a.to,
      evidence: (a.field === "basePrice" ? report.evidencia : report.evidencia_financiamiento) ?? undefined,
    });
  }
  if (confirmDetail) {
    findings.push({ kind: "precio_base", detail: confirmDetail });
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

  // La negociación está apagada: ya no hay precio sugerido.
  unset.push("priceCheckSuggestedPrice");

  if (decision.needsReextract) set.needsReextract = true;

  if (decision.hide) {
    set.hidden = true;
    set.hiddenByCheck = true;
  }

  // El valor anterior queda guardado: sin esto el cambio automático no tendría vuelta atrás, y
  // un precio mal aplicado sale al sitio en 60 s (ISR).
  for (const a of applied) {
    set[a.field] = a.to;
    if (a.field === "basePrice" && a.from) set.priceCheckPreviousBasePrice = a.from;
    if (a.field === "discountPrice" && a.from) set.priceCheckPreviousDiscountPrice = a.from;
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
    aplicado: applied.length ? applied : null,
    // n8n usa esto para decidir si manda el aviso inmediato (C16) o espera al
    // digest del lunes. hasNewFindings implementa el dedup (C12): si el hallazgo
    // ya estaba registrado con el mismo valor, no se vuelve a avisar.
    // Un precio escrito solo también avisa al instante: ya cambió el sitio.
    urgente: applied.length > 0 || (decision.urgent && decision.hasNewFindings),
    ocultado: decision.hide,
    fuente: car.sourceUrl,
    // Cuántos autos necesitaron navegador real = cuántos credits de Firecrawl
    // consumió la corrida. Es el número que dice si el free tier alcanza.
    via,
    nota: note || undefined,
  });
}
