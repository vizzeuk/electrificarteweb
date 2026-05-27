// ─── Prompt injection detection ───────────────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|previous\s+|your\s+|the\s+|above\s+)?(instructions?|rules?|system|prompt)/i,
  /(forget|disregard|override)\s+(everything|all|your|the|above|prior|previous)/i,
  /you\s+are\s+now\s+(?!available|online)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(if\s+you\s+are|a\b|an\b)/i,
  /\[\[[\s\S]{0,300}\]\]/,
  /jailbreak/i,
  /developer\s+mode/i,
  /unrestricted\s+mode/i,
  /\bDAN\b/,
  /new\s+(system\s+)?prompt\s*:/i,
  /<!--[\s\S]{0,500}-->/,
];

export function detectInjection(content: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(content));
}

// Respuesta genérica que no confirma ni niega la detección
export const INJECTION_RESPONSE =
  "Lo siento, no puedo procesar esa solicitud. ¿En qué te puedo ayudar con tu próximo auto eléctrico?";

// ─── Off-topic filter ─────────────────────────────────────────────────────────

const RELEVANT_KEYWORDS = [
  "auto", "carro", "vehículo", "vehiculo",
  "eléctrico", "electrico", "híbrido", "hibrido",
  "ev", "bev", "phev", "hev", "mhev", "erev",
  "batería", "bateria", "autonomía", "autonomia",
  "carga", "kwh", "motor", "potencia",
  "aceleración", "aceleracion", "0-100", "km",
  "precio", "costo", "valor", "millones",
  "financiamiento", "leasing", "cuota", "crédito",
  "concesionario", "electrificarte", "modelo", "marca",
  "tesla", "byd", "mg", "volvo", "bmw", "audi",
  "mercedes", "nissan", "toyota", "hyundai", "kia",
  "peugeot", "renault", "chery", "gac", "jac", "ora",
  "suv", "sedán", "sedan", "hatchback", "pickup", "camioneta",
  "comprar", "cotizar", "solicitar", "comparar",
  "ahorro", "bencina", "combustible", "gasolina",
  "carga rápida", "wallbox", "enchufe", "rango",
  "supercharger", "kilometraje", "consumo",
  "asesoría", "asesoria", "ayuda", "recomienda", "recomendar",
];

const OFFTOPIC_KEYWORDS = [
  "receta", "ingrediente", "cocinar", "gastronomía",
  "política", "presidente", "congreso", "elección", "partido político",
  "fútbol", "deporte", "gol", "jugador",
  "enfermedad", "síntoma", "diagnóstico", "medicina", "hospital",
  "programar", "código", "javascript", "python", "java", "sql",
  "matemática", "ecuación", "álgebra", "cálculo",
  "historia", "guerra mundial", "siglo xix",
  "chiste", "broma",
  "religión", "dios", "iglesia",
  "astrología", "horóscopo",
];

const MIN_CONTENT_LENGTH = 15;

/**
 * Retorna true si el mensaje claramente no tiene relación con autos eléctricos.
 * Conservador: mensajes cortos o ambiguos no se bloquean.
 */
export function isOffTopic(content: string): boolean {
  if (content.length < MIN_CONTENT_LENGTH) return false;

  const lower = content.toLowerCase();
  const hasRelevant = RELEVANT_KEYWORDS.some((k) => lower.includes(k));
  if (hasRelevant) return false;

  return OFFTOPIC_KEYWORDS.some((k) => lower.includes(k));
}

export const OFFTOPIC_RESPONSE =
  "Soy Francisco, especialista en autos eléctricos e híbridos en Chile 🔋. ¿Puedo ayudarte a encontrar tu próximo auto o resolver alguna duda sobre movilidad eléctrica?";
