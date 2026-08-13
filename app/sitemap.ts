import type { MetadataRoute } from "next";
import { client } from "@/lib/sanity/client";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

interface SlugRow {
  slug: string;
  /** Fecha real de última edición en Sanity — ver nota sobre lastModified abajo. */
  updatedAt?: string;
}

/** Rutas estáticas. No se listan las de post-pago (ver app/robots.ts). */
const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "",                     changeFrequency: "daily",   priority: 1.0 },
  { path: "/marcas",              changeFrequency: "weekly",  priority: 0.9 },
  { path: "/solicitar",           changeFrequency: "monthly", priority: 0.8 },
  { path: "/asesoria",            changeFrequency: "monthly", priority: 0.8 },
  { path: "/asesoria/contratar",  changeFrequency: "monthly", priority: 0.7 },
  { path: "/comparador",          changeFrequency: "monthly", priority: 0.7 },
  { path: "/calculadora",         changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog",                changeFrequency: "weekly",  priority: 0.7 },
  { path: "/negociacion",         changeFrequency: "monthly", priority: 0.6 },
  { path: "/nosotros",            changeFrequency: "monthly", priority: 0.5 },
  { path: "/contacto",            changeFrequency: "yearly",  priority: 0.5 },
  { path: "/terminos",            changeFrequency: "yearly",  priority: 0.3 },
  { path: "/privacidad",          changeFrequency: "yearly",  priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // `_updatedAt` real por documento. Antes se mandaba la fecha de HOY en todas las URLs:
  // eso le dice a Google que el sitio entero cambió en cada rastreo, y cuando comprueba que
  // no es cierto deja de confiar en el campo — justo lo contrario de lo que se busca. Con la
  // fecha real, un auto con precio nuevo se re-rastrea rápido y el resto no compite por
  // presupuesto de rastreo.
  const q = (type: string) =>
    `*[_type == "${type}" && defined(slug.current)]{ "slug": slug.current, "updatedAt": _updatedAt }`;

  const [cars, brands, vehicleTypes, electricTypes, posts, collections] = await Promise.all([
    // hidden != true incluye los que no tienen el campo (= visibles); los ocultos quedan fuera.
    client.fetch<SlugRow[]>(
      `*[_type == "car" && hidden != true && defined(slug.current)]{ "slug": slug.current, "updatedAt": _updatedAt }`
    ),
    client.fetch<SlugRow[]>(q("brand")),
    client.fetch<SlugRow[]>(q("vehicleType")),
    client.fetch<SlugRow[]>(q("electricType")),
    client.fetch<SlugRow[]>(q("blogPost")),
    client.fetch<SlugRow[]>(q("collection")),
  ]).catch((err) => {
    // Un sitemap parcial (solo estáticas) es mejor que un 500: Google reintenta y mientras
    // tanto conserva lo que ya indexó.
    console.error("[sitemap] Sanity falló, se devuelven solo las rutas estáticas:", err);
    return [[], [], [], [], [], []] as SlugRow[][];
  });

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const dynamic = (
    rows: SlugRow[],
    prefix: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
  ): MetadataRoute.Sitemap =>
    [...new Map(rows.map((r) => [r.slug, r])).values()].map((r) => ({
      url: `${SITE_URL}${prefix}/${r.slug}`,
      lastModified: r.updatedAt ? new Date(r.updatedAt) : now,
      changeFrequency,
      priority,
    }));

  return [
    ...staticEntries,
    ...dynamic(cars, "/auto", 0.8),
    ...dynamic(brands, "/marcas", 0.7),
    ...dynamic(vehicleTypes, "/tipo", 0.6, "monthly"),
    ...dynamic(electricTypes, "/electrico", 0.6, "monthly"),
    ...dynamic(collections, "/coleccion", 0.6, "monthly"),
    ...dynamic(posts, "/blog", 0.5, "monthly"),
  ];
}
