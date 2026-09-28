// Comprime los renders y los deja donde los lee el sitio (components/layout/HowItWorks.tsx):
//   public/hero-video/explicativo-16x9.mp4, explicativo-9x16.mp4 y explicativo-poster.jpg
//
//   node video/explicativo/publish.mjs
//
// Necesita ffmpeg en el PATH. Los renders pesan ~10 MB cada uno; comprimidos quedan en ~2 MB,
// igual que el video anterior, para no cargar de más la home. Si hay voz, se incluye en AAC.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const HERE = import.meta.dirname;
const ROOT = path.resolve(HERE, "../..");
const RENDERS = path.join(HERE, "renders");
const OUT = path.join(ROOT, "public/hero-video");

/** Póster: el final de la escena 4 (banda oscura con el auto elegido), sin subtítulo. Se saca de
 *  una copia del proyecto con los subtítulos ocultos, así sirve con cualquier voz y tiempos. */
const timing = JSON.parse(readFileSync(path.join(HERE, "src/timing.json"), "utf8"));
const POSTER_AT = (timing.scenes.s5 - 0.05).toFixed(2);

const JOBS = [
  { src: "explicativo-16x9.mp4", dst: "explicativo-16x9.mp4", scale: "1280:-2" },
  { src: "explicativo-9x16.mp4", dst: "explicativo-9x16.mp4", scale: "720:-2" },
];

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
}

for (const job of JOBS) {
  const src = path.join(RENDERS, job.src);
  if (!existsSync(src)) throw new Error(`Falta ${src}: renderiza primero (ver README.md).`);
  ffmpeg([
    "-i", src,
    "-vf", `scale=${job.scale}`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k",
    "-movflags", "+faststart",
    path.join(OUT, job.dst),
  ]);
  console.log(`public/hero-video/${job.dst}`);
}

const posterDir = path.join(HERE, ".cache", "poster");
rmSync(posterDir, { recursive: true, force: true });
cpSync(path.join(HERE, "horizontal"), posterDir, { recursive: true, filter: (f) => !f.includes("snapshots") });
const html = path.join(posterDir, "index.html");
writeFileSync(html, readFileSync(html, "utf8").replace("</style>", "#captions { display: none; }\n    </style>"));
execFileSync("npx", ["--yes", "hyperframes@0.8.78", "snapshot", posterDir, "--at", POSTER_AT, "--no-end", "--describe", "false", "-o", path.join(posterDir, "shot")], { stdio: "ignore" });
const shot = readdirSync(path.join(posterDir, "shot")).find((f) => f.endsWith(".png") && f.startsWith("frame-"));
ffmpeg(["-i", path.join(posterDir, "shot", shot), "-vf", "scale=1280:-2", "-q:v", "4", path.join(OUT, "explicativo-poster.jpg")]);
console.log("public/hero-video/explicativo-poster.jpg");
