import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN || "",
  useCdn: false,
});

async function main() {
  const brands = await client.fetch(
    `*[_type == "brand"] | order(name asc) { name, "slug": slug.current }`
  );
  console.log(JSON.stringify(brands, null, 2));
}

main().catch(console.error);
