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
--  4. ⚠️ CRÍTICO: el http_post va dentro de BEGIN/EXCEPTION. Si el webhook falla
--     (URL mala, placeholder sin reemplazar, n8n caído), el trigger NO debe
--     abortar el insert — si no, se rompe TODA creación de pujas. (Esto pasó: un
--     trigger sin este bloque tiraba "Quote command returned error" y bloqueaba
--     todos los inserts a ofertas.)
--
-- Para DESBLOQUEAR si ya hay un trigger roto aplicado, primero:
--   drop trigger if exists ofertas_puja_nueva on public.ofertas;   -- (o el nombre que tenga)
-- y luego re-crear con esta versión.
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

  -- 2. Avisar a n8n (Flujo 1). Best-effort — un fallo NUNCA aborta el insert.
  begin
    perform net.http_post(
      url     := 'https://<HOST-N8N>/webhook/auction-puja',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'x-webhook-secret', '<SECRETO>'
      ),
      body    := jsonb_build_object('record', to_jsonb(new))
    );
  exception when others then
    raise warning 'notificar_puja_n8n: webhook falló, se ignora: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists ofertas_puja_nueva on public.ofertas;
create trigger ofertas_puja_nueva
  after insert on public.ofertas
  for each row
  when (new.estado = 'pendiente')
  execute function public.notificar_puja_n8n();
