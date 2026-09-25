/**
 * Piezas compartidas por los endpoints del re-check (docs/FLUJO-PDP-N8N.md §2.3).
 *
 * Los tres endpoints los llama n8n con `x-admin-secret`, igual que los de la
 * subasta (app/api/auction/*). n8n orquesta el lote; la lógica vive acá.
 */

import { createClient } from "@sanity/client";
import type { NextRequest } from "next/server";

export type SanityWriteClient = ReturnType<typeof createClient>;

/** Fail-closed: sin secreto configurado, nadie entra. */
export function authorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  return Boolean(secret) && req.headers.get("x-admin-secret") === secret;
}

export function sanityWrite(): SanityWriteClient | null {
  const token = process.env.SANITY_API_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!token || !projectId) return null;
  return createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2025-01-01",
    token,
    useCdn: false,
  });
}

/**
 * Cuántos autos entran en cada corrida. 4 corridas/día × 7 días = 28 lotes; el
 * lote es techo(publicados / 28), así que la cobertura semanal es completa sin
 * que ningún auto se revise dos veces.
 */
export const SLOTS_PER_WEEK = 28;

/** Un auto no se revisa dos veces en la misma semana (C14). */
export const MIN_DAYS_BETWEEN_CHECKS = 5;

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
