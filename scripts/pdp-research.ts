/**
 * CLI local de investigación de PDP (Fase 1.2, Flujo A). La lógica completa vive en
 * lib/pdp-research/research.ts (compartida con app/api/admin/pdp-research/route.ts, que corre
 * lo mismo desde WhatsApp con Chromium serverless).
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/pdp-research.ts "<Marca>" "<Modelo>" [--dry]
 *
 * Requiere ANTHROPIC_API_KEY y SANITY_API_TOKEN (con permiso de escritura) en el entorno.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import { chromium } from "playwright";
import { researchCar } from "../lib/pdp-research/research";

const DRY_RUN = process.argv.includes("--dry");
const [brandArg, modelArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (!brandArg || !modelArg) {
  console.error('\nUso: npx tsx --env-file=.env.local scripts/pdp-research.ts "<Marca>" "<Modelo>" [--dry]\n');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("\nFalta ANTHROPIC_API_KEY en el entorno (.env.local o Vercel).\n");
  process.exit(1);
}
if (!DRY_RUN && !process.env.SANITY_API_TOKEN) {
  console.error("\nFalta SANITY_API_TOKEN (con permiso de escritura) en el entorno. Usa --dry si solo quieres probar la extracción.\n");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

researchCar(brandArg, modelArg, {
  anthropic,
  sanity,
  dryRun: DRY_RUN,
  log: (line) => console.log(line),
  launchBrowser: () => chromium.launch(),
})
  .then((result) => {
    if (result.status === "no_content" || result.status === "not_found" || result.status === "not_electrified") {
      console.log(`\n✗ ${result.message}\n`);
    } else if (result.status === "duplicate") {
      console.log(`\n= ${result.message}\n`);
    }
    // Los demás estados (created / dry_run) ya imprimieron su propio resumen vía `log`.
  })
  .catch((err) => {
    console.error("\nError fatal:", err);
    process.exit(1);
  });
