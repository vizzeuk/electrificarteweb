-- ─────────────────────────────────────────────────────────────────────────
-- Trigger: al insertarse una puja (ofertas, estado 'pendiente') → avisa a n8n
-- (Flujo 1). Versión canónica para alinear con el Flujo 1 del repo principal.
--
-- Requiere la extensión pg_net habilitada en Supabase.
-- Reemplazar <HOST-N8N> y <SECRETO> antes de correr.
--
-- Puntos clave:
--  1. Guarda anti-QA: ignora pujas cuyo lead esté marcado como QA (order_id =
--     'QA_SEED'), para que los scripts de test contra prod NO disparen n8n.
--  2. Payload = { "record": <fila> }  → el Flujo 1 lee body.record.lead_id / .id.
--  3. Header x-webhook-secret → el nodo Webhook del Flujo 1 debe validarlo
--     (Authentication → Header Auth, name = x-webhook-secret, value = <SECRETO>).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.notificar_puja_n8n()
returns trigger
language plpgsql
security definer
as $$
begin
  -- 1. Ignorar pujas de QA (su lead tiene order_id = 'QA_SEED').
  if exists (
    select 1 from public.leads l
    where l.id = new.lead_id and l.order_id = 'QA_SEED'
  ) then
    return new;
  end if;

  -- 2. Avisar a n8n (Flujo 1). Best-effort; pg_net es asíncrono.
  perform net.http_post(
    url     := 'https://<HOST-N8N>/webhook/auction-puja',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', '<SECRETO>'
    ),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists ofertas_puja_nueva on public.ofertas;
create trigger ofertas_puja_nueva
  after insert on public.ofertas
  for each row
  when (new.estado = 'pendiente')
  execute function public.notificar_puja_n8n();
