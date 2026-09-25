// Contrato del agente + fila del Sheet → documento `car` de Sanity.
//
// Vive en la web y no en un Code node de n8n a proposito (Directriz 4 de
// docs/FLUJO-PDP-N8N.md): las reglas de quien es dueno de que campo son codigo
// con tests, no expresiones de n8n que nadie puede correr.
import type { BasePdp, ContratoPdp, VersionPdp } from "./contrato";
import { parseVersiones, type FilaSheet, type VersionDeclarada } from "./encargo";

export function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Descarta vacios, ceros y strings en blanco — Sanity prefiere el campo ausente. */
function limpio<T>(v: T): T | undefined {
  if (v === null || v === undefined || v === "" || v === 0) return undefined;
  if (Array.isArray(v)) {
    const xs = v.map((x) => (typeof x === "string" ? x.trim() : x)).filter(Boolean);
    return (xs.length ? (xs as unknown as T) : undefined);
  }
  return v;
}

function sinIndefinidos<T extends Record<string, unknown>>(o: T): T {
  for (const [k, v] of Object.entries(o)) if (v === undefined) delete o[k];
  return o;
}

export interface RefsSanity {
  brandId: string;
  vehicleTypeId: string;
  electricTypeId: string;
}

/**
 * Las versiones del documento: el HUMANO pone nombre y precio (R4), el agente
 * solo aporta las specs que difieren. Una version declarada sin delta igual se
 * escribe — el precio es lo que la hace existir.
 */
export function armarVersiones(
  declaradas: VersionDeclarada[],
  deltas: VersionPdp[] = [],
  base: BasePdp = {},
) {
  const porNombre = new Map(deltas.map((d) => [d.nombre.trim().toLowerCase(), d]));
  const masBarata = declaradas.length
    ? declaradas.reduce((a, b) => (b.precio < a.precio ? b : a))
    : null;

  return declaradas.map((v, i) => {
    const delta: Partial<VersionPdp> = porNombre.get(v.nombre.trim().toLowerCase()) ?? {};
    // La version base hereda las specs de `base`; las otras solo su delta. Asi el
    // comparador no muestra una version vacia al lado de otra completa.
    const specs: Partial<VersionPdp> & Partial<BasePdp> =
      masBarata && v.nombre === masBarata.nombre ? { ...base, ...delta } : delta;
    return sinIndefinidos({
      _key: `v${i}`,
      name: v.nombre,
      price: v.precio,
      batteryCapacity: limpio(specs.batteryCapacity),
      batteryType: limpio(specs.batteryType),
      range: limpio(specs.range),
      electricRangeKm: limpio(specs.electricRangeKm),
      power: limpio(specs.power),
      motorDescription: limpio(specs.motorDescription),
      torque: limpio(specs.torque),
      acceleration: limpio(specs.acceleration),
      topSpeed: limpio(specs.topSpeed),
      traction: limpio(specs.traction),
      transmission: limpio(specs.transmission),
      fuelConsumption: limpio(specs.fuelConsumption),
      rendimientoElectrico: limpio(specs.rendimientoElectrico),
      maxDCChargingPower: limpio(specs.maxDCChargingPower),
      maxACChargingPower: limpio(specs.maxACChargingPower),
      connectorType: limpio(specs.connectorType),
      chargeTimeDC: limpio(specs.chargeTimeDC),
      chargeTimeAC: limpio(specs.chargeTimeAC),
      seats: limpio(specs.seats),
      seatRows: limpio(specs.seatRows),
      trunkCapacity: limpio(specs.trunkCapacity),
      frunkCapacity: limpio(specs.frunkCapacity),
    });
  });
}

/**
 * El documento completo, siempre `hidden: true` (R6).
 *
 * `basePrice` sale del MINIMO de las versiones declaradas por el humano, nunca
 * de lo que leyo el modelo: la IA no es duena de precios. Lo leido queda en
 * `catalogFindings` como control, con su cita.
 */
export function armarDocumentoCar(
  fila: FilaSheet,
  contrato: ContratoPdp,
  refs: RefsSanity,
): Record<string, unknown> {
  const declaradas = parseVersiones(fila.versiones);
  if (!declaradas.length) throw new Error("La fila no declara ninguna version: no hay precio para la PDP");

  const base = contrato.base ?? {};
  const basePrice = Math.min(...declaradas.map((v) => v.precio));

  const hallazgos: Record<string, unknown>[] = [];
  if (typeof contrato.precio_lista_leido === "number" && contrato.evidencia_precio) {
    const dif = Math.abs(contrato.precio_lista_leido - basePrice);
    if (dif > basePrice * 0.01) {
      hallazgos.push({
        _key: "precio-leido",
        kind: "precio_base",
        detail: `La fila declara $${basePrice.toLocaleString("es-CL")} como precio mas bajo; la fuente publica $${contrato.precio_lista_leido.toLocaleString("es-CL")}. No se aplico: el precio es del humano.`,
        proposedPrice: contrato.precio_lista_leido,
        evidence: contrato.evidencia_precio,
      });
    }
  }
  for (const [i, d] of (contrato.discrepancias ?? []).entries()) {
    hallazgos.push({ _key: `disc${i}`, kind: "discrepancia_fuente", detail: d });
  }

  const doc: Record<string, unknown> = {
    _type: "car",
    name: fila.modelo,
    slug: { _type: "slug", current: slugify(`${fila.marca} ${fila.modelo}`) },
    brand: { _type: "reference", _ref: refs.brandId },
    vehicleType: { _type: "reference", _ref: refs.vehicleTypeId },
    electricType: { _type: "reference", _ref: refs.electricTypeId },
    modelYear: fila.anio,
    hidden: true,            // R6 — publicar es siempre acto humano
    aiGenerated: true,
    sourceUrls: [fila.url_oficial],
    basePrice,
    versions: armarVersiones(declaradas, contrato.versiones, base),

    tagline: limpio(base.tagline),
    description: limpio(base.description),
    motorDescription: limpio(base.motorDescription),
    transmission: limpio(base.transmission),
    batteryCapacity: limpio(base.batteryCapacity),
    batteryType: limpio(base.batteryType),
    range: limpio(base.range),
    electricRangeKm: limpio(base.electricRangeKm),
    fuelConsumption: limpio(base.fuelConsumption),
    rendimientoElectrico: limpio(base.rendimientoElectrico),
    power: limpio(base.power),
    torque: limpio(base.torque),
    acceleration: limpio(base.acceleration),
    topSpeed: limpio(base.topSpeed),
    traction: limpio(base.traction),
    seats: limpio(base.seats),
    seatRows: limpio(base.seatRows),
    cargo: limpio(base.cargo),
    frunkCapacity: limpio(base.frunkCapacity),
    groundClearance: limpio(base.groundClearance),
    warranty: limpio(base.warranty),
    connectorType: limpio(base.connectorType),
    maxDCChargingPower: limpio(base.maxDCChargingPower),
    maxACChargingPower: limpio(base.maxACChargingPower),
    chargeTimeDC: limpio(base.chargeTimeDC),
    chargeTimeAC: limpio(base.chargeTimeAC),
    euroNcap: limpio(base.euroNcap),
    airbags: limpio(base.airbags),
    safetyFeatures: limpio(base.safetyFeatures),
    techFeatures: limpio(base.techFeatures),
    comfortFeatures: limpio(base.comfortFeatures),
    metaTitle: limpio(base.metaTitle),
    metaDescription: limpio(base.metaDescription),
    keywords: limpio(base.keywords),

    catalogFindings: hallazgos.length ? hallazgos : undefined,
    priceCheckNote: limpio(contrato.notas),
  };

  return sinIndefinidos(doc);
}
