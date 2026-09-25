/// <reference types="node" />
/**
 * Evals de los flujos web → n8n → Supabase → correos (waitlist y reseñas), contra el n8n real.
 *
 *   npx tsx --env-file=.env.local scripts/qa/n8n-evals.mts --to tu@gmail.com [--base http://localhost:3100] [--burst 10] [--solo waitlist|reviews|carga] [--casos 4,5]
 *
 * ⚠️ MANDA CORREOS REALES. Cada caso usa `--to` tal cual como email de la persona (sin
 * plus-addressing: no todos los servidores lo aceptan y un rebote daña la reputación del dominio
 * que envía). Cada caso se identifica por el apellido `QA-<corrida>-<caso>`. Los avisos a Francisco NO se redirigen
 * desde acá: antes de correr, sincronizar n8n con --francisco-to (scripts/n8n-sync-central.mjs)
 * y al terminar volver a sincronizar sin esa opción.
 *
 * Por caso verifica: respuesta de la web, fila en Supabase con los campos esperados, estado de la
 * reseña (con fotos → pendiente, sin fotos → aprobada y visible), y la ejecución de n8n: que
 * termine en success y que hayan corrido exactamente los nodos de correo que corresponden.
 * Todo lo que crea lo borra al final (filas y fotos).
 */
import { createClient } from "@supabase/supabase-js";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const BASE = arg("base") ?? "http://localhost:3100";
const TO = arg("to");
const BURST = Number(arg("burst") ?? 0);
const SOLO = arg("solo");
// --casos 4,5 → corre solo esos casos (1-based). Útil en producción: el rate limit de reseñas es 3/min por IP.
const CASOS = arg("casos")?.split(",").map((n) => Number(n) - 1);
const pick = (i: number) => !CASOS || CASOS.includes(i);
if (!TO || !TO.includes("@")) { console.error("Falta --to tu@correo.com"); process.exit(1); }
const RUN = Date.now().toString(36);
const mark = (tag: string) => `QA-${RUN}-${tag}`;

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const N8N = process.env.N8N_API_URL!, KEY = process.env.N8N_API_KEY!;
const CENTRAL = "80ByudGuUOy5EkJzQga6g";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Result = { flujo: string; caso: string; ok: boolean; detalle: string[] };
const results: Result[] = [];

// ─── n8n: buscar la ejecución de un caso por el email del payload ────────────────
type Exec = { id: string; status: string; nodes: string[]; errors: string[] };
async function findExec(marker: string, timeoutMs = 25_000): Promise<Exec | null> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const r = await fetch(`${N8N}/executions?workflowId=${CENTRAL}&limit=40&includeData=true`, { headers: { "X-N8N-API-KEY": KEY } });
    const { data } = (await r.json()) as { data: any[] };
    for (const e of data ?? []) {
      const run = e.data?.resultData?.runData ?? {};
      const first = Object.values(run)[0] as any;
      const body = first?.[0]?.data?.main?.[0]?.[0]?.json?.body;
      if (body?.lastName === marker && e.finished !== false && e.status !== "running" && e.status !== "waiting") {
        const errors = Object.entries(run).flatMap(([n, runs]: [string, any]) => (runs as any[]).filter((x) => x.error).map((x) => `${n}: ${x.error.message}`.slice(0, 160)));
        return { id: e.id, status: e.status, nodes: Object.keys(run), errors };
      }
    }
    await sleep(1500);
  }
  return null;
}

function check(res: Result, cond: boolean, msg: string) { res.detalle.push(`${cond ? "✓" : "✗"} ${msg}`); if (!cond) res.ok = false; }

// ─── WAITLIST ────────────────────────────────────────────────────────────────────
const WL_CASES = [
  { caso: "completo con modelo", firstName: "Camila", lastName: "Rojas", model: "BYD Dolphin Mini", source: "hero" },
  { caso: "sin modelo (opcional)", firstName: "Diego", lastName: "Muñoz", model: undefined, source: "pdp" },
  { caso: "tildes y ñ", firstName: "José Ñúñez", lastName: "Pérez-Íñiguez", model: "Hyundai IONIQ 5", source: "comparador" },
  { caso: "intento de inyección en el nombre", firstName: "<img src=x onerror=alert(1)>Ana", lastName: "Soto", model: "<b>Tesla</b>", source: "web" },
  { caso: "modelo largo, source desconocido", firstName: "Valentina", lastName: "González", model: "Mercedes-Benz EQS SUV 580 4MATIC AMG Line Plus", source: "calculadora" },
];
const WL_EMAILS = ["Correo confirmación (persona)", "Correo nueva inscripción (Francisco)"];

async function waitlistCase(c: (typeof WL_CASES)[number], i: number) {
  const res: Result = { flujo: "waitlist", caso: c.caso, ok: true, detalle: [] };
  const m = mark(`wl${i + 1}`);
  const r = await fetch(`${BASE}/api/waitlist`, {
    method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.9.${i}.${RUN.length}` },
    body: JSON.stringify({ firstName: c.firstName, lastName: m, email: TO, phone: "+56 912345678", model: c.model, source: c.source }),
  });
  check(res, r.status === 200, `web responde ${r.status}`);
  const { data: row } = await sb.from("waitlist").select("*").eq("last_name", m).maybeSingle();
  check(res, !!row, "fila guardada en Supabase (la web respondió después del insert)");
  if (row) check(res, row.first_name === c.firstName && (row.model ?? null) === (c.model ?? null), "nombre y modelo tal cual");
  const ex = await findExec(m);
  check(res, ex?.status === "success", `ejecución n8n ${ex?.id ?? "—"}: ${ex?.status ?? "no encontrada"}${ex?.errors.length ? " — " + ex.errors.join(" | ") : ""}`);
  if (ex) check(res, WL_EMAILS.every((n) => ex.nodes.includes(n)), "corrieron los 2 correos");
  results.push(res);
}

// ─── RESEÑAS ─────────────────────────────────────────────────────────────────────
async function jpeg(): Promise<Blob> {
  const sharp = (await import("sharp")).default;
  const buf = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 29, g: 96, b: 91 } } }).jpeg().toBuffer();
  return new Blob([new Uint8Array(buf)], { type: "image/jpeg" });
}
async function uploadPhotos(n: number, ip: string): Promise<string[]> {
  if (!n) return [];
  const r = await fetch(`${BASE}/api/reviews/upload-url`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ count: n }) });
  if (!r.ok) throw new Error(`upload-url ${r.status}`);
  const { slots } = (await r.json()) as { slots: { cardKey: string; fullKey: string; card: { url: string }; full: { url: string } }[] };
  const foto = await jpeg(); const keys: string[] = [];
  for (const s of slots) for (const [url, key] of [[s.card.url, s.cardKey], [s.full.url, s.fullKey]] as const) {
    const put = await fetch(url, { method: "PUT", body: foto, headers: { "Content-Type": "image/jpeg" } });
    if (!put.ok) throw new Error(`PUT foto ${put.status}`); keys.push(key);
  }
  return keys;
}

// Rating ≤ 3: nunca aparece en "lo que dicen" del home (getTopReviews pide ≥ 4).
const RV_CASES = [
  { caso: "sin fotos, auto real → se publica", fotos: 0, rating: 3, carSlug: "hyundai-ioniq-5", carBrand: "Hyundai", carModel: "IONIQ 5", body: "Eval QA: la autonomía real en ciudad anda cerca de lo prometido y carga rápido en casa." },
  { caso: "sin fotos, sin auto → se publica", fotos: 0, rating: 2, carSlug: undefined, carBrand: undefined, carModel: undefined, body: "Eval QA: reseña sin auto asociado, debe publicarse igual y el link ir al catálogo." },
  { caso: "sin fotos, inyección en el texto", fotos: 0, rating: 3, carSlug: "qa-eval-no-existe", carBrand: "QA", carModel: "Eval", body: "Eval QA: <a href=\"https://phishing.test\">clic acá</a> <img src=x onerror=alert(1)> esto debe llegar como texto." },
  { caso: "1 foto → queda pendiente", fotos: 1, rating: 3, carSlug: "qa-eval-no-existe", carBrand: "QA", carModel: "Eval", body: "Eval QA: reseña con una foto, debe quedar pendiente hasta que Francisco la apruebe." },
  { caso: "2 fotos → queda pendiente", fotos: 2, rating: 1, carSlug: "qa-eval-no-existe", carBrand: "QA", carModel: "Eval", body: "Eval QA: reseña con dos fotos, debe quedar pendiente y no verse en el sitio." },
];
const RV_PUB = ["Correo reseña publicada (Francisco)", "Correo reseña publicada (autor)"];
const RV_REV = ["Correo por moderar (Francisco)", "Correo reseña en revisión (autor)"];

async function reviewCase(c: (typeof RV_CASES)[number], i: number) {
  const res: Result = { flujo: "reseñas", caso: c.caso, ok: true, detalle: [] };
  const m = mark(`rv${i + 1}`); const ip = `10.8.${i}.${RUN.length}`;
  const photos = await uploadPhotos(c.fotos, ip);
  const r = await fetch(`${BASE}/api/reviews`, {
    method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ firstName: "QA", lastName: m, email: TO, rating: c.rating, body: c.body, carSlug: c.carSlug, carBrand: c.carBrand, carModel: c.carModel, photos, source: "qa-eval" }),
  });
  const j = await r.json().catch(() => ({}));
  check(res, r.status === 200, `web responde ${r.status}`);
  check(res, j.published === (c.fotos === 0), `la web informa published=${j.published}`);
  const { data: row } = await sb.from("reviews").select("id, status, photos").eq("last_name", m).maybeSingle();
  const want = c.fotos ? "pendiente" : "aprobada";
  check(res, row?.status === want, `estado en Supabase: ${row?.status ?? "sin fila"} (esperado ${want})`);
  const { data: pub } = await sb.from("reviews_publicas").select("id").eq("id", row?.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle();
  check(res, !!pub === (c.fotos === 0), c.fotos ? "NO está en la vista pública" : "ya está en la vista pública");
  if (c.carSlug === "hyundai-ioniq-5") {
    const html = await (await fetch(`${BASE}/auto/hyundai-ioniq-5`)).text();
    check(res, html.includes("la autonomía real en ciudad anda cerca"), "aparece en la ficha del auto");
  }
  const ex = await findExec(m);
  check(res, ex?.status === "success", `ejecución n8n ${ex?.id ?? "—"}: ${ex?.status ?? "no encontrada"}${ex?.errors.length ? " — " + ex.errors.join(" | ") : ""}`);
  if (ex) {
    const want = c.fotos ? RV_REV : RV_PUB, notWant = c.fotos ? RV_PUB : RV_REV;
    check(res, want.every((n) => ex.nodes.includes(n)) && !notWant.some((n) => ex.nodes.includes(n)), `correos de la rama "${c.fotos ? "en revisión" : "publicada"}" y solo esos`);
  }
  results.push(res);
}

// ─── Negativos: nada inválido llega a Supabase ───────────────────────────────────
async function negativos() {
  const res: Result = { flujo: "negativos", caso: "datos inválidos", ok: true, detalle: [] };
  const r1 = await fetch(`${BASE}/api/waitlist`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.7.0.1" }, body: JSON.stringify({ firstName: "A", email: "no-es-email", phone: "123" }) });
  check(res, r1.status === 400, `web rechaza una waitlist inválida (HTTP ${r1.status}) sin llamar a n8n`);
  const r2 = await fetch(process.env.N8N_WAITLIST_URL!, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: TO, lastName: mark("neg") }) });
  check(res, r2.status === 422, `n8n responde 422 a un cuerpo incompleto (HTTP ${r2.status}) → la web mostraría error, no un falso "listo"`);
  const r3 = await fetch(process.env.N8N_REVIEWS_URL!, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: "QA", lastName: mark("neg2"), email: TO, body: "x", rating: 9 }) });
  check(res, r3.status === 422, `n8n responde 422 a una reseña con rating 9 (HTTP ${r3.status})`);
  results.push(res);
}

// ─── Ráfaga: N registros a la vez directo a n8n (sin el rate limit de la web) ─────
async function burst(n: number) {
  const res: Result = { flujo: "ráfaga", caso: `${n} waitlist simultáneas (con correos)`, ok: true, detalle: [] };
  const marks = Array.from({ length: n }, (_, i) => mark(`burst${i + 1}`));
  const t0 = Date.now();
  const rs = await Promise.all(marks.map(async (m, i) => {
    const s = Date.now();
    const r = await fetch(process.env.N8N_WAITLIST_URL!, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstName: `Ráfaga ${i + 1}`, lastName: m, email: TO, phone: "+56 912345678", model: "Eval", source: "qa-burst" }) }).catch(() => null);
    return { status: r?.status ?? 0, ms: Date.now() - s };
  }));
  const ms = rs.map((r) => r.ms).sort((a, b) => a - b);
  check(res, rs.every((r) => r.status === 200), `respuestas: ${JSON.stringify(rs.reduce((a: any, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {}))} en ${Date.now() - t0} ms (p50 ${ms[Math.floor(n / 2)]} ms, máx ${ms[n - 1]} ms)`);
  const { count } = await sb.from("waitlist").select("*", { count: "exact", head: true }).in("last_name", marks);
  check(res, count === n, `filas guardadas: ${count}/${n}`);
  const execs = await Promise.all(marks.map((m) => findExec(m, 60_000)));
  const okEx = execs.filter((e) => e?.status === "success").length;
  const errs = [...new Set(execs.flatMap((e) => e?.errors ?? []))];
  check(res, okEx === n, `ejecuciones success: ${okEx}/${n}${errs.length ? " — errores: " + errs.join(" | ") : ""}`);
  results.push(res);
}

async function limpiar() {
  // Por la marca del apellido, NUNCA por email: el email es el real de quien corre los evals y
  // borrar por email podría llevarse un registro verdadero suyo.
  await sb.from("waitlist").delete().like("last_name", `QA-${RUN}-%`);
  const { data } = await sb.from("reviews").select("id, photos").like("last_name", `QA-${RUN}-%`);
  for (const r of data ?? []) {
    const keys: string[] = r.photos ?? [];
    if (keys.length) { await sb.storage.from("review-media-pendiente").remove(keys); await sb.storage.from("review-media").remove(keys); }
    await sb.from("reviews").delete().eq("id", r.id);
  }
}

try {
  console.log(`\nEvals n8n — corrida ${RUN} — correos a ${TO}\n`);
  if (!SOLO || SOLO === "waitlist") for (const [i, c] of WL_CASES.entries()) if (pick(i)) await waitlistCase(c, i);
  if (!SOLO || SOLO === "reviews") for (const [i, c] of RV_CASES.entries()) if (pick(i)) await reviewCase(c, i);
  if (!SOLO || SOLO === "carga") await negativos();
  if (BURST > 0) await burst(BURST);
} finally {
  await limpiar();
  for (const r of results) {
    console.log(`${r.ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} [${r.flujo}] ${r.caso}`);
    for (const d of r.detalle) console.log(`    ${d}`);
  }
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - bad}/${results.length} casos OK · datos de prueba borrados\n`);
  process.exitCode = bad ? 1 : 0;
}
