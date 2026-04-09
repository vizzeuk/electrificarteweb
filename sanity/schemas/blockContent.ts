import { defineArrayMember, defineType } from "sanity";

/**
 * Tipo de contenido enriquecido (Portable Text) reutilizable
 * para el cuerpo de artículos del blog.
 */
export const blockContent = defineType({
  name: "blockContent",
  title: "Contenido enriquecido",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Normal",      value: "normal" },
        { title: "Título H2",   value: "h2" },
        { title: "Título H3",   value: "h3" },
        { title: "Título H4",   value: "h4" },
        { title: "Cita",        value: "blockquote" },
      ],
      lists: [
        { title: "Lista",         value: "bullet" },
        { title: "Lista numerada", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Negrita",   value: "strong" },
          { title: "Cursiva",   value: "em" },
          { title: "Código",    value: "code" },
          { title: "Subrayado", value: "underline" },
        ],
        annotations: [
          {
            name: "link",
            type: "object",
            title: "Enlace",
            fields: [
              {
                name: "href",
                type: "url",
                title: "URL",
                validation: (Rule) =>
                  Rule.uri({ scheme: ["http", "https", "mailto"] }),
              },
              {
                name: "blank",
                type: "boolean",
                title: "Abrir en nueva pestaña",
                initialValue: false,
              },
            ],
          },
        ],
      },
    }),
    // Imágenes dentro del artículo
    defineArrayMember({
      type: "image",
      options: { hotspot: true },
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Texto alternativo (SEO)",
          description: "Describe la imagen para buscadores y accesibilidad",
          validation: (Rule) => Rule.required(),
        },
        {
          name: "caption",
          type: "string",
          title: "Leyenda",
        },
      ],
    }),
    // Bloque de llamada a la acción dentro del cuerpo
    defineArrayMember({
      name: "callout",
      type: "object",
      title: "Destacado / Callout",
      fields: [
        { name: "text",  type: "text",   title: "Texto" },
        { name: "type",  type: "string", title: "Tipo",
          options: { list: [
            { title: "Info",      value: "info" },
            { title: "Consejo",   value: "tip" },
            { title: "Atención",  value: "warning" },
          ]},
          initialValue: "tip",
        },
      ],
      preview: {
        select: { text: "text", type: "type" },
        prepare(val: any) {
          const icons: Record<string, string> = { info: "💡", tip: "✅", warning: "⚠️" };
          return { title: `${icons[val.type] ?? "📌"} ${val.text?.slice(0, 60) ?? "Callout"}` };
        },
      },
    }),
  ],
});
