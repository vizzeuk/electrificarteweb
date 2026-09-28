// Genera la voz con la API de Cartesia, frase por frase, y la deja lista para el video.
//
//   node video/explicativo/voice.mjs --voice <voice-id>              # modo natural (recomendado)
//   node video/explicativo/voice.mjs --voice <voice-id> --fit        # voz a la medida del video actual
//   node video/explicativo/voice.mjs --take                          # una sola toma + align.mjs
//   opciones: --model sonic-3.6  --emotion calm  --speed 1.05  --language es  --fake
//
// Pide a Cartesia cada frase de src/script.json (campo `say`) por separado, así se sabe al
// milisegundo dónde empieza cada una, sin transcribir nada.
//
// Modo natural (por defecto): las frases van a velocidad normal (o la de --speed), una detrás
// de otra con pausas según la puntuación, y src/timing.json se reescribe para que el video siga
// a la voz. El diseño y las animaciones no cambian: solo se corre el momento en que aparece
// cada cosa, y el largo total sale de la voz.
//
// Modo --fit: no toca src/timing.json. Cada frase se ubica cuando aparece su subtítulo actual;
// si no cabe se pide más rápida (hasta 1,5x, el tope de Cartesia) y si sobra espacio, un poco
// más lenta. Sirve si el video no se puede mover, pero con tiempos apretados se oye apurado.
//
// Resultado: src/voz.wav (+ src/voz.json con el detalle). Después: build.mjs, render y publish.mjs.
// La clave se lee de CARTESIA_API_KEY (entorno o .env.local); la voz, de --voice o CARTESIA_VOICE_ID.
// Cada frase queda en .cache/voz/ según texto, voz, modelo y velocidad: repetir no vuelve a cobrar.
// Con --fake usa la voz del Mac en vez de Cartesia (para probar sin gastar créditos).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const HERE = import.meta.dirname;
const ROOT = path.resolve(HERE, "../..");
const SRC = path.join(HERE, "src");
const CACHE = path.join(HERE, ".cache", "voz");
const SR = 44100;

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const FAKE = args.includes("--fake");
const FIT = args.includes("--fit");
const BASE_SPEED = Number(arg("speed", "1"));
const TAKE = args.includes("--take");
const MODEL = arg("model", "sonic-3.6");
const EMOTION = arg("emotion", "calm");
const VOICE = arg("voice", envVar("CARTESIA_VOICE_ID"));
const LANGUAGE = arg("language", "es");

const MAX_SPEED = 1.5; // límite de Cartesia
const MIN_SPEED = 0.9; // más lento suena arrastrado
const FILL = 0.92; // una frase idealmente ocupa ~92% de su espacio; el resto es respiro
const GAP = 0.12; // --fit: silencio mínimo antes de la frase siguiente

/** Modo natural: pausa después de cada frase según cómo termina. */
function pauseAfter(text, sceneChange) {
  if (sceneChange) return 0.55;
  if (/[.?!]$/.test(text)) return 0.35;
  if (/:$/.test(text)) return 0.25;
  return 0.1; // coma o frase cortada: sigue de corrido
}

function envVar(name) {
  if (process.env[name]) return process.env[name];
  const env = path.join(ROOT, ".env.local");
  if (existsSync(env)) {
    const m = readFileSync(env, "utf8").match(new RegExp(`^${name}=(.+)$`, "m"));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}
const apiKey = () => envVar("CARTESIA_API_KEY");

/** PCM 16 bit mono de un WAV (busca el chunk "data"; no asume cabecera de 44 bytes). */
function readWav(buf) {
  let off = 12;
  let fmt = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") fmt = { channels: buf.readUInt16LE(off + 10), rate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    if (id === "data") {
      if (!fmt || fmt.bits !== 16 || fmt.rate !== SR) throw new Error(`WAV inesperado: ${JSON.stringify(fmt)}`);
      const n = Math.floor(Math.min(size, buf.length - off - 8) / 2 / fmt.channels);
      const out = new Int16Array(n);
      for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(off + 8 + i * 2 * fmt.channels);
      return out;
    }
    off += 8 + size + (size % 2);
  }
  throw new Error("WAV sin datos");
}

/** Quita el silencio de las puntas (deja 30 ms de aire). */
function trim(pcm) {
  const th = 400;
  let a = 0;
  let b = pcm.length - 1;
  while (a < b && Math.abs(pcm[a]) < th) a++;
  while (b > a && Math.abs(pcm[b]) < th) b--;
  const pad = Math.round(0.03 * SR);
  return pcm.slice(Math.max(0, a - pad), Math.min(pcm.length, b + pad));
}

/** Escribe PCM 16 bit mono como WAV. */
function writeWav(file, pcm) {
  const data = Buffer.alloc(pcm.length * 2);
  for (let i = 0; i < pcm.length; i++) data.writeInt16LE(pcm[i], i * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([header, data]));
}

async function synth(text, speed) {
  const key = createHash("sha1").update(JSON.stringify({ text, speed, MODEL, VOICE, LANGUAGE, EMOTION, FAKE })).digest("hex").slice(0, 16);
  const file = path.join(CACHE, `${key}.wav`);
  if (!existsSync(file)) {
    if (FAKE) {
      execFileSync("say", ["-v", "Paulina", "-r", String(Math.round(175 * speed)), "-o", file, `--data-format=LEI16@${SR}`, text]);
    } else {
      const res = await fetch("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: {
          "X-API-Key": apiKey(),
          "Cartesia-Version": "2026-08-14",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: MODEL,
          transcript: text,
          voice: { mode: "id", id: VOICE },
          language: LANGUAGE,
          output_format: { container: "wav", encoding: "pcm_s16le", sample_rate: SR },
          generation_config: { speed: Number(speed.toFixed(3)), volume: 1, emotion: EMOTION },
        }),
      });
      if (!res.ok) throw new Error(`Cartesia respondió ${res.status}: ${await res.text()}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
  }
  return trim(readWav(readFileSync(file)));
}

async function main() {
  if (!FAKE) {
    if (!apiKey()) throw new Error("Falta CARTESIA_API_KEY (en el entorno o en .env.local).");
    if (!VOICE) throw new Error("Falta la voz: --voice <voice-id> (el ID de la voz que usaste en Cartesia).");
  }
  mkdirSync(CACHE, { recursive: true });

  const script = JSON.parse(readFileSync(path.join(SRC, "script.json"), "utf8"));
  const timingPath = path.join(SRC, "timing.json");
  const timing = JSON.parse(readFileSync(timingPath, "utf8"));
  const lines = script.lines;
  const clips = [];
  const report = [];

  if (TAKE) {
    // Una sola toma continua (la entonación más natural), con pausas entre escenas, y después
    // align.mjs encuentra dónde cae cada frase y retiempa el video.
    let transcript = "";
    lines.forEach((line, i) => {
      if (i > 0) transcript += line.scene !== lines[i - 1].scene ? `\n<break time="${line.scene === "s5" ? 500 : 400}ms"/>\n` : " ";
      transcript += line.say ?? line.text;
    });
    const pcm = await synth(transcript, BASE_SPEED);
    const lead = new Int16Array(Math.round(0.3 * SR));
    writeWav(path.join(SRC, "voz.wav"), Int16Array.from([...lead, ...pcm]));
    writeFileSync(
      path.join(SRC, "voz.json"),
      JSON.stringify({ generator: FAKE ? "fake (say)" : "cartesia", mode: "take", model: MODEL, emotion: EMOTION, voice: VOICE ?? null, speed: BASE_SPEED, transcript }, null, 2) + "\n",
    );
    console.log(`src/voz.wav: toma única de ${(pcm.length / SR).toFixed(1)} s. Calzando el video…\n`);
    execFileSync("node", [path.join(HERE, "align.mjs")], { stdio: "inherit" });
    return;
  }

  if (FIT) {
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i].say ?? lines[i].text;
      const start = timing.captions[i][0];
      const next = i + 1 < lines.length ? timing.captions[i + 1][0] : timing.total - 0.8;
      const slot = next - start - GAP;

      // 1ª pasada a velocidad normal; si no cabe o sobra mucho, otra con la velocidad justa.
      let speed = BASE_SPEED;
      let pcm = await synth(text, speed);
      let dur = pcm.length / SR;
      if (dur > slot || dur < slot * 0.7) {
        speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed * (dur / (slot * FILL))));
        pcm = await synth(text, speed);
        dur = pcm.length / SR;
        // La velocidad no es exactamente lineal: si todavía no cabe, un ajuste más.
        if (dur > slot && speed < MAX_SPEED) {
          speed = Math.min(MAX_SPEED, speed * (dur / (slot * FILL)));
          pcm = await synth(text, speed);
          dur = pcm.length / SR;
        }
      }
      clips.push({ pcm, start });
      report.push({ line: i, text: lines[i].text, start, dur: +dur.toFixed(2), speed: +speed.toFixed(2), slot: +slot.toFixed(2), fits: dur <= slot + GAP });
    }
  } else {
    let t = 0.3;
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i].say ?? lines[i].text;
      const pcm = await synth(text, BASE_SPEED);
      const dur = pcm.length / SR;
      clips.push({ pcm, start: t, dur, text });
      report.push({ line: i, text: lines[i].text, start: +t.toFixed(2), dur: +dur.toFixed(2), speed: BASE_SPEED, fits: true });
      const sceneChange = i + 1 < lines.length && lines[i + 1].scene !== lines[i].scene;
      t += dur + pauseAfter(text.trim(), sceneChange);
    }

    // El video sigue a la voz: mismos cálculos que align.py, pero con los tiempos exactos.
    const starts = clips.map((c) => c.start);
    const ends = clips.map((c) => c.start + c.dur);
    const captions = lines.map((_, i) => {
      let end = ends[i] + 0.6;
      if (i + 1 < lines.length) end = Math.min(end, starts[i + 1]);
      return [+starts[i].toFixed(2), +Math.max(end, starts[i] + 0.6).toFixed(2)];
    });
    const scenes = {};
    lines.forEach((line, i) => {
      if (!(line.scene in scenes)) scenes[line.scene] = i === 0 ? 0 : +Math.max(starts[i] - 0.35, captions[i - 1][0] + 0.5).toFixed(2);
    });
    // Marcas: posición de la palabra dentro de su frase, proporcional al texto leído.
    const marks = {};
    for (const [name, [li, word]] of Object.entries(script.marks ?? {})) {
      const say = lines[li].say ?? lines[li].text;
      const idx = say.toLowerCase().indexOf(word.toLowerCase());
      if (idx < 0) throw new Error(`La marca "${name}" busca "${word}" en la frase ${li}, pero no está.`);
      marks[name] = +(starts[li] + clips[li].dur * (idx / say.length)).toFixed(2);
    }
    const total = +(ends[ends.length - 1] + 1.6).toFixed(1);
    writeFileSync(
      timingPath,
      JSON.stringify({ _doc: "Tiempos en segundos. Los escribió voice.mjs a partir de la voz de Cartesia.", source: "cartesia", total, scenes, captions, marks }, null, 2) + "\n",
    );
    timing.total = total;
  }

  const total = timing.total;
  const out = new Int16Array(Math.ceil(total * SR));
  for (const { pcm, start } of clips) {
    // Pegar la frase en su lugar, con 5 ms de fundido en las puntas para que no haga clic.
    const at = Math.round(start * SR);
    const fade = Math.round(0.005 * SR);
    for (let k = 0; k < pcm.length && at + k < out.length; k++) {
      const g = Math.min(1, k / fade, (pcm.length - 1 - k) / fade);
      out[at + k] = Math.max(-32768, Math.min(32767, out[at + k] + Math.round(pcm[k] * g)));
    }
  }

  writeWav(path.join(SRC, "voz.wav"), out);
  writeFileSync(
    path.join(SRC, "voz.json"),
    JSON.stringify({ generator: FAKE ? "fake (say)" : "cartesia", mode: FIT ? "fit" : "natural", model: MODEL, emotion: EMOTION, voice: VOICE ?? null, total, lines: report }, null, 2) + "\n",
  );

  for (const r of report) {
    const slot = FIT ? ` / ${r.slot.toFixed(2)}s` : "";
    const flag = r.fits ? "" : "  ← no cabe: acorta la frase o usa el modo natural";
    console.log(`${r.start.toFixed(2).padStart(6)}  ${r.dur.toFixed(2)}s${slot}  x${r.speed.toFixed(2)}  ${r.text}${flag}`);
  }
  const bad = report.filter((r) => !r.fits);
  console.log(`\nsrc/voz.wav listo: ${total} s.${FIT ? " Tiempos del video sin cambios." : " src/timing.json actualizado: el video sigue a la voz."}`);
  if (bad.length) console.log(`${bad.length} frase(s) no caben ni a 1,5x.`);
  if (!FIT && total > 60) console.log(`Pasa del minuto: prueba con --speed ${(BASE_SPEED * total / 59).toFixed(2)}.`);
  console.log("Sigue con: node video/explicativo/build.mjs");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
