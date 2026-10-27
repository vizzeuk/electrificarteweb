/**
 * Genera los prompts y esquemas del pdp-runner (docs/pdp-runner/) desde sus fuentes en la web,
 * para que el runner nunca corra una copia vieja:
 *   - agente "pdp":      claude/agents/extractor-pdp.json  → prompt.md + entregar_pdp.schema.json
 *   - agente "revision": lib/catalog-recheck/read-source.ts → revision.md + entregar_revision.schema.json
 *
 *   npx tsx scripts/pdp-runner-sync.ts            (escribe docs/pdp-runner/)
 *   rsync -a docs/pdp-runner/ vps:electrificarte-pdp/   (el runner los lee en cada corrida)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OUTPUT_SCHEMA, SYSTEM } from "@/lib/catalog-recheck/read-source";

const DIR = join(process.cwd(), "docs/pdp-runner");
const agente = JSON.parse(readFileSync(join(process.cwd(), "claude/agents/extractor-pdp.json"), "utf8")) as {
  system: string;
  tools: { name?: string; input_schema?: unknown }[];
};
const entregar = agente.tools.find((t) => t.name === "entregar_pdp");
if (!entregar?.input_schema) throw new Error("extractor-pdp.json no define entregar_pdp");

writeFileSync(join(DIR, "prompt.md"), agente.system);
writeFileSync(join(DIR, "entregar_pdp.schema.json"), JSON.stringify(entregar.input_schema, null, 1));

const revision = [
  SYSTEM,
  "",
  "## Cómo leer",
  "1. `web_fetch` a cada URL del encargo. Solo ese dominio: la página de precios del modelo y, si la",
  "   enlaza, a lo más un PDF de precios o ficha del mismo dominio.",
  "2. Si la página carga pero sin ningún precio (las marcas pintan precios con JavaScript), o",
  "   `web_fetch` la rechazó, usa `leer_con_navegador` con la misma URL.",
  "3. Termina llamando `entregar_revision` UNA sola vez con el objeto del esquema. Si no pudiste leer",
  "   la página, igual entrega: `fuente_ok` en false y el motivo en `nota`.",
].join("\n");
writeFileSync(join(DIR, "revision.md"), revision);
writeFileSync(join(DIR, "entregar_revision.schema.json"), JSON.stringify(OUTPUT_SCHEMA, null, 1));
console.log("docs/pdp-runner: prompt.md, entregar_pdp.schema.json, revision.md, entregar_revision.schema.json");
