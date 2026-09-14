/// <reference types="node" />
/**
 * PREFLIGHT del sistema de reseñas: verifica que TODO lo externo esté en su lugar
 * antes de probar el flujo completo. No escribe nada.
 *
 *   npx tsx --env-file=.env.local scripts/qa/reviews-preflight.ts
 */
import { createClient } from "@supabase/supabase-js";

const ok = (s: string) => console.log("  \x1b[32m✓\x1b[0m " + s);
const bad = (s: string) => { console.log("  \x1b[31m✗\x1b[0m " + s); fallos++; };
let fallos = 0;

async function main() {
  console.log("\n─── Variables de entorno ───");
  const req = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_API_SECRET", "N8N_REVIEWS_URL"];
  for (const v of req) process.env[v] ? ok(v) : bad(`${v}  ← FALTA en .env.local`);
  process.env.RESEND_API_KEY ? ok("RESEND_API_KEY (opcional, para probar correos)")
    : console.log("  — RESEND_API_KEY no está (solo hace falta para el test de correos)");

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.log("\nSin Supabase no puedo seguir.\n"); process.exit(1); }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log("\n─── Base de datos ───");
  const t = await sb.from("reviews").select("id", { count: "exact", head: true });
  t.error ? bad("tabla `reviews`: " + t.error.message + "  ← correr scripts/sql/2026-09-09_reviews.sql")
          : ok(`tabla \`reviews\` existe (${t.count ?? 0} filas)`);
  const v = await sb.from("reviews_publicas").select("id", { count: "exact", head: true });
  v.error ? bad("vista `reviews_publicas`: " + v.error.message)
          : ok(`vista \`reviews_publicas\` existe (${v.count ?? 0} aprobadas)`);

  console.log("\n─── Buckets de Storage ───");
  const b = await sb.storage.listBuckets();
  if (b.error) bad("no pude listar buckets: " + b.error.message);
  else {
    for (const [want, debeSerPublico] of [["review-media-pendiente", false], ["review-media", true]] as const) {
      const f = b.data.find((x) => x.id === want);
      if (!f) bad(`bucket "${want}" NO existe  ← correr scripts/sql/2026-09-13_reviews_buckets.sql`);
      else if (f.public !== debeSerPublico)
        bad(`bucket "${want}" tiene public=${f.public}, debería ser ${debeSerPublico}`);
      else ok(`bucket "${want}" (público: ${f.public})`);
    }
  }

  console.log("\n─── n8n ───");
  const n8n = process.env.N8N_REVIEWS_URL;
  if (!n8n) bad("N8N_REVIEWS_URL no configurada");
  else {
    try {
      const r = await fetch(n8n, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ __preflight: true }), signal: AbortSignal.timeout(6000),
      });
      // Cualquier respuesta HTTP significa que el webhook existe y responde.
      ok(`webhook de n8n responde (HTTP ${r.status})`);
      if (r.status === 404) bad("404 = el workflow puede estar INACTIVO en n8n, o la URL es la de test");
    } catch {
      bad("el webhook de n8n no respondió  ← ¿está activo el workflow? ¿la URL es la de producción?");
    }
  }

  console.log(fallos === 0
    ? "\n\x1b[32m✅ Todo listo para el test end-to-end.\x1b[0m\n"
    : `\n\x1b[31m${fallos} cosa(s) por resolver antes de probar.\x1b[0m\n`);
  process.exit(fallos ? 1 : 0);
}
main();
