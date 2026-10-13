// "Últimos lanzamientos": la misma lista alimenta el carrusel del home y su página "ver todos",
// para que la página nunca muestre menos autos que el carrusel.

export const LATEST_LAUNCHES_PATH = "/coleccion/ultimos-lanzamientos";
export const LATEST_LAUNCHES_TITLE = "Últimos lanzamientos";

/** Tope de 🆕 en el carrusel del home; la página "ver todos" no lo aplica. */
export const LATEST_LAUNCHES_HOME_MAX = 20;
/** Mínimo de autos: si hay pocos 🆕, se completa con los agregados más recientemente. */
const MIN_CARS = 10;

/**
 * Primero los elegidos a mano en la Página de inicio, después los 🆕 y, si no llegan a 10, los
 * más recientes. `dynamic` viene de `newCarsForHomeQuery` (🆕 primero, luego por fecha de alta).
 */
export function mergeLatestLaunches<T extends { _id: string; isNew?: boolean | null }>(
  manual: T[] | null | undefined,
  dynamic: T[] | null | undefined,
  max = Infinity,
): T[] {
  const picked = manual ?? [];
  const pickedIds = new Set(picked.map((c) => c._id));
  const extras = (dynamic ?? []).filter((c) => !pickedIds.has(c._id));
  const nuevos = (dynamic ?? []).filter((c) => c.isNew).length;
  return [...picked, ...extras].slice(0, Math.min(max, Math.max(MIN_CARS, nuevos)));
}
