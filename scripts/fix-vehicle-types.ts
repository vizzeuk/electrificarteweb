import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "wd30r9b0",
  dataset: "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function main() {
  // 1. Fetch all vehicle type IDs
  const types = await client.fetch<{ _id: string; label: string; slug: string }[]>(
    `*[_type == 'vehicleType'] { _id, label, 'slug': slug.current }`
  );
  const typeMap = Object.fromEntries(types.map((t) => [t.slug, t._id]));
  console.log("Type IDs loaded:", Object.keys(typeMap).join(", "));

  // 2. Fetch all cars with name, brand and current type
  const cars = await client.fetch<{ _id: string; name: string; brand: string; vtSlug: string }[]>(
    `*[_type == 'car'] { _id, name, 'brand': brand->name, 'vtSlug': vehicleType->slug.current }`
  );

  // 3. Define reassignments: [partial name match, target type slug]
  const reassignRules: [string, string][] = [
    // Gran Coupé → Sedán
    ["i4 eDrive40", "sedan"],
    // SUV Coupé → SUV
    ["Tavascan", "suv"],
    ["iX2", "suv"],
    // Roadster → Hatchback
    ["Cyberster", "hatchback"],
    // Hatchback → City Car
    ["Dolphin Mini", "city-car"],
    ["E-Kwid", "city-car"],
    ["E-JS1", "city-car"],
    ["Inster", "city-car"],
    ["500 e", "city-car"],
    ["Cooper Eléctrico", "city-car"],
    ["Spark EUV", "city-car"],
  ];

  let reassignCount = 0;
  for (const car of cars) {
    for (const [nameMatch, targetSlug] of reassignRules) {
      if (car.name.includes(nameMatch)) {
        const targetId = typeMap[targetSlug];
        if (!targetId) { console.warn(`  ⚠ No type ID for slug: ${targetSlug}`); continue; }
        if (car.vtSlug === targetSlug) { console.log(`  ✓ Already correct: ${car.brand} ${car.name} → ${targetSlug}`); continue; }

        console.log(`  → Reassigning: ${car.brand} ${car.name} (${car.vtSlug} → ${targetSlug})`);
        await client.patch(car._id).set({ vehicleType: { _type: "reference", _ref: targetId } }).commit();
        reassignCount++;
      }
    }
  }
  console.log(`\nReassigned ${reassignCount} cars.`);

  // 4. Delete unwanted vehicle types
  const toDelete = ["gran-coupe", "suv-coupe", "roadster", "cabriolet"];
  for (const slug of toDelete) {
    const id = typeMap[slug];
    if (!id) { console.log(`  ⚠ Type not found: ${slug}`); continue; }
    console.log(`  🗑 Deleting type: ${slug} (${id})`);
    await client.delete(id);
  }
  console.log("\nDone. Vehicle types cleaned up.");

  // 5. Final summary
  const finalTypes = await client.fetch(
    `*[_type == 'vehicleType'] | order(navbarOrder asc) { label, 'slug': slug.current, 'count': count(*[_type=='car' && vehicleType._ref == ^._id]) }`
  );
  console.log("\nFINAL STATE:");
  finalTypes.forEach((t: any) => console.log(`  [${t.count}] ${t.label} (${t.slug})`));
}

main().catch(console.error);
