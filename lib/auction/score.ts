/**
 * Motor de puntaje para la subasta inversa de vehículos.
 *
 * Ordena las ofertas (pujas) que hacen los vendedores sobre un lead pagado
 * ($19.990) en una escala normalizada [0, 1]: puntaje más alto = oferta más
 * conveniente para el comprador. Es determinista y puro (sin I/O), para poder
 * testearlo aislado y llamarlo desde n8n vía un endpoint del repo — mismo patrón
 * que price-check (la lógica vive y se testea acá; n8n solo orquesta).
 *
 * Fuente: docs/ especificación del algoritmo de subastas inversas.
 *
 * ⚠️ Discrepancia conocida en la dimensión Precio: la tabla de "comportamiento"
 * de la spec (d=5% → 0.785, d=7% → 0.957, etc.) NO coincide con la fórmula
 * sigmoide que la misma spec escribe (con -45·(d-0.05) la sigmoide da 0.5 en su
 * punto medio d=5%, que normalizada es ≈0.447, no 0.785). Acá se implementa la
 * FÓRMULA tal cual está escrita, por ser el enunciado matemático exacto. Si el
 * comportamiento deseado es el de la tabla, hay que reajustar pendiente/centro
 * de la sigmoide — ver reporte. La dimensión Regalías sí es autoconsistente
 * (fórmula y ejemplos coinciden).
 */

// ── Pesos de la ecuación maestra (suman 1.00) ──────────────────────────────
export const WEIGHTS = {
  precio: 0.4,
  version: 0.2,
  cercania: 0.15,
  flexibilidad: 0.15,
  regalias: 0.1,
} as const;

/** SLA de entrega de Electrificarte (constante de negocio, no dato del lead).
 *  Si la oferta promete entregar más allá de esto, se descalifica. 96 h = tope
 *  de la ventana publicada (78–96 h). Configurable por lead si algún día cambia. */
export const SLA_HORAS_DEFAULT = 96;

// ── Escala discreta: coincidencia de versión/equipamiento ──────────────────
export const VERSION_SCORES = {
  exacta: 1.0, // misma marca, modelo, año, trim y color
  variacion_menor: 0.85, // misma versión técnica, distinto color/tapiz
  upgrade: 0.65, // versión superior al precio cotizado
  inferior: 0.3, // menor equipamiento que el solicitado (down-trim)
  no_coincidente: 0.0, // modelo/marca distinta → knockout
} as const;
export type VersionMatch = keyof typeof VERSION_SCORES;

// ── Escala discreta: cercanía geográfica ───────────────────────────────────
export const CERCANIA_SCORES = {
  local: 1.0, // misma comuna, <15 km, o delivery 100% bonificado
  regional: 0.8, // misma región/provincia, <1 h
  vecina: 0.4, // región colindante
  distante: 0.1, // otra región distante sin delivery
} as const;
export type CercaniaZona = keyof typeof CERCANIA_SCORES;

// ── Entradas ───────────────────────────────────────────────────────────────
export interface LeadScoringInput {
  /** P_publicado: precio de lista publicado en electrificarte.com (Sanity).
   *  Es el techo: ninguna oferta puede superarlo. */
  precioPublicado: number;
  /** ¿El cliente exige financiamiento? Pagar al contado ⇒ false. */
  requiereFinanciamiento: boolean;
  /** Si requiere financiamiento, ¿es obligatorio? Si no lo es, la falta no
   *  descalifica (solo puntúa 0 en flexibilidad). Default: true. */
  financiamientoObligatorio?: boolean;
  /** Tope de entrega en horas. Default: SLA_HORAS_DEFAULT. */
  slaHorasMax?: number;
}

export interface OfferScoringInput {
  /** P_oferta: precio que ofrece el vendedor (CLP). */
  precio: number;
  /** Horas que promete el vendedor para entregar. */
  horasEntrega: number;
  version: VersionMatch;
  cercania: CercaniaZona;
  /** ¿El vendedor ofrece la vía de financiamiento requerida? */
  aceptaFinanciamiento: boolean;
  /** Valor monetario total de regalías/beneficios (CLP): mantenciones,
   *  patente, láminas, bonos de combustible, etc. */
  valorRegalias: number;
  /** ¿El oferente está verificado y activo? Default: true. */
  oferenteVerificado?: boolean;
}

// ── Resultado ──────────────────────────────────────────────────────────────
export interface ScoreDesglose {
  precio: number;
  version: number;
  cercania: number;
  flexibilidad: number;
  regalias: number;
}

export type ScoreResult =
  | { status: "DESCALIFICADA"; motivo: string }
  | {
      status: "VALIDA";
      scoreTotal: number;
      desglose: ScoreDesglose;
      /** Avisos que no descalifican pero requieren revisión humana. */
      alertas: string[];
    };

// ── Sub-puntajes ────────────────────────────────────────────────────────────

/** Precio (peso 40%): sigmoide normalizada anclada en S(0)=0.
 *  d = descuento relativo respecto al precio publicado. */
export function scorePrecio(precioPublicado: number, precioOferta: number): number {
  const d = (precioPublicado - precioOferta) / precioPublicado;
  if (d <= 0) return 0;
  const f = (x: number) => 1 / (1 + Math.exp(-45 * (x - 0.05)));
  const f0 = f(0); // ≈ 0.0953497
  return clamp01((f(d) - f0) / (1 - f0));
}

/** Regalías (peso 10%): curva exponencial de saturación. r = valor/precio. */
export function scoreRegalias(valorRegalias: number, precioPublicado: number): number {
  if (precioPublicado <= 0) return 0;
  const r = valorRegalias / precioPublicado;
  return clamp01(1 - Math.exp(-50 * r));
}

/** Flexibilidad financiera (peso 15%): dicotómica.
 *  Contado / sin necesidad de crédito ⇒ 1.0 para todas las ofertas. */
function scoreFlexibilidad(lead: LeadScoringInput, offer: OfferScoringInput): number {
  if (!lead.requiereFinanciamiento) return 1.0;
  return offer.aceptaFinanciamiento ? 1.0 : 0.0;
}

// ── Evaluación completa (knockouts + ecuación maestra) ──────────────────────
export function evaluateOffer(lead: LeadScoringInput, offer: OfferScoringInput): ScoreResult {
  const slaMax = lead.slaHorasMax ?? SLA_HORAS_DEFAULT;
  const financiamientoObligatorio = lead.financiamientoObligatorio ?? true;

  // Filtros de exclusión (orden del diagrama de descalificación).
  if (!Number.isFinite(offer.precio) || offer.precio <= 0) {
    return ko("Precio inválido o menor/igual a 0");
  }
  if (offer.precio > lead.precioPublicado) {
    return ko("La oferta supera el precio publicado");
  }
  if (offer.horasEntrega > slaMax) {
    return ko(`Plazo de entrega (${offer.horasEntrega} h) supera el SLA (${slaMax} h)`);
  }
  if (VERSION_SCORES[offer.version] === 0) {
    return ko("Modelo/versión no coincide con lo solicitado");
  }
  if (lead.requiereFinanciamiento && financiamientoObligatorio && !offer.aceptaFinanciamiento) {
    return ko("No dispone del financiamiento obligatorio que exige el lead");
  }
  if (offer.oferenteVerificado === false) {
    return ko("Oferente no verificado o suspendido en la plataforma");
  }

  const sPrecio = scorePrecio(lead.precioPublicado, offer.precio);
  const sVersion = VERSION_SCORES[offer.version];
  const sCercania = CERCANIA_SCORES[offer.cercania];
  const sFlexibilidad = scoreFlexibilidad(lead, offer);
  const sRegalias = scoreRegalias(offer.valorRegalias, lead.precioPublicado);

  const scoreTotal =
    WEIGHTS.precio * sPrecio +
    WEIGHTS.version * sVersion +
    WEIGHTS.cercania * sCercania +
    WEIGHTS.flexibilidad * sFlexibilidad +
    WEIGHTS.regalias * sRegalias;

  // Alertas de borde de la spec: no descalifican, marcan para revisión.
  const alertas: string[] = [];
  const d = (lead.precioPublicado - offer.precio) / lead.precioPublicado;
  if (d > 0.3) {
    alertas.push("Descuento atípico (>30%): posible error de tipeo, verificar antifraude.");
  }
  if (offer.valorRegalias / lead.precioPublicado > 0.15) {
    alertas.push("Regalías desproporcionadas (>15% del valor): curva saturada.");
  }

  return {
    status: "VALIDA",
    scoreTotal: round4(scoreTotal),
    desglose: {
      precio: round4(sPrecio),
      version: round4(sVersion),
      cercania: round4(sCercania),
      flexibilidad: round4(sFlexibilidad),
      regalias: round4(sRegalias),
    },
    alertas,
  };
}

/** Rankea las ofertas válidas de un lead, de mejor a peor. Descarta las
 *  descalificadas. Útil para elegir la(s) 1–2 ofertas que se le muestran al
 *  cliente. Empates se rompen por precio más bajo. */
export function rankValidOffers<T extends OfferScoringInput>(
  lead: LeadScoringInput,
  offers: T[],
): Array<{ offer: T; scoreTotal: number; desglose: ScoreDesglose; alertas: string[] }> {
  return offers
    .map((offer) => ({ offer, result: evaluateOffer(lead, offer) }))
    .filter(
      (x): x is { offer: T; result: Extract<ScoreResult, { status: "VALIDA" }> } =>
        x.result.status === "VALIDA",
    )
    .map(({ offer, result }) => ({
      offer,
      scoreTotal: result.scoreTotal,
      desglose: result.desglose,
      alertas: result.alertas,
    }))
    .sort((a, b) => b.scoreTotal - a.scoreTotal || a.offer.precio - b.offer.precio);
}

// ── Utilidades ──────────────────────────────────────────────────────────────
function ko(motivo: string): ScoreResult {
  return { status: "DESCALIFICADA", motivo };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
