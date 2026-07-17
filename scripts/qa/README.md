# QA del bot de WhatsApp (asesor "Francisco IA")

Harness de QA para el bot de WhatsApp. Ejercita el **pipeline real de rails** contra
Anthropic y el catálogo Sanity reales, sin necesidad de WhatsApp/Kapso ni de sembrar
datos en Supabase.

Reproduce fielmente el orden de guards del path de producción (`lib/whatsapp/bot.ts`):

```
detectInjection → isOffTopic → runAdvisor → (containsSystemLeak + validateOutput)
```

## Correr

```bash
# Solo guards deterministas (inyección + off-topic). Gratis, sin LLM:
npx tsx --env-file=.env.local scripts/qa/run.ts

# Suite completa (incluye escenarios que llaman a Anthropic — consume tokens):
npx tsx --env-file=.env.local scripts/qa/run.ts --llm

# Filtrar por tags o por id, y ver el diálogo completo:
npx tsx --env-file=.env.local scripts/qa/run.ts --llm --tags injection,tier-oferta
npx tsx --env-file=.env.local scripts/qa/run.ts --llm --id asesoria-link-al-elegir --transcript

# Salida JSON procesable:
npx tsx --env-file=.env.local scripts/qa/run.ts --llm --json
```

Flags: `--llm` (incluye escenarios con LLM), `--tags a,b`, `--id x`, `--transcript`, `--json`.

## Qué valida

- **Guards de entrada** (`injection`, `offtopic`): regex ES/EN, inyección de rol, DAN,
  exfiltración de prompt, off-topic (recetas, política, código). Deterministas.
- **Rails de salida** (`grounding`, `leak`, `links`): no inventa modelos/precios,
  no filtra el system prompt ni nombres de tools, solo enlaza `electrificarte.com`.
- **Reglas de negocio por tier**:
  - `tier-oferta`: no hace upsell de $4.990 ni re-vende el $19.990 (ya lo tiene).
  - `tier-asesoria`: empuja el $19.990 + link `/solicitar` cuando el cliente elige modelo.
- **Border/adversarial** (`border`): gibberish, inglés, ráfagas, pedidos ilegales,
  consejo financiero fuera de alcance, on-topic + inyección embebida.

## Estructura

- `lib.ts` — simulación del pipeline (`runTurn`/`runConversation`) + helpers de aserción.
- `scenarios.ts` — la matriz de escenarios (agregá casos acá).
- `run.ts` — runner CLI.

## Tier gating en local

El pipeline se llama con el `tier` directo, así que el harness no necesita Supabase.
Para probar el **endpoint HTTP** (`/api/whatsapp/advisor` o el webhook Kapso) con tiers
deterministas y sin sembrar filas en Supabase, existe un override dev-only en
`lib/whatsapp/subscription.ts`:

```bash
# .env.local (solo se activa si NODE_ENV !== "production")
WHATSAPP_TEST_TIERS=56911110001:asesoria,56911110002:oferta,56911110003:vendedor,56911110004:none
```

Mapea teléfonos → tier fijo. Se ignora por completo en producción.

## Agregar un escenario

En `scenarios.ts`, añadí un objeto a `SCENARIOS`:

```ts
{
  id: "mi-caso",
  title: "Descripción corta",
  tier: "asesoria",              // "asesoria" | "oferta"
  tags: ["border", "llm"],       // guardOnly no lleva "llm"
  turns: [{ user: "mensaje del usuario" }],
  checks: [noForeignLinks(), noSystemLeak()],
}
```

Checks disponibles: `mustContainAny`, `mustNotContain`, `blockedBy`, `noForeignLinks`,
`noSystemLeak`, `custom(label, fn)`. Poné `guardOnly: true` si todos los turnos se cortan
en un guard de entrada (no llama a Anthropic → gratis y determinista).
