-- ============================================================================
-- WAITLIST — separar nombre y apellido
-- Corre DESPUÉS de 2026-09-07_waitlist.sql (que creó la tabla con full_name).
--
-- Pegar completo en: Supabase → SQL Editor → Run.
-- Idempotente y NO destructivo: agrega las columnas nuevas, rellena desde
-- full_name si existía, y la deja opcional (no borra datos).
-- ============================================================================

alter table public.waitlist add column if not exists first_name text;
alter table public.waitlist add column if not exists last_name  text;

-- Solo si la tabla todavía tiene full_name (instalaciones que corrieron el SQL
-- original): rellena las columnas nuevas y libera el NOT NULL.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'waitlist' and column_name = 'full_name'
  ) then
    update public.waitlist
    set
      first_name = coalesce(first_name, nullif(split_part(full_name, ' ', 1), '')),
      last_name  = coalesce(
        last_name,
        nullif(btrim(substr(full_name, coalesce(nullif(strpos(full_name, ' '), 0), length(full_name)) + 1)), '')
      )
    where full_name is not null
      and (first_name is null or last_name is null);

    alter table public.waitlist alter column full_name drop not null;
  end if;
end $$;

-- La vista pasa a exponer las columnas nuevas. Hay que DROP antes de crearla:
-- `create or replace view` no permite cambiar los nombres de las columnas.
drop view if exists public.waitlist_unicos;

create view public.waitlist_unicos as
select distinct on (lower(email))
  id, created_at, first_name, last_name, email, phone, model, source, contacted, notes
from public.waitlist
order by lower(email), created_at desc;
