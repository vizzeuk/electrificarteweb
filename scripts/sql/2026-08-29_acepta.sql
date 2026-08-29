-- ─────────────────────────────────────────────────────────────────────────
-- Flujo "cliente acepta". Correr en el SQL Editor de Supabase. Aditiva.
--
-- - ofertas.aceptada_at : cuándo el cliente aceptó esa oferta.
-- - ofertas.oos_at      : cuándo se le preguntó al cliente si se concretó la
--                         venta (seguimiento OOS). NULL = aún no preguntado.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.ofertas
  add column if not exists aceptada_at timestamptz,
  add column if not exists oos_at      timestamptz;
