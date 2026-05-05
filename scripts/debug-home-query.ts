import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "wd30r9b0",
  dataset: "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function main() {
  // Exact same query as latestBlogPostsQuery
  const posts = await client.fetch(
    `*[_type == "blogPost" && noIndex != true] | order(publishedAt desc)[0...$count] {
      _id,
      title,
      "slug": slug.current,
      excerpt,
      category,
      publishedAt,
      readingTime,
      "coverImage": coverImage{ asset->{url}, alt },
      "author": author{ name, role },
      tags
    }`,
    { count: 3 }
  );

  console.log("Posts returned:", posts.length);
  posts.forEach((p: any) => {
    console.log(`\n— ${p.title}`);
    console.log("  coverImage:", JSON.stringify(p.coverImage));
  });
}

main().catch(console.error);
