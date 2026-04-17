import { defineField, defineType, defineArrayMember } from "sanity";

export const collection = defineType({
  name: "collection",
  title: "🗂 Colecciones",
  type: "document",
  groups: [
    { name: "content",  title: "📝 Contenido",      default: true },
    { name: "home",     title: "🏠 Home"                           },
    { name: "cars",     title: "🚗 Autos"                          },
  ],
  fields: [
    // ════════════════════════════════════════════════════════════════
    // CONTENIDO PRINCIPAL
    // ════════════════════════════════════════════════════════════════
    defineField({
      name: "title", title: "Título de la colección", type: "string",
      group: "content", validation: (r) => r.required(),
      description: 'Ej: "SUV Familiares de 7 Asientos"',
    }),
    defineField({
      name: "slug", title: "Slug (URL)", type: "slug",
      options: { source: "title", maxLength: 80 },
      group: "content", validation: (r) => r.required(),
      description: "Se genera automáticamente. Ej: /coleccion/7-asientos",
    }),
    defineField({
      name: "badge", title: "Badge / etiqueta", type: "string",
      group: "content",
      description: 'Texto corto en el badge. Ej: "OFERTA", "7 ASIENTOS", "FAMILIA"',
    }),
    defineField({
      name: "subtitle", title: "Subtítulo corto (para la card)", type: "string",
      group: "content",
      description: 'Ej: "3 corridas, espacio para todos"',
    }),
    defineField({
      name: "description", title: "Descripción (para la página)", type: "text", rows: 3,
      group: "content",
      description: "Texto largo que aparece en el hero de la página de la colección.",
    }),
    defineField({
      name: "heroImage", title: "Imagen hero", type: "image",
      options: { hotspot: true },
      group: "content",
      description: "Imagen de fondo para la card del home y el hero de la página.",
    }),
    defineField({
      name: "ctaText", title: "Texto del botón", type: "string",
      group: "content", initialValue: "Ver colección",
    }),

    // ════════════════════════════════════════════════════════════════
    // CONFIGURACIÓN DEL HOME
    // ════════════════════════════════════════════════════════════════
    defineField({
      name: "showInHome", title: "Mostrar en el home", type: "boolean",
      group: "home", initialValue: true,
      description: "Activa para que esta colección aparezca en el carrusel del home.",
    }),
    defineField({
      name: "homeOrder", title: "Orden en el home (1 = primero)", type: "number",
      group: "home", initialValue: 99,
      description: "Número menor aparece antes en el carrusel.",
    }),

    // ════════════════════════════════════════════════════════════════
    // SELECCIÓN DE AUTOS
    // ════════════════════════════════════════════════════════════════
    defineField({
      name: "filterMode", title: "Modo de selección de autos", type: "string",
      group: "cars",
      options: {
        list: [
          { title: "Manual — elige los autos tú mismo", value: "manual" },
          { title: "Automático — por filtros",          value: "automatic" },
        ],
        layout: "radio",
      },
      initialValue: "manual",
      description: "Manual: tú eliges los autos. Automático: se muestran según los filtros configurados abajo.",
    }),

    // ─── Modo manual ────────────────────────────────────────────────
    defineField({
      name: "manualCars", title: "Autos seleccionados", type: "array",
      group: "cars",
      description: "Solo cuando el modo es Manual. Elige los autos de esta colección.",
      of: [defineArrayMember({ type: "reference", to: [{ type: "car" }] })],
    }),

    // ─── Modo automático (filtros) ──────────────────────────────────
    defineField({
      name: "filterBrand", title: "Filtrar por marca", type: "reference",
      to: [{ type: "brand" }],
      group: "cars",
      description: "Solo cuando el modo es Automático. Deja vacío para todas las marcas.",
    }),
    defineField({
      name: "filterCategory", title: "Filtrar por categoría", type: "string",
      group: "cars",
      description: 'Ej: "SUV", "Sedán", "City Car". Vacío = todas las categorías.',
    }),
    defineField({
      name: "filterMaxPrice", title: "Precio máximo (millones CLP)", type: "number",
      group: "cars",
      description: 'Ej: 20 = autos hasta $20.000.000. Deja vacío para sin límite.',
    }),
    defineField({
      name: "filterMinSeats", title: "Mínimo de asientos", type: "number",
      group: "cars",
      description: 'Ej: 7 = solo autos con 7+ asientos.',
    }),
  ],
  preview: {
    select: {
      title:    "title",
      subtitle: "subtitle",
      media:    "heroImage",
    },
    prepare({ title, subtitle, media }) {
      return { title, subtitle, media };
    },
  },
  orderings: [
    { title: "Orden en home", name: "homeOrderAsc", by: [{ field: "homeOrder", direction: "asc" }] },
  ],
});
