/// <reference types="node" />
/**
 * TEST END-TO-END del sistema de reseñas, simulando el recorrido real completo:
 *
 *   Cliente que ya compró  →  deja reseña CON FOTOS  →  n8n  →  Supabase (pendiente)
 *   →  Francisco aprueba (como lo haría el dashboard)  →  se publican las fotos
 *   →  aparece en el sitio
 *
 * Requiere el servidor de desarrollo corriendo:
 *   npm run dev
 *   npx tsx --env-file=.env.local scripts/qa/reviews-e2e.test.ts [--base http://localhost:3001]
 *
 * Limpia SIEMPRE lo que crea, aunque falle.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BASE = (() => {
  const i = process.argv.indexOf("--base");
  return i > -1 ? process.argv[i + 1] : "http://localhost:3001";
})();

const QA_EMAIL = `qa-e2e-${Date.now()}@qa.electrificarte.test`;
const QA_SLUG = "qa-e2e-no-aprobar";

let paso = 0;
const step = (s: string) => console.log(`\n\x1b[1m${++paso}. ${s}\x1b[0m`);
const ok = (s: string) => console.log("   \x1b[32m✓\x1b[0m " + s);
const info = (s: string) => console.log("   · " + s);
function fail(s: string): never { console.log("   \x1b[31m✗ " + s + "\x1b[0m"); throw new Error(s); }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** JPEG real de 64x64 generado al vuelo — ejercita subida, copia y URL pública. */
async function jpegDePrueba(): Promise<Blob> {
  const sharp = (await import("sharp")).default;
  const buf = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 229, b: 229 } },
  }).jpeg().toBuffer();
  return new Blob([new Uint8Array(buf)], { type: "image/jpeg" });
}

async function limpiar(sb: SupabaseClient) {
  const { data } = await sb.from("reviews").select("id, photos").eq("email", QA_EMAIL);
  for (const r of data ?? []) {
    const keys: string[] = r.photos ?? [];
    if (keys.length) {
      await sb.storage.from("review-media-pendiente").remove(keys).catch(() => {});
      await sb.storage.from("review-media").remove(keys).catch(() => {});
    }
    await sb.from("reviews").delete().eq("id", r.id);
  }
}

async function main() {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret) fail("Falta ADMIN_API_SECRET");

  console.log(`\n\x1b[1m═══ E2E de reseñas contra ${BASE} ═══\x1b[0m`);
  console.log(`   identificador de esta corrida: ${QA_EMAIL}`);

  // ── 1 ─────────────────────────────────────────────────────────────────────
  step("El servidor responde");
  const ping = await fetch(BASE, { signal: AbortSignal.timeout(20000) }).catch(() => null);
  if (!ping?.ok) fail(`No responde ${BASE} — ¿está corriendo \`npm run dev\`?`);
  ok(`${BASE} responde ${ping.status}`);

  // ── 2 ─────────────────────────────────────────────────────────────────────
  step("El cliente sube 2 fotos (URLs firmadas → bucket privado)");
  const signRes = await fetch(`${BASE}/api/reviews/upload-url`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count: 2 }),
  });
  if (!signRes.ok) fail(`/api/reviews/upload-url respondió ${signRes.status}`);
  const { slots } = (await signRes.json()) as {
    slots: { cardKey: string; fullKey: string; card: { url: string }; full: { url: string } }[];
  };
  ok(`${slots.length} pares de URLs firmadas`);

  const foto = await jpegDePrueba();
  const keys: string[] = [];
  for (const s of slots) {
    for (const [url, key] of [[s.card.url, s.cardKey], [s.full.url, s.fullKey]] as const) {
      const put = await fetch(url, { method: "PUT", body: foto, headers: { "Content-Type": "image/jpeg" } });
      if (!put.ok) fail(`No se pudo subir ${key} (HTTP ${put.status})`);
      keys.push(key);
    }
  }
  ok(`${keys.length} archivos subidos al bucket PRIVADO`);

  step("Las fotos NO son accesibles públicamente todavía (sin moderar)");
  const pubUrlPendiente = sb.storage.from("review-media").getPublicUrl(keys[0]).data.publicUrl;
  const leak = await fetch(pubUrlPendiente).catch(() => null);
  if (leak?.ok) fail("¡Una foto sin moderar es accesible públicamente! Revisar los buckets.");
  ok(`el bucket público aún no la tiene (HTTP ${leak?.status ?? "sin respuesta"}) — correcto`);

  // ── 4 ─────────────────────────────────────────────────────────────────────
  step("El cliente envía la reseña (→ n8n → Supabase)");
  const envio = await fetch(`${BASE}/api/reviews`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "QA", lastName: "Automatico", email: QA_EMAIL, phone: "+56 912345678",
      rating: 5, carSlug: QA_SLUG, carBrand: "BYD", carModel: "Dolphin", carYear: 2025,
      carColor: "Blanco", carVersion: "GS", photos: keys, source: "e2e",
      body: "PRUEBA AUTOMATICA E2E — se borra sola. La autonomia real ronda los 380 km en ciudad y la carga nocturna en casa resuelve todo el uso diario.",
    }),
  });
  if (!envio.ok) {
    const txt = await envio.text().catch(() => "");
    if (envio.status === 500 && txt.includes("Webhook")) fail("N8N_REVIEWS_URL no está configurada en .env.local");
    fail(`/api/reviews respondió ${envio.status} — ${txt.slice(0, 160)}`);
  }
  ok("la web aceptó la reseña y la mandó a n8n");

  // ── 5 ─────────────────────────────────────────────────────────────────────
  step("n8n la guardó en Supabase como 'pendiente'");
  let review: { id: string; status: string; photos: string[] | null } | null = null;
  for (let i = 0; i < 15 && !review; i++) {
    await sleep(1000);
    const { data } = await sb.from("reviews").select("id, status, photos").eq("email", QA_EMAIL).maybeSingle();
    review = data as typeof review;
    if (!review) info(`esperando a n8n... (${i + 1}/15)`);
  }
  if (!review) fail("La fila nunca apareció. Revisar: ¿el workflow de n8n está ACTIVO? ¿el mapeo de campos es correcto?");
  if (review.status !== "pendiente") fail(`Nació con status='${review.status}', debería ser 'pendiente'`);
  ok(`fila creada, status='pendiente' (id ${review.id.slice(0, 8)}…)`);
  const fotosGuardadas = review.photos ?? [];
  fotosGuardadas.length === keys.length
    ? ok(`las ${keys.length} rutas de fotos quedaron guardadas`)
    : info(`⚠ se guardaron ${fotosGuardadas.length}/${keys.length} rutas — revisar el mapeo de 'photos' en n8n`);

  // ── 6 ─────────────────────────────────────────────────────────────────────
  step("NO aparece en el sitio mientras está pendiente");
  const { data: antes } = await sb.from("reviews_publicas").select("id").eq("id", review.id);
  (antes ?? []).length === 0 ? ok("no está en `reviews_publicas` — correcto")
    : fail("¡Una reseña pendiente es visible públicamente!");

  // ── 7 ─────────────────────────────────────────────────────────────────────
  step("Francisco la aprueba (como lo hace el dashboard)");
  const { data: aprobadas } = await sb.from("reviews")
    .update({ status: "aprobada", moderated_at: new Date().toISOString(), moderated_by: "qa-e2e" })
    .eq("id", review.id).eq("status", "pendiente").select("id");
  (aprobadas ?? []).length === 1 ? ok("aprobada (el update condicional afectó 1 fila)")
    : fail("El update no afectó ninguna fila");

  step("El update es idempotente (doble clic no rompe nada)");
  const { data: segunda } = await sb.from("reviews")
    .update({ status: "aprobada", moderated_by: "otro-moderador" })
    .eq("id", review.id).eq("status", "pendiente").select("id");
  (segunda ?? []).length === 0 ? ok("el segundo intento no afectó filas — correcto")
    : fail("El segundo update afectó filas: el guard `and status='pendiente'` no está funcionando");

  // ── 9 ─────────────────────────────────────────────────────────────────────
  step("El dashboard publica las fotos (/api/reviews/publish)");
  const pub = await fetch(`${BASE}/api/reviews/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
    body: JSON.stringify({ reviewId: review.id }),
  });
  if (!pub.ok) fail(`/api/reviews/publish respondió ${pub.status}`);
  const pubJson = (await pub.json()) as { movidas: number; fallidas: string[] };
  ok(`fotos movidas al bucket público: ${pubJson.movidas}`);

  step("Ahora SÍ son accesibles públicamente");
  const publicUrl = sb.storage.from("review-media").getPublicUrl(fotosGuardadas[0] ?? keys[0]).data.publicUrl;
  const verFoto = await fetch(publicUrl).catch(() => null);
  verFoto?.ok ? ok(`la foto se sirve públicamente (HTTP ${verFoto.status})`)
              : fail(`La foto no es accesible tras publicar (HTTP ${verFoto?.status ?? "?"})`);

  step("Sin credenciales, el endpoint de publicar está protegido");
  const sinAuth = await fetch(`${BASE}/api/reviews/publish`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewId: review.id }),
  });
  sinAuth.status === 401 ? ok("responde 401 sin x-admin-secret — correcto")
                         : fail(`Debería ser 401 y fue ${sinAuth.status}`);

  // ── 12 ────────────────────────────────────────────────────────────────────
  step("Ya aparece en el sitio, y sin datos personales");
  const { data: publica } = await sb.from("reviews_publicas")
    .select("id, autor, rating, body, car_slug").eq("id", review.id).maybeSingle();
  if (!publica) fail("No aparece en `reviews_publicas` después de aprobar");
  ok(`visible como autor "${publica.autor}" (★${publica.rating})`);
  const cols = Object.keys(publica);
  ["email", "phone", "last_name", "first_name"].some((c) => cols.includes(c))
    ? fail("¡La vista pública expone datos personales!")
    : ok("la vista no expone email, teléfono ni apellido — correcto");

  console.log("\n\x1b[32m\x1b[1m✅ FLUJO COMPLETO OK\x1b[0m");
}

const sbGlobal = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
main()
  .catch((e) => { console.log(`\n\x1b[31m\x1b[1m✗ FALLÓ: ${e.message}\x1b[0m`); process.exitCode = 1; })
  .finally(async () => { await limpiar(sbGlobal); console.log("\n🧹 Limpieza lista (datos de prueba borrados).\n"); });
