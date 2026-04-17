import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN || "",
  useCdn: false,
});

async function main() {
  const vt = await client.fetch(
    `*[_type == "vehicleType"] | order(navbarOrder asc, name asc) { _id, name, label, "slug": slug.current, navbarOrder }`
  );
  const et = await client.fetch(
    `*[_type == "electricType"] | order(navbarOrder asc, name asc) { _id, name, label, tag, "slug": slug.current }`
  );
  console.log("\n=== TIPOS DE VEHÍCULO ===");
  console.log(JSON.stringify(vt, null, 2));
  console.log("\n=== TIPOS ELÉCTRICOS ===");
  console.log(JSON.stringify(et, null, 2));
}

main().catch(console.error);
