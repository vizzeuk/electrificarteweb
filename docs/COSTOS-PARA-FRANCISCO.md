# ¿Cuánto cuesta mantener Electrificarte funcionando?

> Documento explicativo, sin tecnicismos. Septiembre 2026.
> Los precios son de los proveedores y están en dólares; al lado va el aproximado en pesos.

---

## Resumen en una línea

**Hoy: US$20 al mes (unos $19.000 pesos).** Cuando el sitio crezca, sube a **US$45 al mes**
(unos $43.000 pesos). Eso es todo lo que cuesta tener la web, la base de datos, las fotos de
las reseñas y los videos.

---

## ¿Por qué se paga? Los dos servicios

Piensa en la web como un negocio con dos partes: **el local** y **la bodega**.

### 1. Vercel — "el local" · US$20/mes

Es donde vive la página web. Cuando alguien entra a electrificarte.com, Vercel es quien le
muestra el sitio. Se encarga de que cargue rápido en todo Chile y de que no se caiga si entran
muchas personas a la vez.

**¿Por qué hay que pagar y no usar la versión gratis?** Porque el plan gratuito de Vercel es
**solo para proyectos personales, no comerciales**. Electrificarte cobra por la asesoría y va a
trabajar con vendedores, así que es un negocio y corresponde el plan pagado. No es opcional.

De paso, el plan pagado da más tiempo de procesamiento, que el asesor de WhatsApp necesita
cuando conversa con un cliente.

### 2. Supabase — "la bodega" · US$0 hoy, US$25 después

Es donde se guardan **los datos**: las personas de la lista de espera, las reseñas que escriben
los clientes, las fotos que suben, los pagos de asesoría.

**Hoy está gratis y funciona perfecto.** El plan gratuito alcanza porque recién estamos
partiendo y todavía no hay fotos acumuladas.

**¿Cuándo hay que pagar los US$25?** Cuando se junten dos cosas: bastantes reseñas con fotos
publicadas, y bastante gente visitando las fichas de los autos. Más abajo explico cómo darse
cuenta sin ser técnico.

---

## Lo importante: esto casi no cuesta, y no es casualidad

El sistema de reseñas con fotos **no agrega prácticamente ningún costo**. Eso fue una decisión
de diseño, no suerte. Tres cosas que se hicieron a propósito:

**1. Las fotos se achican en el celular de la persona, antes de subirse.**
Una foto de celular pesa unos 6 MB. Antes de salir del teléfono, se reduce a unos 250 KB
—24 veces más liviana— sin que se note la diferencia en pantalla. Eso significa que guardamos
y enviamos muchísimos menos datos.

**2. En las listas se muestra una versión chiquita de la foto.**
La foto grande solo se carga si alguien la abre. Mostrar la grande en todas las listas costaría
5 veces más.

**3. Las fotos viajan directo del celular a la bodega**, sin pasar por el local. Eso evita
cobros intermedios.

**Traducido:** 1.000 reseñas con fotos ocupan unos 11 GB al año. El plan pagado incluye 100 GB.
Estamos usando el 11% de lo que ya viene incluido.

---

## ¿Qué es lo que haría subir el costo?

No es la cantidad de reseñas. **Es la cantidad de visitas a las fichas de autos.**

Cada vez que alguien abre la ficha de un auto y ve las fotos de las reseñas, esas fotos se
descargan. Eso consume la "cuota de datos" del mes.

| Visitas mensuales a fichas de autos | Costo de Supabase |
|---|---|
| 50.000 | US$0 |
| 200.000 | US$0 |
| 500.000 | US$0 |
| 1.000.000 | US$2 |
| 5.000.000 | US$99 |

**El plan de US$25 aguanta casi un millón de visitas mensuales a fichas.** Para tener una idea:
eso es muchísimo más tráfico del que tiene el sitio hoy.

### Cómo saber cuándo subir de plan (sin ser técnico)

Entrar a Supabase → **Settings → Usage** y mirar el número de **Egress**.

- Si está bajo 4 GB al mes → seguir en gratis.
- Si se acerca a 4 GB → subir al plan de US$25.

Revisarlo una vez al mes. **Importante:** en el plan gratuito esa cuota es compartida con la
base de datos, así que si se llena, no es solo que las fotos dejen de verse — el sitio completo
se pone lento. Por eso conviene no apurar el límite.

Recomendación adicional: en Supabase se puede activar un **tope de gasto**. Con eso, si algún
mes nos pasamos, el servicio se frena en vez de generar una cuenta sorpresa.

---

## Los videos de las reseñas: US$0

Cuando sumemos videos tipo TikTok, se usa un servicio llamado **Mux**, especializado en video.

**No cuesta nada** al volumen que vamos a tener: regala 100.000 minutos de reproducción al mes.
Si tuviéramos 30 videos con 1.000 reproducciones cada uno, serían 30.000 minutos. Seguimos en
cero.

**¿Por qué un servicio aparte y no guardarlos con las fotos?** Por un problema muy concreto:
los videos grabados con iPhone usan un formato que **no se ve en la mitad de los celulares
Android**. Mux los convierte automáticamente para que se vean en todos lados, y además ajusta
la calidad según la conexión de cada persona. Si los guardáramos como archivos comunes,
publicaríamos videos que para mucha gente se verían como un cuadrado negro — y no nos
enteraríamos hasta que alguien reclame.

---

## Lo que NO estamos pagando (y podríamos)

| Cosa | Qué costaría | Por qué no lo pagamos |
|---|---|---|
| Revisar automáticamente que las fotos no tengan contenido indebido | Unos US$1 a US$3 por cada 1.000 fotos | Francisco revisa todas a mano, que es lo que pidió |
| Procesar y redimensionar imágenes en el servidor | US$5 por cada 1.000 fotos | Se hace en el celular de la persona, gratis |
| Un servicio extra para las fotos (Cloudflare) | ~US$5/mes + trabajo de migración | Supabase ya lo cubre de sobra |

---

## ¿Conviene sumar más servicios?

**No. La recomendación es quedarse con dos: Vercel y Supabase.**

Existe una alternativa (Cloudflare) que es más barata para guardar fotos cuando hay MUCHO
tráfico. Pero:

- A nuestra escala, **el ahorro sería cero**: hasta un millón de visitas mensuales, ambos
  cuestan lo mismo.
- Sumar un proveedor significa otra cuenta, otra clave, otra cosa que puede fallar y otra
  factura que revisar.
- **Si algún día conviene cambiar, el sistema ya está preparado**: se construyó de forma que
  cambiar de proveedor de fotos sea medio día de trabajo, sin tocar nada más. La puerta queda
  abierta, pero no hace falta usarla.

Menos servicios = menos cosas que se pueden romper. A este tamaño, eso vale más que ahorrar
US$20 al mes.

---

## Resumen final

| Servicio | Para qué sirve | Hoy | Cuando crezcamos |
|---|---|---|---|
| **Vercel** | La página web | US$20/mes | US$20/mes |
| **Supabase** | Datos y fotos | **Gratis** | US$25/mes |
| **Mux** | Videos de reseñas | — | Gratis |
| | | **US$20/mes** | **US$45/mes** |

En pesos: hoy unos **$19.000 mensuales**; más adelante, unos **$43.000 mensuales**.

---

### Nota: costos que ya existen y no están acá

Este documento cubre la **infraestructura de la web**. Aparte están los servicios que ya se
venían usando y que Vicente maneja: el WhatsApp (Kapso), la inteligencia artificial del asesor
(Anthropic), los correos (Resend) y la pasarela de pagos (Reveniu). Esos tienen sus propias
cuentas y no cambian por el sistema de reseñas.

Un dato útil: **Resend**, que manda los correos, tiene un plan gratuito generoso (del orden de
3.000 correos al mes). Conviene confirmar el consumo actual, pero es probable que todavía no
esté generando costo.
