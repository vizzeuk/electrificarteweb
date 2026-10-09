/**
 * GET /api/admin/pdp/opciones — las opciones de los selects del formulario de
 * creación de PDP en el panel (docs/DASHBOARD_PDP_CREACION.md).
 *
 * Devuelve EXACTAMENTE los valores con los que `validarFila` busca las
 * referencias en Sanity (nombre de marca, label del tipo, tag de la
 * electrificación). Así un valor elegido en el select nunca rebota con "no
 * existe en Sanity".
 *
 * Auth: header `x-admin-secret`.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { sanityCreacion } from "@/lib/pdp-creacion/sanity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Opciones {
  marcas: { valor: string; slug: string; sitio: string | null }[];
  tipos: { valor: string; slug: string }[];
  electrificaciones: { valor: string; nombre: string }[];
}

export async function GET(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sanity = sanityCreacion();
  if (!sanity) return NextResponse.json({ error: "Sanity no configurado" }, { status: 500 });

  const fetchOpciones = sanity.fetch.bind(sanity) as (q: string) => Promise<Opciones>;
  const opciones = await fetchOpciones(`{
    "marcas": *[_type == "brand" && defined(name) && !(_id in path("drafts.**"))] | order(name asc) {
      "valor": name, "slug": slug.current, "sitio": website
    },
    "tipos": *[_type == "vehicleType" && !(_id in path("drafts.**"))] | order(coalesce(label, name) asc) {
      "valor": coalesce(label, name), "slug": slug.current
    },
    "electrificaciones": *[_type == "electricType" && defined(tag) && !(_id in path("drafts.**"))] | order(navbarOrder asc) {
      "valor": upper(tag), "nombre": coalesce(label, name, tag)
    }
  }`);

  return NextResponse.json({ ...opciones, anioMin: 2015, anioMax: new Date().getFullYear() + 2 });
}
