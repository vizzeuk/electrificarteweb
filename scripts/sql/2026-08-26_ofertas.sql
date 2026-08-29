-- ─────────────────────────────────────────────────────────────────────────
-- Tabla `ofertas` — pujas de la subasta inversa de vehículos.
--
-- Cada fila es una puja de un vendedor sobre un lead pagado ($19.990).
-- Guarda los insumos de la puja + el resultado del motor de scoring
-- (lib/auction/score.ts) + el ciclo de vida hasta que el cliente acepta/rechaza.
--
-- Correr en el SQL Editor de Supabase (Dashboard → SQL Editor → New query).
-- Es aditiva: no modifica ninguna tabla existente.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.ofertas (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Relaciones
  lead_id       bigint not null references public.leads(id) on delete cascade,
  vendor_id     uuid references public.leads_vendors(id),      -- NULL hasta aclarar dueño del stock
  stock_id      uuid references public.stock_maestro(id),      -- NULL si es "auto parecido" sin stock cargado

  -- Insumos de la puja (lo que declara el vendedor)
  precio_oferta         bigint  not null,                      -- P_oferta (CLP)
  horas_entrega         integer not null,                      -- plazo prometido (SLA de negocio: <= 96 h)
  version_match         text    not null                       -- coincidencia con lo pedido
                        check (version_match in
                          ('exacta','variacion_menor','upgrade','inferior','no_coincidente')),
  cercania_zona         text    check (cercania_zona in
                          ('local','regional','vecina','distante')),
  acepta_financiamiento boolean not null default false,
  valor_regalias        bigint  not null default 0,            -- CLP total de beneficios

  -- Resultado del motor de scoring (snapshot al momento de evaluar)
  precio_publicado      bigint,                                -- P_publicado usado (MSRP del stock o Sanity)
  score_total           numeric(6,4),                          -- [0.0000, 1.0000]
  score_desglose        jsonb,                                 -- {precio,version,cercania,flexibilidad,regalias}
  descalificada         boolean not null default false,
  motivo_descalificacion text,
  alertas               text[],                                -- antifraude, regalías saturadas, etc.

  -- Ciclo de vida (ver diagrama de Miro)
  estado        text not null default 'pendiente'
                check (estado in
                  ('pendiente','evaluada','enviada_cliente','ganadora',
                   'perdida','aceptada','rechazada','expirada')),
  enviada_cliente_at timestamptz,
  respondida_at      timestamptz
);

-- Índices para el ruteo/ranking (varias ofertas por lead, filtro por estado).
create index if not exists ofertas_lead_id_idx  on public.ofertas (lead_id);
create index if not exists ofertas_vendor_id_idx on public.ofertas (vendor_id);
create index if not exists ofertas_estado_idx    on public.ofertas (estado);

-- Mantener updated_at al día.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists ofertas_set_updated_at on public.ofertas;
create trigger ofertas_set_updated_at
  before update on public.ofertas
  for each row execute function public.set_updated_at();

-- RLS activado y cerrado: n8n y el backend usan service_role (bypassea RLS).
-- Las políticas para el dashboard (anon/authenticated) se definen cuando se
-- conecte el dashboard — hoy no hay acceso público a las ofertas.
alter table public.ofertas enable row level security;
