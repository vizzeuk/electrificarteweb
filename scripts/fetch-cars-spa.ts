/**
 * Renderiza con navegador headless (Playwright) las PDPs que son SPA —
 * páginas cuyas imágenes cargan con JavaScript y por eso no aparecen en el
 * HTML crudo que baja fetch-cars.ts.
 *
 * Uso:
 *   npx tsx scripts/fetch-cars-spa.ts                       (las 5 SPA conocidas)
 *   npx tsx scripts/fetch-cars-spa.ts chery-tiggo-7 ...      (slugs puntuales)
 *
 * Por cada auto deja en data/scrape/<slug>/:
 *   images-spa.txt   — URLs de imágenes del DOM ya renderizado
 *   page-spa.txt     — texto visible de la página renderizada
 *
 * Requiere: data/scrape/<slug>/meta.json (lo genera fetch-cars.ts).
 */

import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";

const OUT_DIR = path.resolve(__dirname, "../data/scrape");
const DEFAULT_SPA = [
  "chery-tiggo-7",
  "chery-tiggo-4",
  "cupra-terramar",
  "leapmotor-b10",
  "volkswagen-tiguan-e-tsi",
];

const USE_SECONDARY = process.argv.includes("--secondary");
const slugs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const targets = slugs.length ? slugs : DEFAULT_SPA;

async function processCar(slug: string, browser: import("playwright").Browser) {
  const dir = path.join(OUT_DIR, slug);
  const metaPath = path.join(dir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    console.log(`  ✗ ${slug} — no existe meta.json (corré antes fetch-cars.ts)`);
    return;
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  });

  const url = USE_SECONDARY && meta.secondaryUrl ? meta.secondaryUrl : meta.sourceUrl;

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    // Scroll completo para disparar la carga diferida (lazy-load) de imágenes.
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let y = 0;
        const step = 600;
        const timer = setInterval(() => {
          window.scrollBy(0, step);
          y += step;
          if (y >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });
    await page.waitForTimeout(2000);

    const images: string[] = await page.evaluate(() => {
      const urls = new Set<string>();
      for (const img of Array.from(document.querySelectorAll("img"))) {
        const el = img as HTMLImageElement;
        if (el.currentSrc) urls.add(el.currentSrc);
        if (el.src) urls.add(el.src);
      }
      for (const s of Array.from(document.querySelectorAll("source"))) {
        const ss = (s as HTMLSourceElement).srcset;
        if (ss) ss.split(",").forEach((p) => urls.add(p.trim().split(" ")[0]));
      }
      for (const el of Array.from(document.querySelectorAll("*"))) {
        const bg = getComputedStyle(el).backgroundImage;
        const m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (m) urls.add(m[1]);
      }
      return [...urls].filter((u) => /^https?:\/\//.test(u) && /\.(jpe?g|png|webp)/i.test(u));
    });

    const text = (await page.evaluate(() => document.body.innerText)) ?? "";

    fs.writeFileSync(path.join(dir, "images-spa.txt"), images.join("\n"));
    fs.writeFileSync(path.join(dir, "page-spa.txt"), text.replace(/\n{3,}/g, "\n\n"));
    console.log(`  ✓ ${slug} — ${images.length} imágenes · ${text.length} chars de texto`);
  } catch (err) {
    console.log(`  ✗ ${slug} — ${(err as Error).message}`);
  } finally {
    await page.close();
  }
}

async function main() {
  console.log(`\nRenderizando ${targets.length} PDP(s) SPA con Chromium...\n`);
  const browser = await chromium.launch();
  for (const slug of targets) {
    await processCar(slug, browser);
  }
  await browser.close();
  console.log(`\nListo. Imágenes en data/scrape/<slug>/images-spa.txt\n`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
