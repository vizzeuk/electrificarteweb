# Contexto para el Dashboard de Vendedores — Subasta inversa

> **Cómo usar este archivo:** es un traspaso portátil para trabajar el dashboard
> (`~/proyects/electrificarte-dashboard`) en su propio workspace, sin haber
> estado en las conversaciones de la web principal. Copiá este archivo a la raíz
> del repo del dashboard. Para el detalle canónico, los docs viven en la web
> principal (misma máquina, se leen por ruta absoluta):
> - `~/proyects/electrificarteweb/docs/AUCTION_N8N_CONTRACT.md` (endpoints)
> - `~/proyects/electrificarteweb/docs/HANDOFF-CONDUCTOR.md` (§7 = esta fase)
> - `~/proyects/electrificarteweb/CLAUDE.md` (negocio + terminología + diseño)

## Los tres proyectos

1. **Web principal** (`electrificarteweb`) — sitio público + APIs + bot WhatsApp.
   Genera los leads y **expone la lógica de la subasta** (ver endpoints abajo).
2. **Dashboard** (este repo, `electrificarte-dashboard`) — panel Admin/Vendedor.
   Hoy **100% data mock**. Esta fase lo conecta a datos reales.
3. **Página de vendedores** — alta y suscripción ($12.990/mes). Aún no ubicada.

Más **n8n** (orquesta notificaciones/pagos) y **Supabase** (la BD).

## Negocio en una línea

Subasta **inversa**: el comprador pagó $19.990 (lead) y los vendedores **pujan
hacia abajo** por debajo del precio publicado. El sistema puntúa las pujas y le
manda 1–2 al cliente, que decide por WhatsApp. Reglas de terminología (aplican
al dashboard): **"vendedores oficiales"**, nunca "concesionarios";
"electrificado" como categoría, "Electrificarte" solo como marca.

## Qué tiene que hacer el dashboard en esta fase

1. **Pestaña Leads real** — leer de Supabase los leads (`leads`, status `pagado`)
   que le fueron ruteados al vendedor logueado (por marca + región).
2. **Formulario de puja** — el vendedor crea una oferta → inserta una fila en
   `ofertas` con estado `pendiente` (ver columnas abajo). Hoy `OfertarDialog`
   solo muestra un toast; hay que hacerlo escribir de verdad.
3. **Cuentas de vendedor** — hoy no existen. Recomendado: **Supabase Auth
   (magic link / OTP)**. Al pagar el plan, n8n marca su fila en `leads_vendors`
   como activa y crea/invita el usuario de Supabase Auth; se le manda el link por
   correo (Resend) o WhatsApp (Kapso). Al entrar, el dashboard valida la sesión +
   que `leads_vendors.estado` esté activo.

## Mapa del repo (lo que YA existe — no arrancar de cero)

Stack: Next.js (dev en `-p 3001`), shadcn/ui + Radix, Tailwind. Rama `main`.
Estructura (`src/`):
- `app/vendedor/` — panel del vendedor: `page.tsx`, `layout.tsx`,
  `leads-disponibles/page.tsx` (el pool), `leads-activos/page.tsx`.
- `app/admin/` — panel admin: `page.tsx`, `vendedores/`, `leads-oferta/`,
  `leads-asesoria/`.
- `components/` — tablas y UI: `ofertar-dialog.tsx` (la puja, hoy muestra toast y
  no escribe), `leads-oferta-table.tsx`, `vendedores-table.tsx`, `traffic-chart.tsx`,
  `site-analytics.tsx`, `components/ui/` (shadcn).
- `lib/mock/` — **la data mock a reemplazar por Supabase real**.

**El trabajo es conectar lo que ya está**, no rehacer: (1) reemplazar `lib/mock`
por lecturas reales a Supabase, (2) que `ofertar-dialog` inserte en `ofertas`
(estado `pendiente`), (3) auth de vendedor.

## Modelo de datos (Supabase)

**No hay stock central nuestro.** Cada vendedor maneja su inventario por fuera;
declara el vehículo al pujar. (La tabla `stock_maestro` que existe en Supabase es
un rastro erróneo — ignorarla.)

### `leads` (el comprador pagado) — el dashboard LEE
`id` (bigint), `first_name`, `last_name`, `email`, `telefono`, `rut`,
`region`, `comuna`, `target_model` (auto que busca, texto libre), `financing`
(método de pago), `parte_pago_*` (auto en parte de pago), `status` (`pagado`),
`order_id`.

### `leads_vendors` (el vendedor) — el dashboard LEE/actualiza el perfil
`id` (uuid), `nombre`, `apellido`, `email`, `telefono`, `region`, `comuna`,
`marcas` (texto: marcas que maneja), `estado`, `rut_vendors`,
`nombre_concesionario` (nombre interno del punto de venta — no mostrar la palabra
"concesionario" al usuario).

### `ofertas` (la puja) — el dashboard ESCRIBE (crear puja) y LEE (estado/score)
`id` (uuid, default), `lead_id` → leads, `vendor_id` → leads_vendors,
`precio_oferta` (bigint, CLP), `horas_entrega` (int, ≤96 SLA),
`version_match` (`exacta`|`variacion_menor`|`upgrade`|`inferior`|`no_coincidente`),
`cercania_zona` (`local`|`regional`|`vecina`|`distante`, la resuelve el backend),
`acepta_financiamiento` (bool), `valor_regalias` (bigint),
`marca_ofertada`/`modelo_ofertado`/`anio_ofertado`/`color_ofertado` (vehículo
declarado), `precio_publicado` (P_publicado snapshot),
`score_total`/`score_desglose` (los llena el backend), `descalificada`,
`motivo_descalificacion`, `alertas`, `estado`
(`pendiente`→`evaluada`→`ganadora`/`perdida`/`aceptada`/`rechazada`/`expirada`).

**Al crear una puja, el dashboard setea:** `lead_id`, `vendor_id`,
`precio_oferta`, `horas_entrega`, `version_match`, `acepta_financiamiento`,
`valor_regalias`, `marca/modelo/anio_ofertado`, `estado='pendiente'`. El resto
(cercanía, precio_publicado, score, estado final) lo resuelve el backend.

## Cómo el dashboard habla con la subasta

La lógica (scoring, ruteo, precio, mensajes) vive en la web principal y se expone
como endpoints (auth header `x-admin-secret: <ADMIN_API_SECRET>`). Ver el contrato
completo en `AUCTION_N8N_CONTRACT.md`. Los que le importan al dashboard:

- `POST /api/auction/match { leadId }` → vendedores elegibles (para el ruteo).
- `POST /api/auction/evaluate { leadId }` → evalúa y rankea las pujas de un lead
  y persiste `score_total`/`estado` en `ofertas`. **Normalmente lo dispara n8n**,
  no el dashboard; el dashboard solo inserta la puja `pendiente`.

El dashboard **no** recalcula scores: inserta la puja y lee el `score_total`/
`estado` que el backend escribe.

## Reglas de diseño (no romper)

Space Grotesk (títulos) + Inter (cuerpo), acento cyan `#00E5E5`, fondos
negro/blanco, `rounded-xl`/`2xl`. Se pueden agregar componentes nuevos dentro de
esa línea. Ver `~/proyects/electrificarteweb/DESIGN.md`.

## Secuencia sugerida

1. Supabase Auth para vendedores (login magic-link) + gating por `estado`.
2. Pestaña Leads real (query a `leads` ruteados al vendedor).
3. Formulario de puja → insert en `ofertas` (`pendiente`).
4. Mostrar estado/score de las pujas propias (lo escribe el backend vía n8n).
