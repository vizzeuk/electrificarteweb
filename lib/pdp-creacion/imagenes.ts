// Bajada y subida de las fotos que el agente encontro en la fuente.
//
// El board (R7) pide UNA foto automatica y galeria manual, para no cargar
// assets no verificados. Acá se suben varias, con la misma procedencia que la
// portada —la pagina oficial de la marca— y con guardas duras, porque el modo de
// falla real no es legal: es que la "galeria" termine siendo ocho banners de
// campana y un logo, y alguien tenga que borrarlos a mano uno por uno.
//
// `PDP_GALERIA_MAX=0` vuelve al comportamiento del board (solo portada).
import { createHash } from "node:crypto";
import type { SanityWriteClient } from "./sanity";

/** Menos que esto es un icono, un placeholder o un sprite, no una foto de un auto. */
const MIN_BYTES = 25_000;
/** Mas que esto es un TIFF o un render sin comprimir: no entra en una PDP. */
const MAX_BYTES = 12_000_000;
const TIMEOUT_MS = 20_000;
const UA = "Mozilla/5.0 (compatible; ElectrificarteBot/1.0)";

export function maxGaleria(): number {
  const n = Number(process.env.PDP_GALERIA_MAX ?? 6);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 8) : 6;
}

export interface FotoSubida {
  assetId: string;
  url: string;
  alt: string;
}

export interface ResultadoFotos {
  portada: FotoSubida | null;
  galeria: FotoSubida[];
  /** Por que cada URL descartada no entro. Va al mensaje de WhatsApp. */
  descartes: string[];
  problemaPortada: string | null;
}

interface Bajada {
  buf: Buffer;
  sha: string;
}

/** Baja una imagen y la valida. Reintenta una vez: un hipo de red no es un "no hay foto". */
async function bajar(url: string): Promise<{ ok: true; data: Bajada } | { ok: false; motivo: string }> {
  if (!/^https:\/\//i.test(url)) return { ok: false, motivo: "no es https" };

  let ultimo = "sin respuesta";
  for (let intento = 0; intento < 2; intento++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) { ultimo = `responde ${res.status}`; continue; }

      const tipo = (res.headers.get("content-type") ?? "").toLowerCase();
      // Una pagina de error que devuelve 200 con HTML es el falso positivo mas
      // comun: pasa el status y despues Sanity guarda un asset roto.
      if (!tipo.startsWith("image/")) return { ok: false, motivo: `no es una imagen (${tipo || "sin content-type"})` };
      if (tipo.includes("svg")) return { ok: false, motivo: "es un SVG (casi siempre un logo o un icono)" };

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < MIN_BYTES) return { ok: false, motivo: `pesa ${Math.round(buf.byteLength / 1024)} kB` };
      if (buf.byteLength > MAX_BYTES) return { ok: false, motivo: `pesa ${Math.round(buf.byteLength / 1024 / 1024)} MB` };

      return { ok: true, data: { buf, sha: createHash("sha256").update(buf).digest("hex") } };
    } catch (e) {
      ultimo = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, motivo: ultimo };
}

function nombreDe(url: string): string {
  return decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? "foto.jpg") || "foto.jpg";
}

/**
 * Sube portada y galeria.
 *
 * **En paralelo, y con presupuesto de reloj.** Esto corre dentro de
 * `/api/admin/pdp/cerrar`, que es una funcion de Vercel: 60 s duros. Que n8n no
 * tenga limite no ayuda acá — lo que n8n se ahorra es *esperar* al agente, no
 * este trabajo. Siete fotos bajadas y subidas de a una son 15–30 s, que sumados
 * al resto del endpoint se pasan del corte, y el corte de Vercel no avisa: la
 * PDP queda creada a medias y n8n ve un 504.
 *
 * Deduplica por contenido, no por URL: las marcas sirven la misma foto en varias
 * rutas (CDN, tamanos, query strings), y sin esto la galeria sale con la misma
 * imagen tres veces. El dedup corre DESPUES de bajar todo, en el orden original,
 * para que el resultado no dependa de cual descarga termino primero.
 */
export async function subirFotos(
  sanity: SanityWriteClient,
  portadaUrl: string | undefined,
  galeria: { url: string; descripcion?: string }[] | undefined,
  nombreAuto: string,
  hostFuente: string,
  presupuestoMs = 30_000,
): Promise<ResultadoFotos> {
  const t0 = Date.now();
  const descartes: string[] = [];
  const tope = maxGaleria();

  const candidatas = (galeria ?? []).slice(0, 8).filter((f) => {
    // Misma regla que web_fetch: la foto sale de la fuente, no de cualquier lado.
    let host = "";
    try { host = new URL(f.url).hostname.replace(/^www\./, ""); } catch { /* url basura */ }
    if (!host || (host !== hostFuente && !host.endsWith(`.${hostFuente}`))) {
      descartes.push(`${nombreDe(f.url)}: no es del dominio de la fuente`);
      return false;
    }
    return true;
  });

  // Se bajan mas de las que entran: algunas se van a caer por peso o content-type
  // y no queremos una segunda vuelta de red para reponerlas.
  const aBajar = [
    ...(portadaUrl ? [{ url: portadaUrl, alt: nombreAuto, esPortada: true }] : []),
    ...candidatas.slice(0, tope + 2).map((f) => ({
      url: f.url,
      alt: f.descripcion?.trim() || nombreAuto,
      esPortada: false,
    })),
  ];

  const bajadas = await Promise.all(
    aBajar.map(async (f) => ({ ...f, r: await bajar(f.url) })),
  );

  // Dedup en el orden original, con la portada primero.
  const vistos = new Set<string>();
  const aSubir: { url: string; alt: string; esPortada: boolean; data: Bajada }[] = [];
  let problemaPortada: string | null = portadaUrl ? null : "el agente no encontro una foto usable";

  for (const f of bajadas) {
    if (!f.r.ok) {
      if (f.esPortada) problemaPortada = f.r.motivo;
      else descartes.push(`${nombreDe(f.url)}: ${f.r.motivo}`);
      continue;
    }
    if (vistos.has(f.r.data.sha)) {
      if (!f.esPortada) descartes.push(`${nombreDe(f.url)}: es la misma foto que otra ya subida`);
      continue;
    }
    vistos.add(f.r.data.sha);
    if (!f.esPortada && aSubir.filter((x) => !x.esPortada).length >= tope) continue;
    aSubir.push({ url: f.url, alt: f.alt, esPortada: f.esPortada, data: f.r.data });
  }

  const restante = presupuestoMs - (Date.now() - t0);
  if (restante < 5_000 && aSubir.length > 1) {
    // Bajar ya se comio el presupuesto. Se sube la portada y nada mas: mejor una
    // PDP con portada que un 504 a mitad de la escritura.
    const sobran = aSubir.splice(1);
    descartes.push(`${sobran.length} foto(s) sin subir: se agoto el tiempo del endpoint`);
  }

  const subidas = await Promise.all(
    aSubir.map(async (f) => {
      try {
        const asset = await sanity.assets.upload("image", f.data.buf, { filename: nombreDe(f.url) });
        return { ok: true as const, foto: { assetId: asset._id, url: asset.url, alt: f.alt }, esPortada: f.esPortada };
      } catch (e) {
        return { ok: false as const, url: f.url, esPortada: f.esPortada, motivo: e instanceof Error ? e.message : String(e) };
      }
    }),
  );

  let portada: FotoSubida | null = null;
  const galeriaFinal: FotoSubida[] = [];
  for (const r of subidas) {
    if (!r.ok) {
      if (r.esPortada) problemaPortada = `no se pudo subir la foto (${r.motivo})`;
      else descartes.push(`${nombreDe(r.url)}: no se pudo subir (${r.motivo})`);
      continue;
    }
    if (r.esPortada) portada = r.foto;
    else galeriaFinal.push(r.foto);
  }

  // Si la portada fallo pero la galeria trajo algo, la primera pasa a portada.
  // El caso real: el agente eligio un banner que devuelve 404 mientras las seis
  // fotos del carrusel estaban perfectas — y la PDP salia sin foto principal.
  if (!portada && galeriaFinal.length) {
    portada = galeriaFinal.shift()!;
    problemaPortada = problemaPortada
      ? `${problemaPortada} — se uso la primera de la galeria en su lugar`
      : null;
  }

  return { portada, galeria: galeriaFinal, descartes, problemaPortada };
}

/** Los campos `mainImage` y `gallery[]` del documento de Sanity. */
export function camposDeImagen(r: ResultadoFotos, nombreAuto: string) {
  const img = (f: FotoSubida, key: string, caption?: string) => ({
    _type: "image" as const,
    _key: key,
    asset: { _type: "reference" as const, _ref: f.assetId },
    alt: f.alt,
    ...(caption ? { caption } : {}),
  });

  const gallery = [
    ...(r.portada ? [img(r.portada, "portada", "Portada oficial")] : []),
    ...r.galeria.map((f, i) => img(f, `g${i}`)),
  ];

  return {
    mainImage: r.portada
      ? { _type: "image", asset: { _type: "reference", _ref: r.portada.assetId }, alt: nombreAuto }
      : undefined,
    gallery: gallery.length ? gallery : undefined,
  };
}
