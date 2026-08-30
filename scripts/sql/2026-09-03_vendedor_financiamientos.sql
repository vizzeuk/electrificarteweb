-- ─────────────────────────────────────────────────────────────────────────
-- Financiamientos que acepta el vendedor (para el match lead↔vendedor).
-- Correr en el SQL Editor de Supabase. Aditiva.
--
-- - leads_vendors.financiamientos : lista separada por comas con los MISMOS
--   valores que `leads.financing`: contado, credito-convencional,
--   credito-inteligente. (El lead puede tener 'no-seguro' = indeciso → no filtra.)
--   Lo puebla la web de vendedores (multi-select). Mientras esté NULL/vacío, el
--   match no filtra por financiamiento (degrada con gracia).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.leads_vendors
  add column if not exists financiamientos text;
