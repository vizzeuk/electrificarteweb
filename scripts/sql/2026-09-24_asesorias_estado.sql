-- ─────────────────────────────────────────────────────────────────────────
-- Vista `asesorias_estado` — cuántos días le quedan a cada Asesoría $4.990.
--
-- Una vista y no una columna: "días restantes" cambia solo con el paso del
-- tiempo, así que una columna guardada estaría mal al día siguiente. La vista
-- se calcula en cada consulta y siempre está al día.
--
-- Replica EXACTAMENTE la regla del bot (lib/whatsapp/subscription.ts →
-- asesoriaVigente): la asesoría dura 10 días desde `paid_at` (o `created_at` si
-- no hay `paid_at`), y los estados pendiente/cancelado no cuentan. Si se cambia
-- ASESORIA_WINDOW_DAYS en Vercel, hay que cambiar el '10 days' de acá también.
--
-- Correr en el SQL Editor de Supabase (Dashboard → SQL Editor → New query).
-- Es aditiva: no modifica `advisory_payments`.
-- ─────────────────────────────────────────────────────────────────────────

create or replace view public.asesorias_estado
with (security_invoker = true)   -- respeta el RLS de advisory_payments
as
with base as (
  select
    a.*,
    coalesce(a.paid_at, a.created_at)                         as inicio,
    coalesce(a.paid_at, a.created_at) + interval '10 days'    as vence,
    lower(trim(coalesce(a.status, '')))                        as status_norm
  from public.advisory_payments a
)
select
  id,
  order_id,
  fullname,
  email,
  phone,
  regexp_replace(coalesce(phone, ''), '\D', '', 'g')          as phone_digitos,
  status,
  created_at,
  paid_at,
  inicio,
  vence,
  case
    when status_norm like 'pendiente%' or status_norm like 'pending%'
      then 'pendiente de pago'
    when status_norm in ('cancelled','canceled','cancelado','expired','expirado','inactive','inactivo')
      then 'cancelada'
    when now() < vence then 'activa'
    else 'vencida'
  end                                                          as estado,
  -- Misma cuenta que el recordatorio del día 9: 10 − días completos transcurridos.
  -- Día del pago = 10; el día 9 (cuando sale el aviso) = 1; vencida = 0.
  case
    when (status_norm like 'pendiente%' or status_norm like 'pending%')
      or status_norm in ('cancelled','canceled','cancelado','expired','expirado','inactive','inactivo')
      or now() >= vence
      then 0
    else greatest(0, 10 - floor(extract(epoch from (now() - inicio)) / 86400))::int
  end                                                          as dias_restantes
from base
order by inicio desc;

-- Datos personales: la vista no se expone a la API pública, solo al backend
-- (service_role) y al SQL Editor.
revoke all on public.asesorias_estado from anon, authenticated;

comment on view public.asesorias_estado is
  'Estado y días restantes de cada Asesoría $4.990. Regla = lib/whatsapp/subscription.ts (asesoriaVigente).';
