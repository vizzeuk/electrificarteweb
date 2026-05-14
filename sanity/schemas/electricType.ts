import { defineField, defineType, defineArrayMember } from "sanity";

export const electricType = defineType({
  name: "electricType",
  title: "Tipo Eléctrico",
  type: "document",
  groups: [
    { name: "general", title: "📋 General",      default: true },
    { name: "content", title: "📝 Contenido educativo" },
    { name: "banners", title: "📣 Banners PLP" },
    { name: "seo",     title: "🔍 SEO" },
  ],
  fields: [
    // ─── General ────────────────────────────────────────────────────────────
    defineField({
      name: "name", title: "Nombre interno", type: "string",
      group: "general", validation: (r) => r.required(),
    }),
    defineField({
      name: "slug", title: "Slug (URL)", type: "slug",
      options: { source: "name", maxLength: 96 },
      group: "general", validation: (r) => r.required(),
      description: "Ej: ev, phev, hev, erev, mhev",
    }),
    defineField({
      name: "label", title: "Nombre completo", type: "string",
      group: "general", validation: (r) => r.required(),
      description: 'Ej: "Eléctrico Puro", "Híbrido Enchufable", "Híbrido Clásico"',
    }),
    defineField({
      name: "navbarLabel", title: "Subtítulo en el navbar", type: "string",
      group: "general",
      description: 'Texto pequeño que aparece bajo el nombre en el dropdown del menú. Si se deja vacío, se usa el Tagline del hero.',
    }),
    defineField({
      name: "tag", title: "Sigla técnica", type: "string",
      group: "general", validation: (r) => r.required(),
      description: 'La sigla corta. Ej: "EV", "PHEV", "HEV"',
    }),
    defineField({
      name: "color", title: "Color de la tecnología (HEX)", type: "string",
      group: "general",
      description: 'Color identificador en la UI. Ej: "#00E5E5" para EV, "#6366F1" para PHEV',
    }),
    defineField({
      name: "icon", title: "Ícono (Material Symbol)", type: "string",
      group: "general",
      description: 'Ej: "bolt" para EV, "ev_station" para PHEV, "sync_alt" para HEV',
    }),
    defineField({
      name: "navbarOrder", title: "Orden en el menú", type: "number",
      group: "general",
    }),

    // ─── Hero ad ────────────────────────────────────────────────────────────
    defineField({
      name: "heroFeaturedCar", title: "Auto destacado (publicidad)", type: "reference", to: [{ type: "car" }],
      group: "general",
      description: "Auto que aparece como tarjeta publicitaria en el hero de esta PLP. Si no se selecciona, se muestra el más caro del catálogo.",
    }),
    defineField({
      name: "heroAdText", title: "Texto del anuncio", type: "string",
      group: "general",
      description: 'Texto destacado sobre el auto. Ej: "El eléctrico más eficiente del mercado"',
    }),

    // ─── Content ────────────────────────────────────────────────────────────
    defineField({
      name: "cardImage", title: "Foto de fondo (card home)", type: "image",
      options: { hotspot: true },
      group: "content",
      description: "Imagen de fondo para la card de tecnología en el home. Formato recomendado: vertical, al menos 400×500px.",
    }),
    defineField({
      name: "tagline", title: "Tagline del hero", type: "string",
      group: "content",
      description: 'Una frase impactante. Ej: "Cero emisiones. Cero compromiso."',
    }),
    defineField({
      name: "description", title: "Descripción detallada", type: "text", rows: 6,
      group: "content",
      description: "Explicación completa de este tipo de tecnología eléctrica",
    }),
    defineField({
      name: "howItWorks", title: "Cómo funciona (pasos)", type: "array", group: "content",
      description: "4 pasos que explican cómo funciona esta tecnología. Aparecen con íconos.",
      of: [defineArrayMember({
        type: "object", name: "step", title: "Paso",
        fields: [
          defineField({ name: "icon",  title: "Ícono",        type: "string", description: 'Material Symbol. Ej: "battery_full"' }),
          defineField({ name: "title", title: "Título",       type: "string" }),
          defineField({ name: "desc",  title: "Descripción",  type: "string" }),
        ],
        preview: { select: { title: "title", subtitle: "desc" } },
      })],
    }),
    defineField({
      name: "pros", title: "Ventajas", type: "array", group: "content",
      description: 'Ventajas de este tipo eléctrico. Ej: "Sin emisiones directas"',
      of: [{ type: "string" }],
    }),
    defineField({
      name: "cons", title: "Desventajas / A tener en cuenta", type: "array", group: "content",
      description: 'Desventajas honestas. Ej: "Depende de red de carga"',
      of: [{ type: "string" }],
    }),
    defineField({
      name: "idealFor", title: "Ideal para...", type: "text", rows: 2,
      group: "content",
      description: 'A quién le conviene este tipo de auto. Ej: "Conductores urbanos que cargan en casa."',
    }),

    // ─── SEO ────────────────────────────────────────────────────────────────
    // ─── Banners PLP ────────────────────────────────────────────────────────
    defineField({
      name: "plpBanners",
      title: "Banners de la página",
      type: "array",
      of: [{ type: "plpBanner" }],
      group: "banners",
      description: "Banners que aparecen en el slideshow de esta PLP. Si está vacío o todos están inactivos, el bloque no se muestra.",
    }),

    defineField({ name: "metaTitle",       title: "Meta Title",       type: "string", group: "seo" }),
    defineField({ name: "metaDescription", title: "Meta Description", type: "text", rows: 2, group: "seo" }),
  ],
  preview: {
    select: { title: "label", subtitle: "tag" },
    prepare({ title, subtitle }) {
      return { title: title || "Sin nombre", subtitle: subtitle ? `[${subtitle}]` : undefined };
    },
  },
  orderings: [
    { title: "Orden menú", name: "navbarOrder", by: [{ field: "navbarOrder", direction: "asc" }] },
  ],
});
