# Moderación de reseñas en el dashboard — contrato

> Para el repo **`~/proyects/electrificarte-dashboard`** (proyecto aparte).
> Este documento vive acá porque **esta web es dueña del contrato de datos**.
> Ver también `docs/REVIEWS-UGC-PLAN.md` y `docs/DASHBOARD_CONTEXT.md`.

## Qué hay que construir

Una pantalla en la **vista de ADMIN** (`src/app/admin/...`, no la de vendedor) donde
Francisco vea las reseñas pendientes y las **apruebe o rechace una por una**.

Francisco pidió explícitamente **moderación 100% manual**, aunque sean 300 al mes. No hay
pre-filtro automático. Más adelante tendrá gente ayudándolo, por eso se registra **quién**
moderó cada una.

## La tabla `reviews` (ya creada en Supabase)

Ver `scripts/sql/2026-09-09_reviews.sql` en este repo.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `created_at` | timestamptz | |
| `first_name`, `last_name` | text | **PII** — se ve en el dashboard, **no** se publica completo |
| `email`, `phone` | text | **PII** — solo para contactar, nunca se publica |
| `rating` | smallint 1-5 | |
| `body` | text | el texto de la reseña |
| `car_slug` | text | llave del auto en el catálogo (`/auto/{slug}`) |
| `car_sanity_id` | text | a prueba de renombres de slug |
| `car_brand`, `car_model`, `car_year`, `car_color`, `car_version` | | texto libre |
| `photos` | text[] | rutas en el bucket (fase siguiente) |
| `video_playback_id` | text | id de Mux (fase futura) |
| `status` | text | **`pendiente`** \| `aprobada` \| `rechazada` |
| `moderated_at`, `moderated_by` | | quién y cuándo |
| `reject_reason` | text | opcional, para saber por qué se rechazó |
| `compra_verificada` | boolean | hoy siempre `false` (gating por invitación en standby) |
| `source` | text | de dónde vino (`pdp`, `home`, `link`…) |

## Consultas

**Cola de pendientes** (lo principal de la pantalla):
```sql
select id, created_at, first_name, last_name, email, phone,
       rating, body, car_slug, car_brand, car_model, car_year,
       car_color, car_version, photos, source
from reviews
where status = 'pendiente'
order by created_at asc;   -- las más viejas primero
```

**Aprobar:**
```sql
update reviews
set status = 'aprobada', moderated_at = now(), moderated_by = $1
where id = $2 and status = 'pendiente';
```

**Rechazar:**
```sql
update reviews
set status = 'rechazada', moderated_at = now(), moderated_by = $1, reject_reason = $2
where id = $3 and status = 'pendiente';
```

> El `and status = 'pendiente'` **no es opcional**: hace la operación idempotente. Si dos
> personas moderan a la vez (o se hace doble clic), solo la primera afecta la fila. Es el
> mismo criterio que aplicamos al cierre de subasta.

## ⚠️ Seguridad — reglas que NO se pueden romper

Vienen de `docs/DASHBOARD_CONTEXT.md` §Seguridad:

1. **El `service_role` NUNCA llega al browser.** Nada de `NEXT_PUBLIC_SUPABASE_SERVICE_*`.
   Las escrituras (aprobar/rechazar) van en un **route handler / server action** del dashboard.
2. **RLS está activo en `reviews` sin políticas**, así que solo entra el `service_role`
   desde el servidor. Si se quiere leer con la anon key desde el browser, hay que crear una
   política **explícita solo para el rol admin**.
3. Esta pantalla es **rol admin**, no vendedor. Un vendedor **no** debe ver reseñas
   pendientes ni la PII de quien las dejó.
4. La web pública **nunca** lee esta tabla directo: lee la vista `reviews_publicas`, que solo
   devuelve aprobadas, sin PII y con el autor como `"Juan P."`.

## Después de aprobar: avisar a la web

Las PDP son estáticas con ISR de 60 s. Para que la reseña aparezca **al toque**, el dashboard
debe llamar al endpoint de revalidación de esta web:

```
POST https://www.electrificarte.com/api/revalidate
Header: x-sanity-secret: <SANITY_REVALIDATE_SECRET>
Body:   { "_type": "review", "slug": { "current": "<car_slug>" } }
```

Revalida `/auto/{slug}` y `/`. Si no se llama, igual aparece en ≤60 s — es un "nice to have",
no un bloqueante.

## Lo que la pantalla debería mostrar por reseña

- ⭐ La calificación y el **texto completo** (sin truncar — hay que poder leerlo entero)
- El **auto** (marca, modelo, año, color, versión) con link a `/auto/{car_slug}`
- **Las fotos en grande** — es lo que más importa moderar (fase siguiente)
- Quién la dejó + contacto (para poder escribirle si hay dudas)
- De dónde vino (`source`)
- Botones **Aprobar** / **Rechazar** (con motivo opcional al rechazar)

Sugerencia de UX: atajos de teclado (A = aprobar, R = rechazar, → = siguiente). Con 300 al mes,
la diferencia entre 3 clics y 1 tecla es real.

## Estado actual

- ✅ Tabla, RLS y vista creadas en Supabase
- ✅ El formulario público ya guarda reseñas con `status='pendiente'`
- ✅ n8n avisa a Francisco por correo cuando entra una (`n8n/reviews.json`)
- ✅ `/api/revalidate` acepta `_type: "review"`
- ⬜ **La pantalla de moderación en el dashboard** ← esto
- ⬜ Subida de fotos (bucket + URL firmada)
- ⬜ Mostrar las reseñas aprobadas en PDP / home
