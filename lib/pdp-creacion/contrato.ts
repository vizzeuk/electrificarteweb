// El contrato que devuelve el Managed Agent (`entregar_pdp`) y la metrica de
// llenado del board: N/M campos APLICABLES, no % sobre un total plano.
//
// Board "FLUJO PDP's" → "Umbral de llenado":
//   El borrador SIEMPRE se crea. El umbral decide el mensaje y el estado de la
//   fila, no si se crea. Lo unico que impide crear es la validacion sin IA o un
//   slug duplicado.

export interface BasePdp {
  motorDescription?: string; transmission?: string;
  batteryCapacity?: number; batteryType?: string;
  range?: number; electricRangeKm?: number;
  fuelConsumption?: number; rendimientoElectrico?: number;
  power?: number; torque?: number; acceleration?: number; topSpeed?: number;
  traction?: string; seats?: number; seatRows?: number;
  cargo?: number; frunkCapacity?: number; groundClearance?: number;
  warranty?: string;
  connectorType?: string; maxDCChargingPower?: number; maxACChargingPower?: number;
  chargeTimeDC?: string; chargeTimeAC?: string;
  euroNcap?: number; airbags?: number;
  safetyFeatures?: string[]; techFeatures?: string[]; comfortFeatures?: string[];
  tagline?: string; description?: string;
  metaTitle?: string; metaDescription?: string; keywords?: string[];
}

export interface VersionPdp extends Omit<BasePdp, "cargo" | "tagline" | "description" | "metaTitle" | "metaDescription" | "keywords" | "groundClearance" | "euroNcap" | "airbags" | "safetyFeatures" | "techFeatures" | "comfortFeatures" | "warranty"> {
  nombre: string;
  trunkCapacity?: number;
}

export interface ContratoPdp {
  estado: "listo" | "sin_datos";
  motivo?: string;
  fuente_leida: string;
  precio_lista_leido?: number;
  evidencia_precio?: string;
  base?: BasePdp;
  versiones?: VersionPdp[];
  portada_url?: string;
  galeria?: { url: string; descripcion?: string }[];
  discrepancias?: string[];
  notas?: string;
}

// ─── Metrica N/M ──────────────────────────────────────────────────────────────

/** Campos que se le piden a TODA electrificacion (22). */
const COMUNES = [
  "motorDescription", "transmission", "power", "torque", "acceleration", "topSpeed",
  "traction", "seats", "seatRows", "cargo", "groundClearance", "warranty",
  "euroNcap", "airbags", "safetyFeatures", "techFeatures", "comfortFeatures",
  "tagline", "description", "metaTitle", "metaDescription", "keywords",
] as const;

/** Lo que suma cada electrificacion sobre los comunes. */
const POR_ELECTRIFICACION: Record<string, readonly string[]> = {
  // 22 + 7 = 29
  EV: ["range", "rendimientoElectrico", "batteryCapacity", "batteryType", "connectorType", "maxDCChargingPower", "chargeTimeDC"],
  // 22 + 9 = 31 — suma el rango en modo electrico y el consumo de bencina
  PHEV: ["range", "rendimientoElectrico", "batteryCapacity", "batteryType", "connectorType", "maxDCChargingPower", "chargeTimeDC", "electricRangeKm", "fuelConsumption"],
  EREV: ["range", "rendimientoElectrico", "batteryCapacity", "batteryType", "connectorType", "maxDCChargingPower", "chargeTimeDC", "electricRangeKm", "fuelConsumption"],
  // 22 + 3 = 25 — no enchufa: sin conector, sin carga DC, sin autonomia electrica
  HEV: ["fuelConsumption", "batteryCapacity", "batteryType"],
  MHEV: ["fuelConsumption", "batteryCapacity", "batteryType"],
};

/**
 * Las 5 vitales del board: autonomia, potencia, bateria, 0-100, traccion.
 * En HEV/MHEV no hay autonomia electrica declarada, asi que la vital de
 * "autonomia" pasa a ser el rendimiento de combustible — si no, un HEV perfecto
 * nunca puede quedar completo.
 */
export function vitales(electrificacion: string): string[] {
  const tag = electrificacion.toUpperCase();
  const autonomia = tag === "HEV" || tag === "MHEV" ? "fuelConsumption" : "range";
  return [autonomia, "power", "batteryCapacity", "acceleration", "traction"];
}

/**
 * El segundo escalon: no son vitales, pero una PDP sin ellos no se publica.
 * Son los que un comprador mira antes de decidir y que las marcas chilenas SI
 * publican.
 *
 * Lo que queda deliberadamente afuera de los dos escalones — `euroNcap`,
 * `seatRows`, `topSpeed`, `groundClearance`, `batteryType` — no es porque no
 * importe: es que las paginas de marca en Chile casi nunca lo traen. Exigirlos
 * marcaba como "incompleta" a una ficha que en realidad estaba lista, que es
 * justo lo que pasó con los dos autos de prueba.
 */
export function importantes(electrificacion: string): string[] {
  const tag = electrificacion.toUpperCase();
  const comunes = ["motorDescription", "transmission", "torque", "seats", "warranty", "safetyFeatures"];
  const enchufable = tag === "EV" || tag === "PHEV" || tag === "EREV";
  return enchufable ? [...comunes, "connectorType", "maxDCChargingPower"] : comunes;
}

/** Piso absoluto de campos llenos, cualquiera sea la electrificacion. */
export const MIN_CAMPOS = 20;

export function camposAplicables(electrificacion: string): string[] {
  const extra = POR_ELECTRIFICACION[electrificacion.toUpperCase()];
  if (!extra) throw new Error(`Electrificacion desconocida: ${electrificacion}`);
  return [...COMUNES, ...extra];
}

function tieneValor(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.some((x) => String(x ?? "").trim().length > 0);
  if (typeof v === "number") return Number.isFinite(v) && v > 0;
  return String(v).trim().length > 0;
}

export interface Llenado {
  n: number;
  m: number;
  porcentaje: number;
  faltantes: string[];
  vitalesFaltantes: string[];
  importantesFaltantes: string[];
  tienePortada: boolean;
  tieneTextos: boolean;
  completo: boolean;
}

/**
 * Completo = las 5 vitales + los importantes + al menos 20 campos + portada +
 * tagline/descripcion/meta.
 *
 * **No es el ≥85% del board.** Ese numero era una estimacion previa a tener
 * datos; con las fuentes chilenas reales dejaba fichas buenas del lado
 * incompleto. Medido: el GWM Ora 5 quedo en 23/29 (79%) con las 5 vitales y
 * todos los textos, y lo unico realmente faltante era `seats` — el resto eran
 * campos que gwm.cl no publica. Un umbral que no distingue "le falta el numero
 * de asientos" de "no sabemos cuanta bateria tiene" no sirve para decidir nada.
 *
 * El piso de 20 sigue existiendo para que una ficha vacia con las 5 vitales
 * llenas no pase por completa.
 */
export function medirLlenado(
  base: BasePdp | undefined,
  electrificacion: string,
  portadaUrl?: string,
): Llenado {
  const campos = camposAplicables(electrificacion);
  const b = (base ?? {}) as Record<string, unknown>;
  const llenos = campos.filter((k) => tieneValor(b[k]));
  const m = campos.length;
  const n = llenos.length;
  const porcentaje = m ? Math.round((n / m) * 100) : 0;

  const vitalesFaltantes = vitales(electrificacion).filter((k) => !tieneValor(b[k]));
  const importantesFaltantes = importantes(electrificacion).filter((k) => !tieneValor(b[k]));
  const tienePortada = typeof portadaUrl === "string" && /^https:\/\//i.test(portadaUrl);
  const tieneTextos = ["tagline", "description", "metaTitle", "metaDescription"].every((k) => tieneValor(b[k]));

  return {
    n, m, porcentaje,
    faltantes: campos.filter((k) => !tieneValor(b[k])),
    vitalesFaltantes,
    importantesFaltantes,
    tienePortada,
    tieneTextos,
    completo:
      vitalesFaltantes.length === 0 &&
      importantesFaltantes.length === 0 &&
      n >= MIN_CAMPOS &&
      tienePortada &&
      tieneTextos,
  };
}
