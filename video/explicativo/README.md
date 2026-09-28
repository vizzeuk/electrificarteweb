# Video explicativo (HyperFrames)

Video de 57 s que explica la Asesoría $4.990 y la lista de espera. Se muestra en el popup
"Ver video explicativo" de la home (`components/layout/HowItWorks.tsx`) desde
`public/hero-video/explicativo-16x9.mp4` (escritorio) y `explicativo-9x16.mp4` (móvil inline).

- `GUION.md`: el texto para grabar la voz en Cartesia y qué pasa en pantalla en cada bloque.
- `src/composition.html`: la composición (una sola plantilla para los dos formatos).
- `src/script.json`: el guion frase por frase (subtítulos) y las palabras que disparan animaciones.
- `src/timing.json`: los tiempos. Lo escribe `align.mjs` a partir de la voz real.
- `align.mjs` + `align.py`: calzan el video con la voz grabada (ver abajo).
- `build.mjs`: genera `horizontal/` (1920x1080) y `vertical/` (1080x1920) con datos de Sanity,
  fuentes y logo. Esas carpetas **no se versionan**: las fuentes Fontshare no se pueden
  redistribuir en un repo público (ver `scripts/fetch-fonts.mjs`).
- `publish.mjs`: comprime los renders y los copia a `public/hero-video/` junto con el póster.

Necesita Node 22+ y FFmpeg en el PATH (sin Homebrew: `npm i ffmpeg-static` en una carpeta
temporal y agregar su carpeta al PATH).

## Flujo

```bash
node video/explicativo/build.mjs                       # arma horizontal/ y vertical/
npx hyperframes preview video/explicativo/horizontal   # revisar en el Studio
npx hyperframes check video/explicativo/horizontal     # lint + layout + contraste

# render final (repetir con vertical → explicativo-9x16.mp4)
cd video/explicativo/horizontal && npx hyperframes render --quality high --output ../renders/explicativo-16x9.mp4

node video/explicativo/publish.mjs                     # comprime y copia a public/hero-video/
```

## Agregar la voz

Hay dos caminos. El recomendado es generarla por API: no hay que grabar ni transcribir nada.

### A. Con la API de Cartesia (recomendado)

`CARTESIA_API_KEY` y `CARTESIA_VOICE_ID` van en `.env.local` (no se versiona). Por defecto usa
`sonic-3.6` con emoción `calm`, la misma configuración con que se eligió la voz.

```bash
node video/explicativo/voice.mjs --take     # una sola toma (la que está publicada) y la calza con align.mjs
node video/explicativo/build.mjs            # y después render de los dos formatos + publish.mjs
```

`--take` pide todo el guion de una vez (entonación continua, con `<break>` entre escenas) y
después `align.mjs` ubica cada frase y retiempa el video. El diseño no cambia: solo el momento en
que aparece cada cosa. La toma queda en `.cache/voz/`: repetir no vuelve a cobrar.

Otros modos del mismo script: sin `--take` pide frase por frase y las une con pausas según la
puntuación (tiempos exactos sin transcribir, pero la entonación queda más cortada); `--fit` no
toca los tiempos del video y apura o frena cada frase para que quepa (hasta 1,5x, se oye apurado);
`--speed 1.08` acelera parejo si pasa del minuto; `--fake` prueba con la voz del Mac, sin créditos.

### B. Con un audio ya grabado (se calza solo)

1. Graba el texto de `GUION.md` en Cartesia, de una sola vez, y guarda el audio como
   `src/voz.mp3` (sirve también `.wav` o `.m4a`).
2. `node video/explicativo/align.mjs`: transcribe la voz con Whisper (local, sin API ni costo),
   encuentra dónde empieza cada frase y cada palabra clave, y reescribe `src/timing.json`.
   Imprime una tabla con el tiempo de cada frase y qué tan bien la reconoció; si una frase sale
   con "← revisar", la voz dice otra cosa que el guion (o Whisper la entendió mal).
   La primera vez instala faster-whisper en `.venv/` y baja el modelo (~500 MB); tarda unos minutos.
3. `node video/explicativo/build.mjs`, revisar en el Studio, render de los dos formatos y
   `node video/explicativo/publish.mjs`.

Todo el video se anima respecto a esos tiempos: cada escena entra justo antes de su primera
frase, los subtítulos aparecen con la voz, los criterios de la escena 3 se encienden al decir
"kilómetros", "dónde" y "cuánto", los campos del popup se escriben al decir "nombre",
"WhatsApp" y "modelo", y la duración total sale del largo de la voz. No hay que mover nada a mano.

Para cambiar una frase: editarla en `src/script.json` (`text` es el subtítulo, `say` cómo se lee
cuando difiere, por ejemplo números) y en `GUION.md`, volver a grabar y correr `align.mjs`.
Las palabras que disparan animaciones están en `marks` del mismo archivo.

Sin voz, `src/timing.json` trae una estimación de 57 s y el video se entiende igual por los
subtítulos (el popup se abre solo en la primera visita y arranca silenciado).
