import { defineField, defineType } from "sanity";

export const vehicleType = defineType({
  name: "vehicleType",
  title: "Tipo de Vehículo",
  type: "document",
  groups: [
    { name: "general", title: "📋 General", default: true },
    { name: "hero",    title: "🖼️ Hero de la página PLP" },
    { name: "seo",     title: "🔍 SEO" },
  ],
  fields: [
    // ─── General ────────────────────────────────────────────────────────────
    defineField({
      name: "name", title: "Nombre interno", type: "string",
      group: "general", validation: (r) => r.required(),
      description: 'Nombre para identificar en el CMS. Ej: "SUV"',
    }),
    defineField({
      name: "slug", title: "Slug (URL)", type: "slug",
      options: { source: "name", maxLength: 96 },
      group: "general", validation: (r) => r.required(),
      description: "Se genera automáticamente. Ej: /tipo/suv",
    }),
    defineField({
      name: "label", title: "Nombre que ve el cliente", type: "string",
      group: "general", validation: (r) => r.required(),
      description: 'Ej: "SUV", "Sedán", "City Car", "Hatchback", "Pickup"',
    }),
    defineField({
      name: "icon", title: "Ícono (Material Symbol)", type: "string",
      group: "general",
      description: 'Nombre del ícono de Material Symbols. Ej: "directions_car", "local_taxi", "airport_shuttle"',
    }),
    defineField({
      name: "navbarOrder", title: "Orden en el menú de navegación", type: "number",
      group: "general",
      description: "Número de orden en el dropdown del navbar (1 = primero)",
    }),

    // ─── Hero PLP ───────────────────────────────────────────────────────────
    defineField({
      name: "heroTagline", title: "Tagline del hero", type: "string",
      group: "hero",
      description: 'Texto corto bajo el título. Ej: "Espacio, versatilidad y potencia eléctrica"',
    }),
    defineField({
      name: "heroDescription", title: "Descripción del hero", type: "text", rows: 3,
      group: "hero",
      description: "Párrafo de descripción en el hero de la PLP",
    }),

    // ─── SEO ────────────────────────────────────────────────────────────────
    defineField({ name: "metaTitle",       title: "Meta Title",       type: "string", group: "seo" }),
    defineField({ name: "metaDescription", title: "Meta Description", type: "text", rows: 2, group: "seo" }),
  ],
  preview: {
    select: { title: "label", subtitle: "slug.current" },
    prepare({ title, subtitle }) {
      return { title: title || "Sin nombre", subtitle: subtitle ? `/tipo/${subtitle}` : undefined };
    },
  },
  orderings: [
    { title: "Orden navbar", name: "navbarOrder", by: [{ field: "navbarOrder", direction: "asc" }] },
    { title: "Nombre A-Z",   name: "nameAsc",     by: [{ field: "label",       direction: "asc" }] },
  ],
});
