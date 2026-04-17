/**
 * Script de importación de marcas a Sanity
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/import-brands.ts
 *
 * Logos: coloca archivos PNG/JPG/SVG/WEBP en public/brand-logos/
 * con el nombre del slug de la marca. Ej: public/brand-logos/byd.png
 * El script los sube automáticamente a Sanity.
 */

import { createClient } from "@sanity/client";
import * as fs from "fs";
import * as path from "path";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN || "",
  useCdn: false,
});

const LOGOS_DIR = path.resolve(process.cwd(), "public/brand-logos");
const LOGO_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".webp"];

interface BrandData {
  slug: string;
  name: string;
  country?: string;
  foundedYear?: string;
  website?: string;
  isFeatured?: boolean;
  accentColor?: string;
  description?: string;
  heroTagline?: string;
  stats?: Array<{ label: string; value: string }>;
  videos?: Array<{
    title: string;
    videoUrl?: string;
    duration?: string;
    views?: string;
    channel?: string;
  }>;
}

function findLocalLogo(slug: string): { filePath: string; ext: string } | null {
  for (const ext of LOGO_EXTENSIONS) {
    const filePath = path.join(LOGOS_DIR, `${slug}${ext}`);
    if (fs.existsSync(filePath)) return { filePath, ext };
  }
  return null;
}

const MIME: Record<string, string> = {
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".webp": "image/webp",
};

async function uploadLocalLogo(slug: string, brandName: string): Promise<string | null> {
  const found = findLocalLogo(slug);
  if (!found) return null;

  const { filePath, ext } = found;
  const contentType = MIME[ext] ?? "image/png";
  const buffer = fs.readFileSync(filePath);

  try {
    const asset = await client.assets.upload("image", buffer, {
      filename: `${slug}-logo${ext}`,
      contentType,
    });
    console.log(`  ✓ Logo subido desde archivo local (${asset._id})`);
    return asset._id;
  } catch (err) {
    console.error(`  ✗ Error subiendo logo de ${brandName}:`, err);
    return null;
  }
}

async function importBrands() {
  const brandsPath = path.resolve(process.cwd(), "data/brands.json");

  if (!fs.existsSync(brandsPath)) {
    console.error("❌ No se encontró data/brands.json");
    process.exit(1);
  }

  // Crear carpeta de logos si no existe
  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
    console.log(`📁 Carpeta creada: public/brand-logos/`);
  }

  const brands: BrandData[] = JSON.parse(fs.readFileSync(brandsPath, "utf-8"));
  const logosEncontrados = brands.filter((b) => findLocalLogo(b.slug)).length;

  console.log(`\n📦 Importando ${brands.length} marcas...`);
  console.log(`🖼  Logos locales encontrados: ${logosEncontrados}/${brands.length}\n`);

  let created = 0;
  let updated = 0;
  let errors = 0;
  let logosSubidos = 0;

  for (const brand of brands) {
    console.log(`🚗 ${brand.name} (${brand.slug})`);

    try {
      // 1. Buscar documento existente por slug
      const existingId: string | null = await client.fetch(
        `*[_type == "brand" && slug.current == $slug][0]._id`,
        { slug: brand.slug }
      );

      // 2. Intentar subir logo local
      const logoAssetId = await uploadLocalLogo(brand.slug, brand.name);
      if (logoAssetId) logosSubidos++;

      // 3. Construir payload
      const payload: { _type: string; [key: string]: unknown } = {
        _type: "brand",
        name: brand.name,
        slug: { _type: "slug", current: brand.slug },
        ...(brand.country     && { country:     brand.country }),
        ...(brand.foundedYear && { foundedYear: brand.foundedYear }),
        ...(brand.website     && { website:     brand.website }),
        ...(brand.isFeatured !== undefined && { isFeatured: brand.isFeatured }),
        ...(brand.accentColor && { accentColor: brand.accentColor }),
        ...(brand.description && { description: brand.description }),
        ...(brand.heroTagline && { heroTagline: brand.heroTagline }),
        ...(brand.stats && brand.stats.length > 0 && {
          stats: brand.stats.map((s) => ({
            _type: "stat",
            _key:  s.label.toLowerCase().replace(/[^a-z0-9]/g, "-"),
            label: s.label,
            value: s.value,
          })),
        }),
        ...(brand.videos && brand.videos.length > 0 && {
          videos: brand.videos.map((v, i) => ({
            _type:    "video",
            _key:     `video-${i}`,
            title:    v.title,
            videoUrl: v.videoUrl,
            duration: v.duration,
            views:    v.views,
            channel:  v.channel,
          })),
        }),
        ...(logoAssetId && {
          logo: {
            _type: "image",
            asset: { _type: "reference", _ref: logoAssetId },
          },
        }),
      };

      // 4. Crear o actualizar
      if (existingId) {
        await client.patch(existingId).set(payload).commit();
        console.log(`  ✓ Actualizado`);
        updated++;
      } else {
        const doc = await client.create(payload);
        console.log(`  ✓ Creado (${doc._id})`);
        created++;
      }
    } catch (err) {
      console.error(`  ✗ Error con ${brand.name}:`, err);
      errors++;
    }
  }

  console.log(`\n✅ Importación completada`);
  console.log(`   Marcas creadas:    ${created}`);
  console.log(`   Marcas actualizadas: ${updated}`);
  console.log(`   Logos subidos:     ${logosSubidos}`);
  console.log(`   Errores:           ${errors}`);

  if (logosSubidos < brands.length) {
    console.log(`\n💡 Tip: coloca archivos PNG en public/brand-logos/{slug}.png`);
    console.log(`   y vuelve a correr el script para subir los logos restantes.`);
  }
}

importBrands().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
