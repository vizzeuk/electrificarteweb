import { defineField, defineType, defineArrayMember } from "sanity";

export const brand = defineType({
  name: "brand",
  title: "Marca",
  type: "document",
  groups: [
    { name: "general",   title: "📋 General",    default: true },
    { name: "branding",  title: "🎨 Branding" },
    { name: "content",   title: "📝 Contenido PLP" },
    { name: "media",     title: "🎬 Videos y multimedia" },
  ],
  fields: [
    // ─── General ────────────────────────────────────────────────────────────
    defineField({
      name: "name", title: "Nombre de la marca", type: "string",
      group: "general", validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug", title: "Slug (URL)", type: "slug",
      options: { source: "name", maxLength: 96 },
      group: "general", validation: (rule) => rule.required(),
      description: "Se genera automáticamente. Ej: /marcas/hyundai",
    }),
    defineField({
      name: "country", title: "País de origen", type: "string",
      group: "general",
      description: 'Ej: "Corea del Sur", "China", "Alemania"',
    }),
    defineField({
      name: "foundedYear", title: "Año de fundación", type: "string",
      group: "general",
      description: 'Ej: "1967"',
    }),
    defineField({
      name: "website", title: "Sitio web oficial", type: "url",
      group: "general",
    }),
    defineField({
      name: "isFeatured", title: "⭐ Mostrar en menú de navegación", type: "boolean",
      group: "general", initialValue: false,
      description: "Si está activo, la marca aparece en el dropdown del navbar",
    }),

    // ─── Branding ────────────────────────────────────────────────────────────
    defineField({
      name: "logo", title: "Logo", type: "image",
      options: { hotspot: true },
      group: "branding",
    }),
    defineField({
      name: "accentColor", title: "Color de la marca (HEX)", type: "string",
      group: "branding",
      description: 'Color principal de la marca. Ej: "#003499" para Hyundai. Se usa en el hero de la PLP.',
    }),

    // ─── Content ────────────────────────────────────────────────────────────
    defineField({
      name: "description", title: "Descripción de la marca", type: "text", rows: 4,
      group: "content",
      description: "Texto principal del hero en la página de la marca. 2-3 oraciones.",
    }),
    defineField({
      name: "heroTagline", title: "Tagline del hero", type: "string",
      group: "content",
      description: 'Texto corto complementario. Ej: "Liderando la electromovilidad en Chile"',
    }),
    defineField({
      name: "heroFeaturedCar",
      title: "🚗 Auto destacado en hero",
      type: "reference",
      to: [{ type: "car" }],
      group: "content",
      description: "Auto que aparece en el panel derecho del hero. Si no se configura, se usa el hot deal o el primer auto con foto.",
    }),
    defineField({
      name: "stats", title: "Estadísticas destacadas", type: "array", group: "content",
      description: "Aparecen en el panel derecho del hero. Máximo 3 estadísticas.",
      of: [defineArrayMember({
        type: "object", name: "stat", title: "Estadística",
        fields: [
          defineField({ name: "label", title: "Etiqueta", type: "string", description: 'Ej: "Modelos eléctricos"' }),
          defineField({ name: "value", title: "Valor",   type: "string", description: 'Ej: "3" o "614 km"' }),
        ],
        preview: {
          select: { title: "label", subtitle: "value" },
        },
      })],
    }),

    // ─── Videos ─────────────────────────────────────────────────────────────
    defineField({
      name: "videos", title: "Videos de la marca", type: "array", group: "media",
      description: "Videos de YouTube que se muestran en la sección multimedia de la PLP de la marca.",
      of: [defineArrayMember({
        type: "object", name: "video", title: "Video",
        fields: [
          defineField({ name: "title",   title: "Título del video",  type: "string", validation: (r) => r.required() }),
          defineField({ name: "videoUrl", title: "URL de YouTube (embed)", type: "url", description: 'Ej: "https://www.youtube.com/embed/xxxx"' }),
          defineField({ name: "thumbnail", title: "Thumbnail personalizado", type: "image", options: { hotspot: true } }),
          defineField({ name: "duration", title: "Duración", type: "string", description: 'Ej: "4:32"' }),
          defineField({ name: "views",    title: "Vistas (texto)", type: "string", description: 'Ej: "1.2M"' }),
          defineField({ name: "channel",  title: "Canal",    type: "string", description: 'Ej: "Hyundai Chile"' }),
        ],
        preview: {
          select: { title: "title", subtitle: "channel" },
        },
      })],
    }),
  ],
  preview: {
    select: { title: "name", media: "logo", isFeatured: "isFeatured" },
    prepare({ title, media, isFeatured }) {
      return { title, subtitle: isFeatured ? "⭐ En navbar" : undefined, media };
    },
  },
  orderings: [
    { title: "Nombre A-Z", name: "nameAsc", by: [{ field: "name", direction: "asc" }] },
  ],
});
