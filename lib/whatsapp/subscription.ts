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
 *
 * Incluye `+56 9XXXXXXXX` (con espacio): es lo que manda NUESTRO formulario de
 * checkout (`+56 ${phone}` en AsesoriaCheckoutForm) y n8n lo guarda tal cual. Sin
 * esa variante, ningún cliente que pagó desde la web calzaba con su número.
 */
export function phoneCandidates(digits: string): string[] {
  const candidates = new Set<string>([digits, `+${digits}`]);
  let local = "";
  // Número chileno local sin código de país (9XXXXXXXX) ↔ con código (569XXXXXXXX)
  if (digits.startsWith("56") && digits.length > 9) {
    local = digits.slice(2);
    candidates.add(local);
  } else if (digits.length === 9 && digits.startsWith("9")) {
    local = digits;
    candidates.add(`56${digits}`);
    candidates.add(`+56${digits}`);
  }
  if (local.length === 9) {
    candidates.add(`+56 ${local}`);
    candidates.add(`+56 ${local[0]} ${local.slice(1, 5)} ${local.slice(5)}`); // +56 9 1234 5678
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
    // Todas las filas del número, no la primera: quien abandonó un intento y
    // pagó en el segundo tiene una `pendiente` y una `pagado`, y `.limit(1)` sin
    // orden podía devolver la pendiente y negarle el acceso a alguien que pagó.
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .in(PHONE_COLUMN, phoneCandidates(phone))
      .limit(50);

    if (error) {
      console.warn("[advisor] error consultando suscripción:", error.message);
      return false;
    }
    return algunaAsesoriaVigente(data ?? []);
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
    const s = row.status.trim().toLowerCase();
    if (["cancelled", "canceled", "cancelado", "expired", "expirado", "inactive", "inactivo"].includes(s)) {
      return false;
    }
    // Por prefijo, no por igualdad: n8n escribe "Pendiente pago" en `leads`, y
    // con la comparación exacta ese lead sin pagar recibía el tier "oferta".
    if (s.startsWith("pendiente") || s.startsWith("pending")) return false;
  }

  const expiry = row.expires_at ?? row.expiresAt ?? row.valid_until;
  if (expiry) {
    const t = new Date(expiry as string).getTime();
    if (!Number.isNaN(t) && t < Date.now()) return false;
  }

  return true;
}

// ─── Vigencia de la asesoría $4.990 ───────────────────────────────────────────
// La asesoría dura ASESORIA_WINDOW_DAYS (10) días desde el pago. Antes eso solo
// lo usaba el recordatorio del día 9: el gating no vencía nunca, porque
// `advisory_payments` no tiene `expires_at`. Ahora el vencimiento se calcula acá
// y lo usan las dos cosas — el bot y el recordatorio — con la misma regla.
// La vista `asesorias_estado` (scripts/sql/2026-09-24_asesorias_estado.sql)
// replica esta cuenta en SQL para verla en Supabase.

export const ASESORIA_WINDOW_DAYS = Number(process.env.ASESORIA_WINDOW_DAYS ?? 10);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Columna de respaldo si la fila no tiene `paid_at`. Configurable por si el
 * esquema real usa otro nombre. `paid_at` siempre gana: la fila se crea como
 * `pendiente` al llenar el formulario (`created_at`), y la asesoría corre desde
 * que se paga, no desde que se llenó el formulario.
 */
export const ADVISORY_START_FALLBACK = process.env.SUPABASE_SUBSCRIPTION_CREATED_COLUMN ?? "created_at";

/** Cuándo empezó a correr la asesoría: `paid_at`, o la columna de respaldo. */
export function inicioAsesoria(row: Record<string, unknown>): Date | null {
  for (const col of ["paid_at", ADVISORY_START_FALLBACK]) {
    const raw = row[col];
    if (!raw) continue;
    const d = new Date(raw as string);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** Pagada (según `isRowActive`) y dentro de los 10 días. */
export function asesoriaVigente(row: Record<string, unknown>, now = new Date()): boolean {
  if (!isRowActive(row)) return false;
  const inicio = inicioAsesoria(row);
  // Sin fecha no se puede saber si venció: fail-closed, igual que el resto del gating.
  if (!inicio) return false;
  return now.getTime() < inicio.getTime() + ASESORIA_WINDOW_DAYS * DAY_MS;
}

export function algunaAsesoriaVigente(rows: Record<string, unknown>[], now = new Date()): boolean {
  return rows.some((r) => asesoriaVigente(r, now));
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
      .limit(50);
    // Misma razón que en querySubscription: cualquier fila activa basta.
    return (data ?? []).some((row) => isRowActive(row));
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
