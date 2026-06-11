import { defineField, defineType } from "sanity";

/**
 * Conocimiento del Asesor IA.
 *
 * Base de conocimiento general de EVs (carga, baterías, mitos, garantías, etc.)
 * que NO vive en la ficha de un auto. El asesor de WhatsApp la consulta vía la
 * herramienta `search_knowledge`. Editable por el equipo sin tocar código.
 */
export const advisorKnowledge = defineType({
  name: "advisorKnowledge",
  title: "Conocimiento del Asesor",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      validation: (r) => r.required(),
      description: 'Tema del artículo. Ej: "Cómo funciona la carga DC vs AC"',
    }),
    defineField({
      name: "topic",
      title: "Categoría",
      type: "string",
      options: {
        list: [
          { title: "Carga", value: "carga" },
          { title: "Baterías", value: "baterias" },
          { title: "Autonomía", value: "autonomia" },
          { title: "Costos y ahorro", value: "costos" },
          { title: "Garantías y mantención", value: "garantias" },
          { title: "Mitos y dudas frecuentes", value: "mitos" },
          { title: "Tipos de electrificación (BEV/PHEV/HEV)", value: "tipos" },
          { title: "Incentivos y normativa Chile", value: "normativa" },
          { title: "Otro", value: "otro" },
        ],
      },
      description: "Ayuda a organizar el conocimiento. Opcional.",
    }),
    defineField({
      name: "content",
      title: "Contenido",
      type: "text",
      rows: 10,
      validation: (r) => r.required(),
      description:
        "Explicación clara y precisa, en texto plano. El asesor la usa como fuente experta. Sé honesto y neutro; nada de specs o precios de autos puntuales (eso lo toma del catálogo).",
    }),
    defineField({
      name: "keywords",
      title: "Palabras clave",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      description:
        'Términos por los que el asesor recupera este artículo. Ej: "carga", "wallbox", "kw", "tiempo de carga". Mientras más completas, mejor lo encuentra.',
    }),
    defineField({
      name: "alwaysInclude",
      title: "Incluir siempre",
      type: "boolean",
      initialValue: false,
      description:
        "Si está activo, este conocimiento se inyecta SIEMPRE en el contexto del asesor (úsalo solo para datos núcleo y breves). Si no, se recupera solo cuando es relevante.",
    }),
    defineField({
      name: "priority",
      title: "Prioridad",
      type: "number",
      initialValue: 0,
      description: "Mayor número = se prefiere primero cuando hay varios relevantes.",
    }),
    defineField({
      name: "published",
      title: "Publicado",
      type: "boolean",
      initialValue: true,
      description: "Si está desactivado, el asesor no lo usa.",
    }),
  ],
  preview: {
    select: { title: "title", topic: "topic", published: "published", always: "alwaysInclude" },
    prepare({ title, topic, published, always }) {
      const flags = [always && "📌 siempre", published === false && "🚫 oculto"].filter(Boolean).join(" · ");
      return { title: title || "Sin título", subtitle: [topic, flags].filter(Boolean).join(" — ") || undefined };
    },
  },
  orderings: [
    { title: "Prioridad (mayor primero)", name: "priorityDesc", by: [{ field: "priority", direction: "desc" }] },
    { title: "Título A-Z", name: "titleAsc", by: [{ field: "title", direction: "asc" }] },
  ],
});
