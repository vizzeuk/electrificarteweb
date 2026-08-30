-- ─────────────────────────────────────────────────────────────────────────
-- Descripción de regalías en la puja. Correr en el SQL Editor de Supabase. Aditiva.
--
-- El formulario de puja del dashboard pasa a tener regalías como checkbox +
-- campo de descripción. `valor_regalias` (ya existe) guarda el monto; esta
-- columna guarda el texto de qué incluye.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.ofertas
  add column if not exists regalias_descripcion text;
