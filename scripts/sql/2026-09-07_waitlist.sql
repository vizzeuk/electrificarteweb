-- ============================================================================
-- WAITLIST — tabla de captación gratuita (giro sep-2026)
-- Ver docs/PIVOT-WAITLIST-PLAN.md
--
-- La escribe n8n (con service_role) desde el webhook N8N_WAITLIST_URL, que a su
-- vez recibe los datos de app/api/waitlist/route.ts.
--
-- Pegar completo en: Supabase → SQL Editor → Run.
-- Es idempotente (IF NOT EXISTS): se puede correr más de una vez sin romper nada.
-- ============================================================================

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  full_name   text not null,
  email       text not null,
  phone       text not null,          -- formato "+56 9XXXXXXXX"
  model       text,                   -- auto de interés (opcional)
  source      text default 'web',     -- hero | pdp | comparador | plp | chatbot...

  -- Para el trabajo comercial de Francisco (se llenan a mano o desde el dashboard).
  contacted   boolean not null default false,
  notes       text
);

-- Índices de consulta. NO hay UNIQUE en email a propósito: si alguien se registra
-- dos veces, el insert de n8n NO debe fallar (un insert que revienta puede cortar
-- el flujo entero). La deduplicación se hace al leer, con la vista de más abajo.
create index if not exists waitlist_email_idx      on public.waitlist (email);
create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);
create index if not exists waitlist_source_idx     on public.waitlist (source);

-- ============================================================================
-- Seguridad: RLS activo SIN políticas =  nadie puede leer/escribir con la llave
-- pública (anon). Solo el service_role (n8n, backend) entra. La tabla tiene datos
-- personales — no exponerla al browser.
-- ============================================================================
alter table public.waitlist enable row level security;

-- ============================================================================
-- Vista de trabajo: una fila por persona (la más reciente de cada email).
-- Esta es la lista "limpia" para contactar o para mostrarle a los vendedores.
-- ============================================================================
create or replace view public.waitlist_unicos as
select distinct on (lower(email))
  id, created_at, full_name, email, phone, model, source, contacted, notes
from public.waitlist
order by lower(email), created_at desc;

-- ============================================================================
-- Consultas útiles (no se ejecutan solas, son para copiar cuando las necesites):
--
--   -- cuánta gente hay en la waitlist (sin duplicados)
--   select count(*) from public.waitlist_unicos;
--
--   -- qué CTA está convirtiendo mejor
--   select source, count(*) from public.waitlist group by source order by 2 desc;
--
--   -- los modelos más pedidos (lo que le interesa a los vendedores)
--   select model, count(*) from public.waitlist
--   where model is not null group by model order by 2 desc;
-- ============================================================================
