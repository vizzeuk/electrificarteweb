/// <reference types="node" />
/**
 * QA del endpoint HTTP /api/whatsapp/advisor (capa de ruta completa).
 *
 * A diferencia de run.ts (que llama runAdvisor directo), esto pega al endpoint
 * real levantado por el dev server y valida lo que el harness de lógica NO cubre:
 *   auth (x-webhook-secret) · validación de payload · tier gating · rate-limit.
 *
 * Requiere:
 *   - dev server corriendo (preview_start "electrificarte-dev", puerto 3000)
 *   - .env.local con WHATSAPP_WEBHOOK_SECRET y WHATSAPP_TEST_TIERS
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/qa/http.ts
 *   BASE_URL=http://localhost:3001 npx tsx --env-file=.env.local scripts/qa/http.ts
 *   npx tsx --env-file=.env.local scripts/qa/http.ts --ratelimit   # incluye el test de 21 requests
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ENDPOINT = `${BASE_URL}/api/whatsapp/advisor`;
const SECRET = process.env.WHATSAPP_WEBHOOK_SECRET ?? "";
const runRateLimit = process.argv.includes("--ratelimit");

// Teléfonos mapeados en WHATSAPP_TEST_TIERS
const PH = {
  asesoria: "56911110001",
  oferta: "56911110002",
  vendedor: "56911110003",
  none: "56911110004",
};

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};

interface Result { name: string; pass: boolean; detail: string }
const results: Result[] = [];

function record(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
  const mark = pass ? c.green("✔") : c.red("✗");
  const d = pass ? c.dim(detail) : c.yellow(detail);
  console.log(`${mark} ${c.bold(name)} ${c.dim("→")} ${d}`);
}

async function post(
  body: unknown,
  opts: { secret?: string | null; phone?: string } = {},
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = opts.secret === undefined ? SECRET : opts.secret;
  if (secret) headers["x-webhook-secret"] = secret;
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* body no-JSON */ }
  return { status: res.status, json };
}

function msg(text: string, phone: string) {
  return { phone, messages: [{ role: "user", content: text }] };
}

const hasText = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
const includesCI = (h: unknown, needle: string) =>
  typeof h === "string" && h.toLowerCase().includes(needle.toLowerCase());

async function main() {
  console.log(c.bold(`\n🌐 QA HTTP — ${ENDPOINT}\n`));

  if (!SECRET) {
    console.error(c.red("✗ WHATSAPP_WEBHOOK_SECRET no seteada — corré con --env-file=.env.local"));
    process.exit(1);
  }

  // Sanity: server arriba
  try {
    await fetch(BASE_URL, { method: "GET" });
  } catch {
    console.error(c.red(`✗ No hay servidor en ${BASE_URL}. Levantá el dev server (preview_start "electrificarte-dev").`));
    process.exit(1);
  }

  // ── 1. AUTH ───────────────────────────────────────────────────────────────
  {
    const r = await post(msg("hola", PH.asesoria), { secret: null });
    record("auth: sin secret → 401", r.status === 401, `status=${r.status}`);
  }
  {
    const r = await post(msg("hola", PH.asesoria), { secret: "secreto-incorrecto" });
    record("auth: secret inválido → 401", r.status === 401, `status=${r.status}`);
  }

  // ── 2. VALIDACIÓN DE PAYLOAD ────────────────────────────────────────────────
  {
    const r = await post("{ no json", {});
    record("payload: JSON malformado → 400", r.status === 400, `status=${r.status}`);
  }
  {
    const r = await post({ nada: true }, {});
    record("payload: sin messages/conversation_id → 400", r.status === 400, `status=${r.status}`);
  }
  {
    // último mensaje NO es del usuario → inválido
    const r = await post({ phone: PH.asesoria, messages: [{ role: "assistant", content: "hola" }] }, {});
    record("payload: último msg no-user → 400", r.status === 400, `status=${r.status}`);
  }
  {
    // teléfono demasiado corto
    const r = await post({ phone: "123", messages: [{ role: "user", content: "hola" }] }, {});
    record("payload: teléfono inválido → 400", r.status === 400, `status=${r.status}`);
  }

  // ── 3. TIER GATING (shim WHATSAPP_TEST_TIERS) ──────────────────────────────
  {
    const r = await post(msg("hola, soy vendedor", PH.vendedor), {});
    const ok = r.status === 200 && r.json?.subscribed === false && includesCI(r.json?.message, "vendedores@electrificarte.com");
    record("gating: vendedor → redirect a vendedores@", ok, `status=${r.status} subscribed=${r.json?.subscribed} msg="${(r.json?.message ?? "").slice(0, 60)}…"`);
  }
  {
    const r = await post(msg("hola", PH.none), {});
    const ok = r.status === 200 && r.json?.subscribed === false && includesCI(r.json?.message, "asesoría");
    record("gating: sin suscripción → mensaje de suscripción", ok, `status=${r.status} subscribed=${r.json?.subscribed} msg="${(r.json?.message ?? "").slice(0, 60)}…"`);
  }
  {
    const r = await post(msg("Hola, ¿qué autos eléctricos tienen bajo 20 millones?", PH.asesoria), {});
    const ok = r.status === 200 && r.json?.subscribed === true && hasText(r.json?.message);
    record("gating: asesoria → responde el asesor (subscribed:true)", ok, `status=${r.status} subscribed=${r.json?.subscribed} len=${(r.json?.message ?? "").length}`);
  }
  {
    const r = await post(msg("Ya contraté la oferta por un BYD Dolphin, ¿qué conector usa?", PH.oferta), {});
    const ok = r.status === 200 && r.json?.subscribed === true && hasText(r.json?.message);
    record("gating: oferta → responde el asesor (subscribed:true)", ok, `status=${r.status} subscribed=${r.json?.subscribed} len=${(r.json?.message ?? "").length}`);
  }

  // ── 4. RATE LIMIT (opcional; usa teléfono null-tier → sin LLM) ──────────────
  if (runRateLimit) {
    console.log(c.dim("\n  … enviando 22 requests para gatillar el rate-limit (in-memory 20/60s)"));
    let got429 = false;
    let firstBlockAt = -1;
    for (let i = 1; i <= 22; i++) {
      const r = await post(msg(`ping ${i}`, PH.none), {});
      if (r.status === 429) { got429 = true; if (firstBlockAt < 0) firstBlockAt = i; break; }
    }
    record("rate-limit: gatilla 429 tras ~20 requests", got429, got429 ? `429 en request #${firstBlockAt}` : "nunca dio 429 (¿Redis/fallback?)");
  } else {
    console.log(c.dim("\n  (rate-limit omitido — usá --ratelimit para incluirlo)"));
  }

  // ── Resumen ─────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  const line = failed === 0
    ? c.green(`\n✔ ${passed}/${results.length} checks HTTP OK`)
    : c.red(`\n✗ ${failed} fallidos, ${passed} OK (de ${results.length})`);
  console.log(c.bold(line));
  if (failed > 0) console.log(c.dim("   Fallidos: " + results.filter((r) => !r.pass).map((r) => r.name).join(", ")));
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(c.red("Error fatal:"), err);
  process.exit(1);
});
