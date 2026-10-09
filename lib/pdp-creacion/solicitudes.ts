// Flujo v2: la cola de PDPs por crear vive en Supabase (`pdp_solicitudes`), no
// en el Sheet. El panel crea la solicitud, n8n la toma y la web escribe el
// resultado en la misma fila. Ver docs/DASHBOARD_PDP_CREACION.md.
//
// Solo la web toca la tabla (service_role). n8n y el panel hablan por
// /api/admin/pdp/* con `x-admin-secret`: ninguno de los dos necesita una key de
// Supabase para este flujo.
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseVersiones, type FilaSheet, type VersionDeclarada } from "./encargo";
import { n8nHeaders } from "@/lib/n8n";

export const TABLA = "pdp_solicitudes";

export const ESTADOS_ACTIVOS = ["listo", "en cola", "procesando"] as const;
export const ESTADOS_FINALES = ["listo_para_revisar", "borrador_incompleto", "sin_datos", "rechazada", "error"] as const;
export type EstadoSolicitud = (typeof ESTADOS_ACTIVOS)[number] | (typeof ESTADOS_FINALES)[number];

/** Desde cuándo una fila "en cola"/"procesando" se considera trabada y se puede reintentar. */
export const MINUTOS_TRABADA = 30;

export interface Solicitud {
  id: string;
  created_at: string;
  updated_at: string;
  creado_por: string | null;
  marca: string;
  modelo: string;
  /** null = no declarado (opcional desde oct-2026). */
  anio: number | null;
  tipo: string;
  electrificacion: string;
  /** null = buscar en el sitio oficial de la marca. */
  url_oficial: string | null;
  /** [] = sin versiones declaradas: el precio sale de la fuente, con cita. */
  versiones: VersionDeclarada[];
  slug: string;
  estado: EstadoSolicitud;
  detalle: string | null;
  mensaje: string | null;
  session_id: string | null;
  car_id: string | null;
  studio_url: string | null;
  lote: string | null;
  costo_usd: number | null;
  intentos: number;
  tomada_at: string | null;
  terminada_at: string | null;
}

/** Lo que manda el formulario del panel. */
export interface EntradaPanel {
  marca?: unknown;
  modelo?: unknown;
  anio?: unknown;
  tipo?: unknown;
  electrificacion?: unknown;
  url_oficial?: unknown;
  versiones?: unknown;
  creado_por?: unknown;
}

const txt = (v: unknown) => String(v ?? "").trim();
/** Año opcional: vacio, 0 o basura → null (la validacion rechaza los fuera de rango). */
const anioOpcional = (v: unknown) => (txt(v) === "" || Number(v) === 0 ? null : Number(v));

/**
 * Formulario → fila del flujo. No valida contra Sanity (eso es `validarFila`):
 * solo normaliza tipos para que la validación reciba lo mismo que mandaba el
 * Sheet. Las versiones llegan como arreglo; si alguna no parsea, el error sale
 * de `validarFila` con el mismo texto que vería n8n.
 */
export function filaDesdeEntrada(e: EntradaPanel): FilaSheet {
  const versiones = Array.isArray(e.versiones)
    ? (e.versiones as { nombre?: unknown; precio?: unknown }[]).map((v) => ({
        nombre: txt(v?.nombre),
        precio: Number(String(v?.precio ?? "").replace(/[^\d]/g, "")),
      }))
    : txt(e.versiones);
  return {
    marca: txt(e.marca),
    modelo: txt(e.modelo),
    anio: anioOpcional(e.anio),
    tipo: txt(e.tipo),
    electrificacion: txt(e.electrificacion).toUpperCase(),
    url_oficial: txt(e.url_oficial) || null,
    versiones: versiones ?? [],
  };
}

/** Fila de Supabase → fila del flujo (lo que reciben `iniciar` y `cerrar`). */
export function filaDeSolicitud(s: Pick<Solicitud, "marca" | "modelo" | "anio" | "tipo" | "electrificacion" | "url_oficial" | "versiones">): FilaSheet {
  return {
    marca: s.marca,
    modelo: s.modelo,
    anio: anioOpcional(s.anio),
    tipo: s.tipo,
    electrificacion: s.electrificacion,
    url_oficial: s.url_oficial || null,
    versiones: s.versiones ?? [],
  };
}

/** ¿Se puede volver a poner en "listo"? Finales con falla, o activas trabadas. */
export function sePuedeReintentar(s: Pick<Solicitud, "estado" | "updated_at">, ahora = Date.now()): boolean {
  if (s.estado === "error" || s.estado === "sin_datos" || s.estado === "rechazada") return true;
  if (s.estado === "en cola" || s.estado === "procesando") {
    return ahora - new Date(s.updated_at).getTime() > MINUTOS_TRABADA * 60_000;
  }
  return false;
}

// ─── Supabase ────────────────────────────────────────────────────────────────

/** Código de Postgres para violación de unique: hay otra solicitud activa del mismo auto. */
const UNIQUE_VIOLATION = "23505";

export type ResultadoCrear =
  | { ok: true; solicitud: Solicitud }
  | { ok: false; duplicada: true; error: string };

export async function crearSolicitud(
  sb: SupabaseClient,
  fila: FilaSheet,
  slug: string,
  creadoPor: string | null,
): Promise<ResultadoCrear> {
  const { data, error } = await sb
    .from(TABLA)
    .insert({
      marca: fila.marca,
      modelo: fila.modelo,
      anio: Number(fila.anio) || null,
      tipo: fila.tipo,
      electrificacion: fila.electrificacion,
      url_oficial: fila.url_oficial || null,
      versiones: parseVersiones(fila.versiones),
      slug,
      creado_por: creadoPor,
      estado: "listo",
    })
    .select("*")
    .single();
  if (error?.code === UNIQUE_VIOLATION) {
    return { ok: false, duplicada: true, error: `Ya hay una solicitud en curso para "${slug}"` };
  }
  if (error || !data) throw new Error(error?.message ?? "no se pudo crear la solicitud");
  return { ok: true, solicitud: data as Solicitud };
}

export async function cargarSolicitud(sb: SupabaseClient, id: string): Promise<Solicitud | null> {
  const { data, error } = await sb.from(TABLA).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Solicitud | null) ?? null;
}

export async function listarSolicitudes(
  sb: SupabaseClient,
  opts: { estado?: string; limit?: number } = {},
): Promise<Solicitud[]> {
  let q = sb.from(TABLA).select("*").order("created_at", { ascending: false }).limit(Math.min(opts.limit ?? 50, 200));
  if (opts.estado) q = q.eq("estado", opts.estado);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Solicitud[];
}

/** Reserva atómica (RPC con `for update skip locked`, ver el .sql). */
export async function reservarSolicitudes(sb: SupabaseClient, n: number): Promise<Solicitud[]> {
  const { data, error } = await sb.rpc("reservar_pdp_solicitudes", { n });
  if (error) throw new Error(error.message);
  return (data ?? []) as Solicitud[];
}

export type CambiosSolicitud = Partial<Omit<Solicitud, "id" | "created_at" | "updated_at">>;

export async function actualizarSolicitud(sb: SupabaseClient, id: string, cambios: CambiosSolicitud): Promise<void> {
  const { error } = await sb.from(TABLA).update(cambios).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Escribe el resultado sin que un fallo de Supabase tumbe el request: para
 * `cerrar`, el borrador en Sanity ya está creado y lo importante es devolverle
 * el mensaje a n8n. El fallo queda en el log de Vercel.
 */
export async function anotarSolicitud(sb: SupabaseClient | null, id: string | undefined, cambios: CambiosSolicitud): Promise<void> {
  if (!sb || !id) return;
  try {
    await actualizarSolicitud(sb, id, cambios);
  } catch (e) {
    console.warn(`[pdp_solicitudes] no se pudo anotar ${id}:`, e instanceof Error ? e.message : e);
  }
}

/**
 * Despierta al workflow de n8n para que no espere al cron. Best-effort: si n8n
 * no contesta, el cron de 15 min la toma igual. La reserva es atómica, así que
 * el aviso y el cron nunca procesan la misma fila.
 */
export async function despertarFlujo(): Promise<boolean> {
  const url = process.env.N8N_PDP_CREACION_URL;
  if (!url) return false;
  try {
    // Mismo header que el resto de los webhooks de la web (docs/N8N-SEGURIDAD.md).
    const res = await fetch(url, {
      method: "POST",
      headers: n8nHeaders(),
      body: "{}",
      signal: AbortSignal.timeout(4_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
