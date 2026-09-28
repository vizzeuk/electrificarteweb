# Cambios por el feedback de Francisco (27 de septiembre de 2026)

Resumen completo de lo que cambió en la web, el panel, n8n y Supabase. Sirve para documentar el
sistema y para rehacer los videos explicativos: al final hay una lista de qué escenas cambian.

Contexto: sigue vigente el giro (waitlist gratis + Asesoría $4.990 como producto principal; la
Oferta $19.990 y la red de vendedores en pausa). Este feedback ajusta cómo se presenta todo eso.

---

## 1. Sitio web (electrificarte.com)

### Home
- **Bajada del hero nueva.** Antes hablaba casi solo de la asesoría. Ahora resume todo el sitio:
  "Explora el catálogo de autos electrificados en Chile, compara modelos y calcula cuánto ahorras
  frente a la bencina. Si no sabes cuál elegir, te asesoramos por WhatsApp."
- **Cifras del hero.** La celda del auto más barato ($10.990.000) se reemplazó por
  **"Tu ahorro, frente a la bencina, en la calculadora"**, que lleva a la calculadora. Las otras
  tres siguen: modelos en el catálogo, tecnologías y 10 días de asesoría.
- **Sin botón de waitlist en el hero** (ni en la barra fija del home). Nadie sabe a qué se está
  inscribiendo desde ahí; la waitlist vive en las fichas de cada auto.
- **Reseñas más arriba:** la franja "¿Ya tienes un auto electrificado?" quedó justo debajo de
  "Últimos lanzamientos", con la nota promedio real, el total de reseñas y la última reseña.
- **Testimonios → "Opiniones de dueños de autos electrificados".** Antes decía "Lo que dicen
  nuestros clientes", que no dejaba claro quién opinaba. Ahora aclara que son dueños de autos
  (cualquiera puede dejar una) y enlaza a todas las reseñas. Se borraron los testimonios de
  ejemplo escritos a mano: solo se muestran reseñas reales.
- **"¿Vendes autos electrificados?"** ahora dice que la red de vendedores **todavía no está
  disponible**, sin cifras inventadas, y lleva a la página explicativa de vendedores.
- **Fondos:** las secciones alternan gris claro (Niebla) y blanco de arriba a abajo; ya no hay
  tramos de varias secciones blancas seguidas.

### Fichas de auto y listados
- **"Quiero esta oferta" → "Quiero este modelo"** en todo el sitio: fichas, tarjetas, barra fija,
  marcas, tipos, colecciones, comparador. Sigue abriendo el popup de waitlist con el modelo puesto.
- **Bloque nuevo en cada ficha: "Negociación con vendedores oficiales".** Cuenta que pronto
  abriremos el servicio, con botón "Únete a la waitlist" (modelo precargado) y enlace a la página
  explicativa.
- **Reseñas estilo Google** (ver sección 2).

### Páginas nuevas o rehechas
| Página | Qué es |
|---|---|
| `/negociacion` | Explica el servicio de negociación que se abrirá pronto: qué es, cómo va a funcionar, qué hacer hoy (unirse a la waitlist) y preguntas frecuentes. **No muestra precio** (se informará al abrir) ni promete descuentos. |
| `/vendedores` | Explica qué será la red de vendedores oficiales y que está en preparación. |
| `/vendedores/unirme` | Formulario "Te llamamos cuando esté funcionando": nombre, apellido, email, WhatsApp, punto de venta, marcas, región y comuna (opcionales) y mensaje. |
| `/resenas/todas` | Todas las reseñas publicadas, con resumen, filtros por marca y modelo y orden por recientes o mejor nota. |
| `/resenas` y `/resenas/escribir` | Actualizadas a las 4 categorías y pros/contras. |

- El **footer** enlaza a `/vendedores` y `/vendedores/unirme`. Nada del sitio lleva ya a
  vendedores.electrificarte.com (esa plataforma sigue en pausa).
- Se quitaron las etiquetas "Próximamente" / "En preparación" que había sobre los títulos.
- Los fondos de las páginas internas (asesoría, reseñas, negociación, vendedores, nosotros,
  marcas, ficha, blog, calculadora, tipos) también alternan gris claro y blanco.

---

## 2. Reseñas: categorías y nuevo diseño

- **4 categorías obligatorias** de 1 a 5 estrellas: **Autonomía, Confort, Agilidad y Calidad**.
- **La nota final es el promedio** de las 4, con un decimal (por ejemplo 4,3). La calcula el
  servidor, no el navegador.
- **Dos campos opcionales:** "Lo bueno" y "Lo que mejoraría" (hasta 600 caracteres cada uno).
- Mismo formulario en el popup de la ficha y en `/resenas/escribir`; marca y modelo salen del
  catálogo.
- **En la ficha, estilo Google reseñas:** a la izquierda la nota grande, cantidad de reseñas,
  barras de 5 a 1 estrellas y el promedio por categoría; a la derecha cada reseña con nombre, fecha,
  nota, categorías, texto, lo bueno, lo que mejoraría y **fotos grandes** que abren un visor con
  flechas.
- **Estrellas en Laguna (#1d605b)** en todo el sitio.
- Sigue la regla de siempre: las reseñas solo con texto se publican solas; las que traen fotos
  esperan la aprobación de Francisco en el panel.

---

## 3. Flujos (qué pasa cuando alguien hace algo)

### Alguien deja una reseña
Web (valida y calcula el promedio) → n8n (webhook `reviews`) → Supabase tabla `reviews` →
- **Sin fotos:** se publica al tiro. Correo "Tu reseña ya está publicada" a la persona y aviso a
  Francisco.
- **Con fotos:** queda pendiente. Correo "Recibimos tu reseña" a la persona y correo a Francisco
  para moderarla en el panel.

Los correos ahora muestran la nota con decimal, las 4 categorías y lo bueno / lo que mejoraría
(si los escribió).

### Un vendedor deja sus datos (NUEVO)
`/vendedores/unirme` → web valida → n8n (webhook `waitlist-vendedores`) → Supabase tabla
`waitlist_vendedores` → correo "Recibimos tus datos" al vendedor (sin precios ni plazos: "te
llamamos cuando abramos") y aviso a Francisco con sus datos y botón de WhatsApp. Aparece en el
panel, sección **Waitlist de vendedores**.

### Alguien se une a la waitlist (compradores)
Sin cambios de flujo: popup desde la ficha → n8n → tabla `waitlist` → 2 correos. Solo cambió el
texto del recuadro de la asesoría en el correo (ya no habla de cotizar con vendedores).

### Alguien paga la asesoría
Sin cambios de flujo. **El correo de confirmación ya no habla de la compra:** el paso 3 era "Compra:
cómo cotizar con vendedores oficiales y qué revisar antes de firmar" y ahora es "Decisión:
resolvemos tus dudas de carga, costos y versiones hasta que tengas claro cuál elegir".

Todo esto se probó de punta a punta (web → n8n → Supabase → correos) con datos de prueba que
después se borraron.

---

## 4. Panel (dashboard.electrificarte.com)

- **Período elegible** en el Resumen y en cada sección: 7 días, 30 días, 90 días, 12 meses, todo el
  historial o un rango propio. Queda en la dirección de la página, así una vista se puede compartir.
- **Historial:** gráficos por día, semana o mes (automático según el período, o a elección).
- **Cada cifra se compara con el período anterior** (por ejemplo "+20 %"; las notas se comparan en
  puntos).
- **Resumen configurable ("Personalizar"):** cada persona muestra, oculta y reordena los bloques;
  se guarda en su navegador. Hay un botón para volver a la vista por defecto.
- **Sección nueva: Waitlist de vendedores**, con búsqueda, filtros, exportar CSV, WhatsApp y correo,
  gráfico en el tiempo y desglose por marca y región.
- **Reseñas:** muestra las 4 categorías, lo bueno y lo que mejoraría, la nota con decimal y un
  historial con el promedio por categoría. Aprobar y rechazar funciona igual que antes.

---

## 5. Supabase y n8n

- **Supabase** (SQL `scripts/sql/2026-09-27_resenas_categorias_y_waitlist_vendedores.sql`, ya
  aplicado): la nota de las reseñas acepta un decimal, columnas nuevas para las 4 categorías y
  pros/contras, vista pública actualizada y tabla nueva `waitlist_vendedores` (protegida, solo la
  lee el servidor).
- **n8n** (workflow central "Electrificarte"): tramo de reseñas con los campos nuevos, tramo nuevo
  de waitlist de vendedores, correos actualizados. Todos los webhooks piden el header secreto de
  la web.
- **Vercel:** variable nueva `N8N_VENDOR_WAITLIST_URL` =
  `https://n8n.cadre.cl/webhook/waitlist-vendedores`. Sin ella el formulario de vendedores muestra
  error.

---

## 6. Qué cambia en los videos explicativos

Escenas que hay que regrabar o ajustar:

1. **Hero del home:** bajada nueva, celda "Tu ahorro" en vez del precio del auto más barato, sin
   botón de waitlist (solo "Quiero asesoría por $4.990").
2. **Orden del home:** reseñas justo después de "Últimos lanzamientos"; fondos alternados.
3. **Botones de los autos:** ahora dicen **"Quiero este modelo"** (antes "Quiero esta oferta").
4. **Ficha de auto:** reseñas estilo Google con visor de fotos; bloque "Negociación con vendedores
   oficiales" con "Únete a la waitlist" y "Cómo va a funcionar".
5. **Dejar una reseña:** 4 categorías con estrellas, nota que se calcula sola, "Lo bueno" y "Lo que
   mejoraría".
6. **Página de todas las reseñas** (`/resenas/todas`) con filtros.
7. **Negociación:** `/negociacion` explica que el servicio abrirá pronto y manda a la waitlist.
8. **Vendedores:** la sección del home y el footer llevan a `/vendedores` (explicativa) y de ahí al
   formulario `/vendedores/unirme`. Ya no se muestra la página de suscripción de vendedores.
9. **Correos:** asesoría sin la parte de compra; reseñas con categorías; correo nuevo para
   vendedores en espera.
10. **Panel:** selector de período, "Personalizar" el Resumen, sección Waitlist de vendedores y
    reseñas con categorías.

Lo que **no** cambia: la asesoría ($4.990 por WhatsApp, 10 días), la waitlist de compradores, el
comparador y la calculadora.

---

## 7. Pendientes y decisiones abiertas

- **Sanity (contenido):**
  - `homePage.testimonialsTitle` sigue diciendo "Lo que dicen nuestros clientes" (el sitio ya no
    lo muestra, pero conviene cambiarlo).
  - La **primera pregunta frecuente del home** dice "Negociamos con nuestra red de vendedores
    oficiales para conseguirte la mejor oferta" y cifras de ahorro: choca con el giro.
  - El artículo guía del blog todavía dice "negociamos con concesionarios".
- **Waitlist en páginas genéricas:** además de las fichas, sigue como botón en "Cómo funciona" y
  preguntas frecuentes del home, en `/marcas` y en el cierre de `/nosotros`. Francisco pidió que viva
  en las fichas; falta decidir si se saca también de ahí.
- **Asesor de WhatsApp:** todavía le enseña a la persona a cotizar con vendedores oficiales (comparar
  precio de lista con bonos, pedir la cotización por escrito). Si tampoco debe tocar la compra, se
  ajusta en `lib/whatsapp/advisor.ts`.
- La ficha de auto usa "Oferta exclusiva" en el título de la pestaña del navegador.
- 3 pruebas automáticas del marketplace de subasta (en pausa) fallan desde antes de estos cambios.
