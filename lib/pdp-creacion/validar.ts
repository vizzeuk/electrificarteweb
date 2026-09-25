// Paso 5 del diagrama v2: "Valida sin IA: URL viva, refs existen, slug libre,
// precios mayores a 0".
//
// Es lo UNICO que impide crear (junto al slug duplicado, R8). Todo lo demas —
// specs incompletas, textos flojos — deja igual un borrador oculto: el umbral
// decide el mensaje, no si se crea.
import type { SanityWriteClient } from "./sanity";
import { isChileConfirmedUrl } from "@/lib/chile-url";
import { parseVersiones, hostDe, type FilaSheet } from "./encargo";
import { slugify, type RefsSanity } from "./sanity-doc";

export interface Validacion {
  ok: boolean;
  errores: string[];
  slug: string;
  refs?: RefsSanity;
  /** Host de `urlFinal`, sin www. Es el que se le permite a `web_fetch`. */
  host?: string;
  /** La URL despues de seguir los redirects. Puede no ser la de la fila. */
  urlFinal?: string;
  /** La fila apunta a un dominio que redirige a otro. Se avisa, no bloquea. */
  redirigida?: boolean;
}

const CAMPOS: (keyof FilaSheet)[] = ["marca", "modelo", "anio", "tipo", "electrificacion", "url_oficial", "versiones"];

interface Alcance {
  problema: string | null;
  /** Donde termina la URL despues de los redirects. */
  urlFinal: string;
}

/**
 * Un GET corto. Interesa que conteste algo distinto de 4xx/5xx y —sobre todo—
 * DONDE termina.
 *
 * El redirect no es un detalle: `kia.com/cl/...` contesta 200 pero aterriza en
 * `kia.cl`, otro dominio. Como `web_fetch` va encerrado en el host de la fila
 * (R2), la sesion entera falla con `url_not_allowed` despues de gastar plata y
 * minutos. Chequear el destino acá cuesta un GET.
 */
async function alcanzar(url: string): Promise<Alcance> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; ElectrificarteBot/1.0)" },
    });
    const urlFinal = res.url || url;
    // 403 y 429 son el sitio bloqueando bots, no una URL muerta: el agente la lee
    // por los servidores de Anthropic, que pasan donde nosotros no.
    if (res.status === 403 || res.status === 429) return { problema: null, urlFinal: url };
    if (!res.ok) return { problema: `La URL responde ${res.status}`, urlFinal };
    return { problema: null, urlFinal };
  } catch {
    return { problema: "La URL no responde (timeout o DNS)", urlFinal: url };
  } finally {
    clearTimeout(t);
  }
}

export async function validarFila(fila: FilaSheet, sanity: SanityWriteClient): Promise<Validacion> {
  const errores: string[] = [];

  for (const c of CAMPOS) {
    if (String(fila[c] ?? "").trim() === "") errores.push(`Falta la columna "${c}"`);
  }
  const slug = slugify(`${fila.marca ?? ""} ${fila.modelo ?? ""}`);
  if (errores.length) return { ok: false, errores, slug };

  const anio = Number(fila.anio);
  if (!Number.isInteger(anio) || anio < 2015 || anio > new Date().getFullYear() + 2) {
    errores.push(`Ano invalido: ${fila.anio}`);
  }

  let host: string | undefined;
  try {
    host = hostDe(fila.url_oficial);
    if (!isChileConfirmedUrl(fila.url_oficial)) {
      errores.push(`La URL no es del mercado chileno: ${fila.url_oficial}`);
    }
  } catch (e) {
    errores.push(e instanceof Error ? e.message : `URL invalida: ${fila.url_oficial}`);
  }

  try {
    const vs = parseVersiones(fila.versiones);
    if (!vs.length) errores.push("La columna versiones esta vacia: sin precio no hay PDP");
  } catch (e) {
    errores.push(e instanceof Error ? e.message : "versiones no se pudo interpretar");
  }

  // Las tres referencias y el slug, en una sola query.
  const marcaSlug = slugify(fila.marca);
  const tipo = String(fila.tipo).trim();
  const tag = String(fila.electrificacion).trim().toUpperCase();
  interface Refs { brandId: string | null; vehicleTypeId: string | null; electricTypeId: string | null; existente: string | null }
  // El cast es porque el tipado del cliente de Sanity infiere los params desde el
  // literal de la query, y no le calza una proyeccion de varias sub-queries.
  const fetchRefs = sanity.fetch.bind(sanity) as (q: string, p: Record<string, string>) => Promise<Refs>;
  const encontrado: Refs = await fetchRefs(
    `{
      "brandId":       *[_type == "brand" && (slug.current == $marcaSlug || lower(name) == lower($marca)) && !(_id in path("drafts.**"))][0]._id,
      "vehicleTypeId": *[_type == "vehicleType" && (lower(label) == lower($tipo) || lower(name) == lower($tipo) || slug.current == $tipoSlug) && !(_id in path("drafts.**"))][0]._id,
      "electricTypeId":*[_type == "electricType" && upper(tag) == $tag && !(_id in path("drafts.**"))][0]._id,
      "existente":     *[_type == "car" && slug.current == $slug && !(_id in path("drafts.**"))][0]._id
    }`,
    { marca: fila.marca, marcaSlug, tipo, tipoSlug: slugify(tipo), tag, slug },
  );

  if (!encontrado.brandId) errores.push(`La marca "${fila.marca}" no existe en Sanity — crearla a mano primero`);
  if (!encontrado.vehicleTypeId) errores.push(`El tipo de vehiculo "${tipo}" no existe en Sanity`);
  if (!encontrado.electricTypeId) errores.push(`La electrificacion "${tag}" no existe en Sanity`);
  if (encontrado.existente) errores.push(`Ya existe una PDP con el slug "${slug}" (${encontrado.existente}) — R8, no se duplica`);

  // La URL se chequea al final: es la unica parte lenta, y no vale la pena si
  // ya hay errores de datos.
  let urlFinal = fila.url_oficial;
  let redirigida = false;
  if (!errores.length && host) {
    const alcance = await alcanzar(fila.url_oficial);
    if (alcance.problema) {
      errores.push(`${alcance.problema}: ${fila.url_oficial}`);
    } else {
      urlFinal = alcance.urlFinal;
      const hostFinal = hostDe(urlFinal);
      // Un redirect a la raiz del sitio es una pagina muerta disfrazada de 200:
      // la marca borro la ficha y manda todo a la home. Leer la home no produce
      // ninguna spec del modelo, asi que es mejor rebotar la fila que gastar una
      // sesion entera para terminar en "sin datos".
      if (new URL(urlFinal).pathname.replace(/\/$/, "") === "" && new URL(fila.url_oficial).pathname.replace(/\/$/, "") !== "") {
        errores.push(`La URL redirige a la home (${urlFinal}): la ficha del modelo ya no existe ahi`);
      } else if (hostFinal !== host) {
        redirigida = true;
        host = hostFinal;
        if (!isChileConfirmedUrl(urlFinal)) {
          errores.push(`La URL redirige a ${urlFinal}, que no es del mercado chileno`);
        }
      }
    }
  }

  if (errores.length) return { ok: false, errores, slug, host, urlFinal, redirigida };
  return {
    ok: true,
    errores: [],
    slug,
    host,
    urlFinal,
    redirigida,
    refs: {
      brandId: encontrado.brandId!,
      vehicleTypeId: encontrado.vehicleTypeId!,
      electricTypeId: encontrado.electricTypeId!,
    },
  };
}
