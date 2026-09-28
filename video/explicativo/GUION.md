# Guion: video explicativo (Asesoría $4.990 + lista de espera)

Duración objetivo: **57 s**. Seis bloques; cada uno calza con una escena del video.
Los subtítulos del video repiten este texto palabra por palabra (`src/script.json`), así que si
cambias una frase acá, cámbiala allá también. Después de grabar, `node video/explicativo/align.mjs`
calza el video con la voz (ver README.md).

## Texto para pegar en Cartesia

Los números van escritos en palabras para que la voz los lea bien. Las pausas `<break>` son
opcionales: marcan el cambio de escena y ayudan a que la voz calce con los cortes.

```
¿Quieres pasarte a un auto eléctrico o híbrido, pero no sabes cuál elegir? Explora más de ciento sesenta modelos, compáralos y calcula cuánto ahorras.
<break time="400ms"/>
Y si aún no te decides, está la Asesoría de Electrificarte. Por cuatro mil novecientos noventa pesos, Francisco IA te acompaña por WhatsApp durante diez días.
<break time="400ms"/>
Le cuentas cómo usas el auto: cuántos kilómetros haces, dónde vas a cargar y cuánto quieres gastar. Francisco IA conoce cada ficha del catálogo, compara modelos sin sesgo y te explica el porqué de cada recomendación.
<break time="400ms"/>
Sin apps y sin presión: es una conversación, no una venta. Terminas sabiendo exactamente qué auto es para ti.
<break time="500ms"/>
¿Ya elegiste tu auto? En su ficha, toca Quiero este modelo y súmate gratis a la lista de espera. Pronto abriremos la negociación con vendedores oficiales, y te avisamos primero cuando esté disponible para tu modelo.
<break time="400ms"/>
Electrificarte: primero decides con claridad, después llegas primero a tu auto. Entra a electrificarte punto com.
```

Voz sugerida: español latinoamericano (idealmente chilena), cercana y segura, velocidad normal.
Tono de recomendación, no de locutor de radio.

## Bloque por bloque

| # | Tiempo | Qué dice | Qué se ve |
|---|---|---|---|
| 1 | 0:00–0:07 | ¿Quieres pasarte a un auto eléctrico o híbrido, pero no sabes cuál elegir? Explora más de 160 modelos, compáralos y calcula cuánto ahorras. | "¿No sabes cuál elegir?" y un muro de autos reales del catálogo. El contador sube a +160 y aparecen "Compara modelos" y "Calcula tu ahorro" cuando la voz los nombra (lo mismo que resume el hero del home). |
| 2 | 0:07–0:15 | Y si aún no te decides, está la Asesoría de Electrificarte. Por $4.990, Francisco IA te acompaña por WhatsApp durante 10 días. | Bloque Glaciar de la Asesoría: Francisco IA, $4.990 por 10 días, WhatsApp sin apps, te escribe al instante. |
| 3 | 0:13–0:28 | Le cuentas cómo usas el auto: cuántos kilómetros haces, dónde vas a cargar y cuánto quieres gastar. Francisco IA conoce cada ficha del catálogo, compara modelos sin sesgo y te explica el porqué de cada recomendación. | La misma conversación de ejemplo de /asesoria: 60 km al día, carga en casa, tope $35 millones. Francisco IA responde con BYD Yuan Plus, Hyundai Kona Eléctrico y Volvo EX30 (precio y autonomía reales). Los tres criterios se encienden cuando la voz los nombra. |
| 4 | 0:28–0:35 | Sin apps y sin presión: es una conversación, no una venta. Terminas sabiendo exactamente qué auto es para ti. | Banda oscura: "Es una conversación, no una venta." y el auto elegido con el diseño del auto destacado de las PLP: foto grande, ficha con specs reales y precio de lista, chip "Tu auto". |
| 5 | 0:37–0:50 | ¿Ya elegiste tu auto? En su ficha, toca "Quiero este modelo" y súmate gratis a la lista de espera. Pronto abriremos la negociación con vendedores oficiales, y te avisamos primero cuando esté disponible para tu modelo. | La ficha del Kona, clic en "Quiero este modelo", se abre el popup de la lista de espera con el modelo ya puesto, se llenan los datos y aparece "Ya estás en la lista". |
| 6 | 0:50–0:57 | Electrificarte: primero decides con claridad, después llegas primero a tu auto. Entra a electrificarte.com. | Logo, la frase de cierre y dos botones: "Quiero asesoría por $4.990" (principal) y "Ver el catálogo". |

## Reglas que respeta (CLAUDE.md, giro de septiembre 2026)

- No menciona $19.990, "pago único", "negociamos por ti" ni devolución.
- La Asesoría es el producto principal; la lista de espera es gratis y viene después de decidir.
- Dice "lista de espera", no "waitlist" (feedback 28-sep: la palabra en inglés no se entiende).
- La negociación aparece solo como servicio futuro ("pronto abriremos"), nunca como algo que ya funciona.
- Nunca "marketplace".
- Dice "vendedores oficiales", nunca "concesionarios".
- La lista de espera no promete ofertas ni descuentos: solo que avisamos cuando abramos la negociación.
- Cifras reales del catálogo (las trae `build.mjs` desde Sanity). "Más de 160" es el piso de lo
  que hay hoy (169 modelos visibles al 26-sep-2026).
