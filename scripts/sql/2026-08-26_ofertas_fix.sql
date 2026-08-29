-- ─────────────────────────────────────────────────────────────────────────
-- Ajuste de `ofertas` (correr DESPUÉS de 2026-08-26_ofertas.sql).
--
-- Corrección de contexto: NO existe un stock central nuestro. Cada vendedor
-- maneja su propio inventario por fuera; nosotros no lo normalizamos ni lo
-- guardamos. El vendedor DECLARA el vehículo cuando hace la puja.
--
-- Por eso: se quita la referencia a `stock_maestro` (rastro erróneo) y se
-- agregan los campos del vehículo ofertado directamente en la puja.
-- `precio_publicado` (P_publicado) se llena con el precio publicado del modelo
-- en electrificarte.com (Sanity), no con un MSRP de stock.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.ofertas drop column if exists stock_id;

alter table public.ofertas
  add column if not exists marca_ofertada  text,
  add column if not exists modelo_ofertado text,
  add column if not exists anio_ofertado   integer,
  add column if not exists color_ofertado  text;
