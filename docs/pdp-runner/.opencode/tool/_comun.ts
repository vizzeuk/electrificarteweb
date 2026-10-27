// Utilidades compartidas por las herramientas del extractor. El cerco de dominio (R2) vive aca:
// el runner fija PDP_HOST por corrida y ninguna herramienta lee fuera de ese host.
import { appendFileSync } from "node:fs";
import TurndownService from "turndown";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
export const MAX_CHARS = 150_000;

const sinWww = (h: string) => h.toLowerCase().replace(/^www\./, "");

/** true si `url` es del host del encargo (o un subdominio suyo). */
export function dentroDelCerco(url: string): boolean {
  const host = sinWww(process.env.PDP_HOST ?? "");
  if (!host) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = sinWww(u.hostname);
    return h === host || h.endsWith(`.${host}`);
  } catch {
    return false;
  }
}

export function fueraDelCerco(url: string): string {
  return `Rechazado: ${url} no es del dominio ${process.env.PDP_HOST}. R2: una sola fuente, solo ese dominio.`;
}

const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
td.remove(["script", "style", "noscript", "svg", "iframe"] as never);

export function htmlAMarkdown(html: string, base: string): string {
  // Los datos estructurados que algunas marcas embeben (JSON-LD, __NEXT_DATA__) suelen traer
  // specs y precios que el HTML visible pinta con JS: se rescatan antes de limpiar.
  const datos: string[] = [];
  for (const m of html.matchAll(/<script[^>]+(?:application\/ld\+json|id="__NEXT_DATA__"|id="__NUXT_DATA__")[^>]*>([\s\S]*?)<\/script>/gi)) {
    datos.push(m[1].trim().slice(0, 20_000));
  }
  let md = td.turndown(html);
  // Links relativos → absolutos, para poder navegar el sitio.
  md = md.replace(/\]\((\/[^)\s]*)/g, (_m, p) => `](${new URL(p, base).href}`);
  md = md.replace(/\n{3,}/g, "\n\n");
  if (datos.length) md += `\n\n--- DATOS ESTRUCTURADOS DE LA PAGINA ---\n${datos.join("\n\n")}`;
  return md;
}

export async function pdfATexto(buf: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).map((t, i) => `--- pagina ${i + 1} ---\n${t}`).join("\n");
}

// Sitios con la cadena de certificados incompleta (jmcchile.cl): el navegador baja el intermedio
// de la URL "CA Issuers" del certificado (AIA) y Bun no. Se hace lo mismo y se repite el pedido
// verificando contra raices + intermedio: la verificacion nunca se apaga. Igual que
// lib/http/fetch-cadena.ts en la web.
const CADENA_INCOMPLETA = /UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT|unable to verify the first certificate|unable to get local issuer/i;
const intermediosPorHost = new Map<string, Promise<string[]>>();

function caIssuers(info: unknown): string | null {
  if (info && typeof info === "object") return (info as Record<string, string[] | undefined>)["CA Issuers - URI"]?.[0] ?? null;
  const m = /CA Issuers - URI:(\S+)/.exec(typeof info === "string" ? info : "");
  return m ? m[1] : null;
}

async function intermedios(host: string): Promise<string[]> {
  const tls = await import("node:tls");
  const { X509Certificate } = await import("node:crypto");
  // Solo para LEER el certificado publico; no se manda nada por esta conexion.
  const hoja = await new Promise<{ infoAccess?: unknown }>((ok, mal) => {
    const s = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false }, () => {
      ok(s.getPeerCertificate() as { infoAccess?: unknown });
      s.end();
    });
    s.setTimeout(10_000, () => s.destroy(new Error("timeout leyendo el certificado")));
    s.on("error", mal);
  });
  const pems: string[] = [];
  let url = caIssuers(hoja.infoAccess);
  for (let i = 0; url && i < 3; i++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) break;
    const cert = new X509Certificate(Buffer.from(await res.arrayBuffer()));
    pems.push(cert.toString());
    if (cert.issuer === cert.subject) break;
    url = caIssuers(cert.infoAccess);
  }
  if (!pems.length) throw new Error(`${host} no publica su certificado intermedio`);
  return pems;
}

export async function bajar(url: string): Promise<{ final: string; tipo: string; cuerpo: ArrayBuffer; status: number }> {
  const init = {
    headers: { "user-agent": UA, "accept-language": "es-CL,es;q=0.9" },
    redirect: "follow" as const,
    signal: AbortSignal.timeout(30_000),
  };
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (!CADENA_INCOMPLETA.test(`${err?.code ?? ""} ${err?.message ?? ""}`)) throw e;
    const host = new URL(url).hostname;
    let p = intermediosPorHost.get(host);
    if (!p) { p = intermedios(host); intermediosPorHost.set(host, p); p.catch(() => intermediosPorHost.delete(host)); }
    const { rootCertificates } = await import("node:tls");
    // `tls.ca` es de Bun: reemplaza las raices, por eso van las de siempre + los intermedios.
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000), tls: { ca: [...rootCertificates, ...(await p)] } } as RequestInit);
  }
  return { final: res.url || url, tipo: res.headers.get("content-type") ?? "", cuerpo: await res.arrayBuffer(), status: res.status };
}

/**
 * Guarda lo que leyo el agente junto a su entrega (PDP_OUT + ".paginas.txt"). La web lo usa para
 * confirmar que una cifra que va a escribir sola esta de verdad en la pagina: la varianza del
 * modelo no puede inventar un numero que el texto no tiene.
 */
export function anotarPagina(url: string, texto: string): void {
  const out = process.env.PDP_OUT;
  if (!out) return;
  try {
    appendFileSync(`${out}.paginas.txt`, `\n\n=== ${url} ===\n${texto.slice(0, 120_000)}`);
  } catch {
    // no fatal
  }
}

export function recortar(texto: string): string {
  return texto.length > MAX_CHARS ? `${texto.slice(0, MAX_CHARS)}\n\n[recortado: la pagina sigue]` : texto;
}
