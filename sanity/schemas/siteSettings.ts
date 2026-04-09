import { defineField, defineType, defineArrayMember } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "⚙️ Configuración del Sitio",
  type: "document",
  // Singleton: enforced via Studio structure config in sanity.config.ts
  groups: [
    { name: "general",  title: "🌐 General",   default: true },
    { name: "contact",  title: "📞 Contacto y RRSS" },
    { name: "navbar",   title: "🧭 Menú de navegación" },
    { name: "footer",   title: "🦶 Footer" },
  ],
  fields: [
    // ─── General ────────────────────────────────────────────────────────────
    defineField({
      name: "siteName", title: "Nombre del sitio", type: "string",
      group: "general", initialValue: "Electrificarte",
    }),
    defineField({
      name: "siteTagline", title: "Tagline general", type: "string",
      group: "general",
      description: 'Ej: "El marketplace #1 de autos eléctricos en Chile"',
    }),

    // ─── Contact ────────────────────────────────────────────────────────────
    defineField({
      name: "contactPhone", title: "Teléfono de contacto", type: "string",
      group: "contact", description: 'Ej: "+56 9 1234 5678"',
    }),
    defineField({
      name: "contactEmail", title: "Email de contacto", type: "string",
      group: "contact",
    }),
    defineField({
      name: "whatsappNumber", title: "Número WhatsApp (con código país)", type: "string",
      group: "contact", description: 'Ej: "56912345678" (sin + ni espacios)',
    }),
    defineField({
      name: "instagram", title: "Instagram (URL)", type: "url",
      group: "contact",
    }),
    defineField({
      name: "facebook", title: "Facebook (URL)", type: "url",
      group: "contact",
    }),
    defineField({
      name: "youtube", title: "YouTube (URL)", type: "url",
      group: "contact",
    }),
    defineField({
      name: "tiktok", title: "TikTok (URL)", type: "url",
      group: "contact",
    }),

    // ─── Navbar ─────────────────────────────────────────────────────────────
    defineField({
      name: "navbarBrands", title: "Marcas en el dropdown del navbar", type: "array",
      group: "navbar",
      description: "Selecciona qué marcas aparecen en el menú de navegación. Máximo 6-8 recomendado.",
      of: [defineArrayMember({ type: "reference", to: [{ type: "brand" }] })],
    }),

    // ─── Footer ─────────────────────────────────────────────────────────────
    defineField({
      name: "footerTagline", title: "Tagline del footer", type: "string",
      group: "footer",
      description: 'Ej: "El marketplace de autos eléctricos más confiable de Chile"',
    }),
    defineField({
      name: "footerLegal", title: "Texto legal / copyright", type: "string",
      group: "footer",
      description: 'Ej: "© 2025 Electrificarte SpA. Todos los derechos reservados."',
    }),
  ],
  preview: {
    prepare() {
      return { title: "Configuración del Sitio" };
    },
  },
});
