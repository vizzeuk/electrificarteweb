"""Calza el video con la voz real: transcribe la voz con tiempo por palabra y reescribe
src/timing.json (inicio de cada escena, cada subtítulo y cada marca de animación).

Se corre desde align.mjs, que prepara el entorno de Python. Uso directo:
    python align.py <audio> <script.json> <timing.json> [modelo]

Cómo calza: el texto que se leyó (campo `say` de script.json, o `text`) se compara palabra
por palabra con lo que transcribe Whisper. Las palabras que coinciden toman su tiempo real;
las que no (números, nombres que Whisper escribe distinto) se interpolan entre sus vecinas.
Así no importa si la voz se apura, se demora o hace pausas: cada frase queda donde suena.
"""

import difflib
import warnings
import json
import re
import sys
import unicodedata

from faster_whisper import WhisperModel

warnings.filterwarnings("ignore")  # numpy avisa overflow en el espectrograma; no afecta el resultado

LEAD_IN = 0.35  # la escena entra un poco antes de su primera palabra (la transición dura 0,7 s)
CAPTION_TAIL = 0.6  # el subtítulo queda en pantalla un momento después de la última palabra
END_HOLD = 1.6  # cierre: el último cuadro se sostiene después de la última palabra


def norm(word: str) -> str:
    word = unicodedata.normalize("NFKD", word.lower())
    word = "".join(c for c in word if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", word)


def main() -> None:
    audio, script_path, timing_path = sys.argv[1:4]
    model_name = sys.argv[4] if len(sys.argv) > 4 else "small"

    script = json.load(open(script_path, encoding="utf-8"))
    lines = script["lines"]

    # Palabras del guion, con la frase a la que pertenecen.
    tokens = []  # (índice de frase, palabra normalizada)
    for i, line in enumerate(lines):
        for w in (line.get("say") or line["text"]).split():
            n = norm(w)
            if n:
                tokens.append((i, n))

    prompt = " ".join(line.get("say") or line["text"] for line in lines)
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        audio, language="es", word_timestamps=True, initial_prompt=prompt, vad_filter=False
    )
    heard = []  # (palabra normalizada, inicio, fin)
    for seg in segments:
        for w in seg.words or []:
            n = norm(w.word)
            if n:
                heard.append((n, w.start, w.end))
    if not heard:
        sys.exit("No se reconoció ninguna palabra en el audio.")

    # Emparejar guion ↔ transcripción.
    sm = difflib.SequenceMatcher(None, [t[1] for t in tokens], [h[0] for h in heard], autojunk=False)
    times = [None] * len(tokens)
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            times[a + k] = (heard[b + k][1], heard[b + k][2])

    # Interpolar las palabras sin pareja entre sus vecinas con tiempo.
    matched = [i for i, t in enumerate(times) if t]
    if not matched:
        sys.exit("El audio no se parece al guion: revisa que sea la voz de este video.")
    audio_end = heard[-1][2]
    for i, t in enumerate(times):
        if t:
            continue
        prev = max((m for m in matched if m < i), default=None)
        nxt = min((m for m in matched if m > i), default=None)
        a = times[prev][1] if prev is not None else 0.0
        b = times[nxt][0] if nxt is not None else audio_end
        lo = prev if prev is not None else -1
        hi = nxt if nxt is not None else len(tokens)
        span = (b - a) / (hi - lo)
        times[i] = (a + span * (i - lo - 1), a + span * (i - lo))

    # Frases: inicio de su primera palabra, fin de la última.
    starts, ends, ratio = [], [], []
    for i in range(len(lines)):
        idx = [k for k, t in enumerate(tokens) if t[0] == i]
        starts.append(times[idx[0]][0])
        ends.append(times[idx[-1]][1])
        ratio.append(sum(1 for k in idx if k in matched) / len(idx))

    captions = []
    for i in range(len(lines)):
        end = ends[i] + CAPTION_TAIL
        if i + 1 < len(lines):
            end = min(end, starts[i + 1])
        captions.append([round(starts[i], 2), round(max(end, starts[i] + 0.6), 2)])

    scenes = {}
    for i, line in enumerate(lines):
        s = line["scene"]
        if s not in scenes:
            scenes[s] = 0.0 if not scenes else round(max(starts[i] - LEAD_IN, captions[i - 1][0] + 0.5), 2)

    marks = {}
    for name, (line_i, word) in script.get("marks", {}).items():
        target = norm(word)
        idx = [k for k, t in enumerate(tokens) if t[0] == line_i and t[1] == target]
        if not idx:
            sys.exit(f'La marca "{name}" busca "{word}" en la frase {line_i}, pero no está en el guion.')
        marks[name] = round(times[idx[0]][0], 2)

    total = round(max(ends[-1] + END_HOLD, audio_end + 0.3), 1)
    timing = {
        "_doc": "Tiempos en segundos. Lo reescribe align.mjs a partir de la voz real (src/voz.*).",
        "source": "voz",
        "total": total,
        "scenes": scenes,
        "captions": captions,
        "marks": marks,
    }
    with open(timing_path, "w", encoding="utf-8") as f:
        json.dump(timing, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Voz: {audio_end:.1f} s. Video: {total} s.\n")
    for i, line in enumerate(lines):
        flag = "  ← revisar" if ratio[i] < 0.5 else ""
        print(f"{captions[i][0]:6.2f}–{captions[i][1]:6.2f}  {line['scene']}  {int(ratio[i] * 100):3d}%  {line['text']}{flag}")
    low = [i for i, r in enumerate(ratio) if r < 0.5]
    if low:
        print("\nLas frases marcadas se reconocieron poco: puede que la voz diga otra cosa o que")
        print("Whisper la haya entendido mal. Su tiempo se estimó por las frases vecinas.")


if __name__ == "__main__":
    main()
