-- ─────────────────────────────────────────────────────────────────────────
-- Flujo de recuperación (cliente sin resultado → nueva búsqueda sin re-cobro).
-- Correr en el SQL Editor de Supabase. Aditiva.
--
-- - leads.origen                  : 'form' (normal) | 'recuperacion'.
-- - leads.recuperacion_de         : id del lead ORIGINAL pagado (raíz de la cadena).
-- - leads.recuperacion_count      : cuántas recuperaciones lleva la cadena (tope de abuso).
-- - leads.recuperacion_ofrecida_at: cuándo se le ofreció recuperación (para
--                                    interpretar su próxima respuesta como el modelo).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.leads
  add column if not exists origen                   text not null default 'form',
  add column if not exists recuperacion_de          bigint references public.leads(id),
  add column if not exists recuperacion_count        integer not null default 0,
  add column if not exists recuperacion_ofrecida_at  timestamptz;
