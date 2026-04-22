import { groq } from "next-sanity";

// ─── Campos comunes para tarjetas de blog ─────────────────────────────────────
const BLOG_CARD_FIELDS = groq`
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
`;

// ─── Últimos N artículos (home carrusel) ──────────────────────────────────────
export const latestBlogPostsQuery = groq`
  *[_type == "blogPost" && noIndex != true] | order(publishedAt desc)[0...$count] {
    ${BLOG_CARD_FIELDS}
  }
`;

// ─── Listado completo (página /blog) ─────────────────────────────────────────
export const allBlogPostsQuery = groq`
  *[_type == "blogPost" && noIndex != true] | order(publishedAt desc) {
    ${BLOG_CARD_FIELDS}
  }
`;

// ─── Listado por categoría ────────────────────────────────────────────────────
export const blogPostsByCategoryQuery = groq`
  *[_type == "blogPost" && noIndex != true && category == $category] | order(publishedAt desc) {
    ${BLOG_CARD_FIELDS}
  }
`;

// ─── Post individual (PDP del blog) ──────────────────────────────────────────
export const blogPostBySlugQuery = groq`
  *[_type == "blogPost" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    category,
    publishedAt,
    readingTime,
    tags,
    "coverImage": coverImage{ asset->{url}, alt },
    "ogImage": ogImage{ asset->{url} },
    "author": author{ name, role, "avatar": avatar.asset->{url} },
    body[]{
      ...,
      _type == "image" => { ..., asset->{url} }
    },
    // ─ SEO
    metaTitle,
    metaDescription,
    keywords,
    canonicalUrl,
    noIndex,
    // ─ GEO
    geoRegions,
    geoCities,
    geoNearMe,
    // ─ AEO
    featuredSnippet,
    faqBlock,
    howToBlock,
    articleType,
    // ─ Relaciones
    "relatedCars": relatedCars[]->{
      _id,
      name,
      "slug": slug.current,
      tagline,
      discountPrice,
      basePrice,
      range,
      "brand": brand->{ name, "slug": slug.current },
      "vehicleType": vehicleType->{ label }
    },
    "relatedPosts": relatedPosts[]->{
      ${BLOG_CARD_FIELDS}
    }
  }
`;

// ─── slugs para generateStaticParams ─────────────────────────────────────────
export const allBlogSlugsQuery = groq`
  *[_type == "blogPost" && defined(slug.current)] {
    "slug": slug.current
  }
`;
