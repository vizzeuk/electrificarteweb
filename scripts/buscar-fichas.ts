/**
 * Busca PDFs de ficha técnica y lista de precios en la fuente de cada auto.
 *
 *   npx tsx --env-file=.env.local scripts/buscar-fichas.ts
 *   npx tsx --env-file=.env.local scripts/buscar-fichas.ts --solo-problemas
 *
 * Nace de dos hallazgos de la corrida: las specs por versión casi nunca están en
 * el HTML (por eso 23 autos tienen versiones con la ficha copiada de la base), y
 * varias marcas — Lexus es el caso claro — solo publican precios promocionales
 * en la web y el precio de lista vive en un PDF.
 *
 * `web_fetch` lee PDFs nativamente, así que una vez encontrado el enlace el
 * mismo flujo del re-check puede extraer de ahí. Esto solo los encuentra: no
 * descarga ni escribe nada.
 */

import { createClient } from "@sanity/client";

const soloProblemas = process.argv.includes("--solo-problemas");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

/** Los 23 autos cuyas versiones tienen la ficha copiada de la base. */
const CON_PROBLEMA = new Set([
  "Audi Q4 Sportback e-tron", "BAIC BJ60 MHEV", "Changan Eado Plus iDD", "Ford Territory",
  "Geely EX2", "Hyundai All New Palisade Híbrido", "Hyundai Tucson Híbrido", "Lexus LBX",
  "Lexus NX", "MG 4 Urban EV", "MG S5 EV", "Omoda C5 SHS", "Peugeot NEW 3008 MHEV",
  "Porsche Cayenne E-Hybrid", "Porsche Cayenne E-Hybrid Coupé", "Subaru Forester Strong Hybrid ASD",
  "Toyota Corolla Híbrido", "Volvo EX30", "Volvo XC90 Plug-in Hybrid", "Lexus UX",
]);

const FICHA = /ficha|tecnic|especific|spec|datasheet|cataloc?go|brochure|folleto/i;
const PRECIOS = /precio|lista|tarifa|pricelist|price-?list/i;

async function get(url: string): Promise<{ status: number; body: string }> {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, "accept-language": "es-CL,es;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
    return { status: r.status, body: r.ok ? await r.text() : "" };
  } catch {
    return { status: 0, body: "" };
  }
}

async function pesaPdf(url: string): Promise<number | null> {
  try {
    const r = await fetch(url, { method: "HEAD", headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
    if (!r.ok) return null;
    const n = Number(r.headers.get("content-length"));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const cars = await sanity.fetch<{ name: string; brand: string; sourceUrl: string }[]>(
    `*[_type == "car" && hidden != true && !(_id in path("drafts.**")) && count(sourceUrls) > 0]
     | order(brand->name asc, name asc) {
      name, "brand": brand->name, "sourceUrl": sourceUrls[0]
    }`
  );

  const objetivo = soloProblemas
    ? cars.filter((c) => CON_PROBLEMA.has(`${c.brand} ${c.name}`))
    : cars;

  console.log(`\nBuscando PDFs en la fuente de ${objetivo.length} autos…\n`);

  // Una misma página sirve a varios autos: se baja una sola vez.
  const porUrl = new Map<string, string[]>();
  for (const c of objetivo) porUrl.set(c.sourceUrl, [...(porUrl.get(c.sourceUrl) ?? []), `${c.brand} ${c.name}`]);

  let conFicha = 0;
  let conPrecios = 0;
  const hallados: string[] = [];

  for (const [url, autos] of porUrl) {
    const { body } = await get(url);
    if (!body) {
      console.log(`  \x1b[90m·\x1b[0m ${autos[0].padEnd(34)} la página no se pudo leer sin navegador`);
      continue;
    }
    const pdfs = new Set<string>();
    for (const m of body.matchAll(/href=["']([^"']+\.pdf[^"']*)["']/gi)) {
      try {
        pdfs.add(new URL(m[1], url).toString());
      } catch { /* href relativo raro */ }
    }
    // Enlaces de texto "Lista de precios" que no apuntan a .pdf directo.
    const enlacesPrecio = [...body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)]
      .filter((m) => PRECIOS.test(m[2].replace(/<[^>]+>/g, " ")))
      .map((m) => { try { return new URL(m[1], url).toString(); } catch { return ""; } })
      .filter(Boolean);

    if (!pdfs.size && !enlacesPrecio.length) {
      console.log(`  \x1b[90m·\x1b[0m ${autos[0].padEnd(34)} sin PDFs ni enlace de precios`);
      continue;
    }

    const fichas = [...pdfs].filter((u) => FICHA.test(u));
    const listas = [...pdfs].filter((u) => PRECIOS.test(u));
    const otros = [...pdfs].filter((u) => !FICHA.test(u) && !PRECIOS.test(u));

    console.log(`  \x1b[1m${autos.join(" · ")}\x1b[0m`);
    for (const u of fichas) {
      const kb = await pesaPdf(u);
      console.log(`      \x1b[32mficha\x1b[0m    ${u}${kb ? ` (${Math.round(kb / 1024)} kB)` : kb === null ? " (no responde)" : ""}`);
      conFicha++;
      hallados.push(`${autos[0]}\tficha\t${u}`);
    }
    for (const u of listas) {
      const kb = await pesaPdf(u);
      console.log(`      \x1b[36mprecios\x1b[0m  ${u}${kb ? ` (${Math.round(kb / 1024)} kB)` : kb === null ? " (no responde)" : ""}`);
      conPrecios++;
      hallados.push(`${autos[0]}\tprecios\t${u}`);
    }
    for (const u of otros.slice(0, 2)) console.log(`      \x1b[90motro\x1b[0m     ${u}`);
    for (const u of enlacesPrecio.slice(0, 2)) console.log(`      \x1b[36menlace\x1b[0m   ${u} \x1b[90m(texto "precios", puede ser una página)\x1b[0m`);
  }

  console.log(`\n── ${porUrl.size} páginas revisadas · ${conFicha} fichas técnicas · ${conPrecios} listas de precios ──\n`);
}

void main();
