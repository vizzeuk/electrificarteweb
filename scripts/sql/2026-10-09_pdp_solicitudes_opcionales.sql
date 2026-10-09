-- ─────────────────────────────────────────────────────────────────────────
-- pdp_solicitudes: año y URL oficial pasan a ser OPCIONALES (9-oct-2026).
--
-- Desde el panel ya no se piden obligatoriamente el año, la URL oficial ni las
-- versiones (ver lib/pdp-creacion/encargo.ts):
--   · sin URL → el agente busca la ficha en el sitio oficial de la marca
--     (brand.website en Sanity), sin salir de ese dominio;
--   · sin año → no se declara (no se inventa);
--   · sin versiones → `versiones` queda como [] y el precio sale de la fuente
--     oficial con cita textual, marcado para que una persona lo confirme.
--
-- Aditiva y segura: solo quita el NOT NULL de dos columnas. Correr en el SQL
-- Editor de Supabase ANTES de desplegar la web con este cambio.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.pdp_solicitudes alter column anio drop not null;
alter table public.pdp_solicitudes alter column url_oficial drop not null;
