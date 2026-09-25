/// <reference types="node" />
/**
 * Le pone FOTOS a las reseñas de demo (las que siembra seed-reviews-demo.ts),
 * para que la sección se vea completa al mostrársela a Francisco.
 *
 *   npx tsx --env-file=.env.local scripts/qa/seed-review-photos-demo.ts
 *   npx tsx --env-file=.env.local scripts/qa/seed-review-photos-demo.ts --cleanup
 *
 * ⚠️ Usa las fotos del CATÁLOGO (Sanity) como marcador de posición. NO son fotos
 * subidas por usuarios reales — sirven para mostrar el layout. Las reseñas de verdad
 * traerán fotos de celular, más informales.
 *
 * Genera las dos medidas igual que lo haría el navegador (card 480 / full 1280) y las
 * sube al bucket PÚBLICO, porque estas reseñas ya están aprobadas.
 */
import { createClient } from "@supabase/supabase-js";
import { client as sanity } from "@/lib/sanity/client";
import sharp from "sharp";

const BUCKET = "review-media";

async function main() {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: reviews } = await sb
    .from("reviews").select("id, car_slug, photos").eq("source", "demo");
  if (!reviews?.length) { console.log("\n⚠️  No hay reseñas de demo. Corré seed-reviews-demo.ts primero.\n"); return; }

  if (process.argv.includes("--cleanup")) {
    const keys = reviews.flatMap((r) => (r.photos ?? []) as string[]);
    if (keys.length) await sb.storage.from(BUCKET).remove(keys);
    await sb.from("reviews").update({ photos: [] }).eq("source", "demo");
    console.log(`\n🧹 ${keys.length} archivo(s) borrados y reseñas sin fotos.\n`);
    return;
  }

  // Imágenes del catálogo por slug
  const slugs = [...new Set(reviews.map((r) => r.car_slug))];
  const cars = await sanity.fetch<{ slug: string; imgs: string[] }[]>(
    `*[_type=="car" && slug.current in $slugs]{ "slug": slug.current,
       "imgs": gallery[].asset->url }`, { slugs },
  );
  const porSlug = new Map(cars.map((c) => [c.slug, (c.imgs ?? []).filter(Boolean)]));

  let total = 0;
  for (const r of reviews) {
    if ((r.photos ?? []).length > 0) { console.log(`  · ${r.car_slug} ya tenía fotos, se salta`); continue; }
    const urls = (porSlug.get(r.car_slug!) ?? []).slice(0, 2);
    if (!urls.length) { console.log(`  ⚠ ${r.car_slug} sin imágenes en Sanity`); continue; }

    const keys: string[] = [];
    for (let i = 0; i < urls.length; i++) {
      const buf = Buffer.from(await (await fetch(urls[i])).arrayBuffer());
      for (const [ancho, sufijo] of [[480, "card"], [1280, "full"]] as const) {
        const out = await sharp(buf).resize(ancho, null, { withoutEnlargement: true })
          .jpeg({ quality: ancho === 480 ? 72 : 70 }).toBuffer();
        const key = `demo/${r.id}/${i}-${sufijo}.jpg`;
        const { error } = await sb.storage.from(BUCKET)
          .upload(key, out, { contentType: "image/jpeg", upsert: true });
        if (error) { console.log(`  ✗ ${key}: ${error.message}`); continue; }
        keys.push(key);
      }
    }
    await sb.from("reviews").update({ photos: keys }).eq("id", r.id);
    console.log(`  ✓ ${r.car_slug.padEnd(24)} ${keys.length} archivos (${keys.length / 2} fotos)`);
    total += keys.length;
  }
  console.log(`\n✅ ${total} archivos subidos al bucket público.\n`);
}
main();
