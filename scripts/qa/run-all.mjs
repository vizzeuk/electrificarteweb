// Corre TODA la suite de QA de la subasta de una. Cada test siembra, verifica y limpia.
//   npm test         (o)   node scripts/qa/run-all.mjs
// Los de lógica pura no necesitan env; los que tocan Supabase usan --env-file=.env.local.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const PURE = new Set(["auction-score.test.ts", "auction-routing.test.ts"]);
const TESTS = [
  "auction-score.test.ts",
  "auction-routing.test.ts",
  "auction-sin-ofertas.test.ts",
  "auction-endpoint.test.ts",
  "auction-message-endpoint.test.ts",
  "auction-close.test.ts",
  "auction-accept.test.ts",
  "auction-recovery.test.ts",
  "auction-oos.test.ts",
  "auction-e2e.test.ts",
];

const hasEnv = existsSync(".env.local");
const results = [];
for (const t of TESTS) {
  const args = ["tsx"];
  if (!PURE.has(t) && hasEnv) args.push("--env-file=.env.local");
  args.push(`scripts/qa/${t}`);
  process.stdout.write(`\n\x1b[1m▶ ${t}\x1b[0m\n`);
  const r = spawnSync("npx", args, { stdio: "inherit" });
  results.push({ t, ok: r.status === 0 });
}

console.log("\n\x1b[1m═══════════ RESUMEN ═══════════\x1b[0m");
for (const { t, ok } of results) console.log(`  ${ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${t}`);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} suites OK`);
process.exit(failed.length ? 1 : 0);
