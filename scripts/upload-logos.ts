/**
 * Sube los logos de public/logos_electrificarte/logos_electrificarte/
 * al campo `logo` de cada documento brand en Sanity.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/upload-logos.ts
 */

import { createClient } from "@sanity/client";
import * as fs from "fs";
import * as path from "path";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset:   process.env.NEXT_PUBLIC_SANITY_DATASET   || "production",
  apiVersion: "2024-01-01",
  token:     process.env.SANITY_API_TOKEN || "",
  useCdn:    false,
});

const LOGOS_DIR = path.resolve(process.cwd(), "public/logos");

// Nombres de archivo (sin extensión) → slug en Sanity
const FILENAME_TO_SLUG: Record<string, string> = {
  "Ora-Logo-Grid-Web-Res-PNG": "ora",
  "DEEPAL":               "deepal",
  "DFSK-Logo":            "dfsk",
  "Jaecoo_wordmark.svg":  "jaecoo",   // archivo .svg.png: ext=.png, basename=Jaecoo_wordmark.svg
  "Jetour_logo":          "jetour",
  "Omoda_wordmark.svg":   "omoda",    // archivo .svg.png
  "lynk-and-co":          "lynk-co",
};

async function main() {
  const files = fs.readdirSync(LOGOS_DIR).filter((f) =>
    /\.(png|jpg|jpeg|svg|webp)$/i.test(f)
  );

  console.log(`\n🖼  ${files.length} logos encontrados en ${LOGOS_DIR}\n`);

  let ok = 0, skipped = 0, errors = 0;

  for (const file of files) {
    const ext      = path.extname(file).toLowerCase();
    const basename = path.basename(file, ext);
    const slug     = FILENAME_TO_SLUG[basename] ?? basename;

    // Buscar brand por slug
    const brandId: string | null = await client.fetch(
      `*[_type == "brand" && slug.current == $slug][0]._id`,
      { slug }
    );

    if (!brandId) {
      console.log(`  ⚠  Sin marca en Sanity para slug "${slug}" (archivo: ${file})`);
      skipped++;
      continue;
    }

    try {
      const filePath    = path.join(LOGOS_DIR, file);
      const buffer      = fs.readFileSync(filePath);
      const contentType = ext === ".svg" ? "image/svg+xml"
                        : ext === ".webp" ? "image/webp"
                        : ext === ".png"  ? "image/png"
                        : "image/jpeg";

      // Subir asset
      const asset = await client.assets.upload("image", buffer, {
        filename:    `${slug}-logo${ext}`,
        contentType,
      });

      // Parchear brand con el logo
      await client.patch(brandId).set({
        logo: {
          _type: "image",
          asset: { _type: "reference", _ref: asset._id },
        },
      }).commit();

      console.log(`  ✓  ${slug} → asset ${asset._id}`);
      ok++;
    } catch (err) {
      console.error(`  ✗  Error con ${file}:`, err);
      errors++;
    }
  }

  console.log(`\n✅ Completado`);
  console.log(`   Subidos:  ${ok}`);
  console.log(`   Sin marca: ${skipped}`);
  console.log(`   Errores:  ${errors}`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
