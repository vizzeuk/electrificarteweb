-- ─────────────────────────────────────────────────────────────────────────
-- Tabla `catalog_check_runs` — historial de las corridas del re-check de PDPs
-- (Flujo C, docs/FLUJO-PDP-N8N.md §2).
--
-- Cada fila es UNA de las 28 corridas semanales. Se escribe SIEMPRE, haya
-- hallazgos o no (regla C15 del board): un cron silencioso es indistinguible
-- de un cron muerto, y esta tabla es lo único que permite detectar la falla
-- que ningún cron puede reportar sobre sí mismo — la corrida que no ocurrió.
--
-- De acá sale la cobertura del digest semanal ("28/28 corridas · 176/176
-- autos"). El Sheet de Francisco recibe la misma info en paralelo, pero el
-- Sheet es para leer, esta tabla es para calcular.
--
-- Correr en el SQL Editor de Supabase (Dashboard → SQL Editor → New query).
-- Es aditiva: no modifica ninguna tabla existente.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.catalog_check_runs (
  id            uuid primary key default gen_random_uuid(),
  run_id        text not null unique,          -- el mismo que viaja a n8n y al Sheet
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,

  -- Qué se intentó
  batch_size    integer not null default 0,    -- autos entregados a la corrida
  sin_fuente    integer not null default 0,    -- autos saltados por no tener sourceUrls (C3)

  -- Cómo terminó
  revisados     integer not null default 0,    -- llegaron a leer la fuente
  sin_cambios   integer not null default 0,
  con_cambios   integer not null default 0,
  errores       integer not null default 0,

  -- Detalle por auto: [{ carId, nombre, resultado, hallazgos, error }]
  -- Se guarda entero para poder auditar un hallazgo viejo sin depender de que
  -- el flag siga puesto en Sanity (los flags se limpian al resolverlos).
  detalle       jsonb not null default '[]'::jsonb
);

-- La consulta del digest es siempre "las corridas de los últimos 7 días".
create index if not exists catalog_check_runs_started_at_idx
  on public.catalog_check_runs (started_at desc);

alter table public.catalog_check_runs enable row level security;

-- Sin políticas: solo el service_role (que las salta) escribe y lee. El
-- dashboard de vendedores no tiene nada que hacer acá.
