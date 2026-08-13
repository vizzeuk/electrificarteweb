import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Rutas que no aportan nada en resultados de búsqueda y no deben indexarse:
// - /studio         → CMS privado.
// - /api/           → endpoints, no contenido.
// - páginas de post-pago → son estados de una transacción, no contenido. Además solo se ven
//   con una cookie firmada válida, así que un crawler solo obtendría un 404.
const DISALLOW = [
  "/studio",
  "/api/",
  "/solicitar/gracias",
  "/solicitar/asesoria-gracias",
  "/solicitar/pago-rechazado",
];

// Crawlers de las IA generativas (ChatGPT, Claude, Perplexity, Gemini…). Se listan explícito
// aunque la regla "*" ya los cubriría: varios leen primero su propio user-agent, y dejarlo
// escrito documenta que SÍ queremos que nos citen — es el equivalente SEO para buscadores
// con IA, donde aparecer como fuente vale tanto como rankear.
const AI_CRAWLERS = [
  "GPTBot",             // OpenAI — entrenamiento
  "OAI-SearchBot",      // OpenAI — búsqueda en ChatGPT
  "ChatGPT-User",       // OpenAI — navegación en vivo pedida por el usuario
  "ClaudeBot",          // Anthropic
  "Claude-User",        // Anthropic — navegación en vivo
  "PerplexityBot",      // Perplexity
  "Perplexity-User",    // Perplexity — navegación en vivo
  "Google-Extended",    // Google — Gemini / AI Overviews
  "Applebot-Extended",  // Apple Intelligence
  "cohere-ai",
  "Meta-ExternalAgent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
