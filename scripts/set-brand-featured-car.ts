import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "wd30r9b0",
  dataset: "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

async function run() {
  // Fetch brand and car documents
  const [brand, car] = await Promise.all([
    client.fetch<{ _id: string; name: string } | null>(
      '*[_type == "brand" && slug.current == "bmw"][0]{ _id, name }'
    ),
    client.fetch<{ _id: string; name: string } | null>(
      '*[_type == "car" && slug.current == "bmw-i7-m70-xdrive"][0]{ _id, name }'
    ),
  ]);

  if (!brand) { console.error("BMW brand not found"); process.exit(1); }
  if (!car)   { console.error("BMW i7 M70 car not found"); process.exit(1); }

  console.log(`Brand: ${brand.name} (${brand._id})`);
  console.log(`Car:   ${car.name} (${car._id})`);

  await client.patch(brand._id).set({
    heroFeaturedCar: { _type: "reference", _ref: car._id },
  }).commit();

  console.log(`✓ heroFeaturedCar de BMW → ${car.name}`);
}

run().catch((err) => { console.error(err); process.exit(1); });
