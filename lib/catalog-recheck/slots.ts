/**
 * Los 28 lotes de la semana: 7 días × 4 corridas (09:00, 15:00, 19:00, 23:00 en
 * America/Santiago). Cada auto publicado lleva un `checkSlot` 0–27 asignado al
 * crearse, así que "¿cuándo se revisa este auto?" tiene una respuesta concreta
 * ("martes a las 15:00") en vez de "en algún momento de la semana".
 *
 * La corrida toma PRIMERO los autos de su slot y, si no llenan el lote, lo
 * completa con la cola por antigüedad. Esa segunda parte es la que evita el
 * problema del lote fijo puro: si se cae la corrida del martes, esos autos entran
 * como relleno en las siguientes en vez de saltarse la semana entera.
 */

export const RUN_HOURS = [9, 15, 19, 23] as const;
export const SLOTS_PER_DAY = RUN_HOURS.length;
export const TOTAL_SLOTS = 7 * SLOTS_PER_DAY; // 28

const TZ = "America/Santiago";
const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** Lee hora y día de la semana en hora de Chile, sin depender del TZ del proceso. */
function santiagoParts(at: Date): { hour: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const short = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const index = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(short);
  return { hour: hour % 24, weekday: index < 0 ? 0 : index };
}

/**
 * Qué slot le corresponde a una corrida que arranca en `at`.
 *
 * El caso que importa: una corrida de las 23:00 que se atrasa y arranca a las
 * 00:20 del día siguiente. Sin el ajuste, caería en el slot 0 del día nuevo y
 * revisaría el lote equivocado dos veces. Las horas 0–8 se tratan como el slot
 * de las 23:00 del día anterior.
 */
export function slotFor(at: Date = new Date()): number {
  const { hour, weekday } = santiagoParts(at);
  if (hour < RUN_HOURS[0]) {
    const prevDay = (weekday + 6) % 7;
    return prevDay * SLOTS_PER_DAY + (SLOTS_PER_DAY - 1);
  }
  let runIndex = 0;
  for (let i = RUN_HOURS.length - 1; i >= 0; i--) {
    if (hour >= RUN_HOURS[i]) {
      runIndex = i;
      break;
    }
  }
  return weekday * SLOTS_PER_DAY + runIndex;
}

/** "martes a las 15:00" — para el Studio y para los mensajes a Francisco. */
export function describeSlot(slot: number): string {
  if (!Number.isInteger(slot) || slot < 0 || slot >= TOTAL_SLOTS) return "sin lote asignado";
  const day = DAY_NAMES[Math.floor(slot / SLOTS_PER_DAY)];
  const hour = RUN_HOURS[slot % SLOTS_PER_DAY];
  return `${day} a las ${String(hour).padStart(2, "0")}:00`;
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
