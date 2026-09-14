# Prompt para el workspace del DASHBOARD

> Copiá todo lo que está debajo de la línea y pegalo en el otro workspace.
> Es autocontenido: no necesita tener este repo a mano.

---

Necesito agregar al **dashboard de Electrificarte** (`~/proyects/electrificarte-dashboard`)
una pantalla de **moderación de reseñas** en la vista de **ADMIN** (no la de vendedor).

## Contexto del negocio

Electrificarte es un marketplace chileno de autos electrificados. Acabamos de lanzar un
sistema de **reseñas de vehículos hechas por usuarios** (con fotos) en la web principal
(`electrificarteweb`, otro repo, ya desplegado en producción).

Las reseñas **no se publican solas**: nacen con `status='pendiente'` y Francisco (el dueño)
tiene que **aprobarlas o rechazarlas una por una**. Él pidió explícitamente moderación 100%
manual, aunque sean 300 al mes — no quiere filtros automáticos. Más adelante va a tener gente
ayudándolo, por eso se registra quién moderó cada reseña.

**Sin esta pantalla, ninguna reseña se publica nunca.** Es el eslabón que falta.

## La tabla `reviews` (ya existe en Supabase, no hay que crearla)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `created_at` | timestamptz | |
| `first_name`, `last_name` | text | **PII** — se ve en el dashboard, no se publica completo |
| `email`, `phone` | text | **PII** — para contactar, nunca se publica |
| `rating` | smallint 1-5 | |
| `body` | text | el texto de la reseña |
| `car_slug` | text | llave del auto en el catálogo (`/auto/{slug}`) |
| `car_sanity_id` | text | a prueba de renombres de slug |
| `car_brand`, `car_model`, `car_year`, `car_color`, `car_version` | | texto libre |
| `photos` | text[] | rutas en el bucket. Vienen en pares `-card.jpg` (480px) y `-full.jpg` (1280px) |
| `video_playback_id` | text | Mux, fase futura (hoy siempre null) |
| `status` | text | **`pendiente`** \| `aprobada` \| `rechazada` |
| `auto_flag` | text | sin uso hoy |
| `moderated_at`, `moderated_by` | | quién y cuándo |
| `reject_reason` | text | opcional |
| `compra_verificada` | boolean | hoy siempre `false` |
| `source` | text | de dónde vino (`pdp`, `home`, `link`…) |

Buckets de Supabase Storage:
- `review-media-pendiente` → **PRIVADO**. Acá están las fotos sin moderar. Para verlas en el
  dashboard hay que generar **signed URLs** con el service_role (`createSignedUrl`).
- `review-media` → **PÚBLICO**. Acá van las fotos recién cuando se aprueba.

## Qué construir

Una pantalla en la vista admin con la **cola de reseñas pendientes**, y por cada una:

- ⭐ La calificación y el **texto completo** (sin truncar — hay que poder leerlo entero)
- El **auto**: marca, modelo, año, color, versión (link a `https://www.electrificarte.com/auto/{car_slug}`)
- **Las fotos EN GRANDE** (usar las `-full.jpg` con signed URL del bucket privado). Es lo más
  importante de moderar: hay que poder ver bien si el contenido es apropiado y si es del auto.
- Quién la dejó: nombre, apellido, email, teléfono (para escribirle si hay dudas)
- De dónde vino (`source`) y hace cuánto llegó
- Botones **Aprobar** y **Rechazar** (con motivo opcional al rechazar)

**Sugerencia de UX:** atajos de teclado (A = aprobar, R = rechazar, → = siguiente). Con volumen
alto, la diferencia entre 3 clics y 1 tecla es real.

### Consultas

Cola:
```sql
select id, created_at, first_name, last_name, email, phone,
       rating, body, car_slug, car_brand, car_model, car_year,
       car_color, car_version, photos, source
from reviews
where status = 'pendiente'
order by created_at asc;
```

Aprobar:
```sql
update reviews
set status = 'aprobada', moderated_at = now(), moderated_by = $1
where id = $2 and status = 'pendiente';
```

Rechazar:
```sql
update reviews
set status = 'rechazada', moderated_at = now(), moderated_by = $1, reject_reason = $2
where id = $3 and status = 'pendiente';
```

## ⚠️ Tres reglas que NO se pueden romper

**1. El `and status = 'pendiente'` del UPDATE es obligatorio.**
Hace la operación idempotente: si hay doble clic, o dos personas moderando a la vez, solo la
primera afecta la fila. Verificar cuántas filas se afectaron antes de dar por hecho el cambio.

**2. El `SUPABASE_SERVICE_ROLE_KEY` NUNCA llega al browser.**
Nada de `NEXT_PUBLIC_*` con esa llave. Las escrituras van en un **route handler o server
action**. La tabla `reviews` tiene RLS activo **sin políticas**, así que solo entra el
service_role desde el servidor. Esta pantalla además maneja **PII** (email, teléfono).

**3. Después de aprobar hay que PUBLICAR LAS FOTOS.**
Las fotos están en un bucket privado y **no son visibles** hasta moverlas. No es automático:

```
POST https://www.electrificarte.com/api/reviews/publish
Header: x-admin-secret: <ADMIN_API_SECRET>
Body:   { "reviewId": "<uuid>" }
```

Mueve las fotos al bucket público, revalida `/auto/{slug}` y `/`, y responde
`{ ok, movidas, fallidas }`. Es idempotente.

> **Llamarlo DESPUÉS del `update ... set status='aprobada'`.** Si se llama antes responde
> `409` y no mueve nada (el bucket público nunca debe tener contenido sin moderar).
> Si se aprueba sin llamarlo, **la reseña aparece sin fotos**.

## Env vars que necesita el dashboard

```
SUPABASE_URL=                  # mismas que ya usa el dashboard
SUPABASE_SERVICE_ROLE_KEY=     # SOLO server-side
ADMIN_API_SECRET=              # el mismo valor que en electrificarteweb
```

## Diseño

Seguir la línea del dashboard, que es la misma del sitio: Space Grotesk para títulos, Inter
para texto, acento cyan `#00E5E5`, superficies blanco/negro, `rounded-xl`/`2xl`.

## Qué NO hacer

- No crear ni modificar la tabla `reviews` — ya existe y la web depende de su forma.
- No mostrar reseñas pendientes en la vista de **vendedor**: es solo admin.
- No publicar el apellido completo ni el contacto en ningún lado público (la web ya se encarga:
  lee una vista que devuelve el autor como "Juan P.").
- No agregar filtros automáticos de contenido — Francisco quiere ver todo a mano.
