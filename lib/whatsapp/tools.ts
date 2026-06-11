import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "next-sanity";
import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/chat/fetch-with-timeout";

// ─── Cliente Sanity (lectura pública, mismo patrón que el chat web) ───────────

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-01-01",
  useCdn: true,
});

const PDP_BASE = "https://electrificarte.com/auto/";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CarRow {
  id: string;
  name: string;
  slug: string;
  brand: string;
  drivetrainType?: string;
  vehicleType?: string;
  basePrice: number;
  discountPrice?: number;
  range?: number;
  electricRangeKm?: number;
  power?: number;
  batteryCapacity?: number;
  traction?: string;
  acceleration?: number;
  tagline?: string;
}

function effectivePrice(c: { basePrice: number; discountPrice?: number }): number {
  return c.discountPrice && c.discountPrice < c.basePrice ? c.discountPrice : c.basePrice;
}

function fmtCLP(n: number): string {
  return `$${Math.round(n).toLocaleString("es-CL")} CLP`;
}

/** Resultado de una ejecución de tool: salida para el modelo + slugs/precios reales para validar la respuesta final. */
export interface ToolRun {
  output: unknown;
  slugs: string[];
  prices: number[];
}

// ─── Mapeo de tipo de electrificación ─────────────────────────────────────────

const DRIVETRAIN_ALIASES: Record<string, string> = {
  EV: "EV", BEV: "EV",
  PHEV: "PHEV",
  HEV: "HEV",
  EREV: "EREV", REEV: "EREV",
  MHEV: "MHEV",
};

function normalizeDrivetrain(raw?: string): string | null {
  if (!raw) return null;
  return DRIVETRAIN_ALIASES[raw.toUpperCase()] ?? null;
}

// ─── Definiciones de tools (las ve Claude) ────────────────────────────────────

export const advisorTools: Anthropic.Tool[] = [
  {
    name: "search_vehicles",
    description:
      "Busca autos publicados en el catálogo real de Electrificarte según los criterios del usuario. Úsala cuando tengas al menos una idea del uso y/o presupuesto. SOLO devuelve autos que existen en el sitio. Máximo 5 resultados.",
    input_schema: {
      type: "object",
      properties: {
        drivetrainType: {
          type: "string",
          enum: ["EV", "PHEV", "HEV", "EREV", "MHEV"],
          description:
            "Tipo de electrificación: EV=eléctrico puro, PHEV=híbrido enchufable, HEV=híbrido clásico, EREV=autonomía extendida, MHEV=micro-híbrido. Omitir si el usuario no tiene preferencia.",
        },
        maxPrice: {
          type: "number",
          description: "Precio máximo en CLP (entero, ej: 25000000). Omitir si no mencionó presupuesto.",
        },
        minRange: {
          type: "number",
          description: "Autonomía WLTP mínima en km. Relevante sobre todo para EV.",
        },
        brand: {
          type: "string",
          description: "Marca específica solo si el usuario la mencionó (ej: BYD, Volvo).",
        },
        limit: { type: "number", description: "Número de resultados. Default 3, máximo 5." },
      },
    },
  },
  {
    name: "get_vehicle_detail",
    description:
      "Obtiene la ficha completa de un auto específico (batería, carga, autonomía, seguridad, versiones) cuando el usuario quiere profundizar en un modelo. Usa el slug obtenido de search_vehicles.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Slug del auto (campo 'slug' de search_vehicles)." },
      },
      required: ["slug"],
    },
  },
  {
    name: "search_knowledge",
    description:
      "Consulta la base de conocimiento experta de Electrificarte sobre temas generales de movilidad eléctrica (carga, baterías, autonomía, mitos, garantías, incentivos). Úsala para responder dudas conceptuales con información verificada del sitio, no de tu memoria.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Tema o pregunta del usuario sobre EVs en general." },
      },
      required: ["query"],
    },
  },
];

// ─── search_vehicles ──────────────────────────────────────────────────────────

const CAR_PROJECTION = groq`{
  "id": _id,
  name,
  "slug": slug.current,
  "brand": brand->name,
  "drivetrainType": electricType->tag,
  "vehicleType": vehicleType->label,
  basePrice, discountPrice, range, electricRangeKm,
  power, batteryCapacity, traction, acceleration, tagline
}`;

async function searchVehicles(input: Record<string, unknown>): Promise<ToolRun> {
  const tag = normalizeDrivetrain(typeof input.drivetrainType === "string" ? input.drivetrainType : undefined);
  const maxPrice = typeof input.maxPrice === "number" && input.maxPrice > 0 ? input.maxPrice : null;
  const minRange = typeof input.minRange === "number" && input.minRange > 0 ? input.minRange : null;
  const brand = typeof input.brand === "string" && input.brand.trim() ? input.brand.trim() : null;
  const limit = Math.min(Math.max(typeof input.limit === "number" ? input.limit : 3, 1), 5);

  const cars = await sanityFetch(
    () =>
      sanity.fetch<CarRow[]>(
        groq`*[_type == "car"
          && hidden != true
          && !(_id in path("drafts.**"))
          && (!defined($dtype) || electricType->tag == $dtype)
          && (!defined($maxPrice) || coalesce(discountPrice, basePrice) <= $maxPrice)
          && (!defined($minRange) || range >= $minRange)
          && (!defined($brand) || brand->name match ($brand + "*"))
        ] | order(coalesce(discountPrice, basePrice) asc) [0...$limit] ${CAR_PROJECTION}`,
        { dtype: tag, maxPrice, minRange, brand, limit },
      ),
    [] as CarRow[],
  );

  const results = cars.map((c) => {
    const price = effectivePrice(c);
    return {
      slug: c.slug,
      brand: c.brand,
      model: c.name,
      drivetrainType: c.drivetrainType,
      vehicleType: c.vehicleType,
      price,
      priceFormatted: fmtCLP(price),
      hasDiscount: !!(c.discountPrice && c.discountPrice < c.basePrice),
      range: c.range,
      electricRangeKm: c.electricRangeKm,
      power: c.power,
      tagline: c.tagline,
      pdpUrl: PDP_BASE + c.slug,
    };
  });

  return {
    output: { results, totalFound: results.length },
    slugs: cars.map((c) => c.slug).filter(Boolean),
    prices: cars.map(effectivePrice).filter((p) => p > 0),
  };
}

// ─── get_vehicle_detail ───────────────────────────────────────────────────────

interface CarDetail extends CarRow {
  motorDescription?: string;
  transmission?: string;
  topSpeed?: number;
  seats?: number;
  warranty?: string;
  connectorType?: string;
  maxDCChargingPower?: number;
  chargeTimeDC?: string;
  chargeTimeAC?: string;
  euroNcap?: number;
  safetyFeatures?: string[];
  techFeatures?: string[];
  comfortFeatures?: string[];
  description?: string;
}

async function getVehicleDetail(input: Record<string, unknown>): Promise<ToolRun> {
  const slug = typeof input.slug === "string" ? input.slug.trim() : "";
  if (!slug) return { output: { error: "missing_slug" }, slugs: [], prices: [] };

  const car = await sanityFetch(
    () =>
      sanity.fetch<CarDetail | null>(
        groq`*[_type == "car" && hidden != true && !(_id in path("drafts.**")) && slug.current == $slug][0]{
          "id": _id, name, "slug": slug.current,
          "brand": brand->name,
          "drivetrainType": electricType->tag,
          "vehicleType": vehicleType->label,
          basePrice, discountPrice, range, electricRangeKm,
          power, batteryCapacity, traction, acceleration, tagline,
          motorDescription, transmission, topSpeed, seats, warranty,
          connectorType, maxDCChargingPower, chargeTimeDC, chargeTimeAC,
          euroNcap, safetyFeatures, techFeatures, comfortFeatures, description
        }`,
        { slug },
      ),
    null,
  );

  if (!car) return { output: { error: "not_found", slug }, slugs: [], prices: [] };

  const price = effectivePrice(car);
  return {
    output: {
      slug: car.slug,
      brand: car.brand,
      model: car.name,
      drivetrainType: car.drivetrainType,
      vehicleType: car.vehicleType,
      price,
      priceFormatted: fmtCLP(price),
      hasDiscount: !!(car.discountPrice && car.discountPrice < car.basePrice),
      range: car.range,
      electricRangeKm: car.electricRangeKm,
      power: car.power,
      batteryCapacity: car.batteryCapacity,
      motorDescription: car.motorDescription,
      transmission: car.transmission,
      traction: car.traction,
      acceleration: car.acceleration,
      topSpeed: car.topSpeed,
      seats: car.seats,
      warranty: car.warranty,
      connectorType: car.connectorType,
      maxDCChargingPower: car.maxDCChargingPower,
      chargeTimeDC: car.chargeTimeDC,
      chargeTimeAC: car.chargeTimeAC,
      euroNcap: car.euroNcap,
      safetyFeatures: car.safetyFeatures,
      techFeatures: car.techFeatures,
      comfortFeatures: car.comfortFeatures,
      description: car.description,
      pdpUrl: PDP_BASE + car.slug,
    },
    slugs: [car.slug],
    prices: price > 0 ? [price] : [],
  };
}

// ─── Base de conocimiento (advisorKnowledge) ──────────────────────────────────

interface KnowledgeDoc {
  title: string;
  topic?: string;
  content: string;
  keywords?: string[];
  priority?: number;
  alwaysInclude?: boolean;
}

let _knowledgeCache: { data: KnowledgeDoc[]; expiresAt: number } | null = null;

async function getKnowledge(): Promise<KnowledgeDoc[]> {
  if (_knowledgeCache && Date.now() < _knowledgeCache.expiresAt) return _knowledgeCache.data;
  const data = await sanityFetch(
    () =>
      sanity.fetch<KnowledgeDoc[]>(
        groq`*[_type == "advisorKnowledge" && published == true && !(_id in path("drafts.**"))]{
          title, topic, content, keywords, priority, alwaysInclude
        }`,
      ),
    [] as KnowledgeDoc[],
  );
  _knowledgeCache = { data, expiresAt: Date.now() + 5 * 60 * 1000 };
  return data;
}

/** Conocimiento marcado "incluir siempre", para inyectar en el system prompt. */
export async function getCoreKnowledge(): Promise<string> {
  const docs = await getKnowledge();
  const core = docs
    .filter((d) => d.alwaysInclude)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  if (core.length === 0) return "";
  return core.map((d) => `### ${d.title}\n${d.content}`).join("\n\n");
}

async function searchKnowledge(input: Record<string, unknown>): Promise<ToolRun> {
  const query = (typeof input.query === "string" ? input.query : "").toLowerCase();
  const docs = await getKnowledge();

  const scored = docs
    .map((d) => {
      const haystack = [d.title, d.topic, ...(d.keywords ?? [])].join(" ").toLowerCase();
      const terms = query.split(/\s+/).filter((t) => t.length > 2);
      let score = (d.priority ?? 0) * 0.5;
      for (const t of terms) if (haystack.includes(t)) score += 1;
      // bonus si alguna keyword aparece textual en la query
      for (const k of d.keywords ?? []) if (query.includes(k.toLowerCase())) score += 1;
      return { d, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    output: {
      results: scored.map(({ d }) => ({ title: d.title, topic: d.topic, content: d.content })),
      found: scored.length,
    },
    slugs: [],
    prices: [],
  };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function runTool(name: string, input: Record<string, unknown>): Promise<ToolRun> {
  switch (name) {
    case "search_vehicles":   return searchVehicles(input);
    case "get_vehicle_detail":return getVehicleDetail(input);
    case "search_knowledge":  return searchKnowledge(input);
    default:                  return { output: { error: `unknown_tool:${name}` }, slugs: [], prices: [] };
  }
}
