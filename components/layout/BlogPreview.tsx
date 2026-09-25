import Link from "next/link";
import { sanityImg } from "@/lib/sanityImage";
import { formatFecha } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BlogPreviewPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readingTime: number;
  coverImage?: { asset?: { url: string }; alt?: string } | null;
  author?: { name: string; role: string } | null;
  tags?: string[];
}

interface BlogPreviewProps {
  title?: string;
  posts?: BlogPreviewPost[];
}

// ─── Static fallback posts (mostrar hasta que Francisco suba contenido) ───────
const FALLBACK_POSTS: BlogPreviewPost[] = [
  {
    _id: "f1",
    title: "Guía definitiva: ¿Cuál auto eléctrico conviene más en Chile en 2025?",
    slug: "guia-auto-electrico-chile-2025",
    excerpt: "Comparamos los 10 modelos más vendidos del mercado chileno en precio, autonomía y costo de mantención. Todo lo que necesitas saber antes de decidir.",
    category: "guia-compra",
    publishedAt: "2025-03-15T10:00:00Z",
    readingTime: 8,
    coverImage: null,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["guia", "comparativa", "2025"],
  },
  {
    _id: "f2",
    title: "¿Cuánto cuesta cargar un auto eléctrico en Chile? Cálculo real",
    slug: "costo-carga-auto-electrico-chile",
    excerpt: "Analizamos el costo por kilómetro de los principales EVs vs gasolina. Los números te van a sorprender: hasta 5 veces más barato en uso diario.",
    category: "ahorro",
    publishedAt: "2025-02-28T10:00:00Z",
    readingTime: 5,
    coverImage: null,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["ahorro", "carga", "costos"],
  },
  {
    _id: "f3",
    title: "BYD vs Hyundai vs MG: ¿qué marca eléctrica gana en Chile?",
    slug: "byd-vs-hyundai-vs-mg-chile",
    excerpt: "Las tres marcas dominan el mercado eléctrico chileno. Analizamos garantía, red de servicio, precio y tecnología para que elijas con información.",
    category: "comparativa",
    publishedAt: "2025-02-10T10:00:00Z",
    readingTime: 7,
    coverImage: null,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["BYD", "Hyundai", "MG", "comparativa"],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  "guia-compra": "Guía de compra",
  comparativa:   "Comparativa",
  noticias:      "Noticias",
  tecnologia:    "Tecnología",
  ahorro:        "Ahorro",
  carga:         "Carga",
  legislacion:   "Legislación",
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * "Lo último sobre electromovilidad": grilla de 3 artículos iguales (foto 16:10, categoría,
 * título, bajada y fecha). En móvil el CSS (.posts) la vuelve carrusel horizontal.
 */
export function BlogPreview({ title, posts }: BlogPreviewProps) {
  const displayPosts = (posts && posts.length > 0 ? posts : FALLBACK_POSTS).slice(0, 3);

  return (
    <section className="section" aria-labelledby="blog-title">
      <div className="wrap">
        <div className="section-head">
          <div className="section-head__text">
            <h2 id="blog-title" className="t-h2">{title ?? "Lo último sobre electromovilidad"}</h2>
          </div>
          <Link href="/blog" className="link-arrow">
            Ver todos los artículos
            <Icon name="arrow_forward" size="none" />
          </Link>
        </div>

        <div className="posts">
          {displayPosts.map((post) => (
            <Link key={post._id} href={`/blog/${post.slug}`} className="post">
              <div className="post__media">
                {post.coverImage?.asset?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sanityImg(post.coverImage.asset.url, { w: 800, h: 500, fit: "crop" })}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center">
                    <Icon name="article" className="text-[40px] text-line-2" />
                  </span>
                )}
              </div>
              <p className="post-cat">{CATEGORY_LABELS[post.category] ?? post.category}</p>
              <h3 className="post__title">{post.title}</h3>
              <p className="post__text">{post.excerpt}</p>
              <p className="post-meta">
                <span>{formatFecha(post.publishedAt, true)}</span>
                {post.readingTime ? <span>{post.readingTime} min de lectura</span> : null}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
