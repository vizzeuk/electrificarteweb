// Utilidades compartidas por las herramientas del extractor. El cerco de dominio (R2) vive aca:
// el runner fija PDP_HOST por corrida y ninguna herramienta lee fuera de ese host.
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

export async function bajar(url: string): Promise<{ final: string; tipo: string; cuerpo: ArrayBuffer; status: number }> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, "accept-language": "es-CL,es;q=0.9" },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  return { final: res.url, tipo: res.headers.get("content-type") ?? "", cuerpo: await res.arrayBuffer(), status: res.status };
}

export function recortar(texto: string): string {
  return texto.length > MAX_CHARS ? `${texto.slice(0, MAX_CHARS)}\n\n[recortado: la pagina sigue]` : texto;
}
