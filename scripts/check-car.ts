import { createClient } from "@sanity/client";
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: "production", apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN, useCdn: false,
});
async function main() {
  // Find all cars with versions missing _type
  const cars = await client.fetch(`*[_type=="car" && count(versions[!defined(_type) || _type == null]) > 0]{
    _id, name, "slug": slug.current,
    "versions": versions[]{ _key, _type, name }
  }`);
  console.log(`Cars with broken versions: ${cars.length}`);
  cars.forEach((c: any) => {
    const broken = c.versions.filter((v: any) => !v._type);
    console.log(`  ${c.name} (${c.slug}): ${broken.length} broken versions`);
  });
}
main();
