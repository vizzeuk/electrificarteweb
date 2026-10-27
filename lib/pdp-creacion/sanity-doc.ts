// Contrato del agente + fila del Sheet → documento `car` de Sanity.
//
// Vive en la web y no en un Code node de n8n a proposito (Directriz 4 de
// docs/FLUJO-PDP-N8N.md): las reglas de quien es dueno de que campo son codigo
// con tests, no expresiones de n8n que nadie puede correr.
import { vitales, type BasePdp, type ContratoPdp, type VersionPdp } from "./contrato";
import { hostDe, parseVersiones, sinTiposDelModelo, versionBase, versionesDelModelo, type FilaSheet, type VersionDeclarada } from "./encargo";

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
  /** Refs propias de cada version declarada (mismo orden), solo si difieren del modelo. */
  versiones?: { vehicleTypeId?: string; electricTypeId?: string }[];
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
  refsVersiones: RefsSanity["versiones"] = [],
  /** El precio con bonos/financiamiento que leyo el agente para la version base (con cita). */
  financiamientoBaseLeido?: number,
) {
  const porNombre = new Map(deltas.map((d) => [d.nombre.trim().toLowerCase(), d]));
  // La base es la mas barata de la electrificacion del modelo (ver versionBase).
  const masBarata = versionBase(declaradas);

  return declaradas.map((v, i) => {
    const delta: Partial<VersionPdp> = porNombre.get(v.nombre.trim().toLowerCase()) ?? {};
    const financiamiento = precioFinanciamiento(v, delta, masBarata?.nombre === v.nombre ? financiamientoBaseLeido : undefined);
    // La version base hereda las specs de `base`; las otras solo su delta. Asi el
    // comparador no muestra una version vacia al lado de otra completa. Una version de otra
    // electrificacion trae sus specs completas en el delta (lo pide el encargo).
    const specs: Partial<VersionPdp> & Partial<BasePdp> =
      masBarata && v.nombre === masBarata.nombre ? { ...base, ...delta } : delta;
    const refs = refsVersiones?.[i] ?? {};
    return sinIndefinidos({
      _key: `v${i}`,
      name: v.nombre,
      price: v.precio,
      discountPrice: financiamiento,
      electricType: refs.electricTypeId ? { _type: "reference", _ref: refs.electricTypeId } : undefined,
      vehicleType: refs.vehicleTypeId ? { _type: "reference", _ref: refs.vehicleTypeId } : undefined,
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

/** Lo que el agente leyo como precio con bonos/financiamiento, solo si trae cita (R3). */
function leidoConCita(precio: unknown, cita: unknown): number | undefined {
  return typeof precio === "number" && precio > 0 && typeof cita === "string" && cita.trim() ? precio : undefined;
}

/**
 * El precio con bonos y/o financiamiento de una version (el mas bajo que publica la marca): el
 * que declaro el humano o, si no declaro, el que leyo el agente con su cita. Solo si es menor
 * que el de lista: igual o mayor no es un segundo precio.
 */
export function precioFinanciamiento(
  v: VersionDeclarada,
  delta: Partial<VersionPdp> = {},
  leidoBase?: number,
): number | undefined {
  const p = v.precio_financiamiento ?? leidoBase ?? leidoConCita(delta.precio_financiamiento_leido, delta.evidencia_precio_financiamiento);
  return p && p < v.precio ? p : undefined;
}

/**
 * La URL que queda en `sourceUrls` (la que el re-check semanal relee). Si la fuente fue el sitio
 * de la marca, la home no sirve: se guarda la ficha que el agente dice haber leido, siempre que
 * sea del mismo dominio. Si no, la URL de la fila.
 */
export function fuenteDelDocumento(fila: FilaSheet, contrato: Pick<ContratoPdp, "fuente_leida">): string {
  const fuente = String(fila.url_oficial ?? "");
  if (!fila.sitio_marca) return fuente;
  let host = "";
  try {
    host = hostDe(fuente);
  } catch {
    return fuente;
  }
  const leidas = String(contrato.fuente_leida ?? "").split(/[,\s]+/).filter(Boolean);
  for (const u of leidas) {
    try {
      if (hostDe(u) === host && !/\.pdf($|\?)/i.test(u) && new URL(u).pathname.replace(/\/$/, "") !== "") return u;
    } catch {
      // no es una URL https: se ignora
    }
  }
  return fuente;
}

/**
 * El documento completo, siempre `hidden: true` (R6).
 *
 * `basePrice` sale del MINIMO de las versiones declaradas por el humano. Lo que
 * leyo el modelo queda en `catalogFindings` como control, con su cita.
 *
 * Sin versiones declaradas (opcional desde oct-2026) el precio es el de lista que
 * el agente leyo de la fuente oficial, SOLO si trae cita textual (R3), y queda un
 * hallazgo para que una persona lo confirme antes de publicar. Sin cita no hay
 * precio: el borrador queda incompleto y lo completa una persona en Studio.
 */
export function armarDocumentoCar(
  fila: FilaSheet,
  contrato: ContratoPdp,
  refs: RefsSanity,
): Record<string, unknown> {
  const declaradas = sinTiposDelModelo(parseVersiones(fila.versiones), fila);
  const base = contrato.base ?? {};
  const precioLeido =
    typeof contrato.precio_lista_leido === "number" && contrato.precio_lista_leido > 0 && contrato.evidencia_precio
      ? contrato.precio_lista_leido
      : undefined;
  // El "desde" del modelo sale de las versiones de SU electrificacion: el de una version de otra
  // tecnologia se ve en esa version (y en la PLP de ese tipo), no como precio del modelo.
  const delModelo = versionesDelModelo(declaradas);
  const basePrice = declaradas.length ? Math.min(...delModelo.map((v) => v.precio)) : precioLeido;
  // El precio con bonos/financiamiento del modelo es el de la MISMA version que el de lista
  // (la base): los dos precios de la PDP siempre son de una misma version.
  const financiamientoLeido = leidoConCita(contrato.precio_financiamiento_leido, contrato.evidencia_precio_financiamiento);
  const versionBaseDeclarada = declaradas.length ? versionBase(declaradas) : null;
  const deltasFin = new Map((contrato.versiones ?? []).map((d) => [d.nombre.trim().toLowerCase(), d]));
  const discountPrice = versionBaseDeclarada
    ? precioFinanciamiento(versionBaseDeclarada, {}, financiamientoLeido)
    : financiamientoLeido && basePrice && financiamientoLeido < basePrice ? financiamientoLeido : undefined;

  const hallazgos: Record<string, unknown>[] = [];
  if (!declaradas.length && precioLeido) {
    hallazgos.push({
      _key: "precio-de-fuente",
      kind: "precio_base",
      detail: `Nadie declaro versiones: el precio base ($${precioLeido.toLocaleString("es-CL")}) es el de lista que publica la fuente oficial. Confirmalo antes de publicar.`,
      proposedPrice: precioLeido,
      evidence: contrato.evidencia_precio,
    });
  }
  if (declaradas.length && basePrice && precioLeido) {
    const dif = Math.abs(precioLeido - basePrice);
    if (dif > basePrice * 0.01) {
      hallazgos.push({
        _key: "precio-leido",
        kind: "precio_base",
        detail: `La fila declara $${basePrice.toLocaleString("es-CL")} como precio mas bajo; la fuente publica $${precioLeido.toLocaleString("es-CL")}. No se aplico: el precio es del humano.`,
        proposedPrice: precioLeido,
        evidence: contrato.evidencia_precio,
      });
    }
  }
  // Precios con bonos/financiamiento: el que salio de la fuente (no lo declaro el humano) se
  // usa, pero queda para confirmar; el declarado que no calza con la fuente queda como control.
  const finPorVersion = declaradas.length
    ? declaradas.map((v) => {
        const delta: Partial<VersionPdp> = deltasFin.get(v.nombre.trim().toLowerCase()) ?? {};
        const esBase = v.nombre === versionBaseDeclarada?.nombre;
        const leido = esBase ? financiamientoLeido : leidoConCita(delta.precio_financiamiento_leido, delta.evidencia_precio_financiamiento);
        const cita = esBase ? contrato.evidencia_precio_financiamiento : delta.evidencia_precio_financiamiento;
        return { nombre: v.nombre, declarado: v.precio_financiamiento, leido, cita, lista: v.precio };
      })
    : [{ nombre: undefined, declarado: undefined, leido: financiamientoLeido, cita: contrato.evidencia_precio_financiamiento, lista: basePrice ?? 0 }];
  for (const [i, f] of finPorVersion.entries()) {
    if (!f.leido || f.leido >= f.lista) continue;
    const quien = f.nombre ? `la version "${f.nombre}"` : "el modelo";
    if (!f.declarado) {
      hallazgos.push({
        _key: `financiamiento-de-fuente-${i}`,
        kind: "precio_financiamiento",
        ...(f.nombre ? { versionName: f.nombre } : {}),
        detail: `El precio con bonos y/o financiamiento de ${quien} ($${f.leido.toLocaleString("es-CL")}) es el que publica la fuente oficial. Confirmalo antes de publicar.`,
        proposedPrice: f.leido,
        evidence: f.cita,
      });
    } else if (Math.abs(f.leido - f.declarado) > f.declarado * 0.01) {
      hallazgos.push({
        _key: `financiamiento-leido-${i}`,
        kind: "precio_financiamiento",
        ...(f.nombre ? { versionName: f.nombre } : {}),
        detail: `Se declaro $${f.declarado.toLocaleString("es-CL")} con bonos y/o financiamiento para ${quien}; la fuente publica $${f.leido.toLocaleString("es-CL")}. No se aplico: el precio es del humano.`,
        proposedPrice: f.leido,
        evidence: f.cita,
      });
    }
  }
  for (const [i, d] of (contrato.discrepancias ?? []).entries()) {
    hallazgos.push({ _key: `disc${i}`, kind: "discrepancia_fuente", detail: d });
  }
  // Una version de otra electrificacion no hereda nada de la base: sin sus vitales propias, la
  // ficha mostraria esa version sin autonomia, potencia o bateria. Se avisa para completarla.
  const deltasPorNombre = new Map((contrato.versiones ?? []).map((d) => [d.nombre.trim().toLowerCase(), d as unknown as Record<string, unknown>]));
  for (const [i, v] of declaradas.entries()) {
    if (!v.electrificacion) continue;
    const delta = deltasPorNombre.get(v.nombre.trim().toLowerCase()) ?? {};
    const faltan = vitales(v.electrificacion).filter((k) => {
      const x = delta[k];
      return x === undefined || x === null || x === "" || x === 0;
    });
    if (faltan.length) {
      hallazgos.push({
        _key: `version-otra-tecnologia-${i}`,
        kind: "discrepancia_fuente",
        versionName: v.nombre,
        detail: `La version "${v.nombre}" (${v.electrificacion}) no trae de la fuente: ${faltan.join(", ")}. Completalos en Studio antes de publicar.`,
      });
    }
  }

  const doc: Record<string, unknown> = {
    _type: "car",
    name: fila.modelo,
    slug: { _type: "slug", current: slugify(`${fila.marca} ${fila.modelo}`) },
    brand: { _type: "reference", _ref: refs.brandId },
    vehicleType: { _type: "reference", _ref: refs.vehicleTypeId },
    electricType: { _type: "reference", _ref: refs.electricTypeId },
    modelYear: Number(fila.anio) || undefined,
    hidden: true,            // R6 — publicar es siempre acto humano
    // Todo lo que crea el flujo es un modelo recien llegado al catalogo: nace marcado como
    // "🆕 Nuevo lanzamiento" (badge NUEVO y primero en "Ultimos lanzamientos" al publicarse).
    // Se desmarca a mano en Studio cuando deja de serlo.
    isNew: true,
    aiGenerated: true,
    sourceUrls: [fuenteDelDocumento(fila, contrato)],
    basePrice,
    discountPrice,
    versions: armarVersiones(declaradas, contrato.versiones, base, refs.versiones, financiamientoLeido),

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
