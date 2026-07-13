// ─── Prompt injection detection ───────────────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  // ── Inglés ──────────────────────────────────────────────────────────────────
  /ignore\s+(?:(?:all|previous|your|the|above|prior)\s+)*(instructions?|rules?|system|prompt)/i,
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
  // ── Español ─────────────────────────────────────────────────────────────────
  /ignora\s+(?:(?:todas?|las|los|tus|el|anteriores?|previas?|previos?)\s+)*(instrucci|reglas?|sistema|prompt)/i,
  /(olvida(?:te)?|descarta|anula|sobre?scribe|reemplaza)\s+(todo|todas?|tus|las|los|el|anterior|previo|instrucci|reglas?)/i,
  /(act[úu]a|comp[óo]rtate|finge|haz\s+de\s+cuenta|imagina)\s+(como|que)\s+(si\s+)?(eres|fueras|un|una)/i,
  /(ahora\s+eres|eres\s+ahora|ser[áa]s)\s+(un[oa]?\s+)?(asistente|bot|ia|modelo|hacker|pirata|experto)/i,
  /modo\s+(desarrollador|dios|sin\s+restricciones|libre)/i,
  /nuev[oa]\s+(prompt|instrucci[óo]n|sistema)\s*(del\s+sistema)?\s*:/i,
  // ── Exfiltración del prompt / instrucciones (EN + ES) ───────────────────────
  /(reveal|show|repeat|print|display|leak|expose)\s+(me\s+)?(your|the|my)?\s*(system\s+|initial\s+)?(prompt|instructions?|guidelines?|rules?)/i,
  /(dime|mu[ée]strame|repite|imprime|revela|comparte|dame)\s+(me\s+)?(tu|el|tus|las|mis)?\s*(prompt|instrucci|reglas?|configuraci|system\s*prompt)/i,
  /(what|cu[áa]l(?:es)?)\s+(are|is|son|es)\s+(your|tus|las)\s+(system\s+)?(prompt|instructions?|instrucci|reglas?)/i,
  /repeat\s+(the\s+)?(text|words|everything)\s+(above|before)/i,
  // ── Inyección de roles de chat ──────────────────────────────────────────────
  /(^|\n)\s*(system|assistant|developer|usuario|sistema|asistente)\s*:/i,
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
  "batería", "bateria", "autonomía", "autonomia",
  "carga", "motor", "potencia",
  "aceleración", "aceleracion", "0-100",
  "precio", "costo", "valor", "millones",
  "financiamiento", "leasing", "cuota", "crédito",
  "concesionario", "electrificarte", "modelo", "marca",
  "tesla", "byd", "volvo", "bmw", "audi",
  "mercedes", "nissan", "toyota", "hyundai",
  "peugeot", "renault", "chery",
  "sedán", "sedan", "hatchback", "pickup", "camioneta",
  "comprar", "cotizar", "solicitar", "comparar",
  "ahorro", "bencina", "combustible", "gasolina",
  "carga rápida", "wallbox", "enchufe", "rango",
  "supercharger", "kilometraje", "consumo",
  "asesoría", "asesoria", "recomienda", "recomendar",
];

// Tokens cortos/ambiguos que solo cuentan como relevantes si aparecen como
// palabra completa (evita que "ahora"→"ora", "evento"→"ev" o "llevar"→"ev"
// desactiven el filtro off-topic por un falso positivo de relevancia).
const RELEVANT_TOKENS = [
  "ev", "bev", "phev", "hev", "mhev", "erev",
  "km", "kwh", "suv", "mg", "kia", "gac", "jac", "ora", "ayuda",
];
const RELEVANT_TOKEN_RE = new RegExp(`\\b(${RELEVANT_TOKENS.join("|")})\\b`, "i");

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
  const hasRelevant =
    RELEVANT_KEYWORDS.some((k) => lower.includes(k)) || RELEVANT_TOKEN_RE.test(lower);
  if (hasRelevant) return false;

  return OFFTOPIC_KEYWORDS.some((k) => lower.includes(k));
}

export const OFFTOPIC_RESPONSE =
  "Soy Francisco, especialista en autos eléctricos e híbridos en Chile 🔋. ¿Puedo ayudarte a encontrar tu próximo auto o resolver alguna duda sobre movilidad eléctrica?";

// ─── Detección de fuga del system prompt (output-side) ────────────────────────
// Complementa detectInjection (input-side, regex): si una inyección evade el
// filtro de entrada, este guard atrapa señales de que la respuesta está filtrando
// instrucciones internas o nombres de herramientas que NUNCA deben verse en un
// mensaje al usuario.

const LEAK_MARKERS: RegExp[] = [
  // Nombres de tools internas — jamás deben aparecer en texto al usuario
  /\bsearch_vehicles\b/i,
  /\bget_vehicle_detail\b/i,
  /\bsearch_knowledge\b/i,
  // Encabezados textuales de los system prompts
  /##\s*(Reglas innegociables|Diagn[óo]stico estructurado|Casos de referencia|C[óo]mo trabajas|Qui[ée]n eres|Formato WhatsApp|Producto principal|Tu rol en este contexto|Qu[ée] puedes y no puedes hacer)/i,
  /\b(BASE_SYSTEM|OFERTA_SYSTEM)\b/,
  /Conocimiento base de Electrificarte/i,
  // Pedidos meta que solo tendrían sentido si se filtró el prompt
  /(mi|el)\s+(system\s*prompt|prompt\s+del\s+sistema|instrucciones\s+del\s+sistema)/i,
];

/** True si la respuesta del modelo parece filtrar el system prompt o tools internas. */
export function containsSystemLeak(text: string): boolean {
  return LEAK_MARKERS.some((p) => p.test(text));
}

// Respuesta segura de reemplazo si se detecta fuga.
export const LEAK_SAFE_RESPONSE =
  "¿En qué te puedo ayudar con tu próximo auto eléctrico? Cuéntame qué buscas y te oriento.";
