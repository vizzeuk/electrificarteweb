# pdp-runner — creación de PDPs con OpenCode en la VPS

Reemplaza al Managed Agent de Anthropic en el flujo v2 (`docs/FLUJO-PDP-N8N.md` §3) sin cambiar
n8n ni el panel. Corre el **mismo extractor**: el prompt (`system`) y el esquema de
`entregar_pdp` salen de `claude/agents/extractor-pdp.json`. El modelo lo pone OpenCode (hoy
`github-copilot/claude-sonnet-5`, el mismo de Console, vía la suscripción de Copilot).

```
n8n ──▶ web /iniciar ──▶ pdp-runner (VPS) ── opencode run ──▶ modelo
n8n ──▶ web /cerrar  ──▶ pdp-runner: ¿terminó? → contrato → Sanity (igual que antes)
```

La web elige el motor por entorno: con `PDP_RUNNER_URL` + `PDP_RUNNER_SECRET` las sesiones nuevas
van al runner (ids `oc_…`); sin ellas, a Anthropic como siempre. Las `sesn_…` en vuelo se siguen
leyendo de Anthropic. Volver atrás = borrar `PDP_RUNNER_URL` en Vercel.

## Qué hace el runner y no la web

| Pieza | Managed Agent | pdp-runner |
|---|---|---|
| Cerco de dominio (R2) | `allowed_domains` de `web_fetch` | `.opencode/tool/_comun.ts` (`PDP_HOST` por corrida) |
| Navegador | custom tool → la web llama a Firecrawl | `leer_con_navegador.ts` llama a Firecrawl (key en `.env` del runner) |
| Forma de la entrega | la valida la plataforma | `entregar_pdp.ts` la valida con Ajv; si no calza, el modelo corrige y reintenta |
| Ficha técnica PDF | Files API, montada en `/mnt/session/uploads` | `POST /v1/fichas`; el runner la pasa a texto y le apunta el `read` |
| Costo | US$0,26 por auto, tope US$1,50 | 0 en Anthropic (cuota de Copilot) |

Herramientas apagadas para el agente: `bash`, `edit`, `write`, `webfetch` nativo, `task`, `glob`,
`grep`, `list`. Solo `read`, `web_fetch`, `leer_con_navegador`, `entregar_pdp`.

## Evaluación (26-10-2026, 8 autos publicados, Sonnet 5 vía Copilot)

8/8 entregaron un contrato válido. Tardan entre 30 y 99 s (con Anthropic eran ~155 s). Comparado
contra lo publicado en Sanity, el 74 % de los campos comparables coincide. Las diferencias son
casi siempre datos viejos de Sanity (ej. Equinox EV: la ficha oficial vigente dice eAWD 286 HP)
o specs que la fuente no publica textualmente (R3 → se omiten, que es lo correcto). Lo único
atribuible al modelo es un caso de potencia en kW en el campo de CV (MG S5). El prompt de hoy
tiene la misma debilidad, así que no es algo que haya roto la migración. El navegador (Volvo,
403) y la ficha PDF (Equinox EV) funcionaron.

## Despliegue en la VPS

`~/electrificarte-pdp/` es una copia de esta carpeta, más `prompt.md` y `entregar_pdp.schema.json`
(generados desde `claude/agents/extractor-pdp.json`) y un `.env` con `PDP_RUNNER_SECRET` y
`FIRECRAWL_API_KEY`. Stack propio (`docker compose --env-file .compose.env up -d`), contenedor
`pdp-runner` en la red `n8n-cadre_default`; no reinicia nada de n8n. La sesión de Copilot vive en
`~/.local/share/opencode/auth.json` (`opencode auth login` como `deploy`).

Si cambia el prompt o el esquema en `extractor-pdp.json`, hay que regenerar los dos archivos y
copiarlos a la VPS (el runner los lee en cada corrida, no hace falta reiniciar).

## Para encenderlo

1. Cloudflare Zero Trust → el túnel del contenedor `cloudflare` (stack `n8n-cadre`) → *Public
   hostname* nuevo, p. ej. `pdp-runner.cadre.cl` → `http://pdp-runner:4100`.
2. Vercel: `PDP_RUNNER_URL=https://pdp-runner.cadre.cl` y `PDP_RUNNER_SECRET` (el del `.env` del
   runner). Redeploy.
3. Crear una PDP de prueba desde el panel.

Probar a mano: `./correr.sh <host> <archivo-encargo> <salida.json> [modelo]`.
