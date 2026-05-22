import { SITE_URL, SITE_NAME } from "@/lib/seo";

interface CarSchemaInput {
  name: string;
  brand: string;
  brandSlug: string;
  slug: string;
  description?: string;
  image?: string;
  basePrice?: number | null;
  discountPrice?: number | null;
  range?: number | null;
  battery?: number | null;
  power?: number | null;
  seats?: number | null;
  electricTypeTag?: string | null;
}

const fuelType = (tag?: string | null) => {
  const t = (tag ?? "").toUpperCase();
  if (t === "EV" || t === "BEV") return "Electric";
  if (t) return "Hybrid Electric";
  return undefined;
};

/**
 * Datos estructurados de la PDP de un auto: schema Car (con Offer si hay
 * precio) + BreadcrumbList. Habilita rich results en Google y hace que la
 * ficha sea citable por motores generativos (ChatGPT, Perplexity, AI Overviews).
 */
export function CarStructuredData(props: CarSchemaInput) {
  const { name, brand, brandSlug, slug, description, image } = props;
  const url = `${SITE_URL}/auto/${slug}`;
  const fullName = `${brand} ${name}`.trim();
  const price = props.discountPrice || props.basePrice;

  const specs: { "@type": "PropertyValue"; name: string; value: string }[] = [];
  if (props.range)   specs.push({ "@type": "PropertyValue", name: "Autonomía", value: `${props.range} km` });
  if (props.battery) specs.push({ "@type": "PropertyValue", name: "Batería", value: `${props.battery} kWh` });
  if (props.power)   specs.push({ "@type": "PropertyValue", name: "Potencia", value: `${props.power} CV` });

  const carSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: fullName,
    description: description || `${fullName} disponible en Chile a través de Electrificarte.`,
    brand: { "@type": "Brand", name: brand },
    url,
    ...(image ? { image } : {}),
    ...(fuelType(props.electricTypeTag) ? { fuelType: fuelType(props.electricTypeTag) } : {}),
    ...(props.seats ? { vehicleSeatingCapacity: props.seats } : {}),
    ...(specs.length ? { additionalProperty: specs } : {}),
    ...(price
      ? {
          offers: {
            "@type": "Offer",
            price: String(price),
            priceCurrency: "CLP",
            availability: "https://schema.org/InStock",
            url,
            seller: { "@type": "Organization", name: SITE_NAME },
          },
        }
      : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: brand, item: `${SITE_URL}/marcas/${brandSlug}` },
      { "@type": "ListItem", position: 3, name: fullName, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(carSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
