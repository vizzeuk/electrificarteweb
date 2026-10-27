// Sitios que sirven su certificado SIN la cadena intermedia (jmcchile.cl, oct-2026). El navegador
// la completa solo: baja el intermedio de la URL "CA Issuers" que trae el propio certificado
// (AIA). Node no lo hace y `fetch` falla con UNABLE_TO_VERIFY_LEAF_SIGNATURE: la validacion lo
// reportaba como "timeout o DNS" y las fotos no se podian bajar.
//
// `fetchConCadena` hace lo mismo que el navegador: si el fetch falla por cadena incompleta, baja
// el intermedio y repite el pedido verificando contra raices + intermedio. La verificacion nunca
// se apaga: lo unico que se lee sin verificar es el certificado publico del servidor, para sacar
// de ahi la URL del intermedio.
import https from "node:https";
import tls from "node:tls";
import { X509Certificate } from "node:crypto";

const CADENA_INCOMPLETA = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_GET_ISSUER_CERT",
]);

/** ¿El error de `fetch` es una cadena de certificados incompleta? */
export function esCadenaIncompleta(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return CADENA_INCOMPLETA.has(err?.cause?.code ?? err?.code ?? "");
}

/** Intermedios por host (PEM). Viven lo que vive la funcion: una por instancia esta bien. */
const intermediosPorHost = new Map<string, Promise<string[]>>();

function certificadoDelServidor(host: string): Promise<tls.PeerCertificate> {
  return new Promise((ok, mal) => {
    // Solo para LEER el certificado publico; no se manda ningun dato por esta conexion.
    const s = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false }, () => {
      ok(s.getPeerCertificate());
      s.end();
    });
    s.setTimeout(10_000, () => s.destroy(new Error("timeout leyendo el certificado")));
    s.on("error", mal);
  });
}

/** La URL del intermedio. `tls` la da como objeto y `X509Certificate` como texto. */
function urlCaIssuers(info: unknown): string | null {
  if (info && typeof info === "object") {
    const v = (info as Record<string, string[] | undefined>)["CA Issuers - URI"];
    return v?.[0] ?? null;
  }
  const m = /CA Issuers - URI:(\S+)/.exec(typeof info === "string" ? info : "");
  return m ? m[1] : null;
}

async function intermedios(host: string): Promise<string[]> {
  const pems: string[] = [];
  let url = urlCaIssuers((await certificadoDelServidor(host)).infoAccess);
  // Hasta 3 niveles: normalmente es uno.
  for (let i = 0; url && i < 3; i++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) break;
    const cert = new X509Certificate(Buffer.from(await res.arrayBuffer()));
    pems.push(cert.toString());
    if (cert.issuer === cert.subject) break;
    url = urlCaIssuers(cert.infoAccess);
  }
  if (!pems.length) throw new Error(`${host} no publica su certificado intermedio`);
  return pems;
}

function intermediosDe(host: string): Promise<string[]> {
  let p = intermediosPorHost.get(host);
  if (!p) {
    p = intermedios(host);
    p.catch(() => intermediosPorHost.delete(host));
    intermediosPorHost.set(host, p);
  }
  return p;
}

/** GET con node:https verificando contra raices + intermedios. Sigue hasta 5 redirects. */
async function getConCa(url: string, init: { headers?: Record<string, string>; timeoutMs: number }, saltos = 0): Promise<{ response: Response; url: string }> {
  const u = new URL(url);
  const ca = [...tls.rootCertificates, ...(await intermediosDe(u.hostname))];
  const res = await new Promise<{ status: number; headers: Headers; cuerpo: Buffer; location?: string }>((ok, mal) => {
    const req = https.get(u, { headers: init.headers, ca, timeout: init.timeoutMs }, (r) => {
      const partes: Buffer[] = [];
      r.on("data", (c: Buffer) => partes.push(c));
      r.on("end", () => {
        const headers = new Headers();
        for (const [k, v] of Object.entries(r.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
        ok({ status: r.statusCode ?? 0, headers, cuerpo: Buffer.concat(partes), location: r.headers.location });
      });
      r.on("error", mal);
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", mal);
  });
  if (res.status >= 300 && res.status < 400 && res.location && saltos < 5) {
    const destino = new URL(res.location, u).href;
    // Un redirect a otro host con su cadena completa vuelve al fetch normal.
    if (new URL(destino).hostname !== u.hostname) return fetchConCadena(destino, init, saltos + 1);
    return getConCa(destino, init, saltos + 1);
  }
  return { response: new Response(new Uint8Array(res.cuerpo), { status: res.status, headers: res.headers }), url };
}

/**
 * `fetch` GET que tolera sitios con la cadena de certificados incompleta. Devuelve la respuesta y
 * la URL final (despues de redirects). Cualquier otro error se propaga igual que `fetch`.
 */
export async function fetchConCadena(
  url: string,
  init: { headers?: Record<string, string>; timeoutMs: number },
  saltos = 0,
): Promise<{ response: Response; url: string }> {
  try {
    const response = await fetch(url, { headers: init.headers, redirect: "follow", signal: AbortSignal.timeout(init.timeoutMs) });
    return { response, url: response.url || url };
  } catch (e) {
    if (!esCadenaIncompleta(e) || saltos > 5) throw e;
    return getConCa(url, init, saltos);
  }
}
