import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "wd30r9b0",
  dataset: "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

async function run() {
  const doc = await client.fetch<{ _id: string; heroTitle: string } | null>(
    '*[_type == "homePage"][0]{ _id, heroTitle }'
  );

  if (!doc) {
    console.error("No homePage document found");
    process.exit(1);
  }

  console.log("Current heroTitle:", doc.heroTitle);

  await client
    .patch(doc._id)
    .set({ heroTitle: "Ahorra millones en tu próximo" })
    .commit();

  console.log("✓ heroTitle actualizado a: Ahorra millones en tu próximo");
}

run().catch((err) => { console.error(err); process.exit(1); });
