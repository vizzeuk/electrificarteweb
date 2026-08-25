# Traspaso de contexto — Electrificarte

Documento para retomar el proyecto en un entorno nuevo (Conductor ADE u otro orquestador de
agentes) sin haber estado en las conversaciones anteriores. Escrito el 2026-08-13.

**Cómo usarlo:** léelo entero antes de tocar código. Después, `CLAUDE.md` es la referencia
permanente del proyecto (se carga sola en cada sesión); este archivo es la foto del estado
actual y el punto de partida de la fase siguiente.

---

## 1. Mapa de repos

Tres piezas, dos repos locales, una plataforma externa.

| Pieza | Ubicación | Qué es | Estado |
|---|---|---|---|
| **electrificarteweb** | `~/proyects/electrificarteweb` | Sitio público + APIs + bot de WhatsApp. Next.js 16, Sanity, Vercel. | En producción, pre-lanzamiento |
| **electrificarte-dashboard** | `~/proyects/electrificarte-dashboard` | Panel interno Admin/Vendedor. Next.js 16, shadcn. | **100% datos mock**, sin backend |
| **n8n** | VPS propia (fuera de estos repos) | Orquesta pagos y automatizaciones. Lo mantiene Matías. | En uso |
| **Supabase** | Externo | Base de datos (`leads`, `leads_vendors`, `advisory_payments`). Escribe n8n. | En uso |

`docs/ADMIN_WHATSAPP_RESEARCH_SPEC.md` es la especificación completa del motor de
investigación de autos por WhatsApp — se escribió para que Matías lo reimplemente en n8n sobre
la VPS y así esquivar el límite de duración de funciones de Vercel.

---

## 2. Negocio en una página

Marketplace chileno de vehículos **electrificados** (todo lo que tenga batería: EV, PHEV, HEV,
MHEV, EREV; se excluye solo el 100% combustión). Electrificarte no vende autos: intermedia
entre comprador y **vendedores oficiales** y negocia un precio mejor que el de lista.

Tres productos:

1. **Oferta Exclusiva — $19.990.** El comprador ya sabe qué modelo quiere. Paga y
   Electrificarte le busca la mejor oferta en su red. Llega en 48-96 h. **Tiene garantía de
   devolución: si no hay ahorro, se devuelve el dinero** (esto está vigente y publicado).
2. **Asesoría IA — $4.990.** El comprador aún no sabe qué auto comprar. Conversa 10 días por
   WhatsApp con "Francisco IA" que lo ayuda a decidir. Puede derivar al producto 1.
3. **Suscripción de vendedores — $12.990/mes.** Los vendedores pagan por acceder a los leads
   de 1 y 2. **Esta es la parte que viene** (sección 7).

**Regla de terminología, aplica a todo texto de cara al usuario:** son **"vendedores
oficiales"**, nunca "concesionarios". "Electrificarte" es marca, no adjetivo — la categoría es
"electrificado/a".

---

## 3. Estado actual: qué funciona

### Sitio público
Estático/SSG con ISR (`revalidate = 60`) en casi todas las rutas — esto es lo que le permite
aguantar tráfico. Solo son dinámicas `/comparador` (usa `searchParams`), las dos páginas de
post-pago (leen cookie) y `/studio`.

### Flujo de pago
Formulario → `/api/checkout` → crea cargo en Reveniu → responde `completionUrl` →
el navegador hace POST a Transbank. En paralelo avisa a n8n para dejar el lead "pendiente" en
Supabase. Cuando Transbank confirma, Reveniu llama a n8n y ahí el lead pasa a `pagado`.

### Bot de WhatsApp (Kapso)
Cuatro perfiles resueltos por número emisor y consulta a Supabase:

| Tier | Tabla | Comportamiento |
|---|---|---|
| `admin` | env `ADMIN_PHONE_NUMBERS` | Modo administrador: investiga autos, revisa specs/fotos, publica. |
| `vendedor` | `leads_vendors` | Bloqueado, se le redirige a vendedores@electrificarte.com |
| `oferta` | `leads` (status=`pagado`) | Soporte técnico del modelo elegido. **No** le menciona $4.990 ni $19.990. |
| `asesoria` | `advisory_payments` | Ayuda a decidir. Puede recomendar el $19.990. |
| `null` | — | Mensaje invitando a contratar. |

Prioridad: `vendedor` > `oferta` > `asesoria`. **Fail-closed**: ante cualquier duda o error, no
da acceso. Tiene idempotencia contra webhooks duplicados, lock por teléfono (ráfagas no pisan
el historial) y cuota diaria por número.

### Investigación automática de PDP
Por WhatsApp, Francisco pide "agrega el BYD Han" y el sistema busca la ficha oficial, extrae
specs, sube fotos y crea el auto **oculto**. Después lo revisa conversando (specs → fotos →
publicar). Especificación completa en `docs/ADMIN_WHATSAPP_RESEARCH_SPEC.md`.

---

## 4. Reglas no negociables (romper esto es un bug de negocio)

1. **Un auto se crea siempre oculto** (`hidden: true`). Solo pasa a visible cuando Francisco
   dice explícitamente "publica". Nunca automático.
2. **Nunca inventar datos de un auto.** Specs, precios y tipo de electrificación salen del
   texto de la fuente o quedan vacíos. Es preferible no crear la ficha a publicar un dato
   falso. Hay gates que lo fuerzan: mínimo 10 specs + equipamiento + precio confirmado.
3. **El bot nunca inventa resultados.** Si una investigación quedó "en curso", el bot responde
   eso y nada más — no escribe specs de memoria (esto pasó de verdad, ver sección 6).
4. **Diseño:** no cambiar tipografías, colores ni espaciados sin autorización. Space Grotesk +
   Inter, cyan `#00E5E5`, `rounded-xl`/`2xl`. Sí se pueden agregar componentes nuevos dentro de
   esa línea.
5. **Terminología:** "vendedores oficiales", "electrificado". Ver sección 2.

---

## 5. Trampas operativas (aprendidas a la mala)

Cosas que costaron horas y no son obvias leyendo el código.

**Vercel plan Hobby corta las funciones a 60 s**, sin importar el `maxDuration` que declare el
código. `maxDuration = 120` en el webhook de WhatsApp y `= 300` en pdp-research **no funcionan
en Hobby**. El asesor pagado puede morir a mitad de conversación. Pro sube a 300 s.
→ *Estado: sin confirmar que se haya subido a Pro. Verificar antes de lanzar.*

**GROQ: `campo != "valor"` también matchea `null`/`undefined`.** Para un filtro positivo
exclusivo hay que usar `campo in ["a","b"]`. (En `hidden != true` el comportamiento actual sí es
el deseado: incluye los que no tienen el campo.)

**`math::min()` no acepta `coalesce()` en la proyección directa.** Hay que proyectar primero:
`math::min(*[...]{"p": coalesce(a,b)}.p)`.

**`next dev` con Turbopack cuelga los trabajos en `after()`** — quedan sin terminar y sin
error. Para probar flujos largos en local: `npx next dev --webpack`.

**El log del server local bufferea.** Un trabajo puede haber terminado hace rato aunque el log
no muestre nada. Verificar el resultado real (Sanity, Redis) en vez de confiar en el log.

**La fuente de íconos es un subset generado.** Si agregas un ícono —en código o en Sanity, que
son campos de texto libre— hay que regenerarla o no se dibuja:
`npx tsx --env-file=.env.local scripts/subset-icon-font.ts`

**El rate limiter debe fallar abierto.** Si Upstash se cae y el limitador lanza excepción,
tumba el request completo — incluido el checkout, o sea nadie puede pagar.

**Modelos Anthropic en uso:** `claude-sonnet-4-6` (asesor de WhatsApp),
`claude-haiku-4-5-20251001` (chat del sitio), `claude-sonnet-5` (admin e investigación).
⚠️ `lib/whatsapp/advisor.ts` usa `temperature: 0.4`; **Sonnet 5 rechaza los parámetros de
sampling con error 400**, así que subir ese modelo sin quitar esa línea rompe el asesor pagado.

---

## 6. Bugs reales que ya se corrigieron (no reintroducirlos)

- **Doble cobro por doble-tap.** El guard de los formularios de pago usaba `useState`, que es
  asíncrono. Ahora usa `useRef` (síncrono) y no se libera tras `form.submit()`.
- **Checkout que cobraba y moría.** Llamaba a n8n con `await fetch` sin timeout después de
  crear el cargo en Reveniu; si n8n se demoraba, la función moría y el usuario reintentaba
  generando un segundo cargo. Ahora n8n va en `after()` con timeout.
- **El bot inventó una ficha completa.** Al recibir "en curso" siguió escribiendo precio,
  specs y un link a Studio, todo falso; y al turno siguiente citó su propia respuesta como
  hecho. Se corrigió con dos reglas duras en el system prompt.
- **Estado de revisión zombi.** Un "sí" reactivaba una revisión vieja de otro auto y mandaba
  fotos equivocadas. Ahora se limpia al arrancar una investigación nueva.
- **`llms.txt` con datos falsos.** El estático decía "concesionarios", omitía el producto de
  $4.990 y mezclaba los dos servicios — o sea las IA citaban mal el negocio. Ahora se genera
  desde Sanity.
- **Sitemap con `lastModified` = hoy en las 258 URLs.** Google deja de confiar en el campo.
  Ahora usa el `_updatedAt` real.

---

## 7. FASE SIGUIENTE — Marketplace de ofertas de vendedores

Esto es lo que hay que construir. **Todavía no existe nada de esto en código**: el dashboard
de vendedor tiene la UI con datos mock (`OfertarDialog` muestra un toast y no envía nada).

### Lo que ya está decidido

- El pool de leads disponibles (pagados, sin vendedor) es **visible para todos los vendedores
  activos por igual**. No hay asignación 1:1 automática.
- Cualquier vendedor puede ofertar sobre un lead disponible.
- La oferta llega al cliente **por WhatsApp**, y de ahí la negociación y el cierre ocurren en
  ese canal, **fuera de la plataforma**. Electrificarte no media ni registra el cierre real.
- La suscripción del vendedor cuesta $12.990/mes y sigue el mismo patrón de pago (n8n +
  Supabase + Reveniu).

### Lo que pidió el usuario para esta fase

1. Flujo n8n que ayude a **regatear**.
2. Que los vendedores **accedan a los leads y puedan ofertar** autos.
3. **Ponderaciones a nivel de la oferta.**
4. **Autos parecidos:** no siempre se va a tener el mismo auto, mismo año o mismo modelo
   específico, pero sí autos similares que el vendedor puede ofertar.
5. **Flujo completo de notificaciones.**

### Preguntas que hay que resolver ANTES de construir

Estas no se pueden inferir del código ni del negocio actual — las tiene que responder
Francisco. Construir sin respuesta acá es la forma más rápida de rehacer todo.

**Sobre "autos parecidos" (el punto más ambiguo):**
- ¿Qué hace a un auto "suficientemente parecido"? ¿Mismo segmento? ¿Rango de precio? ¿Misma
  tecnología (EV vs PHEV)? ¿Misma marca?
- ¿Quién decide: el vendedor propone lo que quiera y el cliente evalúa, o el sistema filtra y
  solo deja ofertar dentro de un conjunto válido?
- ¿El cliente pidió "BYD Dolphin" y le llega una oferta de "MG4"? ¿Eso se considera cumplir el
  servicio o es motivo de devolución?

**Sobre las ponderaciones:**
- ¿Qué se pondera y para qué? Las opciones son muy distintas entre sí:
  (a) ordenar las ofertas que ve el cliente, (b) decidir qué vendedor ve antes un lead,
  (c) puntuar la calidad/reputación del vendedor, (d) medir cuánto se parece el auto ofertado
  al pedido.
- ¿El cliente ve **todas** las ofertas o solo la mejor?

**Sobre la garantía de devolución (crítico, conecta con el modelo de datos):**
- La promesa publicada es "si no ahorras, te devolvemos el dinero". Para poder decidir eso
  automáticamente hay que poder medir el ahorro: **¿ahorro contra qué? ¿el `basePrice` de
  Sanity? ¿el precio de lista que declara el vendedor?**
- ¿Quién y cuándo declara que no hubo ahorro, si el cierre ocurre fuera de la plataforma?

**Sobre ciclo de vida y notificaciones:**
- ¿Un lead expira? ¿Una oferta expira?
- ¿Cuántas ofertas puede hacer un vendedor sobre el mismo lead? ¿Puede corregirla?
- Notificaciones: ¿a quién, por qué canal y en qué momento? (vendedor cuando entra un lead
  nuevo; cliente cuando llega una oferta; ¿recordatorios?)
- ¿El cliente puede rechazar/aceptar dentro de la plataforma, o todo pasa a WhatsApp?

**Sobre infraestructura:**
- El dashboard hoy es 100% mock. ¿Esta fase lo conecta a Supabase de verdad?
- ¿Dónde vive la oferta? ¿Tabla nueva en Supabase? ¿Quién escribe, n8n o el dashboard?
- ¿El dashboard se despliega dónde? (hoy no está desplegado)

### Sugerencia de secuencia

1. Cerrar las preguntas de arriba con Francisco.
2. Modelar los datos primero (tabla de ofertas + relación con `leads` y `leads_vendors`),
   porque de eso dependen la ponderación, la similitud y la garantía.
3. Conectar el dashboard de vendedor a datos reales (hoy mock) para el pool y el formulario de
   oferta.
4. n8n: notificaciones + envío de la oferta por WhatsApp al cliente.
5. Recién ahí la lógica de similitud y ponderación, que es la parte con más criterio y la que
   más conviene poder ajustar sin redeploy.

---

## 8. Bloqueantes para lanzar (estado al 2026-08-13)

- [ ] **Vercel Pro.** Sin esto el asesor pagado puede cortarse a los 60 s. Es el único
      bloqueante que no se puede resolver con código.
- [ ] **Verificar Supabase en producción.** El gating es fail-closed: si `SUPABASE_URL` o
      `SUPABASE_SERVICE_ROLE_KEY` están mal en Vercel, **todos los clientes que pagaron verían
      el mensaje de "contrata la asesoría"**. No se pudo probar en local (faltan las llaves).
      Probar con un número real pagado.
- [ ] **`NEXT_PUBLIC_GA_ID`** en Vercel (formato `G-XXXXXXXXXX`). Sin eso GA4 no carga.
- [ ] **Decidir www vs no-www.** El sitio usa `https://electrificarte.com` como canonical, pero
      la URL de retorno de Reveniu apunta a `www.`. Si ambas responden, conviene redirigir una
      a la otra para no dividir autoridad SEO.
- [ ] `N8N_CONTACT_URL` en Vercel con la URL de producción (sin `-test`).
- [ ] Terminología "concesionario" → "vendedores oficiales": quedan 3 archivos.
- [ ] 10 autos sin imágenes y 11 marcas sin logo (ver `CLAUDE.md`).

---

## 9. Cómo verificar que algo funciona

```bash
# Typecheck + build (siempre antes de commitear)
npx tsc --noEmit && npm run build

# Server local para probar flujos largos (WhatsApp, investigación)
npx next dev --webpack        # NO uses Turbopack: cuelga los after()

# Regenerar la fuente de íconos tras agregar uno
npx tsx --env-file=.env.local scripts/subset-icon-font.ts

# Investigar un auto sin escribir en Sanity
npx tsx --env-file=.env.local scripts/pdp-research.ts "BYD" "Han" --dry
```

Para probar el bot de WhatsApp de punta a punta hace falta exponer el local con un túnel
(ngrok) y apuntar el webhook del sandbox de Kapso ahí. `ADMIN_API_BASE_URL=http://localhost:3000`
en `.env.local` hace que el disparo interno vaya al server local en vez de a producción.

---

## 10. Convenciones de trabajo

- Verificar antes de afirmar. Si un script dice "listo", comprobar el resultado real (consultar
  Sanity/Redis, mirar la salida). Varias veces un número que parecía bueno escondía un fallo.
- `git fetch` y revisar si Matías (`Eitheer1`) subió algo antes de pushear. Nunca force-push.
- Commits con mensaje que explique **por qué**, no solo qué.
- Los comentarios en el código explican decisiones no obvias, no lo que hace la línea
  siguiente.
