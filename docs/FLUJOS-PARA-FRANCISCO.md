# Cómo funcionan los dos flujos nuevos

> Explicación simple, sin tecnicismos. Septiembre 2026.
> Los diagramas están en formato Mermaid: se ven dibujados en GitHub, Notion y la mayoría
> de las herramientas. Si los ves como texto, pégalos en https://mermaid.live

---

# 1. Flujo de RESEÑAS

Un cliente cuenta su experiencia con su auto. **Nada se publica sin que tú lo apruebes.**

```mermaid
flowchart TD
    A["Cliente entra a la ficha de un auto<br/>y toca una estrella"] --> B["Escribe su reseña<br/>y sube hasta 5 fotos"]
    B --> C[("Queda guardada como PENDIENTE")]

    C --> D["Aviso por correo a Francisco"]
    C --> E["Correo al cliente:<br/>gracias, la estamos revisando"]
    C --> N["NO se ve en la web<br/>Las fotos quedan privadas"]

    C --> F{"Francisco revisa<br/>en el dashboard"}

    F -->|"Aprobar"| G["Se publica en la ficha del auto"]
    F -->|"Rechazar"| H["Queda archivada<br/>El cliente no se entera"]

    G --> I["Suma a la nota promedio"]
    G --> J["Puede salir en la portada"]
    G --> K["Google puede mostrar<br/>estrellas en las búsquedas"]

    classDef espera fill:#FEF3C7,stroke:#F59E0B,color:#111827
    classDef bueno fill:#CCFBF1,stroke:#00A6A6,color:#111827
    classDef malo fill:#FEE2E2,stroke:#EF4444,color:#111827
    classDef aviso fill:#F3F4F6,stroke:#9CA3AF,color:#111827

    class C,N espera
    class G,I,J,K bueno
    class H malo
    class D,E aviso
```

### Lo importante

- **Nada se publica solo.** Todo pasa por tu revisión, una por una.
- Se muestra **"Juan P."**, nunca el apellido completo ni el correo ni el teléfono.
- Las fotos sin revisar **no son accesibles** ni con el link directo.
- Las reseñas van **solo en la ficha de cada auto**, no en los listados — así un comentario
  malo no arrastra la imagen de todo el catálogo.
- Queda registrado **quién** aprobó cada reseña (útil cuando haya más gente ayudando).

### Ideas para más adelante

- **Invitar a reseñar solo a quien compró**, con un link personal. Hoy cualquiera puede
  escribir, pero como tú apruebas todo, nada malo llega a publicarse.
- **Pedir la reseña por WhatsApp** después de la compra — es el momento de mayor respuesta.
- **Videos** tipo TikTok (en pausa por ahora).

---

# 2. Flujo de WAITLIST (lista de espera)

Alguien interesado en conseguir una buena oferta deja sus datos.

```mermaid
flowchart TD
    A["Persona toca<br/>Consigue la mejor oferta<br/>en cualquier parte del sitio"] --> B["Se abre una ventana"]
    B --> C["Deja nombre, correo, teléfono<br/>y el auto que le interesa"]
    C --> D[("Queda en la base de datos")]

    D --> E["Correo a Francisco<br/>con sus datos y botón<br/>para escribirle por WhatsApp"]
    D --> F["Correo a la persona:<br/>ya estás en la lista"]
    D --> G["Se guarda desde qué parte<br/>del sitio se registró"]

    G --> H["Sabemos qué secciones<br/>traen más gente"]
    E --> I[("La base crece")]
    F --> I
    I --> J["Demanda real y comprobada<br/>para mostrarle a los vendedores"]

    classDef base fill:#CCFBF1,stroke:#00A6A6,color:#111827
    classDef aviso fill:#F3F4F6,stroke:#9CA3AF,color:#111827
    classDef valor fill:#DBEAFE,stroke:#3B82F6,color:#111827

    class D,I base
    class E,F aviso
    class H,J valor
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

---

# Los dos flujos juntos

Cómo se conectan con el resto del negocio hoy:

```mermaid
flowchart LR
    V["Visitante del sitio"]

    V --> A["¿No sabe qué auto quiere?"]
    V --> B["¿Ya sabe cuál quiere?"]
    V --> C["¿Ya tiene su auto?"]

    A --> A1["Asesoría $4.990<br/>por WhatsApp"]
    B --> B1["Waitlist<br/>sin costo"]
    C --> C1["Deja una reseña"]

    A1 --> D[("Clientes de asesoría")]
    B1 --> E[("Base de interesados")]
    C1 --> F[("Reseñas por aprobar")]

    E --> G["Se le ofrece a la<br/>red de vendedores"]
    F --> H["Francisco aprueba<br/>y se publican"]
    H --> I["Más confianza<br/>y mejor posición en Google"]

    classDef producto fill:#CCFBF1,stroke:#00A6A6,color:#111827
    classDef base fill:#FEF3C7,stroke:#F59E0B,color:#111827
    classDef valor fill:#DBEAFE,stroke:#3B82F6,color:#111827

    class A1,B1,C1 producto
    class D,E,F base
    class G,I valor
```
