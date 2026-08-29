-- ─────────────────────────────────────────────────────────────────────────
-- Resultado del seguimiento OOS. Correr en el SQL Editor de Supabase. Aditiva.
--
-- - ofertas.oos_resultado : 'si' | 'no' | NULL (aún sin responder). Registra si
--                            el cliente confirmó que la venta se concretó.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.ofertas
  add column if not exists oos_resultado text
  check (oos_resultado in ('si', 'no'));
