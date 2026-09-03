# QA y testeo de los flujos (subasta + ventas) antes de producción

Cómo verificar que los flujos funcionan, respetan las reglas de negocio y no se
rompen con volumen — **sin necesitar eventos reales ni cobrar de verdad**.

Testear "los flujos" son **4 capas**. Solo una se hace dentro de n8n.

| Capa | Qué verifica | Herramienta |
|---|---|---|
| 1. Lógica | scoring, match, financiamiento, quién gana, recuperación, OOS | `npm test` (código) |
| 2. Endpoints | auth, guardas, transiciones de estado, ramas vacías, `htmlEmail` | `npm test` (incluido) |
| 3. n8n | que cada nodo reciba/mande lo correcto | simulador + Pin Data |
| 4. Carga / idempotencia | que con muchos usuarios no se dupliquen envíos ni queden flujos a la mitad | ver §5 |

---

## 1–2. Tests de código (corren solos, sin n8n)

```bash
npm test
```

Corre las **10 suites** de la subasta. Cada una **siembra datos falsos en Supabase,
verifica con asserts y limpia sola** (aunque falle). Cubre: ruteo de vendedores,
match de financiamiento, scoring y ranking, evaluación de pujas, cierre (ganador/
perdedores/sin ofertas), aceptación, recuperación, OOS, y un e2e completo.

Estado actual: **10/10 verdes**. Corré esto **antes de cada deploy**.

> Los datos QA se marcan (`order_id = QA_SEED`, emails `@qa.electrificarte.test`) para
> poder borrarlos. No tocan datos reales.

---

## 3. Probar los flujos de la SUBASTA sin datos reales

### a) Ver qué recibe/manda cada nodo de n8n (simulador)

```bash
npx tsx --env-file=.env.local scripts/qa/auction-n8n-sim.ts
```

Siembra un lead + vendedores reales, corre los endpoints reales e **imprime, nodo por
nodo, exactamente lo que fluye** (a quién le llega el WhatsApp, con qué placeholders,
qué correo, etc.). Es la forma de ver "de dónde sale cada dato" sin adivinar. Limpia solo.

### b) Ver los correos y mensajes de IA con datos de ejemplo

```bash
npx tsx --env-file=.env.local scripts/qa/auction-seed.ts            # siembra + corre + imprime
npx tsx --env-file=.env.local scripts/qa/auction-seed.ts --cleanup  # borra lo sembrado
```

### c) Probarlo dentro de n8n de verdad (Pin Data)

Los nodos Resend/Kapso de la subasta reciben la respuesta del endpoint. Para probar
sin un lead pagado real:

1. En el nodo **HTTP Request** que llama al endpoint (ej. `/api/auction/cerrar`), click
   derecho → **Pin Data**, y pegá una respuesta de ejemplo (la sacás del simulador de
   arriba, que imprime el JSON exacto de cada endpoint).
2. **Execute Workflow** → los nodos de abajo (SplitOut, Kapso, Resend) corren contra
   esos datos, sin tocar Supabase.
3. Poné un `to`/teléfono de **prueba** (tu correo / tu WhatsApp) en los nodos de envío
   mientras probás, para no escribirle a un cliente real.

> Alternativa más realista: apuntá los HTTP Request a un **deploy de staging** (o
> preview de Vercel) en vez de `www`, sembrá un lead QA con `auction-seed.ts`, y corré
> el flujo entero contra datos de prueba.

---

## 4. Probar el flujo de VENTAS (pagos) sin cobrar

El flujo de ventas es **puro n8n** (Webhooks + Supabase + Kapso + Resend, sin endpoints
del repo). Arquitectura (del diagrama):

```
Webhook forms clientes  → Code JS → Create a row           (alta PENDIENTE del lead)
Webhook asesoria        → Create a row4                    (alta PENDIENTE asesoría)
Webhooks forms vendors  → Create a row1                    (alta vendedor)

Webhook forms clientes1 → [External id not null?] → Switch (CUSTOMERS / VENDORS / ASESORIA)
   CUSTOMERS → Update a row2 → Get many rows → format → WhatsApp + Correo cliente + Correo Francisco
   VENDORS   → Update a row  → Get many rows1 →          WhatsApp(off) + Correo vendedor + Correo Francisco
   ASESORIA  → Update a row3 → Get many rows2 →          Kapso (HTTP Request1 / HTTP A WEBHOOK)
```

`External id not null` es la **compuerta de pago**: cuando Reveniu/Transbank confirma,
el webhook trae `external_id` (= el `orderId` del checkout). Si no es null → es un pago
real → el Switch rutea por tipo → marca la fila como pagada → notifica.

### Cómo dispararlo con datos de prueba

Cada webhook de n8n tiene una **Production URL** y una **Test URL** (botón *Listen for
test event* en el nodo Webhook). Usá la **Test URL** y disparале un payload falso:

```bash
# alta pendiente de un lead
node scripts/qa/fire-sales-webhook.mjs <TEST_URL_forms_clientes> creation-lead --email tu@correo.com

# confirmación de pago de un cliente (rama CUSTOMERS)
node scripts/qa/fire-sales-webhook.mjs <TEST_URL_forms_clientes1> pay-customer --email tu@correo.com

# otras: creation-advisory · pay-advisory · register-vendor
# --dry para solo ver el payload (y pegarlo como Pin Data)
```

Con la Test URL escuchando, hacés *Execute* y ves el flujo correr con esos datos. Poné
tu correo como `to` de prueba en los nodos Resend mientras validás.

> ⚠️ **La forma exacta del webhook de pago la define Reveniu**, no nosotros. Los payloads
> del script son una plantilla razonable (`external_id` + `customer`). Lo más fiel es
> **pinear una ejecución real pasada**: en n8n, abrí una ejecución anterior del flujo de
> pagos → *Copy output* del nodo Webhook → Pin Data. Ajustá el script si tu webhook trae
> otros campos.

### Checklist del flujo de ventas (qué mirar en cada rama)

- [ ] `External id not null` **bloquea** cuando `external_id` viene vacío (no confirma pagos falsos).
- [ ] El **Switch** rutea al tipo correcto (CUSTOMERS / VENDORS / ASESORIA) según el campo que uses (`type`).
- [ ] `Update a row*` marca la fila correcta como **pagada** (por `external_id`/`orderId`, no por otro campo).
- [ ] Los correos salen con el **HTML lindo** (ver el otro doc de correos), no el JSON pelado.
- [ ] Los `*-francisco` van al correo interno; los de cliente/vendedor al de la persona.
- [ ] El WhatsApp de vendedores está **desactivado** a propósito (nodo "Deactivated") — confirmá que sea intencional.

---

## 5. Carga y "que no queden flujos a la mitad" (lo crítico para producción)

El riesgo real con volumen no es que "se caiga", sino **duplicados y estados a medias**.
Dos puntos concretos a endurecer:

### 5.1 Idempotencia del cierre de subasta (hallazgo)

En `app/api/auction/cerrar/route.ts` el cierre es **leer-y-después-escribir**:

```ts
if (lead.cerrada_at) return { yaCerrada: true }   // lee
...
await sb.from("leads").update({ cerrada_at: now })  // escribe después
```

Si el cron dispara `/cerrar` **dos veces casi a la vez** sobre el mismo lead, ambas leen
`cerrada_at = null` y **las dos mandan las ofertas al cliente** → correo duplicado.

**Fix recomendado:** cierre **atómico** — `update leads set cerrada_at = now() where id = X
and cerrada_at is null` y seguir **solo si afectó 1 fila**. Igual criterio para los otros
endpoints que mutan estado (`evaluate`, `recuperar`, `oos-pendientes`).

### 5.2 Reveniu reintenta los webhooks de pago

Las pasarelas **reenvían** el webhook si no reciben 200 rápido. Si el flujo de ventas no
es idempotente, un pago puede **notificar dos veces** (dos correos, dos WhatsApp).

**Fix recomendado en n8n:** que `Update a row*` filtre por estado (**solo** actualiza si
la fila está `pendiente`), y/o un nodo IF después del Update que **corte** si la fila ya
estaba pagada. Así el segundo webhook entra pero no re-dispara notificaciones.

### 5.3 Límites de infraestructura (ya conocidos)

- **Vercel Hobby corta a los 60 s** (ignora `maxDuration`). Con volumen, el asesor/
  investigación se puede cortar → **hace falta Vercel Pro** (bloqueante de lanzamiento).
- Los **rate limiters fallan abiertos**: si Upstash cae, no tumban el checkout, pero
  tampoco limitan.

### 5.4 Test de concurrencia (pendiente de construir)

Un script que dispare N `/cerrar` (o N pagos) en paralelo sobre el mismo lead y verifique
que **solo se envía una vez**. Se construye una vez aplicado el fix 5.1.

---

## Resumen: qué corro y cuándo

- **Antes de cada deploy:** `npm test` (10/10 debe pasar).
- **Para inspeccionar la subasta:** `auction-n8n-sim.ts` / `auction-seed.ts`.
- **Para probar ventas en n8n:** Test URL del webhook + `fire-sales-webhook.mjs`.
- **Antes de lanzar con tráfico:** aplicar 5.1 y 5.2 (idempotencia) y Vercel Pro.
