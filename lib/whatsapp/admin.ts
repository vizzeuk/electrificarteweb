import { normalizePhone } from "@/lib/whatsapp/subscription";

// ─── Allowlist del modo administrador (Fase 1.2, Flujo A / M3) ────────────────
// El modo administrador nunca se activa por contenido del mensaje, solo por
// número emisor verificado — ver CLAUDE.md / docs/HANDOFF.md sección 5.
// ADMIN_PHONE_NUMBERS: lista separada por comas, cualquier formato (+56912345678,
// 56912345678, 912345678) — se normaliza igual que el resto de los números.

const ADMIN_PHONES = new Set(
  (process.env.ADMIN_PHONE_NUMBERS ?? "")
    .split(",")
    .map((p) => normalizePhone(p.trim()))
    .filter(Boolean),
);

export function isAdminPhone(phone: string): boolean {
  if (ADMIN_PHONES.size === 0) return false;
  return ADMIN_PHONES.has(normalizePhone(phone));
}

/** Lista de números admin normalizados — para envíos proactivos (ej. digest semanal de M4). */
export function adminPhones(): string[] {
  return [...ADMIN_PHONES];
}
