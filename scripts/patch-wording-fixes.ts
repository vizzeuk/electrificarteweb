/**
 * Parcha el contenido LIVE en Sanity para alinear wording/terminología con las
 * correcciones del código:
 *   - homePage.heroTitleHighlight  "auto eléctrico" → "auto electrificado"
 *   - homePage.heroSubtitle        concesionario(s) → vendedor(es) oficial(es)
 *   - homePage.testimonials[]      "Francisco M." → "Rodrigo M." + limpia concesionario
 *   - blogPost (guía 2025)         metaTitle: alinea el año (2026 → 2025)
 *   - siteSettings                 contactEmail / contactPhone / whatsappNumber
 *
 * Es idempotente (reemplazos de string). Por defecto hace DRY-RUN e imprime el
 * diff. Para aplicar de verdad, pasa --apply.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/patch-wording-fixes.ts          (dry-run)
 *   npx tsx --env-file=.env.local scripts/patch-wording-fixes.ts --apply  (escribe)
 */

import { createClient } from "@sanity/client";

const APPLY = process.argv.includes("--apply");

const client = createClient({
  projectId:   process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset:     process.env.NEXT_PUBLIC_SANITY_DATASET   || "production",
  apiVersion:  "2025-01-01",
  token:       process.env.SANITY_API_TOKEN || "",
  useCdn:      false,
  perspective: "raw" as const,
});

// Reemplaza "concesionario(s)/concesionaria(s)" → "vendedor(es) oficial(es)".
function fixConcesionario(text: string): string {
  if (!text) return text;
  return text
    .replace(/concesionarios/gi, "vendedores oficiales")
    .replace(/concesionarias/gi, "vendedores oficiales")
    .replace(/concesionario/gi, "vendedor oficial")
    .replace(/concesionaria/gi, "vendedor oficial");
}

function diff(label: string, before: unknown, after: unknown) {
  if (JSON.stringify(before) === JSON.stringify(after)) {
    console.log(`  = ${label}: (sin cambios)`);
    return false;
  }
  console.log(`  ~ ${label}:`);
  console.log(`      antes: ${JSON.stringify(before)}`);
  console.log(`      desp.: ${JSON.stringify(after)}`);
  return true;
}

async function main() {
  if (!process.env.SANITY_API_TOKEN) {
    console.error("✗ Falta SANITY_API_TOKEN en el entorno (.env.local).");
    process.exit(1);
  }
  console.log(APPLY ? "── MODO APLICAR ──\n" : "── DRY-RUN (usa --apply para escribir) ──\n");

  const tx = client.transaction();
  let changes = 0;

  // ─── homePage ───────────────────────────────────────────────────────────
  const home = await client.fetch(
    `*[_type == "homePage"][0]{ _id, heroTitleHighlight, heroSubtitle, testimonials }`
  );
  if (home?._id) {
    console.log(`homePage (${home._id}):`);
    const patch: Record<string, unknown> = {};

    if (home.heroTitleHighlight && /el[eé]ctrico/i.test(home.heroTitleHighlight)) {
      const next = "auto electrificado";
      if (diff("heroTitleHighlight", home.heroTitleHighlight, next)) { patch.heroTitleHighlight = next; changes++; }
    }
    if (home.heroSubtitle) {
      const next = fixConcesionario(home.heroSubtitle);
      if (diff("heroSubtitle", home.heroSubtitle, next)) { patch.heroSubtitle = next; changes++; }
    }
    if (Array.isArray(home.testimonials) && home.testimonials.length) {
      const next = home.testimonials.map((t: any) => ({
        ...t,
        name:  t.name === "Francisco M." ? "Rodrigo M." : t.name,
        quote: fixConcesionario(t.quote || ""),
      }));
      if (diff("testimonials", home.testimonials, next)) { patch.testimonials = next; changes++; }
    }
    if (Object.keys(patch).length) tx.patch(home._id, (p) => p.set(patch));
  } else {
    console.log("homePage: no encontrado (se omite).");
  }

  // ─── blogPost: alinear año en metaTitle ────────────────────────────────────
  const posts = await client.fetch(
    `*[_type == "blogPost" && (metaTitle match "2026" || title match "2026")]{ _id, title, metaTitle }`
  );
  console.log(`\nblogPost con "2026": ${posts.length}`);
  for (const post of posts) {
    console.log(`blogPost (${post._id}):`);
    const next = (post.metaTitle || "").replace(/2026/g, "2025");
    if (diff("metaTitle", post.metaTitle, next)) {
      tx.patch(post._id, (p) => p.set({ metaTitle: next }));
      changes++;
    }
  }

  // Nota: los datos de contacto (email/teléfono/WhatsApp) se renderizan
  // hardcodeados en /contacto y el footer, así que no se tocan campos de
  // siteSettings aquí (evita dejar un draft con cambios sin publicar).

  console.log(`\n${changes} campo(s) con cambios.`);
  if (!changes) { console.log("Nada que hacer."); return; }

  if (APPLY) {
    await tx.commit();
    console.log("✓ Cambios aplicados en Sanity.");
  } else {
    console.log("Dry-run: no se escribió nada. Corre con --apply para aplicar.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
