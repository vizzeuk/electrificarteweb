/**
 * Asignación del lote de revisión (`checkSlot` 0–27) a los autos publicados.
 *
 * Se llama desde tres lados, y por eso vive acá y no dentro de un endpoint:
 *  - `/api/admin/recheck/assign-slots`, que invoca el flujo de creación (v2) en
 *    cuanto crea una PDP, para que el auto nuevo tenga lote al instante.
 *  - `/api/admin/recheck/queue`, al inicio de cada corrida, que barre los que
 *    quedaron sin asignar (creados a mano en Studio). Normalmente no escribe nada.
 *  - El script de backfill, una vez, para los autos que ya existían.
 */

import { assignSlots, TOTAL_SLOTS } from "./slots";
import type { SanityWriteClient } from "./admin";

const PUBLISHED = `_type == "car" && hidden != true && !(_id in path("drafts.**"))`;

export interface AssignResult {
  asignados: { carId: string; checkSlot: number }[];
  /** Cuántos autos publicados ya tenían lote. */
  yaTenian: number;
}

/**
 * Le pone `checkSlot` a los autos publicados que no tienen, al lote MENOS
 * cargado de los 28. Round-robin ciego se desbalancea en cuanto se borra u
 * oculta un auto; esto se rebalancea solo, sin script mensual.
 *
 * `carIds` limita la operación a autos concretos (el flujo de creación pasa el
 * que acaba de crear). Sin eso, barre todos los publicados sin lote.
 */
export async function assignMissingSlots(
  sanity: SanityWriteClient,
  carIds?: string[],
): Promise<AssignResult> {
  const { sinSlot, ocupados } = await sanity.fetch<{
    sinSlot: string[];
    ocupados: (number | null)[];
  }>(
    `{
      "sinSlot": *[${PUBLISHED} && !defined(checkSlot) ${carIds ? "&& _id in $ids" : ""}]._id,
      "ocupados": *[${PUBLISHED} && defined(checkSlot)].checkSlot
    }`,
    carIds ? { ids: carIds } : {},
  );

  const counts: Record<number, number> = {};
  for (const slot of ocupados) {
    if (typeof slot === "number" && slot >= 0 && slot < TOTAL_SLOTS) {
      counts[slot] = (counts[slot] ?? 0) + 1;
    }
  }

  if (sinSlot.length === 0) return { asignados: [], yaTenian: ocupados.length };

  const asignados = assignSlots(sinSlot, counts);
  const tx = asignados.reduce(
    (t, { carId, checkSlot }) => t.patch(carId, (p) => p.set({ checkSlot })),
    sanity.transaction(),
  );
  await tx.commit();

  return { asignados, yaTenian: ocupados.length };
}
