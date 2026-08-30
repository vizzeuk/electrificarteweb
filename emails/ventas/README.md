# Correos del flujo de VENTAS (pago / suscripción) — para pegar en n8n

Estos correos van **directo** al nodo Resend de tu flujo de n8n de pagos/ventas
(NO los renderiza el código del sitio, a diferencia de los de la subasta en la
carpeta padre). Por eso usan **expresiones de n8n** (`{{ $('Nodo').item.json.campo }}`).

Diseño unificado con la línea nueva: header con logo, tarjetas con borde, footer
negro, sin badges/emojis/degradados. Terminología corregida ("Punto de venta", no
"concesionario"); dominio `www`.

| Archivo | Cuándo se envía | A quién | Expresiones que usa |
|---|---|---|---|
| `pago-confirmado-cliente.html` | Cliente paga la Oferta Exclusiva ($19.990) | Cliente | `customer.name`, `descripcion_interes` |
| `nuevo-lead-francisco.html` | (mismo evento) | **Francisco** (interno) | `customer.name`, `descripcion_interes`, `telefono` |
| `registro-vendedor.html` | Vendedor paga su suscripción | Vendedor | `nombre`, `nombre_concesionario`, `marcas` |
| `nuevo-vendedor-francisco.html` | (mismo evento) | **Francisco** (interno) | `nombre`, `apellido`, `nombre_concesionario`, `telefono`, `marcas` |

## Forma fácil: importar los nodos ya armados

En `n8n/ventas-correos.json` están los **4 nodos Resend ya listos** (con `from`,
`to`, `subject` y el `html` completo con las expresiones adentro). En n8n:
**Workflows → Import from File → `n8n/ventas-correos.json`**. Te quedan los 4 nodos
+ un Manual Trigger para probar. **Copiá los nodos que quieras a tu flujo de ventas,
conectalos y borrá el resto** (y el Manual Trigger). Solo tenés que:
- Asignar la credencial **Resend (Header Auth)** en cada nodo (dice "REEMPLAZAR").
- Ajustar el `to` de los `*-francisco` (hoy `francisco@electrificarte.com`) y, si tus
  nodos se llaman distinto, las expresiones (ver abajo).

El `html` va en modo expresión (empieza con `=`), así n8n evalúa las `{{ $(...) }}`
adentro. Si preferís pegarlo a mano, seguí lo de abajo.

## Cómo insertarlos a mano

Cada uno reemplaza (o agrega) un nodo **Resend** (HTTP Request a
`https://api.resend.com/emails`):

1. Abrí el archivo `.html`, copiá **todo** el contenido.
2. En el nodo Resend, en el campo **html** del body, pegalo.
   - Si armás el body como JSON con una expresión, usá el campo html directo o
     una variable; n8n evalúa las `{{ ... }}` dentro del HTML igual.
3. Ajustá el `to`: los del cliente/vendedor van al correo de esa persona; los
   `*-francisco.html` van al correo de Francisco.

## ⚠️ Verificá los nombres de nodo/campo

Las expresiones (`$('HTTP Request2')`, `$('Create a row1')`, `$json.telefono`…)
salen de tus correos actuales. Si en tu flujo los nodos se llaman distinto o los
campos tienen otro nombre, ajustá las expresiones — están listadas arriba y en un
comentario `<!-- ... -->` al inicio de cada archivo. Los `*-francisco.html` usan
`$json.telefono` (verificá que el nombre del campo del lead sea ese).

## Los correos de la SUBASTA ya están inyectados

Los de la subasta (carpeta padre `emails/`) NO se pegan a mano: los endpoints
devuelven el HTML ya armado (`htmlEmail`) y los nodos Resend de los flujos 1–5
mandan `{{ $json.htmlEmail }}`. Ya están conectados.
