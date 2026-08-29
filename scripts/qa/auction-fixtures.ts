/// <reference types="node" />
/**
 * Fixtures + pipeline compartido para el QA de la subasta inversa.
 * Lo usan el QA narrativo (auction-seed.ts) y el QA automático (auction-e2e.test.ts).
 *
 * Todo lo sembrado queda marcado para poder borrarlo:
 *   - lead:       order_id = QA_LEAD_ORDER
 *   - vendedores: email termina en QA_EMAIL_DOMAIN
 *   - ofertas:    por lead_id del lead falso
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  evaluateOffer,
  rankValidOffers,
  type LeadScoringInput,
  type OfferScoringInput,
  type ScoreResult,
  type VersionMatch,
} from "@/lib/auction/score";
import { cercaniaZona, normalize } from "@/lib/auction/geo";
import { matchVendors, type VendorMatch, type VendorProfile } from "@/lib/auction/routing";
import { getPublishedPrice, getBrandNames, type PublishedPriceResult } from "@/lib/auction/pricing";

export const QA_LEAD_ORDER = "QA_SEED";
export const QA_EMAIL_DOMAIN = "@qa.electrificarte.test";

export const LEAD_FIXTURE = {
  targetModel: "BYD Dolphin",
  region: "Metropolitana de Santiago",
  comuna: "Providencia",
  financing: "credito-convencional",
};

export interface VendorSeed {
  id: string;
  nombre: string;
  region: string;
  comuna: string;
  marcas: string;
  estado: string;
  puja: {
    descuentoPct: number;
    version: VersionMatch;
    horasEntrega: number;
    aceptaFinanciamiento: boolean;
    valorRegalias: number;
    marcaOfertada: string;
    modeloOfertado: string;
    anioOfertado: number;
  };
}

/** 3 vendedores BYD (local/vecina/distante) + 1 Tesla que NO debe rutear. */
export function vendorSeeds(): VendorSeed[] {
  return [
    { id: randomUUID(), nombre: "BYD Providencia", region: "Metropolitana de Santiago", comuna: "Providencia", marcas: "BYD, MG", estado: "activo",
      puja: { descuentoPct: 0.05, version: "exacta", horasEntrega: 48, aceptaFinanciamiento: true, valorRegalias: 0, marcaOfertada: "BYD", modeloOfertado: "Dolphin", anioOfertado: 2025 } },
    { id: randomUUID(), nombre: "BYD Temuco", region: "La Araucanía", comuna: "Temuco", marcas: "BYD", estado: "activo",
      puja: { descuentoPct: 0.07, version: "exacta", horasEntrega: 90, aceptaFinanciamiento: true, valorRegalias: 0, marcaOfertada: "BYD", modeloOfertado: "Dolphin", anioOfertado: 2025 } },
    { id: randomUUID(), nombre: "BYD Viña", region: "Valparaíso", comuna: "Viña del Mar", marcas: "BYD", estado: "activo",
      puja: { descuentoPct: 0.03, version: "variacion_menor", horasEntrega: 60, aceptaFinanciamiento: true, valorRegalias: 350_000, marcaOfertada: "BYD", modeloOfertado: "Dolphin", anioOfertado: 2025 } },
    { id: randomUUID(), nombre: "Tesla Las Condes", region: "Metropolitana de Santiago", comuna: "Las Condes", marcas: "Tesla", estado: "activo",
      puja: { descuentoPct: 0.06, version: "no_coincidente", horasEntrega: 50, aceptaFinanciamiento: true, valorRegalias: 0, marcaOfertada: "Tesla", modeloOfertado: "Model 3", anioOfertado: 2024 } },
  ];
}

export function getSupabaseQA(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function cleanupAuctionQA(sb: SupabaseClient): Promise<number> {
  const { data: qaLeads } = await sb.from("leads").select("id").eq("order_id", QA_LEAD_ORDER);
  const ids = (qaLeads ?? []).map((l) => l.id);
  if (ids.length) await sb.from("ofertas").delete().in("lead_id", ids);
  await sb.from("leads").delete().eq("order_id", QA_LEAD_ORDER);
  await sb.from("leads_vendors").delete().like("email", `%${QA_EMAIL_DOMAIN}`);
  return ids.length;
}

export interface SeedResult {
  leadId: number;
  seeds: VendorSeed[];
}

/** Inserta el lead falso + los vendedores falsos. Idempotente (limpia antes). */
export async function seedAuctionQA(sb: SupabaseClient): Promise<SeedResult> {
  await cleanupAuctionQA(sb);

  const { data: leadRow, error: leadErr } = await sb
    .from("leads")
    .insert({
      first_name: "QA", last_name: "Lead", email: `lead${QA_EMAIL_DOMAIN}`, telefono: "56900000000",
      region: LEAD_FIXTURE.region, comuna: LEAD_FIXTURE.comuna, target_model: LEAD_FIXTURE.targetModel,
      financing: LEAD_FIXTURE.financing, status: "pagado", order_id: QA_LEAD_ORDER,
    })
    .select("id")
    .single();
  if (leadErr) throw new Error(`insert lead: ${leadErr.message}`);

  const seeds = vendorSeeds();
  for (const v of seeds) {
    const { error } = await sb.from("leads_vendors").insert({
      id: v.id, nombre: v.nombre, apellido: "QA",
      email: `${normalize(v.nombre).replace(/\s+/g, ".")}${QA_EMAIL_DOMAIN}`,
      telefono: "56900000001", region: v.region, comuna: v.comuna, marcas: v.marcas,
      estado: v.estado, nombre_concesionario: "QA_FAKE",
    });
    if (error) throw new Error(`insert vendor ${v.nombre}: ${error.message}`);
  }
  return { leadId: leadRow.id as number, seeds };
}

export interface Evaluation {
  seed: VendorSeed;
  offer: OfferScoringInput;
  result: ScoreResult;
}

export interface PipelineResult {
  matches: VendorMatch[];
  priced: PublishedPriceResult;
  leadScoring: LeadScoringInput;
  evaluations: Evaluation[]; // solo vendedores elegibles
  ranked: ReturnType<typeof rankValidOffers>;
}

/** Corre ruteo → precio → evaluación (persiste en `ofertas`) → ranking.
 *  No genera mensajes (eso lo hace cada caller). Devuelve todo estructurado. */
export async function runAuctionPipeline(sb: SupabaseClient, seeded: SeedResult): Promise<PipelineResult> {
  const { leadId, seeds } = seeded;

  const brands = await getBrandNames();
  const vendorProfiles: VendorProfile[] = seeds.map((v) => ({
    id: v.id, nombre: v.nombre, region: v.region, comuna: v.comuna, marcas: v.marcas, estado: v.estado,
  }));
  const matches = matchVendors(
    { region: LEAD_FIXTURE.region, comuna: LEAD_FIXTURE.comuna, targetModel: LEAD_FIXTURE.targetModel },
    vendorProfiles,
    { knownBrands: brands },
  );

  const priced = await getPublishedPrice(LEAD_FIXTURE.targetModel);
  if (!priced) throw new Error("No se pudo resolver P_publicado del target_model");
  const P = priced.precioPublicado;

  const leadScoring: LeadScoringInput = { precioPublicado: P, requiereFinanciamiento: true, financiamientoObligatorio: true };
  const elegibles = seeds.filter((s) => matches.find((m) => m.vendor.id === s.id)?.elegible);

  const evaluations: Evaluation[] = [];
  for (const v of elegibles) {
    const precio = Math.round(P * (1 - v.puja.descuentoPct));
    const cercania = cercaniaZona(LEAD_FIXTURE.region, LEAD_FIXTURE.comuna, v.region, v.comuna);
    const offer: OfferScoringInput = {
      precio, horasEntrega: v.puja.horasEntrega, version: v.puja.version, cercania,
      aceptaFinanciamiento: v.puja.aceptaFinanciamiento, valorRegalias: v.puja.valorRegalias, oferenteVerificado: true,
    };
    const result = evaluateOffer(leadScoring, offer);
    const { error } = await sb.from("ofertas").insert({
      lead_id: leadId, vendor_id: v.id, precio_oferta: precio, horas_entrega: v.puja.horasEntrega,
      version_match: v.puja.version, cercania_zona: cercania, acepta_financiamiento: v.puja.aceptaFinanciamiento,
      valor_regalias: v.puja.valorRegalias, precio_publicado: P, marca_ofertada: v.puja.marcaOfertada,
      modelo_ofertado: v.puja.modeloOfertado, anio_ofertado: v.puja.anioOfertado,
      score_total: result.status === "VALIDA" ? result.scoreTotal : null,
      score_desglose: result.status === "VALIDA" ? result.desglose : null,
      descalificada: result.status === "DESCALIFICADA",
      motivo_descalificacion: result.status === "DESCALIFICADA" ? result.motivo : null,
      alertas: result.status === "VALIDA" ? result.alertas : null,
      estado: result.status === "VALIDA" ? "evaluada" : "perdida",
    });
    if (error) throw new Error(`insert oferta ${v.nombre}: ${error.message}`);
    evaluations.push({ seed: v, offer, result });
  }

  const ranked = rankValidOffers(
    leadScoring,
    evaluations.map((e) => e.offer),
  );

  return { matches, priced, leadScoring, evaluations, ranked };
}
