import { createClient } from "@supabase/supabase-js";

const testPhone = process.argv[2] ?? "";

const ok   = (msg: string) => console.log(`  ✅ ${msg}`);
const warn = (msg: string) => console.log(`  ⚠️  ${msg}`);
const fail = (msg: string) => console.log(`  ❌ ${msg}`);
const h    = (title: string) => console.log(`\n── ${title}`);

async function main() {
  // 1. ENV VARS
  h("1. Variables de entorno");
  const VARS = [
    "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
    "KAPSO_API_KEY", "KAPSO_PHONE_NUMBER_ID",
    "WHATSAPP_WEBHOOK_SECRET", "ANTHROPIC_API_KEY",
    "KV_REST_API_URL", "KV_REST_API_TOKEN",
    "ADVISOR_SUBSCRIBE_URL",
  ];
  const OPTIONAL = ["SUPABASE_SUBSCRIPTION_TABLE", "SUPABASE_PHONE_COLUMN", "ADVISOR_DAILY_LIMIT"];
  const missing: string[] = [];
  for (const v of VARS) {
    const val = process.env[v];
    if (!val) { fail(`${v} FALTANTE`); missing.push(v); }
    else ok(`${v} = ${val.slice(0,10)}…`);
  }
  for (const v of OPTIONAL) {
    const val = process.env[v];
    warn(`${v} = ${val ?? "(usando default)"}`);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const TABLE        = process.env.SUPABASE_SUBSCRIPTION_TABLE ?? "asesoria_pagada";
  const PHONE_COL    = process.env.SUPABASE_PHONE_COLUMN ?? "phone";

  // 2. SUPABASE
  h("2. Supabase — conectividad y schema");
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    fail("Supabase sin configurar → isSubscribed() siempre false → TODO usuario ve mensaje de suscripción");
    fail("ACCIÓN: setear SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel > Settings > Environment Variables");
  } else {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: rows, error } = await sb.from(TABLE).select("*").limit(3);
    if (error) {
      fail(`Tabla "${TABLE}" → error: ${error.message}`);
      warn(`Prueba con SUPABASE_SUBSCRIPTION_TABLE=nombre_real en .env.local`);
    } else {
      ok(`Tabla "${TABLE}" accesible — ${rows?.length ?? 0} filas (mostrando hasta 3)`);
      if (rows && rows.length > 0) {
        const cols = Object.keys(rows[0]);
        ok(`Columnas: ${cols.join(", ")}`);
        if (!cols.includes(PHONE_COL)) {
          fail(`Columna "${PHONE_COL}" NO existe → nunca matchea. Setea SUPABASE_PHONE_COLUMN con el nombre correcto`);
        } else {
          ok(`Columna de teléfono "${PHONE_COL}" ✓`);
        }
        if (cols.includes("status")) {
          const vals = [...new Set(rows.map((r: any) => r.status).filter(Boolean))];
          ok(`status values en muestra: ${vals.join(", ")}`);
        }
        console.log("\n  Filas de muestra:");
        console.log(JSON.stringify(rows, null, 2).split("\n").map(l => "  " + l).join("\n"));
      } else {
        warn(`Tabla "${TABLE}" vacía — ningún usuario tiene suscripción`);
      }
    }

    if (testPhone) {
      h(`2b. Buscar teléfono "${testPhone}"`);
      const digits = testPhone.replace(/\D/g, "");
      const candidates = new Set<string>([digits, `+${digits}`]);
      if (digits.startsWith("56") && digits.length > 9) candidates.add(digits.slice(2));
      if (digits.length === 9 && digits.startsWith("9")) { candidates.add(`56${digits}`); candidates.add(`+56${digits}`); }
      const { data: found, error: fe } = await sb.from(TABLE).select("*").in(PHONE_COL, [...candidates]);
      if (fe) fail(`Error: ${fe.message}`);
      else if (!found?.length) fail(`Teléfono NO encontrado con candidatos: ${[...candidates].join(", ")}`);
      else ok(`Encontrado: ${JSON.stringify(found[0])}`);
    }
  }

  // 3. REDIS
  h("3. Redis (cuota diaria)");
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    warn("Redis no configurado → quota check fail-open (no bloquea — OK para staging)");
  } else ok("Redis configurado");

  // 4. KAPSO
  h("4. Kapso");
  if (!process.env.KAPSO_API_KEY || !process.env.KAPSO_PHONE_NUMBER_ID) {
    fail("KAPSO_API_KEY / KAPSO_PHONE_NUMBER_ID faltantes");
    fail("→ fetchKapsoHistory() devuelve vacío → si el workflow manda solo conversation_id, el endpoint retorna 400");
  } else ok(`KAPSO ok — phone_number_id: ${process.env.KAPSO_PHONE_NUMBER_ID}`);

  // 5. ANTHROPIC
  h("5. Anthropic");
  if (!process.env.ANTHROPIC_API_KEY) fail("ANTHROPIC_API_KEY faltante → runAdvisor() crashea → 500");
  else ok("ANTHROPIC_API_KEY seteada");

  // 6. WEBHOOK
  h("6. Webhook secret");
  if (!process.env.WHATSAPP_WEBHOOK_SECRET) fail("WHATSAPP_WEBHOOK_SECRET faltante → 401 en todos los requests");
  else ok(`WHATSAPP_WEBHOOK_SECRET seteada (${process.env.WHATSAPP_WEBHOOK_SECRET.length} chars)`);

  // 7. SUBSCRIBE URL
  h("7. Subscribe URL");
  if (!process.env.ADVISOR_SUBSCRIBE_URL) warn("ADVISOR_SUBSCRIBE_URL no seteada — mensaje sin link de pago");
  else ok(`ADVISOR_SUBSCRIBE_URL = ${process.env.ADVISOR_SUBSCRIBE_URL}`);

  h("RESUMEN");
  if (missing.length === 0) ok("Todas las vars críticas presentes");
  else fail(`Vars críticas faltantes: ${missing.join(", ")}`);
}

main().catch(console.error);
