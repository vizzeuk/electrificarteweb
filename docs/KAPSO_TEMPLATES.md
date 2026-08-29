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
