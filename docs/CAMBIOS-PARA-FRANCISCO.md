# Qué cambió en la web

> Resumen para Francisco. Septiembre 2026.

---

## En una frase

La web dejó de vender la **Oferta de $19.990** y ahora empuja la **Asesoría de $4.990**.
Quien quiere una buena oferta se anota en una **lista de espera**. Además, los clientes
ya pueden **dejar reseñas con fotos** de sus autos, que tú apruebas una por una.

---

## 1. La portada

| Antes | Ahora |
|---|---|
| Botón principal: "Consigue tu mejor precio — pagas $19.990" | **Botón principal: "Te ayudamos a elegir — Asesoría $4.990"** |
| Botón secundario: la asesoría | **Botón secundario: "Consigue la mejor oferta" → abre la lista de espera** |
| "Nuestros clientes ahorran $4.200.000 por auto" | **"Elegir el auto equivocado cuesta millones / Acertar, $4.990"** |
| "+15 vendedores oficiales" | **"Asesoría 1 a 1 por WhatsApp con un experto"** |
| Testimonios cargados a mano | **Reseñas reales de clientes** (si aún no hay, se muestran los de siempre) |

**En el celular** la portada ahora está **centrada**. Antes se veía desalineada.

---

## 2. Ya no se puede llegar al formulario viejo

Había botones que **todavía llevaban al formulario de los $19.990** — por ejemplo en la
calculadora de ahorro. Alguien podía llegar ahí y pagar por un servicio que hoy no se presta.

Se revisó **toda la web**: hoy **ningún botón lleva ahí**, y si alguien entra con el link
guardado, **no puede**. El formulario no se borró — queda guardado para cuando lo reactivemos.

---

## 3. La lista de espera

Todos los botones de "conseguir la mejor oferta" ahora abren una **ventana** donde la persona
deja nombre, correo, teléfono y el auto que le interesa.

Se le avisa **a ti** y **a la persona** por correo. Ver `FLUJOS-PARA-FRANCISCO.md`.

> ⚠️ Ojo con cómo lo comunicamos: **registrarse no tiene costo, pero eso no significa que el
> servicio de buscar la oferta vaya a ser gratis.** Todos los textos se escribieron con ese
> cuidado, para no prometer algo que después no se cumple.

---

## 4. Reseñas de clientes (nuevo)

En la ficha de cada auto hay una franja: **"¿Tienes un BYD Dolphin?"** con estrellas.
Al tocar una, se abre el formulario con esa nota ya puesta.

- **Nada se publica sin que tú lo apruebes**, desde el dashboard.
- Se pueden subir **hasta 5 fotos**, que se achican solas en el celular de la persona.
- Las reseñas van **solo en la ficha de cada auto**, no en los listados — así un comentario
  malo no perjudica a todo el catálogo.
- Con el tiempo, Google puede mostrar **estrellas** junto a nuestros resultados de búsqueda.

---

## 5. Se sacaron las "Hot Deals"

Se ocultaron la sección de la portada, la ventana que aparecía sola y las etiquetas
"HOT DEAL". **Los precios con descuento siguen igual** — solo se sacó lo promocional.
Los autos que estaban ahí ahora aparecen en el listado normal, no desaparecieron.

---

## 6. Arreglos

- **Footer:** el botón de suscripción se salía de la pantalla en celular.
- **Botón de opinión (carita amarilla):** el chat lo tapaba, la "X" para cerrarlo era tan
  chica y estaba tan pegada que se podía cerrar sin querer — y eso lo escondía **30 días**.
  Ya está.
- **Chatbots:** ya no ofrecen el servicio de $19.990; invitan a la lista de espera y a la asesoría.

---

## Lo que falta para que esté 100% en línea

1. **Un "redeploy" en Vercel** para que tomen efecto unas configuraciones nuevas.
2. **Proteger los formularios** con una clave secreta, para que nadie ajeno pueda meter
   datos falsos en la base. (No es grave hoy: nada se publica sin tu aprobación.)
3. **Decidir el incentivo** para quien deje una reseña en video (queda para después).

---

## Costos

Sin cambios respecto a lo conversado: **US$20 al mes hoy**, y **US$45** cuando el sitio crezca.
Las reseñas con fotos **no agregan costo**. Detalle en `COSTOS-PARA-FRANCISCO.md`.
