/// <reference types="node" />
/**
 * Junta las dos fichas del DS 3 en una sola (oct-2026): "3" (híbrido, hatchback) y
 * "3 Opera E-tense" (100% eléctrico, SUV) pasan a ser dos versiones de `ds-3`. La versión
 * E-Tense declara su propia electrificación y carrocería (`versions[].electricType/vehicleType`),
 * así el DS 3 aparece en Híbridos y en Eléctricos, en Hatchback y en SUV.
 *
 * ⚠️ Correr DESPUÉS de desplegar la web que entiende los tipos por versión. Con la web anterior,
 * la versión E-Tense mostraría las specs del híbrido y Studio marcaría los campos como desconocidos.
 * El redirect /auto/ds-3-opera-e-tense → /auto/ds-3 va en next.config.ts del mismo deploy.
 *
 * No inventa datos: las specs de la versión E-Tense son las que ya tenía su ficha en Sanity.
 * Respalda los dos documentos en scripts/data/ antes de escribir.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/fusionar-ds3.ts           # muestra lo que haría
 *   npx tsx --env-file=.env.local scripts/fusionar-ds3.ts --apply   # lo hace
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@sanity/client";

const BASE_ID = "N413gTqYC4TRZUrB6qPxzL";      // ds-3 ("3", HEV, Hatchback): la que queda
const ETENSE_ID = "car-ds-3-opera-e-tense";      // ds-3-opera-e-tense (EV, SUV): se borra
const APPLY = process.argv.includes("--apply");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "wd30r9b0",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  perspective: "raw",
});

type Doc = Record<string, any>;

/** Un string de Sanity que no dice nada ("N/D", "-") cuenta como vacío. */
const dato = (v: unknown) => (typeof v === "string" && /^(n\/?d|-|–|—)?$/i.test(v.trim()) ? undefined : v ?? undefined);

function sinVacios<T extends Record<string, unknown>>(o: T): T {
  for (const [k, v] of Object.entries(o)) if (v === undefined || v === null || v === "") delete o[k];
  return o;
}

async function main() {
  const docs: Doc[] = await client.fetch(`*[_id in $ids]`, {
    ids: [BASE_ID, ETENSE_ID, `drafts.${BASE_ID}`, `drafts.${ETENSE_ID}`],
  });
  const base = docs.find((d) => d._id === BASE_ID);
  const et = docs.find((d) => d._id === ETENSE_ID);
  if (!base) throw new Error(`No existe ${BASE_ID} (ds-3)`);
  if (!et) {
    console.log(`${ETENSE_ID} ya no existe: la fusión ya se hizo.`);
    return;
  }
  const borradores = docs.filter((d) => d._id.startsWith("drafts."));
  if (borradores.length) throw new Error(`Hay borradores abiertos (${borradores.map((d) => d._id).join(", ")}): publícalos o descártalos en Studio primero.`);

  const refs: { _id: string; _type: string }[] = await client.fetch(`*[references($id)]{ _id, _type }`, { id: ETENSE_ID });
  if (refs.length) throw new Error(`${ETENSE_ID} está referenciado por ${refs.map((r) => `${r._type} ${r._id}`).join(", ")}: sácalo de ahí primero.`);

  const v0: Doc = et.versions?.[0] ?? {};
  const version = sinVacios({
    _key: "e-tense",
    _type: "version",
    name: "DS 3 Opera E-Tense",
    price: v0.price ?? et.basePrice,
    discountPrice: v0.discountPrice ?? et.discountPrice,
    // Solo los tipos que difieren de los de la ficha que queda.
    electricType: et.electricType?._ref !== base.electricType?._ref ? et.electricType : undefined,
    vehicleType: et.vehicleType?._ref !== base.vehicleType?._ref ? et.vehicleType : undefined,
    batteryCapacity: v0.batteryCapacity ?? et.batteryCapacity,
    batteryType: v0.batteryType ?? et.batteryType,
    range: v0.range ?? et.range,
    rendimientoElectrico: v0.rendimientoElectrico ?? et.rendimientoElectrico,
    power: v0.power ?? et.power,
    motorDescription: dato(v0.motorDescription ?? et.motorDescription),
    torque: v0.torque ?? et.torque,
    acceleration: v0.acceleration ?? et.acceleration,
    topSpeed: v0.topSpeed ?? et.topSpeed,
    traction: v0.traction ?? et.traction,
    transmission: dato(v0.transmission ?? et.transmission),
    maxDCChargingPower: v0.maxDCChargingPower ?? et.maxDCChargingPower,
    maxACChargingPower: v0.maxACChargingPower ?? et.maxACChargingPower,
    connectorType: v0.connectorType ?? et.connectorType,
    chargeTimeDC: dato(v0.chargeTimeDC ?? et.chargeTimeDC),
    chargeTimeAC: dato(v0.chargeTimeAC ?? et.chargeTimeAC),
    seats: v0.seats ?? et.seats,
    seatRows: v0.seatRows ?? et.seatRows,
    trunkCapacity: v0.trunkCapacity ?? et.cargo,
  });

  // Fotos: la portada y la galería de la E-Tense se suman a la galería del DS 3 (sin repetir).
  const yaEstan = new Set((base.gallery ?? []).map((g: Doc) => g.asset?._ref));
  const fotos = [et.mainImage, ...(et.gallery ?? [])]
    .filter((g: Doc | undefined) => g?.asset?._ref && !yaEstan.has(g.asset._ref) && yaEstan.add(g.asset._ref))
    .map((g: Doc, i: number) => ({ ...g, _type: "image", _key: `etense-${i}`, alt: g.alt ?? "DS 3 Opera E-Tense" }));

  const fuentes = [...new Set([...(base.sourceUrls ?? []), ...(et.sourceUrls ?? [])])];

  console.log("Versión nueva en ds-3:\n", JSON.stringify(version, null, 2));
  console.log(`Fotos que se suman a la galería: ${fotos.length}`);
  console.log(`Fuentes: ${fuentes.join(", ")}`);
  console.log(`Se borra: ${ETENSE_ID} (/auto/${et.slug?.current}) → redirige a /auto/${base.slug?.current}`);

  if (!APPLY) {
    console.log("\n(Sin --apply no se escribe nada.)");
    return;
  }

  const respaldo = join(process.cwd(), "scripts/data/sanity-ds3-antes-de-fusionar.json");
  writeFileSync(respaldo, JSON.stringify({ fecha: new Date().toISOString(), documentos: [base, et] }, null, 2));
  console.log(`Respaldo: ${respaldo}`);

  const tx = client.transaction()
    .patch(BASE_ID, (p) =>
      p.setIfMissing({ versions: [], gallery: [] })
        .append("versions", [version])
        .append("gallery", fotos)
        .set({ sourceUrls: fuentes }),
    )
    .delete(ETENSE_ID);
  const res = await tx.commit({ visibility: "sync" });
  console.log(`Listo (transacción ${res.transactionId}).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
