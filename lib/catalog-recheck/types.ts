/**
 * Contratos del re-check semanal de PDPs (Flujo C — docs/FLUJO-PDP-N8N.md §2).
 *
 * Separado de la lógica para que el diff (diff.ts) sea puro y testeable sin red:
 * la regla de negocio "¿esto es un hallazgo o es ruido?" es lo único que no puede
 * estar mal, y es lo único que no involucra ni a Claude ni a Sanity.
 */

/** Lo que el modelo reporta tras leer UNA URL oficial. Todo puede venir vacío. */
export interface SourceReport {
  /** false si la URL no respondió o no se pudo leer. */
  fuente_ok: boolean;
  /** false si el modelo ya no aparece en el catálogo oficial vigente. */
  modelo_vigente: boolean;
  /** El precio MAS ALTO de la version mas barata (lista). Uno solo publicado = va aca. */
  precio_base: number | null;
  /** El MAS BAJO de esa misma version: con bonos y/o financiamiento (oct-2026). */
  precio_financiamiento?: number | null;
  anio_modelo: number | null;
  versiones: { nombre: string; precio: number | null; precio_financiamiento?: number | null }[];
  /** Cita textual de donde salió `precio_base`. Sin cita, el precio se descarta. */
  evidencia: string | null;
  /** Cita de `precio_financiamiento`. Sin cita, se descarta. */
  evidencia_financiamiento?: string | null;
  nota: string | null;
}

/** Lo que tenemos hoy publicado, tal como sale de Sanity. */
export interface CarSnapshot {
  id: string;
  name: string;
  brand: string;
  slug: string;
  sourceUrl: string;
  basePrice?: number | null;
  discountPrice?: number | null;
  modelYear?: number | null;
  versions?: { name: string; price?: number | null; discountPrice?: number | null }[];
  /** Corridas seguidas con la fuente caída, antes de esta. */
  sourceFailStreak?: number | null;
  /** Hallazgos ya registrados — para no re-avisar lo mismo (C12). */
  catalogFindings?: Finding[];

  /**
   * Otra PDP publicada usa la misma `sourceUrls[0]`. Pasa en 9 familias del
   * catálogo (Porsche Taycan + Cross Turismo, Volvo EX30 + Cross Country, Geely
   * EX5 + E-DMi + EM-i, GWM Ora 03 + GT, …): la marca publica una sola página
   * para toda la familia y nosotros la partimos en varias PDPs.
   */
  sharedSource?: boolean;
  /** El nombre de la versión en la fuente DEBE contener alguno de estos. */
  versionScope?: string[];
  /** ...y ninguno de estos. */
  versionExclude?: string[];
}

export type FindingKind =
  | "precio_base"
  | "precio_version"
  | "precio_financiamiento"
  | "version_nueva"
  | "version_faltante"
  | "anio_nuevo"
  | "descontinuado"
  | "fuente_caida"
  | "precio_aplicado"
  | "fuente_compartida";

export interface Finding {
  kind: FindingKind;
  detail: string;
  /** Lo que publica la fuente. Nunca se aplica solo (C6). */
  proposedPrice?: number;
  versionName?: string;
  evidence?: string;
}

/** Los mismos tres primeros valores que ya usaba el Flujo B, para no romper el digest. */
export type PriceCheckFlag =
  | "none"
  | "price_high"
  | "discontinued"
  | "fuente_muerta"
  | "version_nueva"
  | "anio_nuevo";

export type CheckOutcome = "sin_cambios" | "cambios" | "descontinuado" | "fuente_caida";

/**
 * Un cambio que la revisión escribe sola en el documento publicado: los dos precios del
 * modelo (lista y con bonos/financiamiento), solo con todas las guardas de diff.ts cumplidas
 * y siempre guardando el valor anterior para poder revertir. Nunca versiones, nunca año.
 * (Hasta oct-2026 `discountPrice` era el precio negociado de Francisco y nunca se tocaba;
 * la negociación está apagada y ahora es el precio con bonos y/o financiamiento de la marca.)
 */
export interface AutoApply {
  field: "basePrice" | "discountPrice";
  /** null = no lo teniamos (la marca empezo a publicar un precio con bonos/financiamiento). */
  from: number | null;
  to: number;
  /** Por qué se consideró seguro aplicarlo — va al hallazgo y al digest. */
  reason: string;
}

export interface CheckDecision {
  outcome: CheckOutcome;
  findings: Finding[];
  /** El hallazgo más grave, resumido — lo que leen el digest y los comandos de WhatsApp. */
  flag: PriceCheckFlag;
  note?: string;
  /** Ya no se usa (la negociación está apagada): siempre undefined. */
  suggestedPrice?: number;
  /** Ocultar el auto del sitio (C7 — reversible). */
  hide: boolean;
  sourceFailStreak: number;
  /** Año nuevo en la fuente: las specs probablemente cambiaron, lo resuelve el v2. */
  needsReextract: boolean;
  /** Avisar al instante, sin esperar al digest del lunes (C16). */
  urgent: boolean;
  /** Hay algo que no estaba en los hallazgos anteriores (C12 — dedup). */
  hasNewFindings: boolean;
  /**
   * Cambios que se pueden escribir solos, si la página los confirma. Vacío = nada que aplicar.
   */
  autoApply: AutoApply[];
}
