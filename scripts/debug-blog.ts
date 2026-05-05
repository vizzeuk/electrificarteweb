import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "wd30r9b0",
  dataset: "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function main() {
  const posts = await client.fetch(`
    *[_type == "blogPost"] | order(publishedAt desc)[0...5] {
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      noIndex,
      "coverImageRaw": coverImage,
      "coverImageResolved": coverImage{ "url": asset->url, alt }
    }
  `);
  console.log(JSON.stringify(posts, null, 2));
}

main().catch(console.error);
