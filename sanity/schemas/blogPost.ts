import { defineField, defineType, defineArrayMember } from "sanity";

export const blogPost = defineType({
  name: "blogPost",
  title: "📝 Artículo del Blog",
  type: "document",

  groups: [
    { name: "content",  title: "✍️ Contenido",         default: true },
    { name: "seo",      title: "🔍 SEO"                              },
    { name: "geo",      title: "📍 GEO (local SEO)"                  },
    { name: "aeo",      title: "🤖 AEO (respuestas IA)"              },
    { name: "relations",title: "🔗 Relaciones"                       },
  ],

  fields: [
    // ─── CONTENIDO ────────────────────────────────────────────────────────────
    defineField({
      name: "title",
      title: "Título del artículo",
      type: "string",
      group: "content",
      description: "Aparece en el encabezado de la página y en el carrusel del home.",
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: "slug",
      title: "URL (slug)",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Fecha de publicación",
      type: "datetime",
      group: "content",
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Extracto / Resumen",
      type: "text",
      rows: 3,
      group: "content",
      description: "Aparece en tarjetas del blog y en la descripción de redes sociales. Máx. 200 caracteres.",
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: "coverImage",
      title: "Imagen de portada",
      type: "image",
      group: "content",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Texto alternativo (SEO)",
          type: "string",
          description: "Describe la imagen para Google Imágenes.",
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: "category",
      title: "Categoría",
      type: "string",
      group: "content",
      options: {
        list: [
          { title: "Guías de compra",           value: "guia-compra" },
          { title: "Comparativas",              value: "comparativa" },
          { title: "Noticias del mercado",      value: "noticias" },
          { title: "Tecnología eléctrica",      value: "tecnologia" },
          { title: "Ahorro y financiamiento",   value: "ahorro" },
          { title: "Carga e infraestructura",   value: "carga" },
          { title: "Legislación y beneficios",  value: "legislacion" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "author",
      title: "Autor",
      type: "object",
      group: "content",
      fields: [
        defineField({ name: "name",   type: "string", title: "Nombre",          initialValue: "Equipo Electrificarte" }),
        defineField({ name: "role",   type: "string", title: "Cargo / Rol",     initialValue: "Experto en electromovilidad" }),
        defineField({ name: "avatar", type: "image",  title: "Foto del autor",  options: { hotspot: true } }),
      ],
    }),
    defineField({
      name: "readingTime",
      title: "Tiempo de lectura (minutos)",
      type: "number",
      group: "content",
      description: "Se calcula automáticamente, pero puedes ajustarlo.",
      initialValue: 5,
    }),
    defineField({
      name: "body",
      title: "Cuerpo del artículo",
      type: "blockContent",
      group: "content",
    }),

    // ─── SEO ──────────────────────────────────────────────────────────────────
    defineField({
      name: "metaTitle",
      title: "Meta Title",
      type: "string",
      group: "seo",
      description: "Máx. 60 caracteres. Si se deja vacío, se usa el título del artículo.",
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: "metaDescription",
      title: "Meta Description",
      type: "text",
      rows: 2,
      group: "seo",
      description: "Máx. 155 caracteres. Aparece en los resultados de Google.",
      validation: (Rule) => Rule.max(155),
    }),
    defineField({
      name: "keywords",
      title: "Keywords principales",
      type: "array",
      group: "seo",
      of: [defineArrayMember({ type: "string" })],
      description: "Ej: 'auto eléctrico Chile', 'BYD precio'. Separa con Enter.",
      options: { layout: "tags" },
    }),
    defineField({
      name: "canonicalUrl",
      title: "URL Canónica",
      type: "url",
      group: "seo",
      description: "Solo si este artículo fue publicado primero en otro sitio.",
    }),
    defineField({
      name: "ogImage",
      title: "Imagen para redes sociales (OG Image)",
      type: "image",
      group: "seo",
      description: "1200×630 px. Si se omite, se usa la imagen de portada.",
      options: { hotspot: true },
    }),
    defineField({
      name: "noIndex",
      title: "Ocultar de Google (noindex)",
      type: "boolean",
      group: "seo",
      initialValue: false,
      description: "Activa solo para borradores o contenido duplicado.",
    }),

    // ─── GEO (local SEO) ──────────────────────────────────────────────────────
    defineField({
      name: "geoRegions",
      title: "Regiones de Chile relevantes",
      type: "array",
      group: "geo",
      of: [defineArrayMember({ type: "string" })],
      description: "Marcar las regiones a las que apunta este artículo para SEO local.",
      options: {
        list: [
          "Región Metropolitana",
          "Valparaíso",
          "Biobío",
          "La Araucanía",
          "Los Lagos",
          "Coquimbo",
          "Maule",
          "O'Higgins",
          "Atacama",
          "Antofagasta",
          "Tarapacá",
          "Arica y Parinacota",
          "Ñuble",
          "Los Ríos",
          "Aysén",
          "Magallanes",
        ].map((r) => ({ title: r, value: r })),
        layout: "grid",
      },
    }),
    defineField({
      name: "geoCities",
      title: "Ciudades mencionadas",
      type: "array",
      group: "geo",
      of: [defineArrayMember({ type: "string" })],
      description: "Ej: 'Santiago', 'Viña del Mar'. Ayuda al posicionamiento local.",
      options: { layout: "tags" },
    }),
    defineField({
      name: "geoNearMe",
      title: "Aplica búsquedas 'cerca de mí'",
      type: "boolean",
      group: "geo",
      initialValue: false,
      description: "Activa si el artículo es sobre concesionarios, puntos de carga o servicios locales.",
    }),

    // ─── AEO (Answer Engine Optimization para ChatGPT, Perplexity, SGE) ──────
    defineField({
      name: "featuredSnippet",
      title: "Párrafo destacado (Featured Snippet)",
      type: "text",
      rows: 4,
      group: "aeo",
      description: "Respuesta directa de 40–60 palabras a la pregunta principal del artículo. Google lo muestra en 'posición cero'. También es captado por ChatGPT y Perplexity.",
    }),
    defineField({
      name: "faqBlock",
      title: "Preguntas frecuentes del artículo (FAQ Schema)",
      type: "array",
      group: "aeo",
      of: [
        defineArrayMember({
          name: "faqItem",
          type: "object",
          title: "Pregunta / Respuesta",
          fields: [
            defineField({ name: "question", type: "string", title: "Pregunta",   validation: (Rule) => Rule.required() }),
            defineField({ name: "answer",   type: "text",   title: "Respuesta",  validation: (Rule) => Rule.required().max(300) }),
          ],
          preview: {
            select: { title: "question" },
            prepare(val: any) {
              return { title: `❓ ${val.title}` };
            },
          },
        }),
      ],
      description: "Se inyecta como JSON-LD FAQPage. Aparece en Google y es citado por IAs.",
    }),
    defineField({
      name: "howToBlock",
      title: "Pasos 'Cómo hacer' (HowTo Schema)",
      type: "object",
      group: "aeo",
      description: "Completa solo si el artículo es una guía paso a paso.",
      fields: [
        defineField({ name: "name",        type: "string", title: "Nombre de la guía" }),
        defineField({ name: "description", type: "text",   title: "Descripción breve" }),
        defineField({
          name: "steps",
          type: "array",
          title: "Pasos",
          of: [
            defineArrayMember({
              name: "step",
              type: "object",
              fields: [
                defineField({ name: "name", type: "string", title: "Nombre del paso" }),
                defineField({ name: "text", type: "text",   title: "Instrucción" }),
              ],
              preview: {
                select: { title: "name" },
                prepare(val: any) {
                  return { title: `▶ ${val.title}` };
                },
              },
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "articleType",
      title: "Tipo de artículo (Schema.org)",
      type: "string",
      group: "aeo",
      options: {
        list: [
          { title: "Artículo general",  value: "Article" },
          { title: "Artículo de guía",  value: "HowTo" },
          { title: "Reseña / Review",   value: "Review" },
          { title: "Noticias",          value: "NewsArticle" },
          { title: "Comparativa",       value: "ComparisonArticle" },
        ],
        layout: "radio",
      },
      initialValue: "Article",
    }),

    // ─── RELACIONES ───────────────────────────────────────────────────────────
    defineField({
      name: "relatedCars",
      title: "Autos relacionados",
      type: "array",
      group: "relations",
      of: [defineArrayMember({ type: "reference", to: [{ type: "car" }] })],
      description: "Los autos aparecerán como cards al final del artículo.",
      validation: (Rule) => Rule.max(4),
    }),
    defineField({
      name: "relatedPosts",
      title: "Artículos relacionados",
      type: "array",
      group: "relations",
      of: [defineArrayMember({ type: "reference", to: [{ type: "blogPost" }] })],
      validation: (Rule) => Rule.max(3),
    }),
    defineField({
      name: "tags",
      title: "Etiquetas",
      type: "array",
      group: "relations",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
  ],

  orderings: [
    {
      title: "Más reciente",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],

  preview: {
    select: {
      title:    "title",
      category: "category",
      media:    "coverImage",
      date:     "publishedAt",
    },
    prepare({ title, category, media, date }: any) {
      const cats: Record<string, string> = {
        "guia-compra": "📖", comparativa: "⚖️", noticias: "📰",
        tecnologia: "⚡", ahorro: "💰", carga: "🔌", legislacion: "📜",
      };
      return {
        title,
        subtitle: `${cats[category] ?? "📝"} ${category ?? ""} · ${date ? new Date(date).toLocaleDateString("es-CL") : ""}`,
        media,
      };
    },
  },
});
