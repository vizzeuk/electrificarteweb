-- ============================================================================
-- RESEÑAS UGC — tabla, seguridad y vista pública
-- Ver docs/REVIEWS-UGC-PLAN.md
--
-- La escribe n8n (service_role) desde el webhook N8N_REVIEWS_URL, que recibe los
-- datos de app/api/reviews/route.ts. Mismo patrón que `waitlist`.
--
-- Pegar completo en: Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  -- ── Persona (PII: NO se publica) ──────────────────────────────────────────
  first_name  text not null,
  last_name   text not null,
  email       text not null,
  phone       text,

  -- ── La reseña ─────────────────────────────────────────────────────────────
  rating      smallint not null check (rating between 1 and 5),
  body        text not null,

  -- ── El auto ───────────────────────────────────────────────────────────────
  -- car_slug es la llave que ya usa todo el sitio (/auto/[slug], comparador,
  -- leads). car_sanity_id protege ante renombres de slug. El resto es texto
  -- libre a propósito: en Sanity las versiones no tienen id estable y el campo
  -- color no existe.
  car_slug      text,
  car_sanity_id text,
  car_brand     text,
  car_model     text,
  car_year      int,
  car_color     text,
  car_version   text,

  -- ── Multimedia (se llena en la fase siguiente) ────────────────────────────
  photos            text[] default '{}',   -- rutas dentro del bucket
  video_playback_id text,                  -- id de Mux (no se guarda el video acá)

  -- ── Moderación ────────────────────────────────────────────────────────────
  status        text not null default 'pendiente'
                check (status in ('pendiente', 'aprobada', 'rechazada')),
  auto_flag     text,          -- resultado del pre-filtro automático
  moderated_at  timestamptz,
  moderated_by  text,
  reject_reason text,

  -- ── Verificación de compra ────────────────────────────────────────────────
  -- Hoy siempre false: el gating por invitación está en STANDBY (ver
  -- lib/reviews/config.ts). Cuando se active, la invitación lo marca true.
  compra_verificada boolean not null default false,
  invite_id         text,

  -- De dónde salió (pdp, home, whatsapp, email...), para medir qué convierte.
  source text default 'web'
);

create index if not exists reviews_car_slug_idx   on public.reviews (car_slug);
create index if not exists reviews_status_idx     on public.reviews (status);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);
-- Índice parcial: la consulta más frecuente del sitio es "aprobadas de este auto".
create index if not exists reviews_publicas_idx   on public.reviews (car_slug, created_at desc)
  where status = 'aprobada';

-- ============================================================================
-- Seguridad: RLS activo SIN políticas = solo entra el service_role (n8n/backend).
-- La tabla tiene datos personales — nunca se expone al browser.
-- ============================================================================
alter table public.reviews enable row level security;

-- ============================================================================
-- Vista pública: SOLO reseñas aprobadas y SIN PII.
-- Es lo único que puede leer el sitio para renderizar.
-- `autor` = nombre + inicial del apellido ("Vicente C."), nunca el apellido completo.
-- ============================================================================
create or replace view public.reviews_publicas as
select
  id,
  created_at,
  rating,
  body,
  car_slug, car_brand, car_model, car_year, car_color, car_version,
  photos,
  video_playback_id,
  compra_verificada,
  first_name || ' ' || left(coalesce(last_name, ''), 1) || '.' as autor
from public.reviews
where status = 'aprobada';

-- ============================================================================
-- Consultas útiles (para copiar cuando las necesites):
--
--   -- cola de moderación
--   select id, created_at, first_name, rating, car_slug, left(body, 80)
--   from public.reviews where status = 'pendiente' order by created_at;
--
--   -- promedio y cantidad por auto (lo que va en la PDP y en las cards)
--   select car_slug, round(avg(rating), 1) as promedio, count(*) as total
--   from public.reviews where status = 'aprobada' group by car_slug order by total desc;
-- ============================================================================
