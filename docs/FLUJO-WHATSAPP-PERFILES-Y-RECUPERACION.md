# WhatsApp: perfiles (tiers), recuperación y pendientes

> **Para el equipo (Matías incluido).** Documenta las decisiones y dudas que
> surgieron al armar la subasta inversa: cómo se separan los perfiles en el bot,
> el flujo de recuperación del cliente, los links de correos/plantillas, y qué
> queda pendiente. Objetivo: que todos entendamos lo mismo antes de seguir.

---

## 1. Los perfiles (tiers) y por qué NO se solapan

**La preocupación:** que un vendedor hablando con el bot reciba cosas de asesoría o
de oferta, o cualquier cruce entre perfiles.

**La garantía:** el bot resuelve **un solo tier por teléfono** antes de responder, y
cada tier tiene un comportamiento aislado. No hay forma de que se mezclen.

### Cómo se decide el tier (`lib/whatsapp/subscription.ts` → `resolveTier`)
Ante un mensaje entrante, se consulta el teléfono en las 3 tablas **en paralelo** y
se aplica **prioridad estricta**:

```
vendedor  >  oferta  >  asesoria  >  null (sin suscripción)
```

| Tier | Tabla Supabase | Cómo se comporta el bot |
|---|---|---|
| `vendedor` | `leads_vendors` | **Bloqueado.** Recibe un mensaje de redirección a vendedores@… y NUNCA llega al asesor. |
| `oferta` | `leads` (status `pagado`) | Ya eligió auto y espera precio. Soporte del modelo + (nuevo) elección de ofertas. **No** se le menciona asesoría ni se le re-vende el $19.990. |
| `asesoria` | `advisory_payments` | Aún decide qué auto. Puede recomendar el $19.990 como paso siguiente. |
| `null` | — | Mensaje invitando a contratar. |

Puntos clave del diseño (ya implementados):
- **El vendedor se chequea primero** justo para que un vendedor registrado nunca
  dispare por accidente el asesor de comprador.
- Si alguien tiene **oferta Y asesoría**, gana `oferta` (ya pasó la etapa de decidir
  — no se le re-vende).
- El asesor usa **prompts distintos por tier** (`BASE_SYSTEM` para asesoría,
  `OFERTA_SYSTEM` para oferta), así el contenido nunca se cruza.
- El **modo administrador** (Francisco) se resuelve por número emisor **antes** que
  cualquier tier, y también está aislado.

### Cómo los flujos NUEVOS respetan esto
- **Elección de ofertas (cliente acepta):** el enganche en el bot solo actúa para
  tier `oferta` **que además tiene ofertas esperando decisión**. Si no, el bot sigue
  su curso normal. No toca al vendedor ni a la asesoría.
- **Recuperación (sección 2):** solo aplica a tier `oferta` (el cliente que pagó).
  Crea otro lead `oferta` para el mismo teléfono → sigue siendo el mismo perfil.

### Un matiz importante
Un mismo teléfono puede tener **varias filas/leads** (ej. una recuperación crea un
lead nuevo). Eso **no** rompe los perfiles: la prioridad decide el tier, y los
flujos que dependen de un lead puntual (aceptación, recuperación) siempre trabajan
con **el lead activo más reciente**. El perfil de la persona es uno solo.

---

## 2. Flujo de recuperación (cliente sin resultado, sin cobrar de nuevo)

**La idea (de Matías):** si al cliente no le resultó (rechazó las ofertas, o la venta
no se concretó, o ninguna oferta logró ahorro), en vez de mandarlo a llenar el
formulario y pagar de nuevo, **le ofrecemos buscar otro vehículo sin costo**, por
WhatsApp. Si tras eso sigue sin haber ahorro → **devolución del dinero**.

**Es viable y no arma revoltijo de perfiles.** El cliente sigue siendo tier `oferta`
(ya pagó). Recuperarlo = crear un **lead nuevo en `leads`** para el mismo teléfono,
`status = pagado`, pero **sin pasar por `/checkout`** (sin cobro), marcado como
recuperación y enlazado al pago original.

### Diseño propuesto (system-gated + acotado)
1. **Se ofrece**, no se pide arbitrariamente. Se dispara cuando un lead cierra mal
   (rechazó todo / OOS = "no se concretó" / sin ahorro).
2. El bot propone: *"No resultó con el X, ¿buscamos otro sin que pagues de nuevo?"*
   → el cliente dice el nuevo modelo → se crea el lead nuevo (server-side, sin cobro).
3. El lead nuevo entra al embudo normal (notifica vendedores, etc.).
4. Si tras N intentos sigue sin ahorro → **devolución**.

### Seguridad y abuso (a escala)
El riesgo real es **búsquedas gratis infinitas**. Se controla con:
- **Iniciado por el sistema**, no por el cliente a demanda (no puede spamear
  "búscame otro auto").
- **Tope duro por pago** (ej. máx. 2 recuperaciones por cada $19.990), guardado en
  el lead.
- Los **rate limits y la cuota diaria del bot** ya existentes aplican igual — no se
  abre ningún vector nuevo de abuso/DoS.

### Qué falta construir (feature autocontenida)
- Campos en `leads`: `origen` (`form` | `recuperacion`), `recuperacion_de`,
  `recuperacion_count`.
- Endpoint `/api/auction/recuperar` (crea el lead con el tope).
- Nueva intención en el bot (cliente acepta recuperación → dice el modelo → se crea).

---

## 3. Botones y links (correos + plantillas de Kapso)

Los botones de los correos son links normales; lo importante es **a dónde apuntan**:

| Botón | Destino | Nota |
|---|---|---|
| Cliente: "Responder/Elegir por WhatsApp" | `wa.me/<número-Electrificarte>` | Abre el chat con el bot; su respuesta la maneja el flujo de aceptación. |
| Vendedor: "Enviar/Mejorar oferta", "Ir al panel" | URL del **dashboard** | Pendiente de desplegar el dashboard. |
| Vendedor ganador: "Escribir al cliente" | `wa.me/<teléfono-cliente>` | Abre WhatsApp directo con el cliente. |

**El cliente NO tiene una página web de "estado del pedido".** Su canal de estado/
ayuda es la **conversación de WhatsApp con el bot**. Si se quisiera una página web
de estado, es una feature nueva a decidir.

**Botones de Kapso (Meta):** las plantillas soportan botones de URL o de respuesta
rápida; se configuran en el **editor de plantillas de Kapso**. Recomendación:
vendedores → botón URL al dashboard; cliente → sin botón (elige escribiendo "la 1").

---

## 4. Wiring de correos + verificación de variables

**"Wiring"** = conectar los HTML de correo (`emails/`) para que se envíen de verdad.
Hoy los nodos de Resend en n8n mandan un HTML simple inline; wirear = que el endpoint
arme el HTML relleno y n8n mande eso. Es un paso mecánico pendiente (el diseño ya
está aprobado).

**Cómo se verifica que `{{1}}`/`{{2}}` calcen con los datos reales:**
- **Correos:** usan nombres (`{{modelo}}`, `{{precio}}`), no números → no hay problema
  de orden.
- **Plantillas de Kapso:** usan `{{1}}`, `{{2}}` por posición. El orden en el nodo de
  n8n debe coincidir con el de la plantilla. Meta **rechaza** si la cantidad no
  coincide; y el script `scripts/qa/auction-n8n-sim.ts` imprime, con datos reales,
  qué valor va a cada `{{n}}` — eso se compara contra la plantilla en Kapso.

---

## 5. Pendientes (orden sugerido)

1. **Dashboard** (`electrificarte-dashboard`, otro repo) — pestaña Leads real, form
   de puja, cuentas de vendedor. Es lo visible y desbloquea las URLs "Ir al panel".
   Contexto en `docs/DASHBOARD_CONTEXT.md`.
2. **Flujo de recuperación** (sección 2) — cierra el círculo con la devolución.
3. **Wiring de correos** (sección 4) — mecánico, ya aprobado el diseño.
4. **Plantillas de Kapso** — bloqueadas por config de Meta del lado del usuario
   (error `subcode 33`); las redacta el texto está en `docs/KAPSO_TEMPLATES.md`.
5. **Captura de la respuesta OOS** ("sí se concretó" / "no") — hoy el OOS es un
   empujón de una vía; registrar la respuesta automáticamente es mejora futura y
   se enlaza con el flujo de recuperación/devolución.

---

## Estado actual (para referencia)
- Motor de subasta, endpoints, flujos n8n 1–5 y flujo de aceptación: **desplegados en
  producción** (electrificarte.com, usar dominio `www`).
- Migraciones corridas: ventana + aceptación.
- Detalle técnico de endpoints: `docs/AUCTION_N8N_CONTRACT.md`. Flujos y nodos:
  `n8n/README.md`.
