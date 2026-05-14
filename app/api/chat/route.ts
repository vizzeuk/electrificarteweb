import { NextRequest, NextResponse } from "next/server";
import { createClient } from "next-sanity";
import { groq } from "next-sanity";
import Anthropic from "@anthropic-ai/sdk";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-01-01",
  useCdn: true,
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface CarResult {
  name: string;
  slug: string;
  brand: { name: string; slug: string };
  vehicleType?: { label: string; slug: string };
  electricType?: { label: string; tag: string };
  basePrice: number;
  discountPrice?: number;
  isHotDeal?: boolean;
  hotDealBonusAmount?: number;
  range?: number;
  power?: number;
  batteryCapacity?: number;
  traction?: string;
  acceleration?: number;
}

// ─── Budget ranges ────────────────────────────────────────────────────────────

const BUDGET: Record<string, { min: number; max: number }> = {
  "hasta-15": { min: 0,          max: 15_000_000  },
  "15-30":    { min: 15_000_000, max: 30_000_000  },
  "30-50":    { min: 30_000_000, max: 50_000_000  },
  "mas-50":   { min: 50_000_000, max: 500_000_000 },
};

// ─── Vehicle type slug keywords ───────────────────────────────────────────────

const VEHICLE_SLUGS: Record<string, string[]> = {
  suv:      ["suv", "crossover", "suv-compacto", "suv-mediano", "suv-grande"],
  sedan:    ["sedan", "berlina"],
  hatchback:["hatchback", "city-car", "citkar"],
  pickup:   ["pickup", "camioneta"],
};

// ─── Electric type tag keywords ───────────────────────────────────────────────

const ELECTRIC_TAGS: Record<string, string[]> = {
  electric: ["BEV"],
  hybrid:   ["HEV", "PHEV", "MHEV", "REEV", "FHEV"],
  any:      [],
};

// ─── Format price ─────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString("es-CL")} CLP`;
}

// ─── Build car card text ──────────────────────────────────────────────────────

function carCard(c: CarResult): string {
  const price  = c.discountPrice && c.discountPrice < c.basePrice ? c.discountPrice : c.basePrice;
  const savings = c.isHotDeal && c.discountPrice && c.discountPrice < c.basePrice
    ? `\n🔥 HOT DEAL — Ahorra ${fmt(c.basePrice - c.discountPrice)}`
    : "";
  const specs = [
    c.range        ? `${c.range} km autonomía`        : null,
    c.power        ? `${c.power} CV`                  : null,
    c.traction     ? c.traction                       : null,
    c.acceleration ? `0–100 en ${c.acceleration}s`    : null,
  ].filter(Boolean).join(" · ");

  return `**${c.brand.name} ${c.name}** — ${fmt(price)}${savings}\n${specs}\n[Ver detalle](/auto/${c.slug})`;
}

// ─── Recommendation handler ───────────────────────────────────────────────────

async function handleRecommendation(body: {
  budget?: string;
  vehicleType?: string;
  electricType?: string;
}): Promise<string> {
  const { budget = "any", vehicleType = "any", electricType = "any" } = body;
  const range = BUDGET[budget];
  const minPrice = range?.min ?? 0;
  const maxPrice = range?.max ?? 500_000_000;

  const vehicleSlugs = VEHICLE_SLUGS[vehicleType] ?? [];
  const electricTags = ELECTRIC_TAGS[electricType] ?? [];

  const cars: CarResult[] = await client.fetch(
    groq`*[_type == "car"
      && !(_id in path("drafts.**"))
      && coalesce(discountPrice, basePrice) >= $minPrice
      && coalesce(discountPrice, basePrice) <= $maxPrice
      && ($anyVehicle || vehicleType->slug.current in $vehicleSlugs)
      && ($anyElectric || electricType->tag in $electricTags)
    ] | order(isHotDeal desc, coalesce(discountPrice, basePrice) asc) [0..3] {
      name, "slug": slug.current,
      "brand": brand->{ name, "slug": slug.current },
      "vehicleType": vehicleType->{ label, "slug": slug.current },
      "electricType": electricType->{ label, tag },
      basePrice, discountPrice, isHotDeal, hotDealBonusAmount,
      range, power, batteryCapacity, traction, acceleration
    }`,
    {
      minPrice,
      maxPrice,
      vehicleSlugs,
      electricTags,
      anyVehicle: vehicleSlugs.length === 0,
      anyElectric: electricTags.length === 0,
    }
  );

  if (cars.length === 0) {
    return `No encontré autos que coincidan exactamente con tus criterios en este momento. Te recomiendo explorar todo nuestro catálogo para encontrar opciones similares.

[MENU]
1. Ver catálogo completo → /marcas
2. Hablar con el equipo → /contacto
3. Volver al inicio
[/MENU]`;
  }

  const list = cars.map((c) => carCard(c)).join("\n\n");
  return `Encontré ${cars.length} opcion${cars.length > 1 ? "es" : ""} que se ajustan a tu búsqueda:\n\n${list}

[MENU]
1. Ver catálogo completo → /marcas
2. Quiero cotizar uno de estos → /solicitar
3. Volver al inicio
[/MENU]`;
}

// ─── Normal chat handler ──────────────────────────────────────────────────────

async function handleChat(messages: { role: string; content: string }[]): Promise<string> {
  const lastMsg = messages.at(-1)?.content?.toLowerCase() ?? "";

  // Fetch context in parallel: brands, hot deals, cheapest cars, high range cars
  const [allBrands, hotDeals, cheapCars, longRangeCars] = await Promise.all([
    client.fetch<{ name: string; slug: string }[]>(
      groq`*[_type == "brand" && !(_id in path("drafts.**"))] | order(name asc) { name, "slug": slug.current }`
    ),
    client.fetch<CarResult[]>(
      groq`*[_type == "car" && !(_id in path("drafts.**")) && isHotDeal == true]
        | order(coalesce(discountPrice, basePrice) asc) [0..5] {
          name, "slug": slug.current,
          "brand": brand->{ name, "slug": slug.current },
          "electricType": electricType->{ label, tag },
          basePrice, discountPrice, hotDealBonusAmount, range, power, traction, acceleration
        }`
    ),
    client.fetch<CarResult[]>(
      groq`*[_type == "car" && !(_id in path("drafts.**"))]
        | order(coalesce(discountPrice, basePrice) asc) [0..5] {
          name, "slug": slug.current,
          "brand": brand->{ name, "slug": slug.current },
          "electricType": electricType->{ label, tag },
          basePrice, discountPrice, isHotDeal, range, power, traction
        }`
    ),
    client.fetch<CarResult[]>(
      groq`*[_type == "car" && !(_id in path("drafts.**")) && defined(range) && range > 0]
        | order(range desc) [0..5] {
          name, "slug": slug.current,
          "brand": brand->{ name, "slug": slug.current },
          "electricType": electricType->{ label, tag },
          basePrice, discountPrice, isHotDeal, range, power, traction
        }`
    ),
  ]);

  // If a specific brand is mentioned, fetch its models
  const matchedBrand = allBrands.find((b) => lastMsg.includes(b.name.toLowerCase()));
  let brandCars: CarResult[] = [];
  if (matchedBrand) {
    brandCars = await client.fetch<CarResult[]>(
      groq`*[_type == "car" && !(_id in path("drafts.**")) && brand->slug.current == $slug]
        | order(coalesce(discountPrice, basePrice) asc) [0..6] {
          name, "slug": slug.current,
          "brand": brand->{ name, "slug": slug.current },
          "electricType": electricType->{ label, tag },
          basePrice, discountPrice, isHotDeal, range, power, traction, acceleration
        }`,
      { slug: matchedBrand.slug }
    );
  }

  function carsToText(cars: CarResult[]): string {
    return cars.map((c) => {
      const price = c.discountPrice && c.discountPrice < c.basePrice ? c.discountPrice : c.basePrice;
      const specs = [
        c.range ? `${c.range}km` : null,
        c.power ? `${c.power}CV` : null,
        c.traction ?? null,
        c.acceleration ? `0-100: ${c.acceleration}s` : null,
      ].filter(Boolean).join(", ");
      return `- ${c.brand.name} ${c.name} | ${fmt(price)}${c.isHotDeal ? " 🔥HOT" : ""} | ${specs} | /auto/${c.slug}`;
    }).join("\n");
  }

  const systemPrompt = `Eres Francisco, el asistente virtual de Electrificarte — el marketplace #1 de autos eléctricos e híbridos en Chile. Eres amable, experto y conciso.

MARCAS DISPONIBLES: ${allBrands.map((b) => b.name).join(", ")}

HOT DEALS ACTIVOS:
${hotDeals.length > 0 ? carsToText(hotDeals) : "Sin Hot Deals activos"}

AUTOS MÁS ACCESIBLES (precio ascendente):
${carsToText(cheapCars)}

MAYOR AUTONOMÍA:
${carsToText(longRangeCars)}

${matchedBrand ? `MODELOS ${matchedBrand.name.toUpperCase()}:\n${brandCars.length > 0 ? carsToText(brandCars) : "Sin modelos disponibles"}` : ""}

REGLAS:
- Responde siempre en español chileno, tono cercano
- Máximo 3-4 párrafos, sé directo
- Usa markdown: **negrita**, listas con guiones
- Incluye links clickeables: [Nombre del auto](/auto/slug) o [Ver catálogo](/marcas)
- Rutas útiles: /marcas · /solicitar · /contacto · /auto/[slug]
- Al final sugiere 2-3 acciones con links
- NUNCA inventes precios ni especificaciones fuera de los datos aquí indicados
- Si no tienes info suficiente, di "no tengo esa información en este momento" y sugiere /contacto`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "Lo siento, no pude procesar tu consulta. Intenta de nuevo.";
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let message: string;

    if (body.mode === "recommend") {
      message = await handleRecommendation(body);
    } else if (Array.isArray(body.messages)) {
      message = await handleChat(body.messages);
    } else {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    return NextResponse.json({ message });
  } catch (err) {
    console.error("[chat api]", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
