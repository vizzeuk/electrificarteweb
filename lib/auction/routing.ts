/**
 * Ruteo de un lead a los vendedores con características parecidas.
 *
 * Decisión de negocio: no hay portal/pool. El lead se manda DIRECTO a los
 * vendedores cuyo perfil calza — misma marca del auto buscado y cercanía
 * geográfica. La marca es el filtro duro (un vendedor solo puede ofertar lo que
 * maneja); la cercanía ordena (un vendedor lejano igual podría despachar, así
 * que no descalifica, solo baja en el ranking).
 *
 * El perfil del vendedor sale de `leads_vendors` (region, comuna, marcas, estado).
 */

import type { CercaniaZona } from "@/lib/auction/score";
import { cercaniaZona, normalize } from "@/lib/auction/geo";

export interface VendorProfile {
  id: string;
  nombre?: string | null;
  region?: string | null;
  comuna?: string | null;
  /** Marcas que maneja el vendedor (texto libre: "BYD, Tesla", "byd"...). */
  marcas?: string | null;
  estado?: string | null;
  /** Financiamientos que acepta (mismos valores que leads.financing, separados por coma). */
  financiamientos?: string | null;
}

export interface LeadForRouting {
  region?: string | null;
  comuna?: string | null;
  targetModel: string;
  /** Financiamiento que busca el lead (contado | credito-convencional | credito-inteligente | no-seguro). */
  financing?: string | null;
}

/**
 * ¿El vendedor acepta el financiamiento que busca el lead? Degrada con gracia:
 * - Si el lead no tiene requisito concreto (contado / no-seguro / vacío) → true.
 * - Si el vendedor aún no declaró sus financiamientos (dato de la web de
 *   vendedores, hoy puede estar vacío) → true (no filtra hasta tener el dato).
 * - Si no, el lead.financing debe estar en la lista del vendedor.
 */
export function vendorAcceptsFinancing(leadFinancing?: string | null, vendorFinanciamientos?: string | null): boolean {
  const lead = normalize(leadFinancing);
  if (lead === "" || lead === "no-seguro" || lead === "contado") return true;
  const vend = normalize(vendorFinanciamientos);
  if (vend === "") return true;
  return vend.includes(lead);
}

export interface VendorMatch {
  vendor: VendorProfile;
  /** El vendedor maneja la marca del auto buscado. */
  brandMatch: boolean;
  /** El vendedor está activo (no suspendido/dado de baja). */
  activo: boolean;
  /** El vendedor acepta el financiamiento que busca el lead. */
  financiamientoOk: boolean;
  cercania: CercaniaZona;
  /** Recibe el lead: activo + marca calza + financiamiento calza. */
  elegible: boolean;
  motivos: string[];
}

// Estados que NO reciben leads. El resto se considera activo (tolerante, porque
// los estados reales de leads_vendors aún no están estandarizados).
const ESTADOS_INACTIVOS = new Set(["suspendido", "inactivo", "baja", "rechazado", "eliminado"]);

const CERCANIA_RANK: Record<CercaniaZona, number> = {
  local: 0,
  regional: 1,
  vecina: 2,
  distante: 3,
};

/** Detecta la marca del target_model: la primera marca conocida que aparezca en
 *  el texto; si no hay lista de marcas, cae al primer token. */
export function detectBrand(targetModel: string, knownBrands?: string[]): string | null {
  const t = normalize(targetModel);
  if (!t) return null;
  if (knownBrands && knownBrands.length > 0) {
    // Preferir el match más largo (ej. "Great Wall" sobre "Wall").
    const hit = [...knownBrands]
      .map((b) => normalize(b))
      .filter((b) => b && t.includes(b))
      .sort((a, b) => b.length - a.length)[0];
    if (hit) return hit;
  }
  return t.split(/\s+/)[0] ?? null;
}

/** Rankea los vendedores para un lead. Devuelve TODOS (con `elegible`) para que
 *  el QA vea también los que no calzan; los elegibles van primero, ordenados por
 *  cercanía. */
export function matchVendors(
  lead: LeadForRouting,
  vendors: VendorProfile[],
  opts: { knownBrands?: string[] } = {},
): VendorMatch[] {
  const brand = detectBrand(lead.targetModel, opts.knownBrands);

  const matches: VendorMatch[] = vendors.map((vendor) => {
    const activo = !ESTADOS_INACTIVOS.has(normalize(vendor.estado));
    const marcas = normalize(vendor.marcas);
    const brandMatch = brand != null && marcas !== "" && marcas.includes(brand);
    const cercania = cercaniaZona(lead.region, lead.comuna, vendor.region, vendor.comuna);
    const financiamientoOk = vendorAcceptsFinancing(lead.financing, vendor.financiamientos);
    const elegible = activo && brandMatch && financiamientoOk;

    const motivos: string[] = [];
    if (!activo) motivos.push(`vendedor no activo (estado: ${vendor.estado ?? "—"})`);
    if (!brandMatch) {
      motivos.push(
        brand == null
          ? "no se pudo detectar la marca del auto buscado"
          : `no maneja la marca "${brand}" (marcas: ${vendor.marcas ?? "—"})`,
      );
    }
    if (!financiamientoOk) motivos.push(`no acepta el financiamiento del lead (${lead.financing})`);
    if (elegible) motivos.push(`calza marca + financiamiento + cercanía ${cercania}`);

    return { vendor, brandMatch, activo, financiamientoOk, cercania, elegible, motivos };
  });

  return matches.sort((a, b) => {
    if (a.elegible !== b.elegible) return a.elegible ? -1 : 1;
    return CERCANIA_RANK[a.cercania] - CERCANIA_RANK[b.cercania];
  });
}
