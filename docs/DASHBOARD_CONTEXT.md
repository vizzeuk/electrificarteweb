# Contexto para el Dashboard de Vendedores — Subasta inversa

> **Cómo usar este archivo:** es un traspaso portátil para trabajar el dashboard
> (`~/proyects/electrificarte-dashboard`) en su propio workspace, sin haber
> estado en las conversaciones de la web principal.
>
> **Contexto completo de la web principal (este repo, misma máquina).** La copia
> actualizada vive en el workspace de Conductor donde se hizo todo el trabajo de la
> subasta (el worktree `~/proyects/electrificarteweb` puede estar desactualizado —
> si es así, hacé `git pull` en él, o leé directo desde el workspace):
>
> `BASE = ~/conductor/workspaces/electrificarteweb/kingston`
>
> - `$BASE/CLAUDE.md` — negocio, terminología, reglas, stack.
> - `$BASE/DESIGN.md` — sistema de diseño (colores, tipografías, componentes).
> - `$BASE/docs/HANDOFF-CONDUCTOR.md` — estado general del proyecto.
> - `$BASE/docs/AUCTION_N8N_CONTRACT.md` — endpoints de la subasta.
> - `$BASE/docs/FLUJO-WHATSAPP-PERFILES-Y-RECUPERACION.md` — tiers/perfiles + recuperación.
> - `$BASE/n8n/README.md` — flujos n8n. `$BASE/emails/` — plantillas de correo.
>
> Leé este archivo + esos para tener el panorama de los 3 proyectos acoplados.

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

## Seguridad (LEER ANTES DE TOCAR DATOS — crítico a escala)

El dashboard corre en el **navegador de los vendedores**. Cualquier cosa que llegue
al cliente es pública. Reglas duras:

1. **El `SUPABASE_SERVICE_ROLE_KEY` NUNCA va al browser.** Bypassea toda la
   seguridad (RLS). Jamás en código cliente ni en variables `NEXT_PUBLIC_*`. Vive
   solo server-side (server actions / route handlers del dashboard).

2. **Auth de vendedor con Supabase Auth** (magic link / OTP). Al entrar, se valida
   la sesión + que su fila en `leads_vendors` esté activa. Hace falta un vínculo
   entre el usuario de Auth y la fila del vendedor (columna `user_id uuid` →
   `auth.users`, o match por email verificado). n8n crea/activa esa fila y el
   usuario al confirmarse el pago del plan.

3. **RLS (Row Level Security) ON en todas las tablas** que toca el dashboard, con
   políticas por vendedor autenticado:
   - `leads_vendors`: cada vendedor lee/edita **solo su propia fila**.
   - `ofertas`: cada vendedor **inserta** ofertas a su nombre (`vendor_id` = el suyo)
     y **lee solo las suyas**. No puede ver ni tocar ofertas de otros.
   - `leads` (el pool): un vendedor activo puede LEER los leads disponibles
     (`status=pagado`, `cerrada_at` null), pero **con columnas limitadas** (ver #4).

4. **PII del cliente protegida.** El pool (leads-disponibles) **NO** debe exponer
   `telefono`, `email` ni `rut` del comprador. Solo lo necesario para ofertar:
   `target_model`, `region`, `comuna`, `financing`, `parte_pago_*`. El contacto del
   cliente se revela **solo al vendedor ganador**, y llega por la notificación de
   aceptación (WhatsApp/correo que ya envía el flujo), **no por el dashboard**.
   → En la práctica: exponer el pool con una **vista** (o columnas explícitas) sin PII.

5. **Patrón de acceso recomendado:**
   - Lecturas del vendedor (su perfil, sus ofertas, el pool sin PII) → cliente
     Supabase con **anon key + RLS**.
   - Escrituras con reglas de negocio (crear puja, validar tope) → mejor por un
     **route handler / server action del dashboard** (server-side, valida la sesión;
     puede usar service role ahí, nunca en el browser). Al insertar una puja en
     `ofertas` (estado `pendiente`), el **Supabase Database Webhook** dispara el
     flujo n8n que ya existe — el dashboard no llama endpoints de la subasta.

6. **Panel admin** (`app/admin`): rol distinto, acceso restringido a
   Electrificarte. Gatearlo con su propia verificación (no mezclar con el rol
   vendedor). El admin sí ve más datos, pero detrás de auth de admin.

7. **Rate limiting / escala:** las lecturas van con RLS (Supabase escala bien); las
   escrituras sensibles pasan por el server del dashboard, donde se puede limitar.
   No exponer operaciones masivas sin límite al cliente.

> Regla mental: **el browser solo puede hacer lo que RLS + la sesión del vendedor
> permiten.** Todo lo demás (service role, reglas de negocio, PII) vive server-side.

## Reglas de diseño (no romper)

Space Grotesk (títulos) + Inter (cuerpo), acento cyan `#00E5E5`, fondos
negro/blanco, `rounded-xl`/`2xl`. Se pueden agregar componentes nuevos dentro de
esa línea. Ver `~/proyects/electrificarteweb/DESIGN.md`.

## Secuencia sugerida

1. Supabase Auth para vendedores (login magic-link) + gating por `estado`.
2. Pestaña Leads real (query a `leads` ruteados al vendedor).
3. Formulario de puja → insert en `ofertas` (`pendiente`).
4. Mostrar estado/score de las pujas propias (lo escribe el backend vía n8n).
