/// <reference types="node" />
/**
 * Runner del QA del bot de WhatsApp.
 *
 * Corre escenarios contra el pipeline real (guards + runAdvisor con Anthropic y
 * catálogo Sanity reales) y verifica los checks de rails/negocio de cada uno.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/qa/run.ts               # solo guard-only (gratis, sin LLM)
 *   npx tsx --env-file=.env.local scripts/qa/run.ts --llm         # + escenarios con LLM (consume tokens)
 *   npx tsx --env-file=.env.local scripts/qa/run.ts --llm --tags injection,tier-oferta
 *   npx tsx --env-file=.env.local scripts/qa/run.ts --llm --id asesoria-link-al-elegir
 *   npx tsx --env-file=.env.local scripts/qa/run.ts --llm --transcript   # imprime cada respuesta del bot
 *
 * Flags:
 *   --llm          incluye escenarios que llaman a Anthropic (por defecto solo guardOnly)
 *   --tags a,b     filtra por tags (o ids)
 *   --id x         corre solo ese escenario
 *   --transcript   imprime el diálogo completo de cada escenario
 *   --json         salida JSON procesable
 */

import { runConversation, type Scenario, type TurnResult } from "./lib";
import { SCENARIOS, filterScenarios } from "./scenarios";

// ─── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
function val(flag: string): string | null {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

const withLLM = has("--llm");
const showTranscript = has("--transcript");
const asJson = has("--json");
const tagArg = val("--tags");
const idArg = val("--id");

const tags = idArg ? [idArg] : tagArg ? tagArg.split(",").map((s) => s.trim()).filter(Boolean) : [];

// ─── Selección ─────────────────────────────────────────────────────────────────

let selected = filterScenarios(tags);
if (!withLLM) selected = selected.filter((s) => s.guardOnly);

// ─── Colores ────────────────────────────────────────────────────────────────────

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

interface ScenarioReport {
  id: string;
  title: string;
  tier: string;
  passed: boolean;
  checks: { label: string; pass: boolean; detail: string }[];
  turns: TurnResult[];
}

async function runScenario(s: Scenario): Promise<ScenarioReport> {
  const offTopic = s.offTopicGuard ?? true;
  const turns = await runConversation(s.turns, s.tier, offTopic);
  const checks = s.checks.map((chk) => {
    const r = chk.run(turns);
    return { label: chk.label, pass: r.pass, detail: r.detail };
  });
  return {
    id: s.id,
    title: s.title,
    tier: s.tier,
    passed: checks.every((c) => c.pass),
    checks,
    turns,
  };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY && withLLM) {
    console.error(c.red("✗ ANTHROPIC_API_KEY no está seteada. Corre con --env-file=.env.local"));
    process.exit(1);
  }

  const guardOnlyCount = selected.filter((s) => s.guardOnly).length;
  const llmCount = selected.length - guardOnlyCount;

  if (!asJson) {
    console.log(c.bold(`\n🔍 QA WhatsApp bot — ${selected.length} escenario(s)`) +
      c.dim(`  (${guardOnlyCount} guard-only, ${llmCount} con LLM${withLLM ? "" : " — omitidos, usa --llm"})`));
    if (tags.length) console.log(c.dim(`   filtro: ${tags.join(", ")}`));
    console.log("");
  }

  const reports: ScenarioReport[] = [];
  // Guard-only escenarios corren en paralelo (son síncronos/gratis); los de LLM,
  // en serie para no gatillar rate limits de Anthropic.
  for (const s of selected) {
    const rep = await runScenario(s);
    reports.push(rep);
    if (asJson) continue;

    const icon = rep.passed ? c.green("✔") : c.red("✗");
    const tierTag = c.dim(`[${rep.tier}${s.guardOnly ? "" : ", llm"}]`);
    console.log(`${icon} ${c.bold(rep.id)} ${tierTag} ${c.dim("— " + rep.title)}`);

    for (const chk of rep.checks) {
      const mark = chk.pass ? c.green("  ✓") : c.red("  ✗");
      const detail = chk.pass ? c.dim(chk.detail) : c.yellow(chk.detail);
      console.log(`${mark} ${chk.label} ${c.dim("→")} ${detail}`);
    }

    if (showTranscript || !rep.passed) {
      for (const t of rep.turns) {
        console.log(c.cyan(`    👤 ${t.user}`));
        const tag = t.blockedBy ? c.yellow(`[blocked:${t.blockedBy}] `) : "";
        console.log(`    🤖 ${tag}${t.reply.replace(/\n/g, "\n       ")}`);
      }
    }
    console.log("");
  }

  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.length - passed;

  if (asJson) {
    console.log(JSON.stringify({ total: reports.length, passed, failed, reports }, null, 2));
  } else {
    const line = failed === 0
      ? c.green(`\n✔ ${passed}/${reports.length} escenarios OK`)
      : c.red(`\n✗ ${failed} fallidos, ${passed} OK (de ${reports.length})`);
    console.log(c.bold(line));
    if (failed > 0) {
      console.log(c.dim("   Fallidos: " + reports.filter((r) => !r.passed).map((r) => r.id).join(", ")));
    }
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(c.red("Error fatal en el runner:"), err);
  process.exit(1);
});
