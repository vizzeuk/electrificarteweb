# Plantillas de WhatsApp (Kapso / Meta) — Subasta inversa

Se crean y validan en Kapso (provider oficial). Idioma `es` (o `es_CL`).
Categoría **UTILITY** salvo la del cliente que puede ir como **MARKETING**.

**Patrón clave:** la plantilla es para el envío **en frío** (fuera de la ventana
de 24 h). Su trabajo es dar lo esencial + **invitar a responder**, para abrir la
sesión de 24 h. Una vez que la persona responde, n8n manda el **mensaje completo
generado por IA** como texto libre (ya dentro de sesión). Por eso las plantillas
son cortas y con pocas variables.

Notación: `{{1}}`, `{{2}}`… son variables que n8n rellena.

---

---

# 🟢 ACTIVA HOY — `asesoria_ultimo_dia`

> Las 8 plantillas de más abajo son de la **subasta inversa**, que está en 🟡 **STANDBY**.
> Esta es la única que hace falta crear hoy.

Recordatorio del **día 9** a quien contrató la Asesoría ($4.990): le queda 1 día.
La manda el cron `/api/cron/asesoria-reminder`.

## ⚠️ REGLA CRÍTICA: la plantilla NO puede tener variables

El código llama a `sendTemplate(phone, name, lang)` **sin parámetros**
(`lib/whatsapp/outbound.ts:100`), así que el payload va **sin `components`**.

> Si la plantilla se crea con `{{1}}` (por ejemplo para el nombre), **Meta rechaza el
> envío** por número de parámetros incorrecto. Tiene que ser **texto fijo, sin variables**.

## Cómo crearla

| Campo | Valor |
|---|---|
| **Nombre** | `asesoria_ultimo_dia` — solo minúsculas, números y guión bajo |
| **Categoría** | **UTILITY** ← importante |
| **Idioma** | **Español (`es`)** |
| **Variables** | **ninguna** |
| **Botones** | ninguno (ver abajo) |

**Body** (copiar tal cual — coincide con `ASESORIA_REMINDER_TEXT`):

```
Hola 👋 Soy *Francisco IA*, tu asesor de electrificarte.com. A tu asesoría le queda *1 día*. ¿Te puedo ayudar en algo antes de que termine? 🔋
```

Los `*asteriscos*` dan **negrita** en WhatsApp. Los emoji están permitidos.

### Por qué UTILITY y no MARKETING
Es un aviso sobre un servicio que la persona **ya pagó** y está por vencer — eso es
utilitario. Si se marca como MARKETING, Meta puede rechazarla o aplicarle los límites
y costos de marketing.

## Después de que Meta la apruebe

Agregar en Vercel (Production + Preview):

```
ASESORIA_REMINDER_TEMPLATE=asesoria_ultimo_dia
```

⚠️ **Si al crearla eligieron un idioma distinto de `es`** (ej. `es_CL` o `es_ES`), hay que
agregar también:

```
ASESORIA_REMINDER_TEMPLATE_LANG=es_CL
```

El código usa `es` por defecto. Si el código y Meta no coinciden en el idioma, **el envío
falla en silencio** (queda solo un warning en los logs).

## Mientras no esté aprobada

No pasa nada grave: el código cae a **texto libre**. La limitación es que WhatsApp solo
permite texto libre dentro de la **ventana de 24 h**, así que el recordatorio solo llega a
quienes escribieron en las últimas 24 horas. Los demás no lo reciben.

**Mejor dejar la variable sin configurar que ponerle un nombre equivocado**: con un nombre
que no existe, el envío falla para *todos*; sin variable, al menos llega a una parte.

## Idea para después (requiere un cambio chico de código)

El objetivo real de la plantilla es **que la persona responda**, porque eso abre la ventana
de 24 h y ahí el asesor puede conversar libre. Un **botón de respuesta rápida** ("Sí, ayúdame")
convierte mucho mejor que pedirle que escriba.

> Ojo: los botones de respuesta rápida necesitan que el envío incluya un componente
> `button` con su payload. Hoy `sendTemplate` no lo manda. **Crearla sin botones primero**
> (funciona seguro con el código actual); si después quieren el botón, es un ajuste chico
> en `lib/whatsapp/outbound.ts`.

---

# 🟡 STANDBY — plantillas de la subasta inversa

Las de abajo pertenecen al marketplace de ofertas, hoy congelado. **No hace falta crearlas
todavía**; quedan documentadas para cuando se reactive.

### 1. `nuevo_lead_vendedor` — UTILITY
Avisar al vendedor que le llegó un lead que calza.

**Body:**
```
🚗 Tienes un nuevo lead en Electrificarte: alguien está buscando un {{1}} en {{2}}.

Responde este mensaje para ver los detalles y enviar tu oferta antes que el resto.
```
- `{{1}}` = modelo buscado (ej. "BYD Dolphin")
- `{{2}}` = comuna/región del cliente (ej. "Providencia, RM")
- Botón (opcional, quick reply): **"Ver lead"**

---

### 2. `mejora_tu_oferta` — UTILITY
Presión al vendedor para que baje el precio (agente negociador). Señales reales.

**Body:**
```
⚡ Hay competencia por el lead de {{1}}: {{2}} vendedores están ofertando.

La mejor oferta actual va en {{3}}. Si puedes mejorarla, responde con tu nuevo precio y quedas mejor posicionado con el cliente.
```
- `{{1}}` = modelo · `{{2}}` = nº de vendedores compitiendo · `{{3}}` = mejor precio vigente (anonimizado)
- Botón (opcional): **"Mejorar oferta"**

---

### 3. `ofertas_listas_cliente` — MARKETING (o UTILITY)
Avisar al cliente que ya tiene ofertas.

**Body:**
```
¡Hola {{1}}! 🎉 Ya conseguimos {{2}} oferta(s) para tu {{3}}, por debajo del precio publicado.

Responde este mensaje y te muestro los detalles para que elijas la que más te convenga.
```
- `{{1}}` = nombre · `{{2}}` = nº de ofertas · `{{3}}` = modelo
- Botón (opcional): **"Ver ofertas"**

---

### 4. `lead_no_adjudicado` — UTILITY
Al vendedor que no ganó (con el valor ganador anonimizado).

**Body:**
```
El lead de {{1}} ya se cerró. La oferta ganadora quedó en {{2}}.

Te avisaremos apenas llegue otro lead que calce con lo que vendes. 🚗
```
- `{{1}}` = modelo · `{{2}}` = valor de la oferta ganadora (anonimizado)

---

### 5. `oferta_aceptada_vendedor` — UTILITY
Al vendedor cuya oferta aceptó el cliente.

**Body:**
```
🎉 ¡Felicitaciones! El cliente aceptó tu oferta por el {{1}}.

Te vamos a conectar directamente con él por WhatsApp para cerrar la venta. Éxito 🤝
```
- `{{1}}` = modelo

---

### 6. `confirmacion_puja` — UTILITY
Al vendedor, apenas registra su puja (Flujo 1).

**Body:**
```
✅ Recibimos tu oferta de {{2}} por el {{1}}. Quedó registrada.

Te avisaremos si el cliente la elige. Si aparece competencia, te vamos a dar la chance de mejorarla.
```
- `{{1}}` = modelo · `{{2}}` = precio ofertado

---

### 7. `seguimiento_oos` — UTILITY
Al cliente, X horas después de aceptar, para saber si la venta se concretó (Flujo 5).

**Body:**
```
Hola {{1}} 👋 ¿Cómo va con el {{2}}? ¿Lograste concretar la compra?

Cuéntanos cómo te fue para ayudarte con lo que necesites.
```
- `{{1}}` = nombre · `{{2}}` = modelo

---

### 8. `sin_ofertas_cliente` — UTILITY
Al cliente cuando su búsqueda cerró sin que nadie ofertara (Flujo 4, rama sin ofertas).

**Body:**
```
Hola 👋 Esta vez no conseguimos ofertas para tu {{1}}. Podemos buscarte otro auto sin costo adicional, y si aun así no hay un buen precio, tu pago es reembolsable.

Respóndenos con el modelo que te interesa y lo ingresamos de nuevo.
```
- `{{1}}` = modelo

*(A Francisco se le avisa por WhatsApp directo desde el servidor — no necesita plantilla.)*

---

## Textos que NO necesitan plantilla (van en sesión)

Estos ocurren cuando la persona **ya está respondiendo** (dentro de las 24 h),
así que se mandan como **texto libre** generado por IA / por n8n, sin plantilla:

- El **detalle comparativo de las ofertas** al cliente (lo genera
  `/api/auction/message/client`), tras el `ofertas_listas_cliente`.
- El **detalle de presión** al vendedor (lo genera
  `/api/auction/message/pressure`), tras el `mejora_tu_oferta`.
- La **confirmación al cliente** al aceptar + el **seguimiento OOS** ("¿se
  concretó la venta?") X horas después.

## Correo (Resend) — no necesita aprobación

Los mismos hitos van por correo (Resend), donde no hay ventana de 24 h ni
plantillas Meta: ahí sí se puede mandar el texto completo directamente.
