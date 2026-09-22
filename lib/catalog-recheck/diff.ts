/**
 * El diff del re-check: aritmética pura, sin IA y sin red (regla C4 del board).
 *
 * La IA solo reporta lo que leyó en la fuente; decidir si eso es un cambio real,
 * ruido, o una mala lectura es de acá. Es deliberado: la misma URL leída dos
 * semanas seguidas tiene que dar el mismo diff, y un modelo no garantiza eso.
 */

import type {
  CarSnapshot,
  CheckDecision,
  Finding,
  PriceCheckFlag,
  SourceReport,
} from "./types";

/**
 * Piso de plausibilidad (C9). Ningún auto electrificado nuevo en Chile cuesta menos
 * que esto — un precio bajo este umbral viene de una mala lectura, no de una rebaja.
 * Visto en producción: un "precio oficial" de $151.900 sacado de un newsroom en vez
 * de la página de precios (ver lib/price-check/check.ts).
 */
export const MIN_PLAUSIBLE_PRICE = 3_000_000;

/** Ruido (C8): un delta bajo el 1% del precio actual O bajo $200.000 no es un hallazgo. */
const NOISE_RATIO = 0.01;
const NOISE_FLOOR = 200_000;

/** El precio que sugerimos aplicar queda 5% bajo el oficial — regla de negocio ya vigente. */
const UNDERCUT_RATIO = 0.95;

/** Tras 2 corridas seguidas sin poder leer la fuente, se marca muerta (C11). */
const DEAD_SOURCE_STREAK = 2;

const SEVERITY: Record<PriceCheckFlag, number> = {
  discontinued: 5,
  fuente_muerta: 4,
  price_high: 3,
  version_nueva: 2,
  anio_nuevo: 1,
  none: 0,
};

export function isNoise(current: number, read: number): boolean {
  const delta = Math.abs(read - current);
  return delta < Math.max(current * NOISE_RATIO, NOISE_FLOOR);
}

/** Descarta lecturas implausibles en vez de propagarlas como "rebaja". */
function plausible(price: number | null | undefined): number | null {
  if (typeof price !== "number" || !Number.isFinite(price)) return null;
  return price >= MIN_PLAUSIBLE_PRICE ? Math.round(price) : null;
}

/**
 * "GLX AWD", "glx-awd" y "GLX  AWD" son la misma versión. Sin esto, cada cambio
 * tipográfico de la marca genera una "versión nueva" y una "desaparecida".
 */
export function normalizeVersionName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;

/** Un hallazgo es "el mismo" si coincide tipo + versión + valor propuesto (C12). */
function fingerprint(f: Finding): string {
  return [f.kind, normalizeVersionName(f.versionName ?? ""), f.proposedPrice ?? ""].join("|");
}

export function decide(car: CarSnapshot, report: SourceReport): CheckDecision {
  const previous = new Set((car.catalogFindings ?? []).map(fingerprint));
  const finish = (d: Omit<CheckDecision, "hasNewFindings">): CheckDecision => ({
    ...d,
    hasNewFindings: d.findings.some((f) => !previous.has(fingerprint(f))),
  });

  // ── Fuente caída ──────────────────────────────────────────────────────────
  // No se toca nada del contenido: no saber el precio no es lo mismo que saber
  // que cambió. Solo se cuenta la racha y, a la segunda, se pide otra URL.
  if (!report.fuente_ok) {
    const streak = (car.sourceFailStreak ?? 0) + 1;
    const dead = streak >= DEAD_SOURCE_STREAK;
    const detail = `No se pudo leer ${car.sourceUrl} (${streak} ${streak === 1 ? "corrida" : "corridas"} seguidas).${report.nota ? ` ${report.nota}` : ""}`;
    return finish({
      outcome: "fuente_caida",
      findings: [{ kind: "fuente_caida", detail }],
      flag: dead ? "fuente_muerta" : "none",
      note: detail,
      hide: false,
      sourceFailStreak: streak,
      needsReextract: false,
      // Solo urge cuando la revisión de este auto queda detenida hasta que
      // alguien pegue otra URL. Un fallo aislado se reintenta en 6 h.
      urgent: dead,
    });
  }

  // ── Descontinuado ─────────────────────────────────────────────────────────
  // Única escritura automática sobre contenido que permite el board (C7), y es
  // reversible: hiddenByCheck deja el rastro de que lo ocultó la revisión.
  if (!report.modelo_vigente) {
    const detail = `Ya no aparece en el catálogo oficial de ${car.sourceUrl}.${report.nota ? ` ${report.nota}` : ""}`;
    return finish({
      outcome: "descontinuado",
      findings: [{ kind: "descontinuado", detail, evidence: report.evidencia ?? undefined }],
      flag: "discontinued",
      note: detail,
      hide: true,
      sourceFailStreak: 0,
      needsReextract: false,
      urgent: true,
    });
  }

  const findings: Finding[] = [];
  let suggestedPrice: number | undefined;
  let flag: PriceCheckFlag = "none";
  const raise = (f: PriceCheckFlag) => {
    if (SEVERITY[f] > SEVERITY[flag]) flag = f;
  };

  // ── Precio base ───────────────────────────────────────────────────────────
  // Sin cita textual no hay hallazgo: es la regla R3/C4 del board aplicada al
  // caso que más duele, porque un precio inventado se aplica y llega al sitio.
  const officialBase = report.evidencia ? plausible(report.precio_base) : null;
  const ourBase = car.basePrice ?? null;

  if (officialBase && ourBase && !isNoise(ourBase, officialBase)) {
    findings.push({
      kind: "precio_base",
      detail: `Nuestro precio lista ${clp(ourBase)} · la fuente publica ${clp(officialBase)}.`,
      proposedPrice: officialBase,
      evidence: report.evidencia ?? undefined,
    });
    // Solo es accionable cuando conviene bajar el nuestro. Si ya estamos bajo el
    // oficial el hallazgo queda registrado, pero no hay nada que aplicar.
    const suggested = Math.round(officialBase * UNDERCUT_RATIO);
    const ourEffective = car.discountPrice ?? ourBase;
    if (ourEffective > suggested) {
      suggestedPrice = suggested;
      raise("price_high");
    }
  }

  // ── Versiones ─────────────────────────────────────────────────────────────
  const ours = new Map(
    (car.versions ?? []).map((v) => [normalizeVersionName(v.name), v] as const)
  );
  const seen = new Set<string>();

  for (const v of report.versiones ?? []) {
    if (!v?.nombre) continue;
    const key = normalizeVersionName(v.nombre);
    seen.add(key);
    const mine = ours.get(key);
    const price = plausible(v.precio);

    if (!mine) {
      findings.push({
        kind: "version_nueva",
        detail: `La fuente lista "${v.nombre}"${price ? ` a ${clp(price)}` : " (sin precio legible)"}, que no tenemos publicada.`,
        proposedPrice: price ?? undefined,
        versionName: v.nombre,
      });
      raise("version_nueva");
      continue;
    }

    const minePrice = mine.price ?? null;
    if (price && minePrice && !isNoise(minePrice, price)) {
      findings.push({
        kind: "precio_version",
        detail: `"${mine.name}": tenemos ${clp(minePrice)} · la fuente publica ${clp(price)}.`,
        proposedPrice: price,
        versionName: mine.name,
      });
      raise("version_nueva");
    }
  }

  // Una versión que desapareció de la fuente se reporta, pero NO se borra: puede
  // ser que la marca partió su catálogo en dos páginas, no que dejó de venderla.
  for (const [key, mine] of ours) {
    if (seen.has(key)) continue;
    findings.push({
      kind: "version_faltante",
      detail: `Tenemos publicada "${mine.name}" y ya no aparece en la fuente. Revisar si se dejó de vender o si cambió de página.`,
      versionName: mine.name,
    });
    raise("version_nueva");
  }

  // ── Año de modelo ─────────────────────────────────────────────────────────
  // El re-check no toca specs (C: "qué no se revisa"). Un año nuevo solo marca
  // que conviene volver a extraer la ficha con el flujo v2.
  let needsReextract = false;
  if (
    typeof report.anio_modelo === "number" &&
    typeof car.modelYear === "number" &&
    report.anio_modelo > car.modelYear
  ) {
    findings.push({
      kind: "anio_nuevo",
      detail: `La fuente publica el año ${report.anio_modelo} y tenemos ${car.modelYear}. Conviene re-extraer la ficha completa.`,
    });
    needsReextract = true;
    raise("anio_nuevo");
  }

  const note = findings.length
    ? `${findings.map((f) => f.detail).join(" ")} Fuente: ${car.sourceUrl}`
    : undefined;

  return finish({
    outcome: findings.length ? "cambios" : "sin_cambios",
    findings,
    flag,
    note,
    suggestedPrice,
    hide: false,
    sourceFailStreak: 0,
    needsReextract,
    // Los cambios de precio y de versión esperan al digest del lunes: no hay nada
    // roto en el sitio y avisar 4 veces al día se convierte en ruido que no se lee.
    urgent: false,
  });
}
