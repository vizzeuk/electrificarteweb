-- ============================================================================
-- 27-sep-2026 · Feedback de Francisco
-- Pegar COMPLETO en Supabase → SQL Editor. Es idempotente (se puede correr dos veces).
-- ============================================================================

-- ── 1. Reseñas: 4 categorías + pros y contras ──────────────────────────────
-- Cada reseña se califica en Autonomía, Confort, Agilidad y Calidad (1 a 5). La nota final
-- (`rating`) es el PROMEDIO de las cuatro, con un decimal (ej. 4,3). Las reseñas antiguas no
-- tienen categorías: conservan su nota y las categorías quedan vacías.
-- La vista pública depende de `rating`, así que se recrea después del cambio de tipo.
drop view if exists public.reviews_publicas;

alter table public.reviews drop constraint if exists reviews_rating_check;
alter table public.reviews alter column rating type numeric(2,1) using rating::numeric(2,1);
alter table public.reviews add constraint reviews_rating_check check (rating between 1 and 5);

alter table public.reviews add column if not exists rating_autonomia smallint;
alter table public.reviews add column if not exists rating_confort   smallint;
alter table public.reviews add column if not exists rating_agilidad  smallint;
alter table public.reviews add column if not exists rating_calidad   smallint;
alter table public.reviews add column if not exists pros    text;   -- "Lo bueno" (opcional)
alter table public.reviews add column if not exists contras text;   -- "Lo que mejoraría" (opcional)

alter table public.reviews drop constraint if exists reviews_categorias_check;
alter table public.reviews add constraint reviews_categorias_check check (
  (rating_autonomia is null or rating_autonomia between 1 and 5) and
  (rating_confort   is null or rating_confort   between 1 and 5) and
  (rating_agilidad  is null or rating_agilidad  between 1 and 5) and
  (rating_calidad   is null or rating_calidad   between 1 and 5)
);

-- Vista pública: SOLO aprobadas y SIN datos personales (igual que antes + los campos nuevos).
create view public.reviews_publicas as
select
  id,
  created_at,
  rating,
  rating_autonomia, rating_confort, rating_agilidad, rating_calidad,
  body,
  pros, contras,
  car_slug, car_brand, car_model, car_year, car_color, car_version,
  photos,
  video_playback_id,
  compra_verificada,
  first_name || ' ' || left(coalesce(last_name, ''), 1) || '.' as autor
from public.reviews
where status = 'aprobada';

-- ── 2. Waitlist de VENDEDORES ────────────────────────────────────────────────
-- La suscripción de vendedores está en standby: mientras tanto, quien vende autos
-- electrificados deja sus datos y lo contactamos cuando abra el servicio. Tabla aparte de
-- `waitlist` (esa es la demanda de COMPRADORES que se le ofrecerá a los vendedores).
create table if not exists public.waitlist_vendedores (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  first_name  text not null,
  last_name   text not null,
  email       text not null,
  phone       text not null,
  punto_venta text,            -- dónde vende (texto libre)
  marcas      text,            -- marcas que vende, separadas por coma
  region      text,
  comuna      text,
  mensaje     text,            -- comentario opcional
  source      text default 'web',
  contacted   boolean not null default false,
  notes       text
);
create index if not exists waitlist_vendedores_created_idx on public.waitlist_vendedores (created_at desc);
create index if not exists waitlist_vendedores_email_idx   on public.waitlist_vendedores (lower(email));

-- Solo el service role (n8n, panel) lee y escribe. Sin políticas = nadie más.
alter table public.waitlist_vendedores enable row level security;
