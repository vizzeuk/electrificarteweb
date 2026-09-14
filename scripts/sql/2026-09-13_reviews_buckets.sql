-- ============================================================================
-- RESEÑAS UGC — buckets de fotos
-- Correr DESPUÉS de 2026-09-09_reviews.sql
-- Pegar completo en: Supabase → SQL Editor → Run. Idempotente.
--
-- DOS buckets a propósito (ver docs/REVIEWS-UGC-PLAN.md §4b):
--   · pendiente = PRIVADO. Acá cae lo que sube el usuario, sin moderar.
--   · público   = lo aprobado. Se mueve acá recién cuando Francisco aprueba.
--
-- Por qué: si todo viviera en un bucket público, alguien podría subir algo
-- indebido y compartir la URL directa ANTES de que Francisco lo vea.
-- ============================================================================

-- Bucket PRIVADO (lo que sube el usuario, sin moderar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-media-pendiente',
  'review-media-pendiente',
  false,                                  -- NO público
  5242880,                                -- 5 MB por archivo (una foto ya comprimida pesa ~250 KB)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Bucket PÚBLICO (solo lo aprobado)
-- Público a propósito: el CDN necesita poder cachear. Con URLs firmadas cada vista
-- sería cache miss y el egress costaría $0,09/GB en vez de $0,03/GB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-media',
  'review-media',
  true,                                   -- público
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================================
-- No hacen falta políticas de RLS sobre storage.objects:
--   · Las subidas usan URLs FIRMADAS generadas con el service_role desde el servidor.
--   · La lectura de lo aprobado sale del bucket público.
--   · El rol anon NO puede escribir en ninguno de los dos.
--
-- Verificar que quedaron bien:
--   select id, public, file_size_limit from storage.buckets
--   where id in ('review-media-pendiente', 'review-media');
-- ============================================================================
