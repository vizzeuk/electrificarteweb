-- ─────────────────────────────────────────────────────────────────────────
-- pdp_solicitudes: ficha tecnica opcional (17-oct-2026).
--
-- El panel puede adjuntar el PDF oficial de la ficha tecnica del modelo para
-- Chile. El PDF vive en la Files API de Anthropic; aca solo se guarda su id y
-- el nombre original (ver lib/pdp-creacion/ficha.ts).
--
-- Aditiva y segura. Correr en el SQL Editor de Supabase. Sin estas columnas la
-- web sigue funcionando, pero avisa que la ficha no se guardo.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.pdp_solicitudes add column if not exists ficha_file_id text;
alter table public.pdp_solicitudes add column if not exists ficha_nombre text;
