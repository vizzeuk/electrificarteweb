import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { client } from "@/lib/sanity/client";
import { allBlogPostsQuery } from "@/lib/queries/blog";
import { BlogListingContent } from "./BlogListingContent";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog de Electromovilidad | Guías, Comparativas y Noticias | Electrificarte",
  description:
    "Guías de compra, comparativas de autos eléctricos, costos de carga y todo lo que necesitas saber sobre electromovilidad en Chile.",
};

export default async function BlogPage() {
  const posts = await client.fetch(allBlogPostsQuery, {}, { next: { tags: ["blogPost"] } }).catch(() => []);
  return <BlogListingContent posts={posts ?? []} />;
}
