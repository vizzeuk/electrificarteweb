import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { client } from "@/lib/sanity/client";
import { blogPostBySlugQuery, allBlogSlugsQuery } from "@/lib/queries/blog";
import { BlogPostContent } from "./BlogPostContent";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Genera rutas estáticas en build
export async function generateStaticParams() {
  const slugs = await client.fetch(allBlogSlugsQuery).catch(() => []);
  return (slugs ?? []).map((s: { slug: string }) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await client.fetch(blogPostBySlugQuery, { slug }).catch(() => null);
  if (!post) return { title: "Artículo no encontrado | Electrificarte" };

  const ogUrl = post.ogImage?.asset?.url ?? post.coverImage?.asset?.url;

  return {
    title:       post.metaTitle       ?? `${post.title} | Electrificarte`,
    description: post.metaDescription ?? post.excerpt,
    keywords:    post.keywords?.join(", "),
    robots:      post.noIndex ? "noindex,nofollow" : "index,follow",
    alternates:  post.canonicalUrl ? { canonical: post.canonicalUrl } : undefined,
    openGraph: {
      title:       post.metaTitle ?? post.title,
      description: post.metaDescription ?? post.excerpt,
      type:        "article",
      publishedTime: post.publishedAt,
      authors:     post.author?.name ? [post.author.name] : undefined,
      images: ogUrl ? [{ url: ogUrl, width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await client.fetch(blogPostBySlugQuery, { slug }, { next: { tags: ["blogPost"] } }).catch(() => null);
  if (!post) notFound();
  return <BlogPostContent post={post} />;
}
