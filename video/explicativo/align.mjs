// Calza el video con la voz grabada (src/voz.mp3, .wav o .m4a).
//
//   node video/explicativo/align.mjs            # modelo "small" (bueno para español)
//   node video/explicativo/align.mjs medium     # más preciso, más lento
//
// Transcribe la voz con Whisper (faster-whisper, local, sin API) y reescribe src/timing.json.
// La primera vez crea un entorno de Python en .venv/ y baja el modelo (~500 MB): tarda unos minutos.
// Después: node video/explicativo/build.mjs, y a revisar o renderizar.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const HERE = import.meta.dirname;
const SRC = path.join(HERE, "src");
const VENV = path.join(HERE, ".venv");
const PY = path.join(VENV, "bin", "python");

const voice = ["voz.mp3", "voz.wav", "voz.m4a"].map((f) => path.join(SRC, f)).find(existsSync);
if (!voice) {
  console.error("No encontré la voz: guarda el audio de Cartesia como video/explicativo/src/voz.mp3");
  process.exit(1);
}

if (!existsSync(PY)) {
  console.log("Preparando Python (solo la primera vez)…");
  execFileSync("python3", ["-m", "venv", VENV], { stdio: "inherit" });
  execFileSync(PY, ["-m", "pip", "install", "-q", "--upgrade", "pip"], { stdio: "inherit" });
  execFileSync(PY, ["-m", "pip", "install", "-q", "faster-whisper"], { stdio: "inherit" });
}

const model = process.argv[2] ?? "small";
execFileSync(
  PY,
  [path.join(HERE, "align.py"), voice, path.join(SRC, "script.json"), path.join(SRC, "timing.json"), model],
  { stdio: "inherit" },
);
console.log("\nListo: src/timing.json actualizado. Sigue con node video/explicativo/build.mjs");
