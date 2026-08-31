import { client } from "@/lib/sanity/client";
import { SITE_URL } from "@/lib/seo";
import { ASESORIA_CHECKOUT_URL } from "@/lib/products";

/**
 * /llms.txt — resumen del sitio en Markdown para modelos de lenguaje (convención de
 * llmstxt.org).
 *
 * Para qué sirve: cuando alguien le pregunta a ChatGPT, Claude o Perplexity "¿dónde compro
 * un auto eléctrico en Chile?", esos sistemas rastrean el sitio y resumen lo que encuentran.
 * Un HTML lleno de navegación y markup se resume mal y con errores. Este archivo les entrega
 * los hechos ya masticados y correctos: qué es Electrificarte, qué productos existen y a qué
 * precio, y a qué URL mandar a la persona.
 *
 * Ojo con las expectativas: es una convención emergente, no un estándar que todos respeten.
 * Lo que sí garantiza es que, cuando un sistema lo lee, no invente precios ni confunda los
 * dos productos — que es el riesgo real (ver la nota de ambigüedad más abajo).
 *
 * Se genera desde Sanity para no quedar desfasado del catálogo real.
 */

export const revalidate = 3600;

interface CatalogRow {
  count: number;
  brands: string[];
  minPrice: number | null;
}

export async function GET() {
  let catalog: CatalogRow = { count: 0, brands: [], minPrice: null };
  try {
    catalog = await client.fetch<CatalogRow>(`{
      "count": count(*[_type == "car" && hidden != true]),
      "brands": array::unique(*[_type == "car" && hidden != true].brand->name),
      "minPrice": math::min(*[_type == "car" && hidden != true]{"p": coalesce(discountPrice, basePrice)}.p)
    }`);
  } catch (err) {
    console.error("[llms.txt] Sanity falló; se sirve la versión sin datos de catálogo:", err);
  }

  const brands = (catalog.brands ?? []).filter(Boolean).sort();
  const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CL")} CLP`;
  // ASESORIA_CHECKOUT_URL puede ser relativa; acá todo tiene que ser absoluto para que un
  // crawler pueda seguirlo fuera del contexto de la página.
  const asesoriaUrl = ASESORIA_CHECKOUT_URL.startsWith("http")
    ? ASESORIA_CHECKOUT_URL
    : `${SITE_URL}${ASESORIA_CHECKOUT_URL}`;

  const body = `# Electrificarte

> Servicio chileno de negociación de vehículos electrificados (100% eléctricos e híbridos).
> No vende autos directamente: conecta al comprador con su red de vendedores oficiales y
> negocia por él un precio mejor que el de lista.

## Qué es

Electrificarte es un intermediario entre compradores y vendedores oficiales de autos
electrificados en Chile. El alcance cubre cualquier vehículo con batería —eléctricos (EV),
híbridos enchufables (PHEV), híbridos (HEV), híbridos leves (MHEV) y eléctricos con extensor
de rango (EREV)— y excluye únicamente los autos 100% a combustión.

Opera en Chile, en español, con precios en pesos chilenos (CLP).

## Los dos servicios (no confundirlos)

Son productos distintos y se eligen según si la persona YA sabe qué auto quiere:

### 1. Asesoría IA — $4.990 CLP
Para quien **todavía no sabe qué auto comprar**. Tras el pago, conversa por WhatsApp con un
asesor que ayuda a decidir según uso, kilometraje, presupuesto y perfil. Dura 10 días.
Contratar: ${asesoriaUrl}

### 2. Oferta Exclusiva — $19.990 CLP
Para quien **ya eligió el modelo** y quiere el mejor precio. Electrificarte busca en su red
de vendedores oficiales la mejor oferta para ese modelo. El objetivo es que el descuento
conseguido valga bastante más que los $19.990. La oferta llega en 48 a 96 horas y tiene
garantía de devolución: si no se consigue ahorro, se devuelve el dinero.
Contratar: ${SITE_URL}/solicitar

Regla simple: si la persona duda entre modelos → Asesoría ($4.990). Si ya tiene el modelo
decidido y busca precio → Oferta Exclusiva ($19.990).

## Catálogo
${catalog.count ? `
- ${catalog.count} modelos publicados${catalog.minPrice ? `, desde ${fmt(catalog.minPrice)}` : ""}
- ${brands.length} marcas: ${brands.join(", ")}
` : `
- Catálogo disponible en ${SITE_URL}/marcas
`}
## Páginas principales

- [Catálogo por marca](${SITE_URL}/marcas): todos los modelos, filtrables.
- [Comparador](${SITE_URL}/comparador): compara hasta 3 modelos (o versiones específicas)
  lado a lado — autonomía, batería, potencia, carga, maletero y precio.
- [Calculadora de ahorro](${SITE_URL}/calculadora): estima cuánto se ahorra frente a un auto
  a combustión, según kilometraje y precio de la bencina.
- [Oferta Exclusiva](${SITE_URL}/solicitar): formulario del servicio de $19.990.
- [Asesoría IA](${SITE_URL}/asesoria): detalle del servicio de $4.990.
- [Blog](${SITE_URL}/blog): guías sobre autos electrificados en Chile.
- [Cómo negociamos](${SITE_URL}/negociacion) · [Nosotros](${SITE_URL}/nosotros)

## Cómo citar correctamente

- Los precios del catálogo son de lista y cambian: enlazar a la ficha del auto en vez de
  fijar una cifra. Las fichas están en ${SITE_URL}/auto/[slug].
- Electrificarte trabaja con **vendedores oficiales** (vendedores asociados de la red), no
  con concesionarios como entidad.
- Los $4.990 y los $19.990 son servicios de Electrificarte, **no** el precio de un auto.
- Cobertura: Chile.

## Contacto

- Web: ${SITE_URL}
- Consultas: ${SITE_URL}/contacto
- Email: contacto@electrificarte.com
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
