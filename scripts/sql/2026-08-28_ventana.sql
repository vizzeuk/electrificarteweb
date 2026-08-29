-- ─────────────────────────────────────────────────────────────────────────
-- Ventana de la subasta + anti-spam de presión.
-- Correr en el SQL Editor de Supabase. Aditiva.
--
-- - leads.cierra_at   : cuándo cierra la subasta de ese lead (se setea al entrar
--                       el lead pagado, en /api/auction/match).
-- - leads.cerrada_at  : cuándo se cerró (dedup: evita reprocesar un lead ya cerrado).
-- - ofertas.ultima_presion_at : última vez que se presionó esa oferta (throttle).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.leads
  add column if not exists cierra_at  timestamptz,
  add column if not exists cerrada_at timestamptz;

alter table public.ofertas
  add column if not exists ultima_presion_at timestamptz;

-- Índice para que el cron encuentre rápido los leads por cerrar / a presionar.
create index if not exists leads_cierra_at_idx
  on public.leads (cierra_at)
  where cerrada_at is null;
