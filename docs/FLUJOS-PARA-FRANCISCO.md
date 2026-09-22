# Cómo funcionan los dos flujos nuevos

> Explicación simple, sin tecnicismos. Septiembre 2026.

---

# 1. Flujo de RESEÑAS

Un cliente cuenta su experiencia con su auto. **Nada se publica sin que tú lo apruebes.**

```
┌──────────────────────────────────────────────────────────────────┐
│  1. EL CLIENTE ESCRIBE                                           │
│     En la ficha del auto toca una estrella → se abre el          │
│     formulario → escribe su reseña y sube fotos (hasta 5).       │
└───────────────────────────┬──────────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. QUEDA GUARDADA COMO "PENDIENTE"                              │
│     Entra a la base de datos.                                    │
│     🔒 NO se ve en la web. Las fotos quedan en un lugar privado, │
│        nadie puede abrirlas todavía.                             │
│     📧 Te llega un correo avisando.                              │
│     📧 Al cliente le llega un "gracias, la estamos revisando".   │
└───────────────────────────┬──────────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. TÚ LA REVISAS (en el dashboard)                              │
│     Ves la reseña completa, las fotos en grande y quién la       │
│     escribió. Decides:                                           │
│                                                                  │
│        ✅ APROBAR                    ❌ RECHAZAR                  │
└──────────────┬─────────────────────────────┬─────────────────────┘
               ▼                             ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ 4. SE PUBLICA                │  │ 4. NO SE PUBLICA             │
│  · Aparece en la ficha       │  │  · Queda archivada           │
│  · Suma a la nota promedio   │  │  · El cliente no se entera   │
│  · Puede salir en la portada │  │  · Puedes anotar el motivo   │
│  · Google puede mostrar las  │  └──────────────────────────────┘
│    ⭐ estrellas en búsquedas  │
└──────────────────────────────┘
```

### Lo importante
- **Nada se publica solo.** Todo pasa por tu revisión, una por una.
- Se muestra **"Juan P."**, nunca el apellido completo ni el correo ni el teléfono.
- Las fotos sin revisar **no son accesibles** ni con el link directo.
- Las reseñas van **solo en la ficha de cada auto**, no en los listados — así un
  comentario malo no arrastra la imagen de todo el catálogo.
- Queda registrado **quién** aprobó cada reseña (útil cuando haya más gente ayudando).

### Ideas para más adelante
- **Invitar a reseñar solo a quien compró**, con un link personal. Hoy cualquiera puede
  escribir, pero como tú apruebas todo, nada malo llega a publicarse.
- **Pedir la reseña por WhatsApp** después de la compra — es el momento de mayor respuesta.
- **Videos** tipo TikTok (en pausa por ahora).

---

# 2. Flujo de WAITLIST (lista de espera)

Alguien interesado en conseguir una buena oferta deja sus datos.

```
┌──────────────────────────────────────────────────────────────────┐
│  1. LA PERSONA SE REGISTRA                                       │
│     Toca "Consigue la mejor oferta" en cualquier parte del       │
│     sitio → se abre una ventana → deja nombre, correo,           │
│     teléfono y el auto que le interesa.                          │
└───────────────────────────┬──────────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. QUEDA EN LA BASE DE DATOS                                    │
│     Se guarda también DESDE DÓNDE se registró (portada, ficha    │
│     de un auto, comparador…) para saber qué funciona mejor.      │
└───────────────────────────┬──────────────────────────────────────┘
                            ▼
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────────────┐
│ 3a. 📧 TE LLEGA A TI     │  │ 3b. 📧 LE LLEGA A LA PERSONA     │
│  · Nombre y contacto     │  │  · "Ya estás en la lista"        │
│  · Auto que le interesa  │  │  · Qué auto anotó                │
│  · De qué parte del      │  │  · Que le avisaremos cuando      │
│    sitio vino            │  │    abramos el acceso             │
│  · Botón para escribirle │  │                                  │
│    directo por WhatsApp  │  │                                  │
└──────────────────────────┘  └──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. LA BASE CRECE                                                │
│     Esa lista es el activo: demanda real y comprobada para       │
│     mostrarle a la red de vendedores.                            │
└──────────────────────────────────────────────────────────────────┘
```

### Lo importante
- Registrarse **no compromete a nada** y **no promete** una oferta.
- Hay una vista que muestra **una sola fila por persona**, aunque se registre dos veces.
- Sabemos **qué parte del sitio trae más gente** — sirve para decidir dónde invertir.

### Ideas para más adelante
- **Avisarles por WhatsApp**, no solo por correo (se lee mucho más).
- **Agrupar por modelo**: "23 personas esperan un BYD Dolphin" es justo el argumento
  de venta para un vendedor.
- **Recordatorio automático** a las semanas, para que no se enfríe el interés.
