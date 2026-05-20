import { defineField, defineType } from "sanity";

export const plpBanner = defineType({
  name: "plpBanner",
  title: "Banner PLP",
  type: "object",
  fields: [
    defineField({
      name: "active",
      title: "Activo",
      type: "boolean",
      initialValue: true,
      description: "Desactiva para ocultar el banner sin eliminarlo.",
    }),
    defineField({
      name: "image",
      title: "Imagen del banner (Desktop)",
      type: "image",
      options: { hotspot: true },
      validation: (r) => r.required(),
      description: "Versión desktop. Si NO subís imagen mobile, esta se usa en ambos. Recomendado: 1440×320px, JPG/WebP.",
    }),
    defineField({
      name: "mobileImage",
      title: "Imagen del banner (Mobile) — opcional",
      type: "image",
      options: { hotspot: true },
      description: "Versión mobile (vertical/cuadrada). Solo se usa en pantallas ≤767px. Si la dejás vacía, se usa la desktop también en mobile. Recomendado: 750×900px o 1080×1080px.",
    }),
    defineField({
      name: "ctaHref",
      title: "URL destino (al hacer clic)",
      type: "string",
      description: 'Relativa o externa. Ej: "/solicitar?auto=bmw-i7" o "https://electrificarte.com/auto/bmw-i7"',
    }),
    defineField({
      name: "altText",
      title: "Texto alternativo (accesibilidad)",
      type: "string",
      description: 'Describe brevemente el banner para lectores de pantalla. Ej: "Oferta BMW i7 – Ahorra $8 millones"',
    }),
  ],
  preview: {
    select: {
      active: "active",
      media:  "image",
      href:   "ctaHref",
    },
    prepare({ active, media, href }) {
      return {
        title:    href ?? "Sin URL",
        subtitle: active === false ? "🔴 Inactivo" : "🟢 Activo",
        media,
      };
    },
  },
});
