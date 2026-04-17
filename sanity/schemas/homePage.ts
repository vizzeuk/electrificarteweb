import { defineField, defineType, defineArrayMember } from "sanity";

export const homePage = defineType({
  name: "homePage",
  title: "🏠 Página de Inicio",
  type: "document",
  // Singleton: enforced via Studio structure config in sanity.config.ts
  groups: [
    { name: "hero",         title: "🦸 Hero",             default: true },
    { name: "catalog",      title: "🚗 Catálogo" },
    { name: "howItWorks",   title: "📖 Cómo funciona" },
    { name: "social",       title: "💬 Testimonios y FAQ" },
  ],
  fields: [
    // ════════════════════════════════════════════════════════════════════════
    // HERO
    // ════════════════════════════════════════════════════════════════════════
    defineField({
      name: "heroBadge", title: "Badge del hero", type: "string",
      group: "hero", initialValue: "Marketplace #1 en Chile",
      description: 'Texto en el badge verde arriba del título. Ej: "Marketplace #1 en Chile"',
    }),
    defineField({
      name: "heroTitle", title: "Título principal", type: "string",
      group: "hero", initialValue: "Ahorra millones en tu próximo",
      description: "Primera parte del título (en blanco)",
    }),
    defineField({
      name: "heroTitleHighlight", title: "Palabra destacada del título", type: "string",
      group: "hero", initialValue: "auto electrificado",
      description: "Parte del título en color teal/primary",
    }),
    defineField({
      name: "heroSubtitle", title: "Subtítulo", type: "text", rows: 2,
      group: "hero",
      initialValue: "Negociamos con nuestra red exclusiva de concesionarios para garantizarte el mejor precio del mercado. Sin letra chica.",
    }),
    defineField({
      name: "heroCta1Text", title: "Botón principal – texto", type: "string",
      group: "hero", initialValue: "Solicitar mi oferta",
    }),
    defineField({
      name: "heroCta1Href", title: "Botón principal – enlace", type: "string",
      group: "hero", initialValue: "/solicitar",
    }),
    defineField({
      name: "heroCta2Text", title: "Botón secundario – texto", type: "string",
      group: "hero", initialValue: "Cómo funciona",
    }),
    // ─── Hero stats card ────────────────────────────────────────────────────
    defineField({
      name: "heroStatSavings", title: "Ahorro promedio (valor)", type: "string",
      group: "hero", initialValue: "$4.200.000 CLP",
      description: 'Ej: "$4.200.000 CLP"',
    }),
    defineField({
      name: "heroStatCars", title: "Autos vendidos", type: "string",
      group: "hero", initialValue: "500+",
    }),
    defineField({
      name: "heroStatDiscount", title: "Descuento promedio (%)", type: "string",
      group: "hero", initialValue: "27%",
    }),
    defineField({
      name: "heroStatResponse", title: "Tiempo de respuesta", type: "string",
      group: "hero", initialValue: "24h",
    }),
    defineField({
      name: "heroOfferOldPrice", title: "Oferta activa – precio tachado", type: "string",
      group: "hero", initialValue: "$29.990",
    }),
    defineField({
      name: "heroOfferNewPrice", title: "Oferta activa – precio final", type: "string",
      group: "hero", initialValue: "$19.990",
    }),
    defineField({
      name: "heroOfferBadge", title: "Oferta activa – badge (texto)", type: "string",
      group: "hero", initialValue: "33% dcto Electric Sale",
    }),

    // ════════════════════════════════════════════════════════════════════════
    // CATÁLOGO
    // ════════════════════════════════════════════════════════════════════════
    defineField({
      name: "latestLaunchesTitle", title: "Título 'Últimos Lanzamientos'", type: "string",
      group: "catalog", initialValue: "Últimos lanzamientos",
    }),
    defineField({
      name: "latestLaunchesCars", title: "Autos en 'Últimos Lanzamientos'", type: "array",
      group: "catalog",
      description: "Selecciona los autos que aparecen en la sección 'Últimos Lanzamientos' del home. Máximo 3.",
      of: [defineArrayMember({ type: "reference", to: [{ type: "car" }] })],
      validation: (r) => r.max(3),
    }),
    defineField({
      name: "hotDealCar", title: "🔥 Auto del HOT DEAL del home", type: "reference", to: [{ type: "car" }],
      group: "catalog",
      description: "El auto que aparece en la sección Hot Deal del home. Idealmente activa el flag 'HOT DEAL' en el auto también.",
    }),
    defineField({
      name: "opportunitiesTitle", title: "Título 'Destacados'", type: "string",
      group: "catalog", initialValue: "Destacados Electrificarte",
    }),
    defineField({
      name: "opportunitiesCars", title: "Autos en 'Destacados'", type: "array",
      group: "catalog",
      description: "Autos que aparecen en el carrusel de Destacados. Puedes agregar todos los que quieras.",
      of: [defineArrayMember({ type: "reference", to: [{ type: "car" }] })],
    }),
    defineField({
      name: "serviciosExtras", title: "Servicios adicionales (Wallbox · Seguros)", type: "array",
      group: "catalog",
      description: "Las dos cards de servicios adicionales que aparecen bajo Oportunidades. Máximo 2.",
      of: [defineArrayMember({
        type: "object", name: "servicioExtra", title: "Servicio",
        fields: [
          defineField({ name: "badge",       title: "Badge (ej: OFERTA, NUEVO)",   type: "string" }),
          defineField({ name: "title",       title: "Título de la card",           type: "string" }),
          defineField({ name: "description", title: "Descripción / subtítulo",     type: "text", rows: 2 }),
          defineField({ name: "ctaText",     title: "Texto del botón",             type: "string", initialValue: "Cotiza aquí" }),
          defineField({ name: "ctaHref",     title: "Enlace del botón",            type: "string" }),
          defineField({ name: "image",       title: "Imagen de fondo",             type: "image", options: { hotspot: true } }),
        ],
        preview: { select: { title: "title", media: "image" } },
      })],
      validation: (r) => r.max(2),
    }),

    // ════════════════════════════════════════════════════════════════════════
    // CÓMO FUNCIONA
    // ════════════════════════════════════════════════════════════════════════
    defineField({
      name: "howItWorksTitle", title: "Título 'Cómo Funciona'", type: "string",
      group: "howItWorks", initialValue: "Cómo funciona Electrificarte",
    }),
    defineField({
      name: "howItWorksSubtitle", title: "Subtítulo 'Cómo Funciona'", type: "text", rows: 2,
      group: "howItWorks",
      initialValue: "En 4 simples pasos pasas de buscar a estrenar tu auto eléctrico al mejor precio de Chile.",
    }),
    defineField({
      name: "howItWorksSteps", title: "Pasos del proceso", type: "array", group: "howItWorks",
      description: "Los 4 pasos de Cómo Funciona. Puedes editar el ícono, título y descripción.",
      of: [defineArrayMember({
        type: "object", name: "step", title: "Paso",
        fields: [
          defineField({ name: "number", title: "Número (display)", type: "string", description: 'Ej: "01"' }),
          defineField({ name: "icon",   title: "Ícono (Material Symbol)", type: "string", description: 'Ej: "search", "payments", "handshake", "celebration"' }),
          defineField({ name: "title",  title: "Título del paso", type: "string" }),
          defineField({ name: "description", title: "Descripción", type: "text", rows: 2 }),
        ],
        preview: { select: { title: "title", subtitle: "number" } },
      })],
    }),

    // ════════════════════════════════════════════════════════════════════════
    // TRUST BADGES
    // ════════════════════════════════════════════════════════════════════════
    defineField({
      name: "trustBadges", title: "Sellos de confianza", type: "array", group: "social",
      description: "Los 4 íconos de confianza (Pago seguro, Garantía, etc.)",
      of: [defineArrayMember({
        type: "object", name: "badge", title: "Sello",
        fields: [
          defineField({ name: "icon",        title: "Ícono (Material Symbol)", type: "string" }),
          defineField({ name: "title",       title: "Título",       type: "string" }),
          defineField({ name: "description", title: "Descripción",  type: "string" }),
        ],
        preview: { select: { title: "title" } },
      })],
    }),

    // ════════════════════════════════════════════════════════════════════════
    // TESTIMONIALS
    // ════════════════════════════════════════════════════════════════════════
    defineField({
      name: "testimonialsTitle", title: "Título 'Testimonios'", type: "string",
      group: "social", initialValue: "Lo que dicen nuestros clientes",
    }),
    defineField({
      name: "testimonials", title: "Testimonios de clientes", type: "array", group: "social",
      description: "Opiniones de clientes reales. Máximo 3 recomendado.",
      of: [defineArrayMember({
        type: "object", name: "testimonial", title: "Testimonio",
        fields: [
          defineField({ name: "name",    title: "Nombre del cliente", type: "string" }),
          defineField({ name: "car",     title: "Auto que compró",    type: "string", description: 'Ej: "Tesla Model 3"' }),
          defineField({ name: "savings", title: "Ahorro logrado",     type: "string", description: 'Ej: "$5.200.000"' }),
          defineField({ name: "quote",   title: "Opinión",            type: "text", rows: 3 }),
          defineField({ name: "rating",  title: "Calificación (1-5)", type: "number", initialValue: 5, validation: (r) => r.min(1).max(5) }),
        ],
        preview: { select: { title: "name", subtitle: "car" } },
      })],
    }),

    // ════════════════════════════════════════════════════════════════════════
    // FAQ
    // ════════════════════════════════════════════════════════════════════════
    defineField({
      name: "faqTitle", title: "Título de Preguntas Frecuentes", type: "string",
      group: "social", initialValue: "Preguntas frecuentes",
    }),
    defineField({
      name: "faqs", title: "Preguntas frecuentes", type: "array", group: "social",
      description: "Francisco puede agregar, editar o eliminar preguntas libremente.",
      of: [defineArrayMember({
        type: "object", name: "faqItem", title: "Pregunta",
        fields: [
          defineField({ name: "question", title: "Pregunta", type: "string" }),
          defineField({ name: "answer",   title: "Respuesta", type: "text", rows: 3 }),
        ],
        preview: { select: { title: "question" } },
      })],
    }),
  ],
  preview: {
    prepare() {
      return { title: "Página de Inicio" };
    },
  },
});
