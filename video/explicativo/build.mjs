// Arma los dos proyectos HyperFrames del video explicativo (16:9 y 9:16) desde src/.
//
//   node video/explicativo/build.mjs
//
// Qué hace:
// 1. Trae de Sanity los autos que aparecen en el video (fotos, marca, precio, autonomía) y
//    los inyecta en la composición: las cifras salen del catálogo, nunca escritas a mano.
// 2. Copia las fuentes (Cabinet Grotesk y Switzer), el logo y la foto de Francisco a assets/.
//    Las fuentes no se versionan (licencia ITF FFL, ver scripts/fetch-fonts.mjs): por eso
//    horizontal/ y vertical/ están en .gitignore y se regeneran con este script.
// 3. Si existe src/voz.mp3 (o .wav/.m4a), la agrega como pista de audio. Los tiempos salen de
//    src/timing.json (align.mjs los calza con la voz) y los subtítulos de src/script.json.
// 4. Escribe horizontal/index.html (1920x1080) y vertical/index.html (1080x1920).
//
// Después: npx hyperframes preview video/explicativo/horizontal (o render).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const HERE = import.meta.dirname;
const ROOT = path.resolve(HERE, "../..");
const SRC = path.join(HERE, "src");
const CACHE = path.join(HERE, ".cache");

const SANITY = "https://wd30r9b0.apicdn.sanity.io/v2025-01-01/data/query/production";

/** Muro de autos de la escena 1 (orden = orden en pantalla, 4 por columna). */
const WALL = [
  "tesla-model-3", "byd-dolphin-mini", "hyundai-ioniq-5", "bmw-ix1-xdrive30-xline",
  "chery-tiggo-8-pro-phev", "fiat-500-e", "geely-ex5", "haval-h6-hibrido",
  "jaecoo-7-shs", "cupra-tavascan-ev", "byd-song-plus-dm-i", "honda-crv-hybrid-ehev",
];
/** Los mismos tres autos del ejemplo de conversación de /asesoria. El elegido va primero en `PICK`. */
const EXAMPLE = ["byd-yuan-plus", "hyundai-kona-electrico", "volvo-ex30"];
const PICK = "hyundai-kona-electrico";

const FORMATS = [
  { dir: "horizontal", w: 1920, h: 1080, orient: "h" },
  { dir: "vertical", w: 1080, h: 1920, orient: "v" },
];

async function groq(query, params = {}) {
  const qs = new URLSearchParams({ query });
  for (const [k, v] of Object.entries(params)) qs.set(`$${k}`, JSON.stringify(v));
  const res = await fetch(`${SANITY}?${qs}`);
  if (!res.ok) throw new Error(`Sanity respondió ${res.status}`);
  return (await res.json()).result;
}

const clp = (n) => "$" + Math.round(n).toLocaleString("es-CL").replace(/,/g, ".");
const num = (n) => Math.round(n).toLocaleString("es-CL").replace(/,/g, ".");

/** Misma regla que carStats() en lib/utils.ts. */
function rangeLabel(range, maxVer) {
  const base = range ?? 0;
  const max = maxVer ?? 0;
  if (max > base) return `hasta ${num(max)} km`;
  return base > 0 ? `${num(base)} km` : null;
}

/** Las tres primeras specs disponibles, en el orden de carStats() para un 100% eléctrico. */
function specsOf(c) {
  const all = [
    ["Autonomía", rangeLabel(c.range, c.maxVer)],
    ["Batería", c.battery >= 1 ? `${c.battery.toLocaleString("es-CL")} kWh` : null],
    ["Eficiencia", c.rendimientoElectrico ? `${c.rendimientoElectrico.toLocaleString("es-CL")} km/kWh` : null],
    ["Potencia", c.power > 0 ? `${c.power} CV` : null],
    ["Plazas", c.seats > 0 ? `${c.seats} plazas` : null],
  ];
  return all.filter(([, v]) => v).slice(0, 3).map(([label, value]) => ({ label, value }));
}

async function download(url, file) {
  if (existsSync(file)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo bajar ${url}: ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  mkdirSync(CACHE, { recursive: true });

  // ── Datos del catálogo ──
  const slugs = [...WALL, ...EXAMPLE];
  const cars = await groq(
    `*[_type == "car" && hidden != true && slug.current in $slugs]{
      "slug": slug.current, name, "brand": brand->name, basePrice, discountPrice, range,
      battery, rendimientoElectrico, power, seats, "tag": electricType->tag,
      "maxVer": math::max(versions[defined(range) && range > 0].range),
      "img": coalesce(mainImage.asset->url, images[0].asset->url)
    }`,
    { slugs },
  );
  const bySlug = Object.fromEntries(cars.map((c) => [c.slug, c]));
  const missing = slugs.filter((s) => !bySlug[s]?.img);
  if (missing.length) throw new Error(`Autos sin ficha visible o sin foto: ${missing.join(", ")}`);
  const models = await groq(`count(*[_type == "car" && hidden != true])`);
  // "Más de N": se redondea hacia abajo a la decena para que siga siendo cierto si el catálogo crece.
  const modelsFloor = Math.floor(models / 10) * 10;

  for (const s of slugs) {
    await download(`${bySlug[s].img}?w=720&h=450&fit=crop&crop=center&fm=jpg&q=82`, path.join(CACHE, `${s}.jpg`));
  }
  // Foto grande del auto elegido (auto destacado de la escena 4, mismo diseño que el de las PLP).
  await download(`${bySlug[PICK].img}?w=1600&h=1000&fit=crop&crop=center&fm=jpg&q=85`, path.join(CACHE, "pick-large.jpg"));

  const data = {
    modelsFloor,
    wall: WALL.map((s) => ({ slug: s, brand: bySlug[s].brand, name: bySlug[s].name })),
    example: EXAMPLE.map((s) => {
      const c = bySlug[s];
      const price = c.discountPrice && c.discountPrice < c.basePrice ? c.discountPrice : c.basePrice;
      return {
        slug: s, title: `${c.brand} ${c.name}`, brand: c.brand, name: c.name, tag: c.tag,
        price: clp(price), listPrice: !(c.discountPrice && c.discountPrice < c.basePrice),
        range: rangeLabel(c.range, c.maxVer), specs: specsOf(c),
      };
    }),
    pick: PICK,
  };

  // ── Fuentes ──
  const FONTS = path.join(ROOT, "app/fonts/fontshare");
  if (!existsSync(path.join(FONTS, "Switzer-400.woff2"))) {
    execFileSync("node", [path.join(ROOT, "scripts/fetch-fonts.mjs")], { stdio: "inherit" });
  }

  const voice = ["voz.mp3", "voz.wav", "voz.m4a"].find((f) => existsSync(path.join(SRC, f)));
  const script = JSON.parse(readFileSync(path.join(SRC, "script.json"), "utf8"));
  const timing = JSON.parse(readFileSync(path.join(SRC, "timing.json"), "utf8"));
  if (timing.captions.length !== script.lines.length) {
    throw new Error("timing.json no calza con script.json (distinta cantidad de frases): corre align.mjs.");
  }
  // La voz puede venir de align.mjs (voz grabada, retiempa el video) o de voice.mjs (Cartesia por
  // API a la medida del video; deja src/voz.json). Solo avisa si no pasó por ninguno de los dos.
  if (voice && timing.source !== "voz" && !existsSync(path.join(SRC, "voz.json"))) {
    console.warn("Ojo: hay voz pero timing.json es la estimación. Corre node video/explicativo/align.mjs para calzarla.");
  }
  const template = readFileSync(path.join(SRC, "composition.html"), "utf8");

  for (const f of FORMATS) {
    const out = path.join(HERE, f.dir);
    const assets = path.join(out, "assets");
    mkdirSync(path.join(assets, "fonts"), { recursive: true });
    mkdirSync(path.join(assets, "cars"), { recursive: true });

    for (const file of ["CabinetGrotesk-700", "CabinetGrotesk-800", "Switzer-400", "Switzer-500", "Switzer-600", "Switzer-700"]) {
      copyFileSync(path.join(FONTS, `${file}.woff2`), path.join(assets, "fonts", `${file}.woff2`));
    }
    copyFileSync(path.join(ROOT, "public/brand/electrificarte-wordmark.webp"), path.join(assets, "wordmark.webp"));
    copyFileSync(path.join(ROOT, "public/brand/electrificarte-lockup.webp"), path.join(assets, "lockup.webp"));
    copyFileSync(path.join(ROOT, "public/images/foto-francisco.jpeg"), path.join(assets, "francisco.jpg"));
    for (const s of slugs) copyFileSync(path.join(CACHE, `${s}.jpg`), path.join(assets, "cars", `${s}.jpg`));
    copyFileSync(path.join(CACHE, "pick-large.jpg"), path.join(assets, "cars", "pick-large.jpg"));
    if (voice) copyFileSync(path.join(SRC, voice), path.join(assets, voice));

    const html = template
      .replaceAll("__W__", String(f.w))
      .replaceAll("__H__", String(f.h))
      .replaceAll("__ORIENT__", f.orient)
      .replaceAll("__TOTAL__", String(timing.total))
      .replace("/*__DATA__*/null", JSON.stringify(data))
      .replace("/*__TIMING__*/null", JSON.stringify(timing))
      .replace("/*__SCRIPT__*/null", JSON.stringify(script.lines.map((l) => l.text)))
      .replace(
        "<!--__VOICE__-->",
        voice
          ? `<audio id="voz" class="clip" data-start="0" data-track-index="9" src="assets/${voice}" data-volume="1"></audio>`
          : "",
      );
    writeFileSync(path.join(out, "index.html"), html);
    writeFileSync(
      path.join(out, "hyperframes.json"),
      JSON.stringify({ $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", paths: { assets: "assets" } }, null, 2) + "\n",
    );
    writeFileSync(path.join(out, "meta.json"), JSON.stringify({ id: `explicativo-${f.dir}`, name: `explicativo-${f.dir}` }, null, 2) + "\n");
  }

  console.log(`Listo: ${models} modelos visibles (se muestra "más de ${modelsFloor}").`);
  console.log(`Voz: ${voice ? `src/${voice}` : "sin voz (el video lleva subtítulos igual)"}. Tiempos: ${timing.source}, ${timing.total} s.`);
  console.log("Preview: npx hyperframes preview video/explicativo/horizontal");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
