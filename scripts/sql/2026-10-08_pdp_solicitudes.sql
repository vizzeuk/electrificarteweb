-- ─────────────────────────────────────────────────────────────────────────
-- Tabla `pdp_solicitudes` — la cola de PDPs por crear (Flujo v2,
-- docs/FLUJO-PDP-N8N.md §3 y docs/DASHBOARD_PDP_CREACION.md).
--
-- Reemplaza a las filas "listo" de la hoja AUTOS del Sheet como INPUT del
-- flujo de creación: el formulario del panel (dashboard) crea una fila acá, n8n
-- la toma, y la web escribe el resultado en la misma fila. Así el panel ve el
-- estado sin abrir el Sheet ni n8n.
--
-- Nadie escribe esta tabla directo salvo la web (service_role):
--   · el panel llama a POST /api/admin/pdp/solicitudes (valida y crea)
--   · n8n llama a /api/admin/pdp/{reservar,iniciar,cerrar,marcar}
-- El panel solo la LEE para mostrar la lista.
--
-- Correr en el SQL Editor de Supabase. Es aditiva: no toca ninguna tabla.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.pdp_solicitudes (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  creado_por       text,                         -- email de quien la pidió en el panel

  -- Lo que llena el humano (R4: es dueño de todo esto)
  marca            text not null,
  modelo           text not null,
  anio             integer not null,
  tipo             text not null,                -- label del vehicleType en Sanity
  electrificacion  text not null,                -- tag del electricType (EV, PHEV, HEV…)
  url_oficial      text not null,
  versiones        jsonb not null,               -- [{ "nombre": "GLX", "precio": 24990000 }]
  slug             text not null,                -- slug que va a tener la PDP

  -- Lo que escribe el flujo
  -- listo → en cola → procesando → listo_para_revisar | borrador_incompleto
  --                                 | sin_datos | rechazada | error
  estado           text not null default 'listo'
                   check (estado in ('listo', 'en cola', 'procesando', 'listo_para_revisar',
                                     'borrador_incompleto', 'sin_datos', 'rechazada', 'error')),
  detalle          text,                         -- una línea: qué pasó
  mensaje          text,                         -- el aviso completo (el mismo que va por WhatsApp)
  session_id       text,                         -- sesión del Managed Agent (Claude Console)
  car_id           text,                         -- _id del borrador creado en Sanity
  studio_url       text,
  lote             text,                         -- cuándo la revisa el re-check semanal
  costo_usd        numeric(8, 4),
  intentos         integer not null default 0,   -- cuántas veces la tomó n8n
  tomada_at        timestamptz,
  terminada_at     timestamptz
);

-- La cola: n8n busca siempre "las listo, la más vieja primero".
create index if not exists pdp_solicitudes_estado_idx
  on public.pdp_solicitudes (estado, created_at);

-- Una sola solicitud ACTIVA por auto. Sin esto, dos envíos del mismo modelo
-- pasan los dos la validación (el slug todavía no existe en Sanity) y se gastan
-- dos sesiones del agente (~US$0,30 cada una) para que la segunda la rebote R8.
create unique index if not exists pdp_solicitudes_slug_activa_uidx
  on public.pdp_solicitudes (slug)
  where estado in ('listo', 'en cola', 'procesando');

create or replace function public.pdp_solicitudes_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists pdp_solicitudes_touch on public.pdp_solicitudes;
create trigger pdp_solicitudes_touch
  before update on public.pdp_solicitudes
  for each row execute function public.pdp_solicitudes_touch();

-- Reserva atómica del lote: pasa a 'en cola' hasta `n` filas 'listo' y las
-- devuelve. `skip locked` hace que dos corridas de n8n simultáneas (el cron y el
-- aviso inmediato del panel) nunca tomen la misma fila. PostgREST no puede hacer
-- un UPDATE … LIMIT atómico, por eso es una función.
create or replace function public.reservar_pdp_solicitudes(n integer default 5)
returns setof public.pdp_solicitudes
language sql
as $$
  update public.pdp_solicitudes s
     set estado = 'en cola',
         tomada_at = now(),
         intentos = s.intentos + 1,
         detalle = 'Tomada por el flujo'
   where s.id in (
     select id from public.pdp_solicitudes
      where estado = 'listo'
      order by created_at
      limit greatest(n, 0)
      for update skip locked
   )
  returning s.*;
$$;

alter table public.pdp_solicitudes enable row level security;

-- Sin políticas: solo el service_role (que las salta) lee y escribe. El panel
-- la lee desde su SERVIDOR con service_role, nunca desde el browser.
revoke execute on function public.reservar_pdp_solicitudes(integer) from public, anon, authenticated;
