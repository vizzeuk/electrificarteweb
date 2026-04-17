import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN || "",
  useCdn: false,
});

async function main() {
  const cars = await client.fetch(
    `*[_type == "car"] { name, "vt": vehicleType._ref, "et": electricType._ref }`
  );
  const byVt: Record<string, string[]> = {};
  const byEt: Record<string, string[]> = {};
  cars.forEach((car: { name: string; vt?: string; et?: string }) => {
    if (car.vt) (byVt[car.vt] ??= []).push(car.name);
    if (car.et) (byEt[car.et] ??= []).push(car.name);
  });
  console.log("\n📦 Autos por vehicleType ID:");
  Object.entries(byVt).forEach(([id, names]) =>
    console.log(`  ${id} (${names.length}):`, names.join(", "))
  );
  console.log("\n⚡ Autos por electricType ID:");
  Object.entries(byEt).forEach(([id, names]) =>
    console.log(`  ${id} (${names.length}):`, names.join(", "))
  );
}

main().catch(console.error);
