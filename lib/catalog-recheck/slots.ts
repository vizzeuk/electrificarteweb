/**
 * Los 28 lotes del MES (oct-2026; antes eran 28 lotes semanales): una corrida al día a las
 * 09:00 (America/Santiago), los días 1 a 28. Cada auto publicado lleva un `checkSlot` 0–27
 * asignado al crearse, así que "¿cuándo se revisa este auto?" tiene una respuesta concreta
 * ("el día 12 de cada mes") y cada auto se revisa una vez al mes.
 *
 * La corrida toma PRIMERO los autos de su slot y, si no llenan el lote, lo completa con la
 * cola por antigüedad. Esa segunda parte es la que evita el problema del lote fijo puro: si se
 * cae la corrida del día 12, esos autos entran como relleno en las siguientes en vez de
 * saltarse el mes. Los días 29 a 31 no tienen lote: si hay corrida, es solo relleno.
 */

export const RUN_HOUR = 9;
export const TOTAL_SLOTS = 28;

const TZ = "America/Santiago";

/** Día del mes y hora en hora de Chile, sin depender del TZ del proceso. */
function santiagoParts(at: Date): { hour: number; day: number; daysInPrevMonth: number } {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hour12: false, day: "numeric", month: "numeric", year: "numeric" });
  const parts = fmt.formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const year = get("year");
  const month = get("month");
  return { hour: get("hour") % 24, day: get("day"), daysInPrevMonth: new Date(Date.UTC(year, month - 1, 0)).getUTCDate() };
}

/**
 * Qué slot le corresponde a una corrida que arranca en `at`: el día del mes menos uno.
 *
 * Una corrida que se atrasa y arranca antes de las 09:00 del día siguiente sigue siendo la del
 * día anterior: sin el ajuste revisaría el lote equivocado. -1 = días 29 a 31 (sin lote).
 */
export function slotFor(at: Date = new Date()): number {
  const { hour, day, daysInPrevMonth } = santiagoParts(at);
  const dia = hour < RUN_HOUR ? (day === 1 ? daysInPrevMonth : day - 1) : day;
  return dia <= TOTAL_SLOTS ? dia - 1 : -1;
}

/** "el día 12 de cada mes" — para el Studio y para los mensajes a Francisco. */
export function describeSlot(slot: number): string {
  if (!Number.isInteger(slot) || slot < 0 || slot >= TOTAL_SLOTS) return "sin lote asignado";
  return `el día ${slot + 1} de cada mes`;
}

/**
 * Elige el slot MENOS cargado. Round-robin ciego se desbalancea en cuanto se
 * borra un auto (o se oculta): esto se rebalancea solo, sin script mensual.
 * Empate → el slot de número más bajo, para que sea determinista y testeable.
 */
export function leastLoadedSlot(counts: Record<number, number>): number {
  let best = 0;
  let bestCount = Number.POSITIVE_INFINITY;
  for (let slot = 0; slot < TOTAL_SLOTS; slot++) {
    const n = counts[slot] ?? 0;
    if (n < bestCount) {
      best = slot;
      bestCount = n;
    }
  }
  return best;
}

/**
 * Asigna slots a una tanda de autos que no tienen, partiendo de la carga actual.
 * Devuelve los pares a escribir. Se llama al crear un auto y al inicio de cada
 * corrida (donde normalmente no asigna nada, porque ya están todos asignados).
 */
export function assignSlots(
  carIds: string[],
  currentCounts: Record<number, number>,
): { carId: string; checkSlot: number }[] {
  const counts = { ...currentCounts };
  return carIds.map((carId) => {
    const checkSlot = leastLoadedSlot(counts);
    counts[checkSlot] = (counts[checkSlot] ?? 0) + 1;
    return { carId, checkSlot };
  });
}
