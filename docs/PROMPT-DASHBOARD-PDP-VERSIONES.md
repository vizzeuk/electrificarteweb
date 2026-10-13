# Prompt para el workspace del DASHBOARD — versiones con otra carrocería o electrificación

> Copia todo lo que está debajo de la línea y pégalo en el workspace del dashboard.
> Es autocontenido: no necesita tener este repo a mano.

---

Necesito ampliar el formulario **"Nueva PDP"** del panel de admin del **dashboard de Electrificarte**
(`/admin/pdps`, la pantalla que crea fichas de autos automáticamente con IA). Cada **versión** del
modelo tiene que poder declarar su propia **carrocería** y su propia **electrificación** cuando son
distintas a las del modelo.

## Por qué

Hay modelos que se venden con versiones de distinta tecnología o carrocería. Ejemplo real: el
**DS 3** tiene "Étoile Hybrid" (híbrido, hatchback) y "E-Tense Opera" (100% eléctrico, SUV). Antes
eso obligaba a crear dos fichas duplicadas. Ahora es **una sola ficha** y el auto aparece en los
filtros de todos sus tipos (Híbridos **y** Eléctricos, Hatchback **y** SUV). La web principal
(`electrificarteweb`) ya soporta esto en Sanity, en el sitio y en el flujo de creación; falta que el
formulario del panel lo permita.

## Qué cambia en el formulario

Hoy cada fila de la lista repetible de versiones tiene `nombre` y `precio`. Hay que agregar a cada
fila **dos selects opcionales**:

| Campo | Control | Opciones | Valor por defecto |
|---|---|---|---|
| `tipo` | select | `tipos[].valor` de `GET /api/admin/pdp/opciones` (el mismo origen que el select de carrocería del modelo) | **"Igual que el modelo"** (no se manda) |
| `electrificacion` | select | `electrificaciones[].valor` de `/opciones` (mostrar `nombre`, mandar `valor`) | **"Igual que el modelo"** (no se manda) |

Reglas:

- Son **opcionales**. "Igual que el modelo" = **no mandar el campo** (ni `""` ni `null`, simplemente
  omitirlo). Si se manda un valor igual al del modelo, la web lo ignora, pero es mejor no mandarlo.
- Usa los `valor` **tal cual** vienen de `/opciones`. Son los textos con los que la web busca las
  referencias en Sanity; si los transformas, la validación responde 422 "no existe en Sanity".
- Para no ensuciar la UI, muestra los dos selects compactos en la fila de la versión (o detrás de
  un enlace "Distinta carrocería o electrificación" que los despliega). Lo normal es que queden en
  "Igual que el modelo".
- Ayuda de copy junto a los selects: *"Solo si esta versión es de otra tecnología o carrocería que
  el modelo (ej. la versión eléctrica de un modelo híbrido). El tipo y la electrificación del modelo
  son los principales."*
- El `tipo` y la `electrificacion` **del modelo** siguen siendo obligatorios y son los principales:
  de ahí salen el badge de la tarjeta, las specs de la ficha y el precio "desde".

## Contrato (la web ya lo acepta, no hay que tocar la web)

```http
POST {ELECTRIFICARTE_API_BASE}/api/admin/pdp/solicitudes
x-admin-secret: <secreto>
Content-Type: application/json

{
  "marca": "DS",
  "modelo": "3",
  "anio": 2026,
  "tipo": "Hatchback",
  "electrificacion": "HEV",
  "url_oficial": "https://...",
  "versiones": [
    { "nombre": "Étoile Hybrid", "precio": 35990000 },
    { "nombre": "E-Tense Opera", "precio": 41490000, "tipo": "SUV", "electrificacion": "EV" }
  ],
  "creado_por": "francisco@electrificarte.com"
}
```

- `versiones[].tipo` y `versiones[].electrificacion`: strings opcionales, mismos valores que los
  campos del modelo.
- Errores nuevos posibles en el **422** (`errores[]`), que hay que mostrar como los demás, arriba del
  formulario y sin borrar lo escrito:
  - `El tipo de vehiculo "X" de la version "Y" no existe en Sanity`
  - `La electrificacion "X" de la version "Y" no existe en Sanity`
- El `GET /api/admin/pdp/solicitudes` devuelve las versiones tal como se guardaron (con `tipo` y
  `electrificacion` solo cuando difieren del modelo). En la lista de solicitudes, si una versión los
  trae, muéstralos junto al nombre (ej. "E-Tense Opera — EV, SUV").
- **Reintentar con corrección** (`POST /api/admin/pdp/solicitudes/reintentar`): el formulario de
  corrección precarga los mismos selects por versión y manda las versiones con la misma forma.

## Qué hace la web con esto (para el copy y para entender los resultados)

- La IA extrae las specs **completas** de las versiones de otra electrificación (no hereda nada de la
  versión base). Si la fuente oficial no las publica, la ficha queda con un hallazgo en Studio
  ("La version X (EV) no trae de la fuente: ...") para completarla antes de publicar.
- La versión base (la que llena las specs del modelo) es la más barata **de la electrificación del
  modelo**, aunque una de otra tecnología sea más barata.
- La ficha nace **oculta**, como siempre; se publica a mano desde Studio.

## Diseño

Usa el sistema de diseño v1 de Electrificarte que ya tiene el dashboard (`docs/design/portable/`
de `electrificarteweb`: tokens, `brand.css`, tema shadcn). Selects con el mismo estilo que los del
modelo; sin colores nuevos, sin píldoras, sin texto bajo 12 px.

## Orden de despliegue

La web principal tiene que estar desplegada con este cambio **antes** de publicar el panel. Si el
panel manda `tipo`/`electrificacion` por versión a una web vieja, la web los descarta en silencio y
la ficha se crea sin ellos.

## Checklist

- [ ] Dos selects opcionales por versión, con "Igual que el modelo" por defecto (no se manda)
- [ ] Opciones desde `/api/admin/pdp/opciones` (`tipos[].valor`, `electrificaciones[].valor`)
- [ ] Errores 422 de versión mostrados como los demás
- [ ] La lista de solicitudes muestra el tipo/electrificación de las versiones que los traen
- [ ] Reintentar con corrección precarga y manda los selects
- [ ] Prueba real: un modelo con una versión de otra electrificación llega a `listo_para_revisar`
      o `borrador_incompleto`, y en Studio la versión tiene su "Electrificación" y "Carrocería"
