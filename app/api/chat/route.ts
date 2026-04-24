import { NextRequest, NextResponse } from "next/server";
import { createClient } from "next-sanity";
import { groq } from "next-sanity";

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

  // ── Pregunta por una marca específica
  const allBrands: { name: string; slug: string }[] = await client.fetch(
    groq`*[_type == "brand" && !(_id in path("drafts.**"))] | order(name asc) { name, "slug": slug.current }`
  );

  const matchedBrand = allBrands.find((b) =>
    lastMsg.includes(b.name.toLowerCase())
  );

  if (matchedBrand) {
    const cars: CarResult[] = await client.fetch(
      groq`*[_type == "car" && !(_id in path("drafts.**")) && brand->slug.current == $slug]
        | order(coalesce(discountPrice, basePrice) asc) [0..4] {
          name, "slug": slug.current,
          "brand": brand->{ name, "slug": slug.current },
          "electricType": electricType->{ label, tag },
          basePrice, discountPrice, isHotDeal, range, power, traction, acceleration
        }`,
      { slug: matchedBrand.slug }
    );

    if (cars.length === 0) {
      return `Actualmente no tenemos modelos de **${matchedBrand.name}** disponibles en nuestro catálogo. Puedes explorar otras marcas o contactar al equipo.

[MENU]
1. Ver todas las marcas → /marcas
2. Contactar al equipo → /contacto
[/MENU]`;
    }

    const list = cars.map((c) => carCard(c)).join("\n\n");
    return `Estos son los modelos **${matchedBrand.name}** disponibles:\n\n${list}

[MENU]
1. Ver más de ${matchedBrand.name} → /marcas/${matchedBrand.slug}
2. Solicitar cotización → /solicitar
[/MENU]`;
  }

  // ── Pregunta por precio / económico
  if (/precio|barato|económico|accesible|menos de|presupuesto/.test(lastMsg)) {
    const cars: CarResult[] = await client.fetch(
      groq`*[_type == "car" && !(_id in path("drafts.**"))]
        | order(coalesce(discountPrice, basePrice) asc) [0..3] {
          name, "slug": slug.current,
          "brand": brand->{ name, "slug": slug.current },
          "electricType": electricType->{ label, tag },
          basePrice, discountPrice, isHotDeal, range, power, traction
        }`
    );

    const list = cars.map((c) => carCard(c)).join("\n\n");
    return `Las opciones más accesibles de nuestro catálogo son:\n\n${list}

[MENU]
1. Ver catálogo completo → /marcas
2. Encontrar mi modelo ideal
[/MENU]`;
  }

  // ── Pregunta por autonomía / rango
  if (/autonomía|kilómetros|km|rango|range|batería/.test(lastMsg)) {
    const cars: CarResult[] = await client.fetch(
      groq`*[_type == "car" && !(_id in path("drafts.**")) && defined(range) && range > 0]
        | order(range desc) [0..3] {
          name, "slug": slug.current,
          "brand": brand->{ name, "slug": slug.current },
          "electricType": electricType->{ label, tag },
          basePrice, discountPrice, isHotDeal, range, power, traction
        }`
    );

    const list = cars.map((c) => carCard(c)).join("\n\n");
    return `Los autos con **mayor autonomía** de nuestro catálogo son:\n\n${list}

[MENU]
1. Ver catálogo completo → /marcas
2. Encontrar mi modelo ideal
[/MENU]`;
  }

  // ── Pregunta por hot deals / ofertas
  if (/oferta|hot deal|descuento|bono|ahorro|promoción/.test(lastMsg)) {
    const cars: CarResult[] = await client.fetch(
      groq`*[_type == "car" && !(_id in path("drafts.**")) && isHotDeal == true]
        | order(coalesce(discountPrice, basePrice) asc) {
          name, "slug": slug.current,
          "brand": brand->{ name, "slug": slug.current },
          "electricType": electricType->{ label, tag },
          basePrice, discountPrice, isHotDeal, hotDealBonusAmount, range, power, traction
        }`
    );

    if (cars.length === 0) {
      return `En este momento no hay Hot Deals activos, pero podemos negociar el mejor precio para ti.

[MENU]
1. Ver catálogo completo → /marcas
2. Solicitar precio → /solicitar
[/MENU]`;
    }

    const list = cars.map((c) => carCard(c)).join("\n\n");
    return `🔥 **Hot Deals activos** — ofertas con bono garantizado:\n\n${list}

[MENU]
1. Ver catálogo completo → /marcas
2. Quiero esta oferta → /solicitar
[/MENU]`;
  }

  // ── Pregunta por SUV
  if (/suv|crossover|camioneta|pickup|sedán|sedan|hatchback/.test(lastMsg)) {
    const typeKw = /suv|crossover/.test(lastMsg) ? "suv"
      : /camioneta|pickup/.test(lastMsg) ? "pickup"
      : /sedán|sedan/.test(lastMsg) ? "sedan"
      : "hatchback";

    const slugs = VEHICLE_SLUGS[typeKw] ?? [];
    const cars: CarResult[] = await client.fetch(
      groq`*[_type == "car" && !(_id in path("drafts.**")) && vehicleType->slug.current in $slugs]
        | order(coalesce(discountPrice, basePrice) asc) [0..3] {
          name, "slug": slug.current,
          "brand": brand->{ name, "slug": slug.current },
          "electricType": electricType->{ label, tag },
          basePrice, discountPrice, isHotDeal, range, power, traction
        }`,
      { slugs }
    );

    const list = cars.map((c) => carCard(c)).join("\n\n");
    return `Opciones de **${typeKw.toUpperCase()}** disponibles:\n\n${list}

[MENU]
1. Ver catálogo completo → /marcas
2. Encontrar mi modelo ideal
[/MENU]`;
  }

  // ── Fallback con menú principal
  return `Puedo ayudarte con información sobre los autos eléctricos e híbridos de nuestro catálogo. ¿Qué te gustaría saber?

[MENU]
1. Quiero encontrar mi modelo ideal
2. Ver Hot Deals activos
3. ¿Cuánto ahorro versus bencina?
4. Quiero contactar al equipo
[/MENU]`;
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
