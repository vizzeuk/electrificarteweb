/**
 * Graba el hero animation HTML con Playwright y exporta MP4 + WebM + poster
 * Uso: npx tsx scripts/record-hero.ts
 */
import { chromium } from "playwright";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

const DURATION_MS  = 50_000; // 48.25s de animación + buffer
const URL          = "http://localhost:3000/hero-video/Electrificarte_Video_16x9.html";
const OUT_DIR      = path.join(process.cwd(), "public/hero-video");
const WEBM_RAW     = path.join(OUT_DIR, "hero-raw.webm");
const WEBM_OUT     = path.join(OUT_DIR, "hero.webm");
const MP4_OUT      = path.join(OUT_DIR, "hero.mp4");
const POSTER_OUT   = path.join(OUT_DIR, "hero-poster.jpg");

async function main() {
  console.log("▶ Lanzando Chromium...");
  const browser = await chromium.launch({ headless: false }); // headless:false para que JS/audio corran bien

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: OUT_DIR,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await ctx.newPage();

  console.log(`▶ Abriendo ${URL}`);
  await page.goto(URL, { waitUntil: "networkidle" });

  // Darle un segundo para que arranque la animación
  await page.waitForTimeout(1000);

  console.log(`▶ Grabando ${DURATION_MS / 1000}s...`);
  await page.waitForTimeout(DURATION_MS);

  console.log("▶ Cerrando contexto...");
  const video = await page.video();
  await ctx.close();
  await browser.close();

  // Playwright guarda el webm con nombre aleatorio — lo renombramos
  const savedPath = await video!.path();
  fs.renameSync(savedPath, WEBM_RAW);
  console.log(`✓ WebM raw guardado: ${WEBM_RAW}`);

  // Verificar ffmpeg
  try { execSync("which ffmpeg", { stdio: "ignore" }); }
  catch { console.error("✗ ffmpeg no encontrado. Instala con: brew install ffmpeg"); process.exit(1); }

  console.log("▶ Convirtiendo a MP4 (H.264)...");
  execSync(
    `ffmpeg -y -i "${WEBM_RAW}" \
      -vcodec libx264 -crf 23 -preset slow \
      -movflags +faststart \
      -an "${MP4_OUT}"`,
    { stdio: "inherit" }
  );
  console.log(`✓ MP4: ${MP4_OUT}`);

  console.log("▶ Optimizando WebM (VP9)...");
  execSync(
    `ffmpeg -y -i "${WEBM_RAW}" \
      -vcodec libvpx-vp9 -crf 30 -b:v 0 \
      -an "${WEBM_OUT}"`,
    { stdio: "inherit" }
  );
  console.log(`✓ WebM: ${WEBM_OUT}`);

  console.log("▶ Extrayendo poster (frame 2s)...");
  execSync(
    `ffmpeg -y -ss 2 -i "${MP4_OUT}" -vframes 1 -q:v 2 "${POSTER_OUT}"`,
    { stdio: "inherit" }
  );
  console.log(`✓ Poster: ${POSTER_OUT}`);

  // Limpiar raw
  fs.unlinkSync(WEBM_RAW);

  console.log("\n✅ Listo. Archivos generados:");
  for (const f of [MP4_OUT, WEBM_OUT, POSTER_OUT]) {
    const kb = Math.round(fs.statSync(f).size / 1024);
    console.log(`   ${path.basename(f)} — ${kb} KB`);
  }
}

main().catch(console.error);
