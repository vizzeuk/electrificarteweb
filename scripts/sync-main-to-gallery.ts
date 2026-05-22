/**
 * Agrega la foto de portada (mainImage) como primera foto de la galería,
 * en TODOS los autos que aún no la tengan ahí.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/sync-main-to-gallery.ts --dry
 *   npx tsx --env-file=.env.local scripts/sync-main-to-gallery.ts
 *
 * Idempotente: si la portada ya está en la galería, no hace nada.
 */

import { createClient } from "@sanity/client";

const DRY_RUN = process.argv.includes("--dry");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

interface Car {
  _id: string;
  name: string;
  mainRef: string | null;
  galleryRefs: string[];
}

async function run() {
  const cars: Car[] = await client.fetch(`
    *[_type == "car" && !(_id in path("drafts.**"))]{
      _id, name,
      "mainRef": mainImage.asset._ref,
      "galleryRefs": gallery[].asset._ref
    }
  `);

  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Revisando ${cars.length} autos...\n`);
  let patched = 0,
    skipped = 0;

  for (const car of cars) {
    if (!car.mainRef) {
      skipped++;
      continue;
    }
    if ((car.galleryRefs ?? []).includes(car.mainRef)) {
      skipped++;
      continue;
    }

    const galleryItem = {
      _type: "image",
      _key: `main-${car.mainRef.slice(-10)}`,
      asset: { _type: "reference", _ref: car.mainRef },
    };

    if (DRY_RUN) {
      console.log(`  + ${car.name} — se agregaría la portada a la galería`);
      patched++;
      continue;
    }

    await client
      .patch(car._id)
      .setIfMissing({ gallery: [] })
      .insert("before", "gallery[0]", [galleryItem])
      .commit();
    console.log(`  ✓ ${car.name}`);
    patched++;
  }

  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Listo — ${patched} actualizados · ${skipped} ya tenían la portada o sin foto\n`);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
