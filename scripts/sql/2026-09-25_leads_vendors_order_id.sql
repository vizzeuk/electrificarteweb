-- Vendedores: guardar el número de orden del checkout para poder activar la suscripción cuando
-- Reveniu confirma el pago. Hasta ahora el alta guardaba el RUT en rut_vendors y el pago buscaba
-- el número de orden en esa misma columna: nunca calzaba y ningún vendedor quedaba "pagado".
-- Pegar en Supabase → SQL Editor. Es idempotente.
alter table public.leads_vendors add column if not exists order_id text;
create index if not exists leads_vendors_order_id_idx on public.leads_vendors (order_id);
