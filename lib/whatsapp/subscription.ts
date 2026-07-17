import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Configuración (servidor) ─────────────────────────────────────────────────
// La verificación de "asesoría pagada" vive en Supabase. n8n da de alta el número
// cuando el usuario paga. Este módulo es la AUTORIDAD de gating: el endpoint
// re-verifica acá y no confía en ningún flag externo.
//
// Nombres de columna configurables por env para adaptarse a la tabla real sin
// tocar código. Defaults pensados para una tabla típica `asesoria_pagada`.

// ─── Tabla de asesoría $4.990 ─────────────────────────────────────────────────
export const ADVISORY_TABLE = process.env.SUPABASE_SUBSCRIPTION_TABLE ?? "advisory_payments";
export const ADVISORY_PHONE_COLUMN = process.env.SUPABASE_PHONE_COLUMN ?? "phone";
const TABLE = ADVISORY_TABLE;
const PHONE_COLUMN = ADVISORY_PHONE_COLUMN;

// ─── Tabla de ofertador $19.990 ───────────────────────────────────────────────
// n8n escribe aquí cuando Reveniu confirma el pago. Status "pagado" = activo.
// "pendiente" queda excluido por isRowActive (payment not yet confirmed).
// La columna del teléfono puede diferir entre tablas (ej: "telefono" vs "phone").
const OFERTA_TABLE = process.env.SUPABASE_OFERTA_TABLE ?? "leads";
const OFERTA_PHONE_COLUMN = process.env.SUPABASE_OFERTA_PHONE_COLUMN ?? "telefono";

// ─── Tabla de vendedores ──────────────────────────────────────────────────────
// Registros de vendedores de la plataforma de vendedores (web separada).
// Cualquier número activo en esta tabla es bloqueado del bot de compradores.
const VENDOR_TABLE = process.env.SUPABASE_VENDOR_TABLE ?? "leads_vendors";
const VENDOR_PHONE_COLUMN = process.env.SUPABASE_VENDOR_PHONE_COLUMN ?? "telefono";

// ─── Cliente Supabase (singleton, lazy) ───────────────────────────────────────

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabase;
}

// ─── Normalización de teléfono ────────────────────────────────────────────────

/**
 * Deja solo dígitos (quita +, espacios, guiones, paréntesis).
 * Evita bypass del gating por diferencias de formato.
 * Ej: "+56 9 1234 5678" → "56912345678"
 */
export function normalizePhone(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

/**
 * Variantes habituales bajo las que podría estar guardado el número en la tabla,
 * para tolerar distintos formatos de escritura desde n8n / el gateway de pago.
 */
function phoneCandidates(digits: string): string[] {
  const candidates = new Set<string>([digits, `+${digits}`]);
  // Número chileno local sin código de país (9XXXXXXXX) ↔ con código (569XXXXXXXX)
  if (digits.startsWith("56") && digits.length > 9) {
    const local = digits.slice(2);
    candidates.add(local);
    candidates.add(`+${digits}`);
  } else if (digits.length === 9 && digits.startsWith("9")) {
    candidates.add(`56${digits}`);
    candidates.add(`+56${digits}`);
  }
  return [...candidates];
}

// ─── Cache corto (60s) ────────────────────────────────────────────────────────

const _cache = new Map<string, { subscribed: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

// ─── Verificación de suscripción ──────────────────────────────────────────────

/**
 * ¿El número tiene asesoría pagada vigente?
 *
 * Fail-closed: si Supabase no está configurado o la consulta falla, se trata
 * como NO suscrito (es un servicio pagado; ante la duda, no damos acceso).
 *
 * Tolerante al esquema real: basta con que el teléfono exista en la tabla.
 * Si la fila tiene `status`/`active` o `expires_at`, también se respetan.
 */
export async function isSubscribed(rawPhone: string): Promise<boolean> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return false;

  const cached = _cache.get(phone);
  if (cached && Date.now() < cached.expiresAt) return cached.subscribed;

  const subscribed = await querySubscription(phone);
  _cache.set(phone, { subscribed, expiresAt: Date.now() + CACHE_TTL_MS });
  return subscribed;
}

async function querySubscription(phone: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[advisor] Supabase no configurado — gating cerrado por defecto");
    return false;
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .in(PHONE_COLUMN, phoneCandidates(phone))
      .limit(1);

    if (error) {
      console.warn("[advisor] error consultando suscripción:", error.message);
      return false;
    }
    const row = data?.[0];
    if (!row) return false;

    return isRowActive(row);
  } catch (err) {
    console.warn("[advisor] excepción consultando suscripción:", err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Interpreta el estado de la fila de forma tolerante:
 * - Si existe `active` (boolean), debe ser true.
 * - Si existe `status` (string), no debe ser cancelada/expirada/inactiva.
 * - Si existe `expires_at`, debe ser futura.
 * Si ninguno de esos campos existe, la mera presencia de la fila basta.
 */
export function isRowActive(row: Record<string, unknown>): boolean {
  if (typeof row.active === "boolean" && !row.active) return false;

  if (typeof row.status === "string") {
    const s = row.status.toLowerCase();
    if (["cancelled", "canceled", "cancelado", "expired", "expirado", "inactive", "inactivo", "pendiente", "pending"].includes(s)) {
      return false;
    }
  }

  const expiry = row.expires_at ?? row.expiresAt ?? row.valid_until;
  if (expiry) {
    const t = new Date(expiry as string).getTime();
    if (!Number.isNaN(t) && t < Date.now()) return false;
  }

  return true;
}

// ─── Tier de suscripción ──────────────────────────────────────────────────────

/**
 * Tier del número que escribe:
 * - "vendedor"  → bloqueado (canal exclusivo para compradores)
 * - "oferta"    → contrató el Servicio de Oferta Exclusiva ($19.990): ya sabe
 *                 qué auto quiere y espera precio de la red de vendedores.
 *                 El advisor le da soporte técnico sin venderle nada más.
 * - "asesoria"  → contrató la Asesoría IA ($4.990): aún decide qué auto comprar.
 *                 El advisor le ayuda a elegir y puede recomendarle el $19.990
 *                 como siguiente paso una vez que tenga claro el modelo.
 * - null        → sin suscripción activa → mostrar mensaje de suscripción
 *
 * Si alguien tiene ambos → "oferta" (ya pasó la etapa de decisión).
 */
export type SubscriptionTier = "asesoria" | "oferta" | "vendedor" | null;

const _tierCache = new Map<string, { tier: SubscriptionTier; expiresAt: number }>();

export async function getSubscriptionTier(rawPhone: string): Promise<SubscriptionTier> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return null;

  // ── Override dev-only para QA local ─────────────────────────────────────────
  // Fuera de producción, WHATSAPP_TEST_TIERS permite mapear teléfonos a un tier
  // fijo sin sembrar filas en Supabase. Formato: "56911110001:asesoria,56911110002:oferta".
  // Tiers válidos: asesoria | oferta | vendedor | none (none ⇒ null / sin suscripción).
  // Se ignora por completo si NODE_ENV === "production" (nunca afecta prod).
  const testTier = resolveTestTier(phone);
  if (testTier !== undefined) return testTier;

  const cached = _tierCache.get(phone);
  if (cached && Date.now() < cached.expiresAt) return cached.tier;

  const tier = await resolveTier(phone);
  _tierCache.set(phone, { tier, expiresAt: Date.now() + CACHE_TTL_MS });
  return tier;
}

// ─── Override de tier para QA (dev-only) ──────────────────────────────────────

let _testTierMap: Map<string, SubscriptionTier> | null = null;

/** "asesoria"|"oferta"|"vendedor"|null (tier válido) o `undefined` si el token es inválido. */
function parseTierToken(token: string): SubscriptionTier | undefined {
  switch (token.toLowerCase()) {
    case "asesoria": return "asesoria";
    case "oferta":   return "oferta";
    case "vendedor": return "vendedor";
    case "none":
    case "null":     return null;
    default:         return undefined;
  }
}

function parseTestTiers(): Map<string, SubscriptionTier> {
  const map = new Map<string, SubscriptionTier>();
  const raw = process.env.WHATSAPP_TEST_TIERS;
  if (!raw) return map;
  for (const pair of raw.split(",")) {
    const [phoneRaw, tierRaw] = pair.split(":").map((s) => s.trim());
    if (!phoneRaw || !tierRaw) continue;
    const tier = parseTierToken(tierRaw);
    if (tier === undefined) continue; // token de tier inválido → ignorar
    for (const cand of phoneCandidates(normalizePhone(phoneRaw))) {
      map.set(normalizePhone(cand), tier);
    }
  }
  return map;
}

/**
 * Retorna el tier forzado para un teléfono según WHATSAPP_TEST_TIERS, o `undefined`
 * si no aplica (env ausente, prod, o teléfono no mapeado) para que siga el flujo normal.
 * Distingue `undefined` (no aplica) de `null` (mapeado explícitamente a "sin suscripción").
 */
function resolveTestTier(phone: string): SubscriptionTier | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  if (!process.env.WHATSAPP_TEST_TIERS) return undefined;
  if (!_testTierMap) _testTierMap = parseTestTiers();
  return _testTierMap.has(phone) ? _testTierMap.get(phone)! : undefined;
}

async function checkTable(table: string, phone: string, phoneCol = PHONE_COLUMN): Promise<boolean> {
  if (!table) return false;
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { data } = await supabase
      .from(table)
      .select("*")
      .in(phoneCol, phoneCandidates(phone))
      .limit(1);
    const row = data?.[0];
    return row ? isRowActive(row) : false;
  } catch {
    return false;
  }
}

async function resolveTier(phone: string): Promise<SubscriptionTier> {
  // Checks run in priority order. Vendor check first so a registered vendor
  // never accidentally triggers the buyer advisor.
  const [isVendor, isOferta, isAsesoria] = await Promise.all([
    checkTable(VENDOR_TABLE, phone, VENDOR_PHONE_COLUMN),
    checkTable(OFERTA_TABLE, phone, OFERTA_PHONE_COLUMN),
    querySubscription(phone), // existing advisory_payments check
  ]);

  if (isVendor) return "vendedor";
  if (isOferta) return "oferta";   // also true if they have both (don't re-pitch)
  if (isAsesoria) return "asesoria";
  return null;
}
