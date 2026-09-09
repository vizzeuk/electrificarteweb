# Sistema de reseñas UGC — investigación y plan

> **Estado: PLAN. No implementado.** Investigación de costos hecha en septiembre 2026.
> Requiere decisiones de Vicente/Francisco antes de escribir código.

## Qué se quiere

Reseñas de vehículos escritas por usuarios, con **fotos**, moderadas **una por una** por
Francisco antes de publicarse. Se muestran en las PDP, en las PLP (rating agregado en las
cards) y las mejores en la home.

Campos del formulario: estrellas · nombre + apellido · correo · teléfono · texto de la reseña ·
auto (marca/modelo/año/color/versión) · multimedia.

---

# 0. "Solo quien compró" — cómo se resuelve

## El problema de fondo

**Electrificarte no cierra la venta.** El `CLAUDE.md` lo dice explícito: *"Electrificarte no
media ni registra el cierre real del trato — solo entrega el contacto y la oportunidad"*. El
trato se cierra por WhatsApp entre cliente y vendedor, fuera de la plataforma. Por lo tanto
**no existe un registro automático y confiable de "esta persona compró"**.

Hay **una sola excepción, y ya está construida**:

> `ofertas.oos_resultado = 'si'` — el flujo 5 (OOS) le pregunta al cliente 48 h después de
> aceptar una oferta *"¿se concretó la venta?"* y registra la respuesta.
> Ver `lib/auction/oos.ts:80` y `scripts/sql/2026-08-31_oos_resultado.sql`.

Es autodeclarado, pero es **la señal de compra que ya tenemos**. Problema: vive en el flujo de
la subasta, que hoy está en 🟡 **STANDBY**. O sea que **hoy no entra ninguna señal nueva**.

## La solución: reseñas SOLO por invitación

En vez de un formulario público que después intenta verificar, se da vuelta el modelo:
**nadie puede reseñar por su cuenta**. Se entra únicamente con un **link de invitación con token
firmado**. La verificación deja de estar en el formulario y pasa al **momento de invitar**.

**Reutiliza un patrón que ya existe en el repo:** `lib/order-token.ts` firma tokens con HMAC-SHA256
(hoy protege `/solicitar/gracias`). El mismo mecanismo genera un `reviewToken` que codifica *quién*
y *qué auto*, y que no se puede falsificar sin el secreto.

```
/resena?t=<inviteId>.<hmac>
   → el formulario solo abre con token válido
   → precarga el auto (no lo puede cambiar)
   → la reseña nace marcada compra_verificada = true
```

**Por qué es la decisión correcta acá:**
- Es la **única forma real** de garantizar "solo compradores" cuando la venta ocurre fuera de la plataforma.
- **Mata el spam y el sabotaje de la competencia** casi por completo: no hay formulario abierto que abusar.
- **Baja muchísimo la carga de moderación** — el invitado rara vez manda basura.
- **Es donde se cuelga el incentivo** del video (§5): la promo viaja en la invitación.

## De dónde salen las invitaciones (en orden de automatización)

| Fuente | Cuándo sirve | Estado |
|---|---|---|
| **Francisco invita a mano** desde el dashboard | **HOY** — él sabe quién compró, los cierres pasan por WhatsApp con él en el loop | ✅ Viable ya, solo requiere el token |
| **Automático desde OOS**: `oos_resultado='si'` → dispara la invitación por WhatsApp | Cuando se reactive la subasta | 🟡 El gancho ya existe (`lib/auction/oos.ts:80`) |
| **El vendedor certifica** la compra en el dashboard | Señal más fuerte de todas | ⏸ Depende de la plataforma de vendedores (otro repo) |

**Recomendación:** partir con **invitación manual de Francisco** (funciona hoy, cero infra nueva
más allá del token) y dejar enganchado el automático de OOS para cuando la subasta vuelva.

## Fallback para quien compró pero no está en el sistema

Subir un comprobante (factura o permiso de circulación) que Francisco revisa.

> ⚠️ **Ojo, esto tiene riesgo legal.** Una factura trae **RUT, domicilio y precio pagado**: es
> dato personal sensible bajo Ley 19.628 / 21.719. Si se hace: el comprobante **se ve y se
> borra**, nunca se guarda a largo plazo y **jamás se publica**. Mi sugerencia es **no incluirlo
> en v1** — con la invitación manual alcanza.

## ⚠️ Reseñas incentivadas: hay que declararlo

Si se regala una promo/descuento por dejar una reseña (§5), eso es una **reseña incentivada** y
las reglas de Google para datos estructurados de `Review`, además de la normativa de publicidad
(SERNAC), exigen dos cosas:

1. **El incentivo se da por dejar la reseña, NUNCA por dejarla positiva.** Condicionarlo a una
   buena calificación es publicidad engañosa.
2. **Se declara.** Basta una etiqueta visible del tipo *"Reseña con beneficio"*.

No declararlo pone en riesgo justamente el premio SEO (las estrellas en Google) que es una de
las razones para hacer todo esto.

---

# 1. Recomendación (lo importante primero)

| Decisión | Recomendación | Por qué |
|---|---|---|
| **Almacenamiento de fotos** | **Supabase Storage** con `createSignedUploadUrl()` | Cero proveedores nuevos, ya tenemos Supabase, se integra con RLS y con la moderación en la misma BD |
| **Subida** | **Directa del browser al bucket** (URL firmada) | Vercel corta el body de las funciones en **4,5 MB** — la foto nunca debe pasar por `/api/*` |
| **Pre-filtro automático** | **NSFWJS en el browser** (gratis) + **OpenAI `omni-moderation-latest`** en el servidor (**gratis**, acepta imágenes) | Filtra lo obvio antes de llegar a Francisco, a costo cero |
| **Moderación humana** | Cola en el **dashboard** (rol admin) | Es donde Francisco ya trabaja |
| **Quién puede reseñar** | **Solo por invitación** (link con token firmado) | Es la única forma real de garantizar "solo compradores" — ver §0 |
| **Video** | **SÍ, pero en Mux — no en el bucket de Supabase** | Con invitación el volumen es bajo y moderable; Supabase no transcodifica y el video no se vería en Android — ver §5 |
| **Datos** | Tabla `reviews` en Supabase (no Sanity) | Sanity no admite escritura pública sin exponer un write token |

**Costo estimado: ~$0/mes** hasta ~1.000 reseñas/mes (ver §6). El gasto real aparece recién si
las fotos se sirven sin caché ni optimización.

**Las 3 decisiones técnicas que hacen que esto cueste ~$0 (no son opcionales):**
1. **Achicar la foto en el browser antes de subir** (~1600px, WebP/JPEG q80): 2 MB → ~300 KB.
   Reduce storage y egress **y** evita por completo el medidor de transformaciones de Supabase
   ($5 por cada 1.000 imágenes origen). Ya tenemos `compressImage()` en `LeadForm.tsx:229`.
2. **Generar las variantes UNA vez al aprobar** (con `sharp`) y guardarlas como archivos. Nunca
   transformar al vuelo: el contador de "transformaciones únicas" **se reinicia cada mes**, así
   que a 10.000 reseñas/mes serían ~$537/mes en vez de ~$42.
3. **Nunca servir el original.** Servir el original en vez de la variante multiplica el egress
   **×33** (2 MB vs 60 KB). Es la forma más común de que esta feature explote en costos.

---

# 2. Por qué NO usar Sanity para esto

Sanity es tentador (ya lo usamos, tiene CDN de imágenes gratis e ilimitado en transformaciones),
pero **escribir requiere un token de escritura** y la propia documentación de Sanity dice que
nunca debe llegar al browser: quien lo tenga puede **borrar todo el dataset**. Eso obliga a
pasar la subida por una ruta de Next.js → y ahí volvemos al límite de **4,5 MB** de Vercel.

Sanity se queda para el **catálogo** (que es contenido editorial nuestro). El UGC va a Supabase.

---

# 3. Arquitectura propuesta

```
Browser (formulario de reseña)
  │  1. NSFWJS local (~2,6 MB, ~90-93%) descarta lo evidente antes de subir
  │  2. compressImage() — ya existe en LeadForm.tsx:229 (1280px, JPEG 0.7)
  │  3. pide URL firmada  ──────────────►  /api/reviews/upload-url   (valida sesión/rate limit)
  │  4. sube la foto DIRECTO al bucket ─►  Supabase Storage   (nunca pasa por Vercel)
  │  5. envía el resto del form ────────►  /api/reviews  (zod + rate limit)
                                              │
                                              ▼
                                    n8n  →  tabla `reviews` (estado: pendiente)
                                              │
                                   OpenAI omni-moderation (gratis) marca sospechosas
                                              │
                                              ▼
                              DASHBOARD (rol admin) — Francisco aprueba/rechaza
                                              │
                                    aprobada → revalidatePath('/auto/[slug]')
                                              │
                                              ▼
                                   PDP · PLP · Home muestran la reseña
```

**Por qué la subida va directa al bucket:** Vercel limita el body de cualquier función a
**4,5 MB** (`FUNCTION_PAYLOAD_TOO_LARGE`), en todos los planes; no es configurable. Tres fotos
de celular sin comprimir lo revientan. Con URL firmada el archivo va browser → bucket y la
función solo mueve texto.

---

# 4. Comparación de almacenamiento (datos de sep-2026)

| Opción | Storage | Egress | Subida directa | Trampa principal |
|---|---|---|---|---|
| **Supabase Storage** ✅ | 1 GB free / 100 GB en Pro, luego $0,0213/GB | 5 GB free / 250 GB Pro, luego **$0,09/GB** | Sí (`createSignedUploadUrl`) | **Egress unificado**: las fotos consumen la misma cuota que Postgres y Auth |
| Cloudflare R2 + Images | $0,015/GB | **$0 — gratis** | Sí (presigned PUT) | Lo más barato a escala, pero exige dominio propio en Cloudflare + CORS |
| Vercel Blob | $0,023–0,041/GB | $0,05–0,117/GB + Fast Origin Transfer | Sí (`upload()` client) | **Servir privado por una función apila 4 medidores** hasta $0,35/GB. Y **Hobby prohíbe uso comercial** |
| Sanity assets | 100 GB incluidos | 100 GB incluidos | ❌ (write token) | Escritura pública inviable |
| Cloudinary | modelo de créditos | 1 crédito = 1 GB | Sí (unsigned preset) | Salto de Free a **$99/mes**; precio de moderación IA no es público |

**Elegimos Supabase** porque no agrega proveedor, se integra con RLS y la moderación vive en la
misma base. **R2 es objetivamente más barato** ($0 de egress) y es el plan B si el egress
crece: migrar es cambiar el adaptador de subida, no el modelo de datos.

> ⚠️ **Trampa de Supabase a vigilar:** el egress es **unificado** entre Database, Auth y
> Storage. En el plan Free son 5 GB **totales**. Servir fotos sin caché puede agotar la cuota y
> afectar consultas de Postgres. Mitigación: servir siempre con transformación/caché y activar
> el **Spend Cap** para que corte en vez de facturar.

**Cuándo migrar a R2** (definirlo ahora para no improvisar después): cuando el almacenamiento
supere **~80 GB** o el egress mensual supere **~200 GB**. Migrar es cambiar el adaptador de
subida; el modelo de datos no cambia.

⚠️ **Ojo con mostrar reseñas en la home:** si las fotos cargan en cada visita a la home, el
egress escala con el **tráfico del sitio**, no con la cantidad de reseñas. Si superamos ~1M de
vistas de foto al mes, R2 (egress $0) pasa a ser la opción correcta desde el día uno.

> Dato a favor de Supabase sobre R2: las URLs prefirmadas de **R2 no pueden limitar el tamaño
> del archivo** (no soporta `content-length-range` como S3), así que alguien podría subir un
> archivo gigante por una URL que emitimos. Con Supabase el límite se configura en el bucket.

---

# 5. Video: SÍ — pero en Mux, no en el bucket de Supabase

> **Esto revisa la recomendación anterior.** Antes dije "no video en v1" asumiendo un formulario
> abierto con ~150 videos/mes, imposibles de moderar. Con **reseñas por invitación + incentivo**
> (§0) el volumen real es de **5-30 videos/mes**: Francisco puede ver 20 videos de 60 s en ~20
> minutos al mes. Eso elimina la objeción principal. **El video pasa a ser viable.**

## Por qué NO servirlo desde el bucket de Supabase

El bucket sirve perfecto para **fotos** y es un desastre para **video**, por 4 razones — y la
primera sola ya lo descarta:

1. **Ruleta de códecs (el bloqueante real).** Los iPhone graban por defecto en **HEVC/H.265
   dentro de un `.mov`**. Safari lo reproduce; **Chrome y Firefox en Android y escritorio no**,
   de forma confiable. Sin transcodificación estarías publicando videos que para una parte de
   tus visitantes son **un rectángulo negro** — y no te enterarías hasta que alguien reclame.
2. **Sin bitrate adaptativo (ABR).** Un clip de 50 MB / 30 s es un flujo sostenido de ~13 Mbps.
   En un 4G congestionado el visitante no puede sostenerlo y **no hay una calidad menor a la que
   caer** → rebuffering permanente.
3. **El egress de Supabase es UNIFICADO** — y esta es la que más me preocupa de tu
   infraestructura. La misma cuota la comparten **Database, Auth y Storage**: 5 GB totales en
   Free, 250 GB en Pro. Un video de 50 MB pesa **~800 veces** una foto optimizada.
   > **Un solo video de 50 MB con 500 vistas = 25 GB.** En el plan Free eso se come **5 veces**
   > la cuota mensual de **todo el proyecto**. No es solo un problema de costo: el video puede
   > dejar sin cuota a las consultas de Postgres y degradar el sitio.
4. **Sin poster/miniatura.** Habría que generarlo con ffmpeg del lado servidor — pesado para una
   función de Vercel.

*(La subida grande sí la resuelve Supabase: soporta **TUS resumable** en trozos de 6 MB. Ese no
es el problema — el problema es reproducir y servir.)*

## La opción recomendada: Mux

| | Mux | Cloudflare Stream | Bucket crudo (Supabase) |
|---|---|---|---|
| Costo a tu volumen | **$0/mes** | ~$5-6/mes | "gratis" hasta que revienta la cuota |
| Entrega gratis | **100.000 min/mes** | ninguna | — |
| Transcodifica (arregla HEVC) | ✅ | ✅ | ❌ |
| ABR | ✅ | ✅ | ❌ |
| Poster automático | ✅ gratis | ✅ | ❌ |
| Subida directa (evita los 4,5 MB) | ✅ Direct Uploads | ✅ | ✅ |

**Mux Pay-as-you-go regala 100.000 minutos de entrega al mes.** A 30 videos/mes de 60 s, con
1.000 vistas cada uno, son 30.000 minutos: **sigue siendo $0**. La calidad de entrada *Basic* es
gratis y alcanza de sobra para un clip de celular.

**Lo importante: esto NO parte tu arquitectura.** En la fila de `reviews` guardas solo un string
`video_playback_id`. **El modelo de datos sigue 100% en Supabase**; a Mux solo se van los bytes
del video. Y como el video no pasa por el bucket, **no contamina la cuota de egress** que usa
Postgres.

## Reglas a imponer igual (independiente del proveedor)
- **Tope duro de 60 segundos** y rechazo sobre ~100 MB en el cliente.
- **Consentimiento explícito** al subir (checkbox), porque un video en la calle capta
  **patentes, caras de terceros y números de casa** → dato personal bajo Ley 19.628 / 21.719.
- **Instrucción visible en el formulario:** "no grabes patentes de otros autos ni a personas".
- **Francisco ve el 100% de los videos.** A este volumen es realista; a 150/mes no lo sería.

# 6. Moderación automática — el pre-filtro sale gratis

| Opción | $/1.000 imágenes | Free tier |
|---|---|---|
| **OpenAI `omni-moderation-latest`** ✅ | **$0** | Gratis, acepta imágenes ≤20 MB |
| **NSFWJS** (browser) ✅ | **$0** | Open source, ~90-93%, modelo 2,6 MB |
| Google Vision SafeSearch | $1,50 | 1.000/mes **para siempre** |
| AWS Rekognition | $1,00 | 1.000/mes, solo 12 meses |
| Sightengine | ~$2,00 | 2.000/mes para siempre |
| Hive | $3,00 | $50 en créditos |

**Estrategia de dos capas, ambas gratis:**
1. **NSFWJS en el browser** — descarta lo evidente antes de gastar ancho de banda. Es
   *bypasseable* con DevTools, así que **nunca** es la verificación final.
2. **OpenAI omni-moderation en el servidor** — gratis, multimodal, cubre sexual/violencia/
   autolesión. Marca la reseña como sospechosa; **Francisco siempre tiene la última palabra.**

> Verificar el rate limit de moderación de la cuenta de OpenAI antes de depender de esto.

**El problema real no es el porno.** A escala, lo que llega es **spam, sabotaje de la
competencia, teléfonos metidos en el texto y fotos que no son autos**. Para eso hay una jugada
con muy buena relación costo/beneficio: **Google Vision regala SafeSearch si además pedís Label
Detection en la misma llamada** — o sea, por $1,50/1.000 obtenés el filtro NSFW **y** una
verificación de "¿esto es realmente un auto?". Vale la pena si el UGC crece.

⚠️ **La moderación manual se rompe entre 500 y 1.000 reseñas/mes.** A 10.000/mes sería pedirle a
Francisco revisar 30.000 fotos. Hay que diseñar las reglas de auto-aprobación y el camino rápido
para usuarios confiables **ahora**, mientras el volumen es bajo y se pueden calibrar contra su
propio criterio.

---

# 7. Modelo de datos (borrador)

Tabla `reviews` en Supabase, **RLS activo**:
- `id`, `created_at`
- `first_name`, `last_name`, `email`, `phone` — **PII, nunca se expone en público**
- `rating` (1-5), `body` (texto)
- `car_slug` + `car_sanity_id` — el slug es la llave que ya usa todo el sitio; el `_id` protege
  ante renombres
- `car_brand`, `car_model`, `car_year`, `car_color`, `car_version` — **texto libre**: en Sanity
  las `versions[]` no tienen identificador estable y **el campo color no existe**
- `photos` (array de rutas del bucket)
- `status`: `pendiente` | `aprobada` | `rechazada`
- `auto_flag` (resultado del pre-filtro), `moderated_by`, `moderated_at`, `reject_reason`

**RLS:** política pública de lectura **solo** para `status='aprobada'` y **solo** columnas sin
PII (vía vista `reviews_publicas`). Las pendientes las ve solo el rol **admin** del dashboard.
Esto sigue la regla del `docs/DASHBOARD_CONTEXT.md`: el `service_role` nunca llega al browser.

---

# 8. Dónde se muestra (puntos de integración ya mapeados)

- **PDP** — sección nueva entre la galería y "Vehículos similares" (`AutoPageClient.tsx:949`),
  más un resumen "★ 4,6 (23 opiniones)" en el bloque de precio del hero.
- **PLP** — rating agregado en las cards. ⚠️ **Hay 4 implementaciones de card**: el componente
  `CarCard.tsx` (usado en colección y home) y **markup duplicado inline** en `BrandPageContent`,
  `TipoPageContent` y `ElectricoPageContent`. Son 4 ediciones, o un refactor previo a `CarCard`.
- **Home** — `Testimonials.tsx` ya tiene la forma casi exacta (`name`, `quote`, `rating`,
  `imageUrl`, `car`). Alimentarlo con reseñas aprobadas es cambiar la fuente en
  `HomeDeferred.tsx:37`. Habría que hacer `savings` opcional.
- **SEO — la mayor ganancia.** Hoy **no existe** `AggregateRating` ni `Review` en el sitio.
  Agregarlos al schema `Car` en `CarStructuredData.tsx:52` habilita **estrellas en Google**.

**A reutilizar:**
- `compressImage()` — `LeadForm.tsx:229-253` (1280px, JPEG 0.7, corrige rotación EXIF). Ya
  resuelve el problema de las fotos de 6 MB.
- `StarRating` — `Testimonials.tsx:26`. **Hay que exportarlo** a `components/ui/` (hoy es local).
- El ícono `star` **ya está** en el subset de la fuente.

⚠️ **PDPs prerenderizadas** (`generateStaticParams` + `revalidate = 60`): al aprobar una reseña
hay que llamar a `revalidatePath('/auto/[slug]')` o la reseña no aparece hasta 60 s / el próximo
build. Ya existe `app/api/revalidate/route.ts` para eso.

---

# 8b. Trampas operativas a resolver sí o sí

1. **Fotos huérfanas.** Mucha gente sube fotos y abandona el formulario. Sin un cron que barra
   los archivos sin fila asociada, pagamos por guardar basura para siempre.
2. **Borrar el EXIF con GPS.** Las fotos de celular traen las **coordenadas de la casa** del
   dueño. Publicarlas sería una fuga de datos personales (Ley 19.628 / 21.719). El
   `compressImage()` actual redibuja en un `<canvas>`, lo que **ya elimina el EXIF** — hay que
   asegurarse de subir el resultado del canvas y **nunca el archivo original**.
3. **PII que nunca se publica:** nombre completo, correo y teléfono se guardan pero no se
   exponen. La vista pública solo devuelve columnas sin PII.
4. **Límite de tamaño en el bucket**, además de la validación del cliente (el cliente se
   bypassea).

# 9. Fases sugeridas

- **Fase A — Invitaciones.** Tabla `reviews` + `review_invites` con RLS, firma del `reviewToken`
  (reusa `lib/order-token.ts`), y la pantalla en el dashboard donde Francisco genera el link.
  Sin formulario público: **acá se resuelve el "solo compradores"**.
- **Fase B — Captura (fotos).** `/resena?t=…`, formulario con estrellas, `compressImage()` +
  subida directa al bucket con URL firmada, `/api/reviews`.
- **Fase C — Moderación.** Cola admin en el dashboard + pre-filtro gratis (NSFWJS + OpenAI) +
  `revalidatePath` al aprobar.
- **Fase D — Display PDP.** Sección de reseñas + `AggregateRating` en structured data (el SEO,
  que es la mayor ganancia).
- **Fase E — PLP y home.** Rating en las cards (⚠️ 4 implementaciones) + `Testimonials`
  alimentado por reseñas aprobadas.
- **Fase F — Video.** Cuenta Mux + Direct Uploads + `video_playback_id` en la fila + player.
  Se puede hacer después sin tocar nada de lo anterior.

---

# 10. Decisiones pendientes

**Resueltas en esta ronda:**
- ✅ **Solo compradores** → reseñas **por invitación** con token firmado (§0). Empieza con
  invitación manual de Francisco; el automático de OOS queda enganchado para cuando vuelva la subasta.
- ✅ **Video** → **sí**, pero en **Mux**, no en el bucket (§5). No parte la arquitectura: solo
  se guarda un `video_playback_id` en la fila de Supabase.

**Abiertas:**
1. **¿Cuál es el incentivo exacto del video?** ⚠️ **No existe sistema de códigos de descuento en
   el repo** (el `CLAUDE.md` lo lista como "futuro, no implementado"). Y con el giro, el $19.990
   está en standby — así que el premio tendría que ser la **Asesoría $4.990** gratis/con
   descuento, o un beneficio futuro. **Para v1 lo más simple es que Francisco lo entregue a
   mano por WhatsApp** (costo cero, cero código).
2. **¿Fotos obligatorias u opcionales?** Obligatorias dan mejor UGC pero bajan conversión.
3. **¿Cuántas fotos por reseña?** Sugerido: máx. 3-5. (Hoy hay incoherencia: `LeadForm` permite
   10 y `/api/leads` valida 5.)
4. **¿Se publica el nombre completo o "Vicente C."?** Recomiendo **nombre + inicial**.
5. **¿Teléfono obligatorio?** Es PII, no se muestra nunca; sirve solo para identificar.
6. **¿La moderación vive en el dashboard?** Es lo correcto, pero **es otro repo** y hoy usa datos
   mock. Alternativa v1: una pantalla admin mínima en esta web.
7. **¿Se aceptan reseñas de gente que compró fuera de Electrificarte?** Si sí, hay que definir el
   fallback de comprobante (§0) con su riesgo legal.

---

## Fuentes
Vercel: [límites de funciones](https://vercel.com/docs/functions/limitations) ·
[Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) ·
Supabase: [pricing](https://supabase.com/pricing) ·
[egress unificado](https://supabase.com/docs/guides/platform/manage-your-usage/egress) ·
[uploads firmados](https://supabase.com/docs/guides/storage/uploads/standard-uploads) ·
Cloudflare: [R2](https://developers.cloudflare.com/r2/pricing/) ·
[Images](https://developers.cloudflare.com/images/pricing/) ·
Moderación: [OpenAI](https://developers.openai.com/api/docs/guides/moderation) ·
[NSFWJS](https://github.com/infinitered/nsfwjs) ·
[Rekognition](https://aws.amazon.com/rekognition/pricing/) ·
[Vision](https://cloud.google.com/vision/pricing) ·
Video: [Mux](https://www.mux.com/pricing/video) ·
[Cloudflare Stream](https://developers.cloudflare.com/stream/pricing/)
