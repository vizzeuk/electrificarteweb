import type { MetadataRoute } from "next";
import { client } from "@/lib/sanity/client";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

interface SlugRow {
  slug: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Rutas estáticas
  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/marcas`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/comparador`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/calculadora`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/solicitar`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/contacto`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ].map((e) => ({ ...e, lastModified: now }) as MetadataRoute.Sitemap[number]);

  // Rutas dinámicas desde Sanity
  const [cars, brands, vehicleTypes, electricTypes, posts, collections] = await Promise.all([
    client.fetch<SlugRow[]>(`*[_type == "car" && hidden != true && defined(slug.current)]{ "slug": slug.current }`),
    client.fetch<SlugRow[]>(`*[_type == "brand" && defined(slug.current)]{ "slug": slug.current }`),
    client.fetch<SlugRow[]>(`*[_type == "vehicleType" && defined(slug.current)]{ "slug": slug.current }`),
    client.fetch<SlugRow[]>(`*[_type == "electricType" && defined(slug.current)]{ "slug": slug.current }`),
    client.fetch<SlugRow[]>(`*[_type == "blogPost" && defined(slug.current)]{ "slug": slug.current }`),
    client.fetch<SlugRow[]>(`*[_type == "collection" && defined(slug.current)]{ "slug": slug.current }`),
  ]).catch(() => [[], [], [], [], [], []] as SlugRow[][]);

  const dynamic = (rows: SlugRow[], prefix: string, priority: number): MetadataRoute.Sitemap =>
    [...new Map(rows.map((r) => [r.slug, r])).values()].map((r) => ({
      url: `${SITE_URL}${prefix}/${r.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority,
    }));

  return [
    ...staticEntries,
    ...dynamic(cars, "/auto", 0.8),
    ...dynamic(brands, "/marcas", 0.7),
    ...dynamic(vehicleTypes, "/tipo", 0.6),
    ...dynamic(electricTypes, "/electrico", 0.6),
    ...dynamic(collections, "/coleccion", 0.6),
    ...dynamic(posts, "/blog", 0.5),
  ];
}
