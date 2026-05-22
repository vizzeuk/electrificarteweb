/**
 * Sube las fotos de Audi extraídas de los PDF de catálogo y las asigna
 * como portada + galería de cada auto Audi en Sanity.
 *
 * Uso: npx tsx --env-file=.env.local scripts/patch-audi-photos.ts
 */

import { createClient } from "@sanity/client";
import * as fs from "fs";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const AUDIS: Record<string, { main: string; gallery: string[] }> = {
  "audi-a6-sportback-e-tron": {
    main: "/tmp/audi-imgs/a6-000.png",
    gallery: ["/tmp/audi-imgs/a6-047.png", "/tmp/audi-imgs/a6-051.png", "/tmp/audi-imgs/a6-057.png"],
  },
  "audi-q4-sportback-e-tron": {
    main: "/tmp/audi-q4-sportback-e-tron/ficha-1-063.png",
    gallery: [
      "/tmp/audi-q4-sportback-e-tron/ficha-1-000.png",
      "/tmp/audi-q4-sportback-e-tron/ficha-2-057.png",
      "/tmp/audi-q4-sportback-e-tron/ficha-1-059.png",
    ],
  },
  "audi-q6-e-tron": {
    main: "/tmp/audi-q6-e-tron/ficha-1-000.png",
    gallery: [
      "/tmp/audi-q6-e-tron/ficha-2-050.png",
      "/tmp/audi-q6-e-tron/ficha-1-054.png",
      "/tmp/audi-q6-e-tron/ficha-1-056.png",
    ],
  },
  "audi-q6-sportback-e-tron": {
    main: "/tmp/audi-q6-sportback-e-tron/ficha-2-000.png",
    gallery: [
      "/tmp/audi-q6-sportback-e-tron/ficha-1-050.png",
      "/tmp/audi-q6-sportback-e-tron/ficha-2-051.png",
      "/tmp/audi-q6-sportback-e-tron/ficha-1-054.png",
    ],
  },
};

async function uploadLocal(path: string): Promise<string> {
  const buf = fs.readFileSync(path);
  const asset = await client.assets.upload("image", buf, { filename: path.split("/").pop() });
  return asset._id;
}

function imageRef(assetId: string, key?: string) {
  return {
    _type: "image" as const,
    ...(key ? { _key: key } : {}),
    asset: { _type: "reference" as const, _ref: assetId },
  };
}

async function run() {
  for (const [slug, imgs] of Object.entries(AUDIS)) {
    const id = await client.fetch<string | null>(
      `*[_type == "car" && slug.current == $slug && !(_id in path("drafts.**"))][0]._id`,
      { slug }
    );
    if (!id) {
      console.log(`  ? no encontrado: ${slug}`);
      continue;
    }

    const mainId = await uploadLocal(imgs.main);
    const galleryIds: string[] = [];
    for (const g of imgs.gallery) galleryIds.push(await uploadLocal(g));

    // La galería incluye la portada primero, igual que en el resto del catálogo.
    const gallery = [mainId, ...galleryIds].map((aid, i) => imageRef(aid, `audi${i}`));

    await client
      .patch(id)
      .set({ mainImage: imageRef(mainId), gallery })
      .commit();
    console.log(`  ✓ ${slug} — ${gallery.length} fotos`);
  }
  console.log("Listo.");
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
