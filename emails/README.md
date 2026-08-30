# Plantillas de correo (Resend)

HTML estructurado siguiendo la línea de Electrificarte (cyan `#00E5E5`, teal
`#006A61`, tinta `#111827`, footer negro como el sitio). Email-safe: tablas +
estilos inline, sin fuentes web ni degradados. Cada archivo es autónomo (se puede
pegar tal cual en Resend o en un test).

Las variables van entre dobles llaves `{{asi}}`; se reemplazan al enviar.

| Archivo | Flujo | Para quién | Variables |
|---|---|---|---|
| `nuevo-lead-vendedor.html` | 2 · entra un lead | Vendedor | `modelo`, `comuna`, `cta_url` |
| `confirmacion-puja.html` | 1 · entra una puja | Vendedor | `modelo`, `precio` |
| `presion-vendedor.html` | 3 · presión | Vendedor | `modelo`, `competidores`, `mejor_precio`, `horas`, `cta_url` |
| `ofertas-cliente.html` | 4 · tiempo agotado | Cliente | `nombre`, `modelo`, `oferta1_*`, `oferta2_*`, `whatsapp_url` |
| `lead-no-adjudicado.html` | 4 · perdedores | Vendedor | `modelo`, `valor_ganador` |
| `oferta-aceptada-vendedor.html` | cliente acepta | Vendedor ganador | `modelo`, `cliente_nombre`, `cliente_telefono`, `whatsapp_url` |
| `seguimiento-oos.html` | 5 · OOS | Cliente | `nombre`, `modelo`, `whatsapp_url` |

`ofertas-cliente.html` trae dos tarjetas (`oferta1_*` y `oferta2_*`, cada una con
`modelo`, `precio`, `ahorro`, `ubicacion`, `entrega`). Si el lead tiene **una sola**
oferta, borra el bloque "Opción 2".

## Cómo se usan

Hoy los nodos Resend de n8n arman el HTML inline (simple). Para usar estas
plantillas hay dos caminos:

1. **Que el endpoint devuelva el HTML ya armado** (recomendado): cada endpoint que
   dispara un correo (`/message/client`, `/cerrar`, etc.) rellena la plantilla y
   devuelve un campo `html`; el nodo Resend de n8n manda `{{ $json.html }}`. Es un
   paso de wiring que se puede hacer cuando apruebes el diseño.
2. **Reemplazo manual en n8n**: pegar el HTML en el nodo Resend y sustituir cada
   `{{variable}}` por la expresión de n8n correspondiente.

> Estos archivos son la **fuente de diseño**. Cuando el look esté aprobado, se
> conectan (camino 1) para que se usen automáticamente en todos los correos.

## Correos del flujo de VENTAS (`ventas/`)

Los de esta carpeta (subasta) los renderiza el código (`renderEmail`, placeholders
`{{clave}}`). Los del **flujo de pagos/suscripción** (cliente $19.990, vendedor,
avisos a Francisco) están en **`emails/ventas/`** y son distintos: van **directo**
al nodo Resend de n8n con **expresiones de n8n** (`{{ $('Nodo').item.json.campo }}`),
no pasan por el código. Ver `emails/ventas/README.md`.
